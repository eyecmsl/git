# Tea

Passwordless authentication app using passkeys (WebAuthn).

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend:** Flask + SQLAlchemy + WebAuthn
- **Auth:** Passkeys (WebAuthn) with JWT access/refresh tokens
- **Roles:** owner → admin → user

## Quick Start

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the first user to register becomes **owner**.

## Production

```bash
docker compose up
```
