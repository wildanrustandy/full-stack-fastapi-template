# Menjalankan Backend & Frontend Tanpa Docker (Local)

## Prasyarat

Pastikan sudah terinstall:

| Tool       | Cek versi        | Install (jika belum)       |
|------------|------------------|----------------------------|
| Python 3.10+ | `python3 --version` | `brew install python`     |
| PostgreSQL 14+ | `psql --version`  | `brew install postgresql@14` |
| uv         | `uv --version`   | `brew install uv`          |
| Bun        | `bun --version`  | `brew install oven-sh/bun/bun` |

> **Penting**: Project ini menggunakan **bun**, bukan npm/yarn. Jangan gunakan `npm install` atau `npm run`.

---

## Langkah 1 — Jalankan PostgreSQL

```bash
# Cek apakah PostgreSQL sudah berjalan
brew services list | grep postgresql

# Jika belum, start
brew services start postgresql@14
```

---

## Langkah 2 — Buat Database

```bash
# Buat database (hanya sekali)
psql -d postgres -c "CREATE DATABASE app;"

# Verifikasi
psql -d app -c "SELECT 1;"
```

> Jika database `app` sudah ada, skip langkah ini.

---

## Langkah 3 — Sesuaikan `.env`

Edit file `.env` di **root project** (satu level di atas folder `backend/`).

Sesuaikan bagian Postgres dengan konfigurasi lokal kamu:

```env
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=app
POSTGRES_USER=<username_postgresql_kamu>
POSTGRES_PASSWORD=<password_postgresql_kamu>
```

> **macOS default**: biasanya `POSTGRES_USER` = username macOS kamu, `POSTGRES_PASSWORD` = kosong atau sama dengan username. Cek dengan `psql -d postgres -c "\du;"` lalu sesuaikan.

---

## Langkah 4 — Install Dependencies

```bash
cd backend
uv sync
```

---

## Langkah 5 — Jalankan Migrasi Database

```bash
# Apply semua migrasi (termasuk model photobooth)
uv run alembic upgrade head
```

> Jika kamu menambahkan model baru di `backend/app/models.py`, generate migrasi baru:
> ```bash
> uv run alembic revision --autogenerate -m "deskripsi migrasi"
> uv run alembic upgrade head
> ```

---

## Langkah 6 — Buat Data Awal (Superuser)

```bash
uv run python app/initial_data.py
```

Ini akan membuat akun superuser pertama berdasarkan `.env`:

- Email: `FIRST_SUPERUSER` (default: `admin@example.com`)
- Password: `FIRST_SUPERUSER_PASSWORD` (default: `changethis`)

---

## Langkah 7 — Jalankan Backend

```bash
uv run fastapi dev app/main.py
```

Backend akan jalan di:

| URL | Deskripsi |
|-----|-----------|
| http://localhost:8000 | API root |
| http://localhost:8000/docs | Swagger UI (interactive docs) |
| http://localhost:8000/redoc | ReDoc (alternative docs) |

---

## Langkah 8 — Install Frontend Dependencies

Buka terminal baru (biarkan backend tetap jalan):

```bash
cd frontend
bun install
```

---

## Langkah 9 — Generate API Client

Frontend menggunakan OpenAPI client yang di-generate otomatis dari backend. **Backend harus sudah berjalan** di port 8000 sebelum langkah ini:

```bash
cd frontend
bun run generate-client
```

> Jalankan ulang `bun run generate-client` setiap kali ada perubahan endpoint di backend (route baru, parameter berubah, dll).

---

## Langkah 10 — Jalankan Frontend

```bash
cd frontend
bun run dev
```

Frontend akan jalan di:

| URL | Deskripsi |
|-----|-----------|
| http://localhost:5173 | Frontend app (login page) |
| http://localhost:5173/admin | Admin dashboard |
| http://localhost:5173/photobooth-dashboard | Photobooth admin (dashboard, booths, transactions) |

### Halaman Kiosk (Photobooth)

Kiosk adalah flow fullscreen untuk pengguna photobooth. Akses langsung di browser:

