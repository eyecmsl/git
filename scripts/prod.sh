#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Starting Tea in production mode ==="

# Verify environment
if [ ! -f "$ROOT/backend/.env" ]; then
    echo "ERROR: backend/.env not found. Copy backend/.env.example to backend/.env and configure."
    exit 1
fi

if [ ! -f "$ROOT/frontend/.env.local" ]; then
    echo "ERROR: frontend/.env.local not found. Create it with required environment variables."
    exit 1
fi

# Backend
echo ""
echo "→ Starting backend..."
cd "$ROOT/backend"

if [ ! -d .venv ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
else
    source .venv/bin/activate
fi

echo "  Running migrations..."
FLASK_ENV=production .venv/bin/flask db upgrade > /dev/null 2>&1

echo "  Starting backend on http://localhost:8000"
FLASK_ENV=production nohup .venv/bin/python run.py > /tmp/tea-backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Frontend (build + serve)
echo ""
echo "→ Building frontend..."
cd "$ROOT/frontend"

if [ ! -d node_modules ]; then
    npm install --silent
fi

echo "  Building production bundle..."
npx next build > /tmp/tea-frontend-build.log 2>&1

echo "  Starting frontend on http://localhost:3000"
npx next start -p 3000 > /tmp/tea-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Production services running ==="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "  To stop: kill $BACKEND_PID $FRONTEND_PID"
