# Tea

Study materials platform with passphrase authentication, role-based access, client-side compression, password-protected files, and a membership system.

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS v4 (Turbopack) |
| **Backend** | Flask + SQLAlchemy + Flask-Migrate + PyJWT |
| **Auth** | System-generated 5-word passphrases (bcrypt-hashed) + JWT access/refresh tokens |
| **Compression** | Browser-native CompressionStream API (GZIP) — 100% client-side |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Security** | CSP, HSTS, CSRF origin validation, rate limiting, Turnstile (optional) |

## Features

- **Passphrase auth** — system generates a 5-word passphrase on registration, bcrypt-hashed, displayed once
- **Role hierarchy** — owner → admin → user (first user is owner, role locked on registration)
- **Resource management** — upload, edit, delete, search, sort, paginate, categorize
- **Client-side GZIP compression** — files compressed in-browser before upload, decompressed on download
- **Password-protected files** — optional per-file password with bcrypt verification
- **Membership system** — automatic (on registration), manual (admin-granted), permanent (irrevocable)
- **Members-only resources** — restrict access to members only
- **Download/view counters** — track resource popularity
- **Image preview** — inline preview for jpg, png, gif, webp
- **Toast notifications** — success/error feedback for all actions
- **Admin panel** — user role management, resource CRUD, membership management
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

## Quick Start (Development)

```bash
# Option 1: One-command setup
chmod +x scripts/dev.sh
./scripts/dev.sh

# Option 2: Manual setup

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask db upgrade
python run.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** — the first user to register becomes **owner**.

## Production Setup

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# 2. Build and run
./scripts/prod.sh
```

Or manually:
```bash
# Backend
cd backend
source .venv/bin/activate
FLASK_ENV=production flask db upgrade
gunicorn -w 4 -b 0.0.0.0:8000 'app:create_app()'

# Frontend
cd frontend
npm run build
npx next start -p 3000
```

## Project Structure