| URL | Deskripsi |
|-----|-----------|
| http://localhost:5173/landing | **Halaman utama kiosk** — mulai dari sini |
| http://localhost:5173/print-count | Pilih jumlah print |
| http://localhost:5173/payment | Pembayaran (QRIS / demo) |
| http://localhost:5173/photo-session | Sesi foto (4 foto dengan countdown) |
| http://localhost:5173/preview | Preview hasil foto |
| http://localhost:5173/output | Halaman selesai / terima kasih |

> **Flow**: `/landing` → `/print-count` → `/payment` → `/photo-session` → `/preview` → `/output`
>
> Untuk mode kiosk di browser, buka Chrome/Edge dalam fullscreen (`F11` atau `Cmd+Ctrl+F` di macOS) lalu navigasi ke `http://localhost:5173/landing`.

---

## Cheat Sheet — Perintah Cepat

Jika sudah pernah setup sebelumnya, jalankan **2 terminal**:

**Terminal 1 — Backend:**
```bash
cd backend
uv run fastapi dev app/main.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
bun run dev
```

Setup dari awal (semua langkah):

```bash
brew services start postgresql@14
psql -d postgres -c "CREATE DATABASE app;"
cd backend
uv sync
uv run alembic upgrade head
uv run python app/initial_data.py
uv run fastapi dev app/main.py
```

Di terminal baru:
```bash
cd frontend
bun install
bun run generate-client
bun run dev
```

---

## Troubleshooting

### `connection refused`

PostgreSQL tidak berjalan atau kredensial salah:

```bash
brew services restart postgresql@14
psql -d postgres -c "\du;"   # cek user
```

### `Target database is not up to date`

Migrasi yang ada belum di-apply. Jalankan dulu:

```bash
uv run alembic upgrade head
```

Baru setelah itu generate migrasi baru:

```bash
uv run alembic revision --autogenerate -m "deskripsi migrasi"
uv run alembic upgrade head
```

### `ModuleNotFoundError`

Dependencies belum terinstall:

```bash
cd backend
uv sync
```

### Frontend build error / type error

Generate ulang API client setelah backend berjalan:

```bash
cd frontend
bun run generate-client
bun run build
```

### `npm` / `node_modules` error

Project ini hanya menggunakan **bun**. Hapus `node_modules` jika ada dari npm:

```bash
cd frontend
rm -rf node_modules
bun install
```

### Reset Database Total (HATI-HATI — hapus semua data!)

```bash
psql -d postgres -c "DROP DATABASE app;"
psql -d postgres -c "CREATE DATABASE app;"
cd backend
uv run alembic upgrade head
uv run python app/initial_data.py
```

---

## Konfigurasi Photobooth (Opsional)

Untuk integrasi pembayaran QRIS dan pengaturan photobooth, isi di `.env`:

```env
# iPaymu Payment Gateway
IPAYMU_VA=your_virtual_account
IPAYMU_KEY=your_api_key
IPAYMU_URL=https://sandbox.ipaymu.com
IPAYMU_NOTIFY_URL=https://your-domain.com/api/v1/payments/notify

# Photobooth settings
DEFAULT_PRICE_PER_PRINT=35000
PAYMENT_TIMEOUT_MINUTES=5
WS_HEARTBEAT_INTERVAL=30
```

| Env Var | Default | Deskripsi |
|---------|---------|-----------|
| `IPAYMU_VA` | — | Virtual Account iPaymu |
| `IPAYMU_KEY` | — | API Key iPaymu |
| `IPAYMU_URL` | `https://sandbox.ipaymu.com` | Base URL iPaymu (sandbox untuk testing) |
| `IPAYMU_NOTIFY_URL` | — | URL webhook notifikasi pembayaran |
| `DEFAULT_PRICE_PER_PRINT` | `35000` | Harga per print (dalam Rupiah) |
| `PAYMENT_TIMEOUT_MINUTES` | `5` | Batas waktu pembayaran sebelum expired |
| `WS_HEARTBEAT_INTERVAL` | `30` | Interval heartbeat WebSocket (detik) |

> Untuk testing gunakan **sandbox** URL. Jika `IPAYMU_VA` dan `IPAYMU_KEY` kosong, gunakan endpoint demo payment (`/api/v1/payments/demo/create`).
