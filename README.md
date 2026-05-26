# Tea

Authentication app with system-generated passphrases and progressive role-based access.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend:** Flask + SQLAlchemy + Werkzeug (bcrypt)
- **Auth:** System-generated passphrases with JWT access/refresh tokens
- **Migrations:** Flask-Migrate (Alembic)
- **Security:** Cloudflare Turnstile → self-hosted SHA-256 PoW fallback → flask-limiter
- **Roles:** owner → admin → user (set at registration, first user is owner)

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

> **Note:** Debug mode (FLASK_ENV=development) enables the auto-reloader which
> can cause dual-process database conflicts. Run with `FLASK_ENV=production`
> or disable the reloader if you encounter issues.

## Security

Requests are protected by a three-tier defense:

| Tier | Mechanism | Scope | Fallback |
|------|-----------|-------|----------|
| 1 | Cloudflare Turnstile (invisible) | Register + login forms | Automatic PoW fallback |
| 2 | Self-hosted SHA-256 PoW | Same endpoints | HMAC-signed nonces, 2-min TTL |
| 3 | flask-limiter (in-memory) | 10/min register, 20/min login | Always-on safety net |

### Turnstile (primary)
An invisible Cloudflare Turnstile widget (`execution="execute"`) runs a browser
challenge on form submit and sends the token as `turnstile_token`. The backend
validates it via Cloudflare's Siteverify API.

### PoW fallback (when Turnstile is down)
If the Turnstile widget fails to load or the Siteverify request times out, the
frontend requests a challenge from `POST /api/v1/challenge` and solves a SHA-256
proof-of-work in the browser (Web Crypto API). The solution is submitted as
`pow_token` and verified on the backend using HMAC-SHA256 signed nonces.

### Rate limiting
flask-limiter runs in-memory (no Redis needed) — 10 requests/minute on register,
20/minute on login. This is always active as a safety net.

> **Dev keys:** The default `TURNSTILE_SECRET_KEY` (`0x...`) and
> `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (`1x...`) are Cloudflare test keys that always
> pass. Replace with real keys from https://dash.cloudflare.com/?to=/:account/turnstile
> before deploying to production. The PoW fallback works regardless.

## How It Works

1. **Register** — enter email + display name. Backend generates a cryptographic
   5-word passphrase (secrets module, 200-word dictionary, ~52 bits entropy)
   and displays it once. JWT tokens are not stored until you confirm.

2. **Save your passphrase** — copy it now. It is hashed with bcrypt and will
   never be shown again. There is no password reset flow yet.

3. **Login** — email + passphrase. Server verifies the bcrypt hash and returns
   JWT access (15 min) and refresh (30 day) tokens stored in localStorage.

4. **Dashboard** — role-based progressive sections:

   | Section | Label | Visible To |
   |---------|-------|------------|
   | A       | System | owner |
   | B       | Administration | owner, admin |
   | C       | Account | owner, admin, user |

   Each section auto-hides below its required role level.

5. **Admin** — owners can promote/demote users between admin and user roles
   via the Admin Panel (link visible in sections A/B).

## Project Structure

```
tea/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Auth & admin API routes
│   │   │   └── challenge.py     # PoW challenge endpoints
│   │   ├── middleware/          # JWT auth middleware
│   │   ├── models/              # User model
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/
│   │       ├── auth_service.py  # Passphrase gen, JWT, user CRUD
│   │       ├── turnstile_service.py  # Turnstile Siteverify client
│   │       ├── pow_service.py   # SHA-256 PoW challenge/verify
│   │       └── webauthn_service.py   # Preserved for future passkey support
│   ├── migrations/              # Alembic migration history
│   ├── config.py                # App configuration
│   └── run.py                   # Entry point
├── frontend/
│   ├── app/
│   │   ├── login/               # Login page (passphrase + Turnstile/PoW)
│   │   ├── register/            # Register page (passphrase reveal)
│   │   ├── dashboard/           # Role-based dashboard
│   │   └── admin/               # User management (owner)
│   ├── lib/
│   │   ├── auth.tsx             # Auth context provider
│   │   ├── api.ts               # HTTP client with auto-refresh
│   │   ├── pow.ts               # Browser PoW solver (Web Crypto API)
│   │   └── webauthn.ts          # Preserved for future passkey support
└── README.md
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Register (email + display_name + turnstile_token or pow_token) |
| POST | /auth/login | — | Login (email + passphrase + turnstile_token or pow_token) |
| POST | /auth/refresh | — | Refresh expired access token |
| GET | /auth/me | Bearer | Get current user profile |
| POST | /challenge | — | Get SHA-256 PoW challenge (for Turnstile fallback) |
| POST | /challenge/verify | — | Verify a PoW solution server-side |
| GET | /admin/users | owner/admin | List all users |
| PATCH | /admin/users/:id/role | owner | Change user role (admin/user) |

Frontend API calls are proxied via Next.js rewrites (`/api/*` → `http://localhost:8000/api/v1/*`).
