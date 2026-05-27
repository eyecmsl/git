#!/usr/bin/env python3
import os, sys, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
PASS, FAIL = 0, 0

def ok(msg): global PASS; PASS += 1; print(f"  [+] {msg}")
def fail(msg): global FAIL; FAIL += 1; print(f"  [x] {msg}")

def check(desc, cond, detail=""):
    if cond: ok(desc)
    else: fail(f"{desc} - {detail}" if detail else desc)

def run_py(script, cwd=BACKEND):
    env = os.environ.copy()
    env["FLASK_ENV"] = "production"
    env["PYTHONPATH"] = cwd
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, dir=cwd) as f:
        f.write(script)
        tmppath = f.name
    try:
        r = subprocess.run([sys.executable, tmppath], cwd=cwd,
            capture_output=True, text=True, timeout=30, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"
    finally:
        os.unlink(tmppath)

def run_cmd(cmd, cwd):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=120)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"

def main():
    os.chdir(ROOT)
    print(f"\nTea Platform Health Check\n{'='*40}\n")

    print("1. Backend")
    code, out = run_py(
        "from app import create_app\napp = create_app()\nprint('OK')"
    )
    check("App factory creates", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.models import User,Resource,Membership,Favorite,Tag\n"
        "from app.models import ResourceTag,Collection,CollectionItem\n"
        "from app.models import AuditLog,DownloadHistory,RecentlyViewed,ResourceVersion\n"
        "print('OK')"
    )
    check("All models import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.api import auth,challenge,resources,memberships\n"
        "from app.api import favorites,tags,collections,audit,download_history\n"
        "from app.api import recently_viewed,versions,profiles,bulk_upload,suggestions\n"
        "print('OK')"
    )
    check("All API modules import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.services import auth_service,membership_service\n"
        "from app.services import resource_service,favorite_service,tag_service\n"
        "from app.services import collection_service,audit_service\n"
        "from app.services import download_history_service,recently_viewed_service\n"
        "from app.services import resource_version_service,user_profile_service\n"
        "from app.services import email_service,thumbnail_service,search_service\n"
        "print('OK')"
    )
    check("All services import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app import create_app,db\n"
        "app = create_app()\n"
        "with app.app_context():\n"
        "    with db.engine.connect() as conn:\n"
        "        rows = conn.execute(\n"
        "            db.text('SELECT name FROM sqlite_master WHERE type=:t ORDER BY name'),\n"
        "            {'t': 'table'}\n"
        "        ).fetchall()\n"
        "    found = set(r[0] for r in rows)\n"
'    required = {"users","resources","memberships","favorites","tags",\n'
'        "resource_tags","collections","collection_items","audit_logs",\n'
'        "download_history","recently_viewed","resource_versions"}\n'
        "    missing = required - found\n"
        "    print('OK' if not missing else 'MISSING: ' + str(missing))\n"
    )
    check("All DB tables exist", code == 0 and "OK" in out, out[-300:])

    print("\n2. Frontend")
    if os.path.exists(os.path.join(FRONTEND, ".next")):
        ok("Build output exists")
    else:
        code, out = run_cmd(["npx", "next", "build"], FRONTEND)
        check("Frontend builds", "Compiled successfully" in out, out[-300:])

    print("\n3. File structure")
    required = [
        "backend/app/__init__.py", "backend/config.py", "backend/run.py",
        "frontend/app/layout.tsx", "frontend/app/dashboard/page.tsx",
        "frontend/app/admin/page.tsx", "frontend/app/profile/page.tsx",
        "frontend/lib/api.ts", "frontend/lib/auth.tsx", "frontend/lib/theme.tsx",
        "frontend/lib/toast.tsx", "frontend/lib/utils.ts",
        "scripts/dev.sh", "scripts/prod.sh", "scripts/check.py",
    ]
    missing = [f for f in required if not os.path.exists(os.path.join(ROOT, f))]
    check("All required files exist", len(missing) == 0, str(missing))

    print("\n4. Git")
    code, out = run_cmd(["git", "status", "--porcelain"], ROOT)
    check("Working tree clean", code == 0 and not out.strip(), out[:300])
    code, out = run_cmd(["git", "log", "--oneline", "-1"], ROOT)
    check("Recent commit exists", code == 0 and out.strip(), out.strip())

    total = PASS + FAIL
    print(f"\n{'='*40}\n{PASS}/{total} checks passed", end="")
    if FAIL:
        print(f", {FAIL} failed")
        sys.exit(1)
    else:
        print()
        sys.exit(0)

if __name__ == "__main__":
    main()