```
tea/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py              # Auth & admin routes
│   │   │   ├── resources.py         # Resource CRUD, download, password verify
│   │   │   ├── memberships.py       # Membership grant/revoke/check
│   │   │   └── challenge.py         # PoW challenge endpoints
│   │   ├── middleware/
│   │   │   └── auth_middleware.py   # JWT auth decorators
│   │   ├── models/
│   │   │   ├── user.py              # User model (roles, passphrase hash)
│   │   │   ├── resource.py          # Resource model (compression, passwords, membership)
│   │   │   └── membership.py        # Membership model (auto/manual/permanent)
│   │   ├── services/
│   │   │   ├── auth_service.py      # Passphrase gen, JWT, user CRUD
│   │   │   ├── resource_service.py  # Resource CRUD, compression, password verify
│   │   │   └── membership_service.py # Membership grant/revoke
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   └── utils/
│   │       ├── errors.py            # AppError + error handlers
│   │       └── security.py          # CSRF origin validation
│   ├── migrations/                  # Alembic migration history
│   ├── config.py                    # Configuration (secrets auto-generated)
│   ├── run.py                       # Dev entry point
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── login/                   # Login (passphrase + optional Turnstile)
│   │   ├── register/                # Register (passphrase reveal)
│   │   ├── dashboard/               # Resource listing, search, sort, image preview
│   │   └── admin/                   # User/Role, Resource CRUD, Membership mgmt
│   ├── lib/
│   │   ├── auth.tsx                 # Auth context provider
│   │   ├── api.ts                   # HTTP client with JWT auto-refresh
│   │   ├── compress.ts              # Browser CompressionStream utilities
│   │   ├── toast.tsx                # Toast notification system
│   │   ├── utils.ts                 # Format helpers (sizes, dates, badges)
│   │   └── pow.ts                   # Browser PoW solver (Web Crypto)
│   └── next.config.ts               # Rewrites + security headers (CSP, HSTS)
├── scripts/
│   ├── dev.sh                       # One-command dev start
│   └── prod.sh                      # Production build & start
└── README.md
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Register with email + display_name |
| POST | /auth/login | — | Login with email + passphrase |
| POST | /auth/refresh | — | Refresh expired access token |
| GET | /auth/me | Bearer | Get current user profile |

### Resources
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /resources | Bearer | List (search, sort, category, page) |
| GET | /resources/popular | Bearer | Top 5 by view count |
| GET | /resources/recent | Bearer | Resources added in last 7 days |
| GET | /resources/:id | Bearer | Get resource (increments views) |
| POST | /resources | owner/admin | Upload (multipart: file + metadata) |
| PATCH | /resources/:id | owner/admin | Edit title, description, category, password, membership |
| DELETE | /resources/:id | owner/admin | Delete resource |
| POST | /resources/:id/download | Bearer | Track + return download URL (checks password) |
| POST | /resources/:id/verify-password | Bearer | Verify file password |

### Memberships
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /memberships | owner/admin | List all memberships |
| GET | /memberships/me | Bearer | Get own membership |
| GET | /memberships/check | Bearer | Check if active |
| POST | /memberships/grant | owner/admin | Grant manual/permanent |
| POST | /memberships/revoke | owner | Revoke manual (not permanent/auto) |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /admin/users | owner/admin | List all users |
| PATCH | /admin/users/:id/role | owner | Change role (admin/user) |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /categories | Bearer | List distinct resource categories |

## Security

### Default (local development)
All security layers are **disabled by default**:
| Layer | Mechanism | Default | How to enable |
|-------|-----------|---------|---------------|
| Bot detection | Cloudflare Turnstile + SHA-256 PoW | Disabled | `TURNSTILE_ENABLED=true` in `.env` + `.env.local` |
| Rate limiting | flask-limiter (in-memory) | Disabled | Remove `RATELIMIT_ENABLED=false` |
| Compression | Browser CompressionStream (GZIP) | Enabled | Always on when browser supports it |

### Always-on protections
| Protection | Implementation |
|------------|---------------|
| CSP | `next.config.ts` — script-src, style-src, img-src, connect-src, etc. |
| HSTS | `Strict-Transport-Security: max-age=63072000` |
| Passphrase hashing | bcrypt via Werkzeug (`generate_password_hash`) |
| JWT signing | HS256 with dedicated secret key |
| JWT claims | sub, jti, iat, exp, type, role — all validated |
| CSRF | Origin header validation on state-changing requests |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | auto-generated | Flask secret key |
| `JWT_SECRET` | auto-generated | JWT signing secret |
| `DATABASE_URL` | `sqlite:///tea.db` | Database connection string |
| `ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `TURNSTILE_ENABLED` | `false` | Enable Turnstile bot detection |
| `RATELIMIT_ENABLED` | `false` | Enable flask-limiter |
| `MAX_UPLOAD_SIZE` | `52428800` (50MB) | Max file upload size |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CSV of allowed CORS origins |
| `FLASK_ENV` | `production` | Controls debug mode |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_TURNSTILE_ENABLED` | Enable Turnstile widget |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |

## Client-Side Compression

Files are compressed with the browser-native **CompressionStream API** (GZIP):

- **Upload**: admin checks "Compress (GZIP)" → browser compresses → server stores compressed blob
- **Download**: browser fetches compressed blob → decompresses in-memory → saves to disk
- **Display**: shows compressed size, original size, and compression ratio
- **Fallback**: if the browser doesn't support CompressionStream, files are stored uncompressed

Storage: `backend/uploads/` (gitignored) proxied via Next.js rewrite at `/uploads/*`.

## Membership System

Three membership types:

| Type | Auto-granted | Revocable | Description |
|------|-------------|-----------|-------------|
| `automatic` | Yes (on register) | No | Every user gets this |
| `manual` | No | Yes (by owner) | Admin grants explicitly |
| `permanent` | No | No | Irrevocable membership |

Members-only resources display a badge and require active membership to download.

## Error Messages

Error responses follow a consistent format:
```json
{ "error": "error_code", "message": "Human-readable message" }
```

HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden),
404 (not found), 409 (conflict), 429 (rate limited), 500 (internal error).

## Rate Limiting

When enabled (`RATELIMIT_ENABLED=true`):
- Auth: 10 req/min register, 20 req/min login
- Resources: 60 req/min authenticated
- All rate-limit errors return `429` with `Retry-After`

## Notes

- Passphrase is shown once after registration and cannot be recovered
- First registered user is **owner** — role cannot be changed
- Backend must be manually restarted after adding routes/models
- Frontend hot-reloads via Turbopack (`next dev --turbo`)
- Debug mode (`FLASK_ENV=development`) enables Werkzeug reloader — use `FLASK_ENV=production` to avoid dual-process DB conflicts
- File uploads are stored locally in `backend/uploads/` — use S3/R2 for production
