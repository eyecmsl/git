# Tea

Authentication app with system-generated passphrases and role-based access.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend:** Flask + SQLAlchemy + Werkzeug
- **Auth:** System-generated passphrases with JWT access/refresh tokens
- **Roles:** owner → admin → user

## Quick Start

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask db upgrade
python run.py

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — the first user to register becomes **owner**.

## How It Works

1. Register with email + display name — the backend generates a random 5-word passphrase shown once
2. Save the passphrase — it will not be shown again
3. Login with email + passphrase — JWT tokens are stored in localStorage
4. Dashboard shows your profile and role badge
5. Owners see an Admin Panel link to manage users (promote to admin)
