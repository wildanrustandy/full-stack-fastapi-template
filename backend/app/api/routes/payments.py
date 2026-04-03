import json
import uuid
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from sqlmodel import SQLModel

from app.api.deps import SessionDep
from app import crud
from app.core.config import settings
from app.models import KioskSessionCreate, KioskSessionUpdate, PaymentCreate, Message
from app.services import ipaymu

router = APIRouter(prefix="/payments", tags=["payments"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class PaymentRequestBody(SQLModel):
    amount: str
    product_name: str = "Photobooth Session"
    qty: str = "1"
    booth_id: uuid.UUID
    print_count: int = 1


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/create")
def create_payment(body: PaymentRequestBody, session: SessionDep) -> Any:
    """Create a new payment via iPaymu and return the QR string."""
    # 1. Create kiosk session
    session_create = KioskSessionCreate(
        booth_id=body.booth_id,
        device_id="kiosk",
        print_count=body.print_count,
        total_price=float(body.amount),
        filter_name="normal",
        timer=5,
    )
    kiosk_session = crud.create_kiosk_session(
        session=session, session_in=session_create
    )

    # 2. Call iPaymu to create payment
    payment_result = ipaymu.create_payment_request(
        session=session,
        amount=float(body.amount),
        product_name=body.product_name,
        print_count=body.print_count,
        notify_url=settings.IPAYMU_NOTIFY_URL,
    )

    ipaymu_data = payment_result["data"]
    reference_id = payment_result["reference_id"]

    # Extract fields from iPaymu response
    qr_string = ipaymu_data.get("Data", {}).get("QrString") or ipaymu_data.get(
        "QrString", ""
    )
    transaction_id = ipaymu_data.get("Data", {}).get(
        "TransactionId"
    ) or ipaymu_data.get("TransactionId", "")
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PAYMENT_TIMEOUT_MINUTES
    )

    # 3. Create payment record
    payment_create = PaymentCreate(
        session_id=kiosk_session.id,
        booth_id=body.booth_id,
        amount=float(body.amount),
    )
    payment = crud.create_payment(
        session=session,
        payment_in=payment_create,
        reference_id=reference_id,
        qr_string=qr_string,
        transaction_id=transaction_id,
        expires_at=expires_at,
    )

    return {
        "QrString": payment.qr_string,
        "TransactionId": payment.transaction_id,
        "ReferenceId": payment.reference_id,
        "SessionId": str(kiosk_session.id),
    }


@router.get("/status/{transaction_id}")
def check_status(transaction_id: str) -> Any:
    """Check the payment status for a given iPaymu transaction."""
    result = ipaymu.check_payment_status(transaction_id)
    return result


def _handle_notification(session: SessionDep, trx_id: str, status: str) -> dict:
    """Shared logic for processing payment notifications (POST and GET)."""
    payment = crud.get_payment_by_transaction_id(session=session, transaction_id=trx_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if status.lower() in ("berhasil", "1"):
        now = datetime.now(timezone.utc)
        crud.update_payment_status(
            session=session, db_payment=payment, status="success", paid_at=now
        )
        # Also update the linked kiosk session
        kiosk_session = crud.get_kiosk_session(
            session=session, session_id=payment.session_id
        )
        if kiosk_session:
            crud.update_kiosk_session(
                session=session,
                db_session=kiosk_session,
                session_in=KioskSessionUpdate(status="paid"),
            )
    elif status.lower() in ("expired", "-2", "2"):
        crud.update_payment_status(session=session, db_payment=payment, status="failed")

    return {"status": "success", "trx_id": trx_id}


@router.post("/notify")
async def payment_notify(request: Request, session: SessionDep) -> Any:
    """Webhook endpoint for iPaymu payment notifications."""
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    data: dict[str, Any] = {}

    # Try URL-encoded first, then fall back to JSON
    if body_str.strip().startswith("{"):
        try:
            data = json.loads(body_str)
        except json.JSONDecodeError:
            data = {}
    else:
        parsed = urllib.parse.parse_qs(body_str)
        data = {k: v[0] for k, v in parsed.items()}

    trx_id = data.get("trx_id", data.get("transaction_id"))
    status = data.get("status", "UNKNOWN")

    if not trx_id or not status:
        raise HTTPException(status_code=400, detail="Missing trx_id or status")

    return _handle_notification(session=session, trx_id=trx_id, status=status)


@router.get("/notify")
def payment_notify_test(
    session: SessionDep,
    trx_id: str = Query(...),
    status: str = Query(...),
) -> Any:
    """Test endpoint (GET) for simulating payment notifications locally."""
    return _handle_notification(session=session, trx_id=trx_id, status=status)


@router.post("/demo/create")
def create_demo_payment(body: PaymentRequestBody, session: SessionDep) -> Any:
    """Create a demo payment that is immediately marked as successful."""
    # Ensure demo booth exists (auto-creates if missing)
    demo_booth = crud.ensure_demo_booth(session=session)

    # 1. Create kiosk session
    session_create = KioskSessionCreate(
        booth_id=demo_booth.id,
        device_id="kiosk",
        print_count=body.print_count,
        total_price=float(body.amount),
        filter_name="normal",
        timer=5,
    )
    kiosk_session = crud.create_kiosk_session(
        session=session, session_in=session_create
    )

    # 2. Generate demo identifiers
    demo_transaction_id = f"DEMO-{uuid.uuid4().hex[:12].upper()}"
    demo_reference_id = f"DEMO-REF-{uuid.uuid4().hex[:8].upper()}"
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PAYMENT_TIMEOUT_MINUTES
    )

    # 3. Create payment record
    payment_create = PaymentCreate(
        session_id=kiosk_session.id,
        booth_id=demo_booth.id,
        amount=float(body.amount),
    )
    payment = crud.create_payment(
        session=session,
        payment_in=payment_create,
        reference_id=demo_reference_id,
        qr_string=f"demo://pay/{demo_transaction_id}",
        transaction_id=demo_transaction_id,
        expires_at=expires_at,
    )

    # 4. Immediately mark as success
    now = datetime.now(timezone.utc)
    crud.update_payment_status(
        session=session, db_payment=payment, status="success", paid_at=now
    )
    crud.update_kiosk_session(
        session=session,
        db_session=kiosk_session,
        session_in=KioskSessionUpdate(status="paid"),
    )

    return {
        "QrString": payment.qr_string,
        "TransactionId": payment.transaction_id,
        "ReferenceId": payment.reference_id,
        "SessionId": str(kiosk_session.id),
    }
