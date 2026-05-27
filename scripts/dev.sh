#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Starting Tea in development mode ==="

# Backend
echo ""
echo "→ Setting up backend..."
cd "$ROOT/backend"

if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created backend/.env from .env.example"
fi

echo "  Running migrations..."
FLASK_ENV=development .venv/bin/flask db upgrade > /dev/null 2>&1

echo "  Starting backend on http://localhost:8000"
FLASK_ENV=production nohup .venv/bin/python run.py > /tmp/tea-backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Frontend
echo ""
echo "→ Setting up frontend..."
cd "$ROOT/frontend"

if [ ! -d node_modules ]; then
    npm install --silent
fi

echo "  Starting frontend on http://localhost:3000"
npx next dev --turbo > /tmp/tea-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Both services started ==="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "  Backend log:  tail -f /tmp/tea-backend.log"
echo "  Frontend log: tail -f /tmp/tea-frontend.log"
echo ""
echo "  To stop: kill $BACKEND_PID $FRONTEND_PID"
