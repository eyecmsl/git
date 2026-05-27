#!/usr/bin/env python3
import os, sys, subprocess

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
    env = os.environ.copy(); env.setdefault("FLASK_ENV", "production")
    try:
        r = subprocess.run([sys.executable, "-c", script], cwd=cwd,
            capture_output=True, text=True, timeout=30, env=env)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"

def run_cmd(cmd, cwd):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=120)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"

def main():
    os.chdir(ROOT)
    print(f"\nTea Platform Health Check\n{'='*40}\n")

    # 1. Backend
    print("1. Backend")
    code, out = run_py("from app import create_app; app = create_app(); print('OK')")
    check("App factory creates", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.models import User,Resource,Membership,Favorite,Tag,"
        "ResourceTag,Collection,CollectionItem,AuditLog,DownloadHistory,"
        "RecentlyViewed,ResourceVersion; print('OK')"
    )
    check("All models import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.api import auth,challenge,resources,memberships,"
        "favorites,tags,collections,audit,download_history,"
        "recently_viewed,versions,profiles,bulk_upload,suggestions; print('OK')"
    )
    check("All API modules import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app.services import auth_service,membership_service,"
        "resource_service,favorite_service,tag_service,collection_service,"
        "audit_service,download_history_service,recently_viewed_service,"
        "resource_version_service,user_profile_service,email_service,"
        "thumbnail_service,search_service; print('OK')"
    )
    check("All services import", code == 0 and "OK" in out, out[-200:])

    code, out = run_py(
        "from app import create_app,db; app=create_app(); "
        "with app.app_context(): "
        "tables=db.engine.execute("
        "'SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name'"
        ").fetchall(); "
        "t=set(r[0] for r in tables); "
        "req=set(['users','resources','memberships','favorites','tags',"
        "'resource_tags','collections','collection_items','audit_logs',"
        "'download_history','recently_viewed','resource_versions']); "
        "m=req-t; print('OK' if not m else 'MISSING:'+str(m))"
    )
    check("All DB tables exist", code == 0 and "OK" in out, out[-300:])

    # 2. Frontend
    print("\n2. Frontend")
    if os.path.exists(os.path.join(FRONTEND, ".next")):
        code, out = run_py("print('OK')", FRONTEND)
        check("Build output exists", code == 0, "")
    else:
        code, out = run_cmd(["npx", "next", "build"], FRONTEND)
        check("Frontend builds", "Compiled successfully" in out and "Generating static pages" in out, out[-300:])

    # 3. File structure
    print("\n3. File structure")
    req = [
        "backend/app/__init__.py", "backend/config.py", "backend/run.py",
        "frontend/app/layout.tsx", "frontend/app/dashboard/page.tsx",
        "frontend/app/admin/page.tsx", "frontend/app/profile/page.tsx",
        "frontend/lib/api.ts", "frontend/lib/auth.tsx", "frontend/lib/theme.tsx",
        "frontend/lib/toast.tsx", "frontend/lib/utils.ts",
        "scripts/dev.sh", "scripts/prod.sh", "scripts/check.py",
    ]
    missing = [f for f in req if not os.path.exists(os.path.join(ROOT, f))]
    check("All required files exist", len(missing) == 0, str(missing))

    # 4. Git state
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
