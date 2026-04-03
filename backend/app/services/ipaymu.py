import hashlib
import hmac
import json
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from app.core.config import settings


def generate_signature(body: str, va: str, api_key: str) -> tuple[str, str]:
    encrypt_body = hashlib.sha256(body.encode()).hexdigest()
    stringtosign = f"POST:{va}:{encrypt_body}:{api_key}"
    signature = (
        hmac.new(api_key.encode(), stringtosign.encode(), hashlib.sha256)
        .hexdigest()
        .lower()
    )
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return signature, timestamp


def create_payment_request(
    session, amount: float, product_name: str, print_count: int, notify_url: str
) -> dict:
    reference_id = "PB" + datetime.now().strftime("%Y%m%d%H%M%S")

    body = {
        "name": "Kiosk User",
        "phone": "08123456789",
        "email": "user@kiosk.com",
        "amount": str(amount),
        "notifyUrl": notify_url,
        "comments": f"Photobooth Payment - {product_name}",
        "referenceId": reference_id,
        "paymentMethod": "qris",
        "paymentChannel": "qris",
    }

    data_body = json.dumps(body, separators=(",", ":"))
    signature, timestamp = generate_signature(
        data_body, settings.IPAYMU_VA, settings.IPAYMU_KEY
    )

    headers = {
        "Content-type": "application/json",
        "Accept": "application/json",
        "signature": signature,
        "va": settings.IPAYMU_VA,
        "timestamp": timestamp,
    }

    response = httpx.post(
        f"{settings.IPAYMU_URL}/api/v2/payment/direct",
        headers=headers,
        content=data_body,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="iPaymu payment request failed")

    return {"data": response.json(), "reference_id": reference_id}


def check_payment_status(transaction_id: str) -> dict:
    body = {"transactionId": transaction_id}
    data_body = json.dumps(body, separators=(",", ":"))

    signature, timestamp = generate_signature(
        data_body, settings.IPAYMU_VA, settings.IPAYMU_KEY
    )

    headers = {
        "Content-type": "application/json",
        "Accept": "application/json",
        "signature": signature,
        "va": settings.IPAYMU_VA,
        "timestamp": timestamp,
    }

    response = httpx.post(
        f"{settings.IPAYMU_URL}/api/v2/transaction",
        headers=headers,
        content=data_body,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="iPaymu status check failed")

    return response.json().get("Data", {})
