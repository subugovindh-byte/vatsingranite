#!/usr/bin/env python3
"""
AB GRANITE ERP — Management CLI
Usage: python scripts/vat.py <command> [env] [args]
"""
import os, sys, json, subprocess, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent.resolve()
PROD_URL   = os.environ.get("PROD_URL",   "https://vatsingranite-prod.azurewebsites.net")
LOCAL_URL  = os.environ.get("LOCAL_URL",  "http://localhost:8080")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "Admin@123")

# ── Terminal colours ──────────────────────────────────────────────────────────
GREEN  = "\033[0;32m"; YELLOW = "\033[1;33m"
RED    = "\033[0;31m"; CYAN   = "\033[0;36m"; RESET = "\033[0m"

def ok(msg):   print(f"{GREEN}✓{RESET} {msg}")
def warn(msg): print(f"{YELLOW}⚠{RESET}  {msg}")
def err(msg):  print(f"{RED}✗{RESET} {msg}"); sys.exit(1)
def hdr(msg):  print(f"\n{CYAN}━━ {msg} ━━{RESET}")

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def http(method, url, *, token=None, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from e
    except Exception as e:
        raise RuntimeError(str(e)) from e

def api_login(base):
    data = http("POST", f"{base}/api/auth/login",
                body={"username": ADMIN_USER, "password": ADMIN_PASS})
    token = data.get("token")
    if not token:
        err("Login failed — check ADMIN_USER / ADMIN_PASS")
    return token

def api_post(base, path, token, body=None):
    return http("POST", f"{base}{path}", token=token, body=body)

def api_get(base, path, token):
    return http("GET", f"{base}{path}", token=token)

def api_delete(base, path, token):
    return http("DELETE", f"{base}{path}", token=token)

def api_patch(base, path, token, body):
    return http("PATCH", f"{base}{path}", token=token, body=body)

def resolve_base(env):
    env = (env or "local").lower()
    if env in ("prod", "production"): return PROD_URL, "prod"
    if env in ("local", "dev"):       return LOCAL_URL, "local"
    err(f"Unknown env '{env}'. Use: local | prod")

def confirm(prompt, expected="yes"):
    answer = input(f"  {prompt}: ").strip()
    if answer != expected:
        print("Aborted."); sys.exit(0)

def run(cmd, *, cwd=None, check=True):
    result = subprocess.run(cmd, shell=True, cwd=cwd or ROOT, check=check)
    return result.returncode

# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_help():
    print(f"""
{CYAN}AB GRANITE ERP — vat.py{RESET}

{YELLOW}LOCAL DEV{RESET}
  dev                    Start dev server (API + Web hot-reload)
  test                   Run 40-test regression smoke suite
  build                  Build web bundle for production

{YELLOW}DEPLOYMENT{RESET}
  deploy                 Build + git push → triggers Azure CI/CD
  status                 Health check: local + production + CI/CD
  logs                   Tail Azure App Service live logs

{YELLOW}DATA MANAGEMENT{RESET}  (env = local | prod, defaults to local)
  purge         [env]    Wipe ALL data — quarries, customers, employees,
                           blocks, invoices, etc. User accounts kept.
  reseed        [env]    Wipe all data then reload demo sample data
  factory-reset [env]    Wipe EVERYTHING incl. user accounts → admin only
  stats         [env]    Show row counts for all tables

{YELLOW}BACKUP & RESTORE{RESET}
  backup        [env]    Create local copy + blob upload + download to ./backups/
  restore       [env] <file>   Upload a .db file to replace the live database

{YELLOW}USER MANAGEMENT{RESET}
  users         [env]    List all user accounts
  adduser       [env]    Create a new user (interactive)
  resetpwd      [env] <username>   Reset a user's password (generates temp)

{YELLOW}QUARRY MANAGEMENT{RESET}
  quarries      [env]    List all quarries (shows which is the default)
  org           [env]    Show organisation/company details

{YELLOW}GO-LIVE{RESET}
  go-live                Full sequence: test → build → purge prod → deploy

{CYAN}ENVIRONMENT VARS{RESET}
  PROD_URL    = {PROD_URL}
  LOCAL_URL   = {LOCAL_URL}
  ADMIN_USER  = {ADMIN_USER}
  ADMIN_PASS  = (set via env var)

{CYAN}EXAMPLES{RESET}
  python scripts/vat.py dev
  python scripts/vat.py test
  python scripts/vat.py stats prod
  python scripts/vat.py purge prod
  python scripts/vat.py backup prod
  python scripts/vat.py restore prod backups/vatsingranite-2025-05-01.db
  python scripts/vat.py users prod
  python scripts/vat.py go-live
""")

# ── Dev / Build / Deploy ──────────────────────────────────────────────────────

def cmd_dev():
    hdr("Starting dev server")
    os.chdir(ROOT)
    os.execvp("npm", ["npm", "run", "dev"])

def cmd_test():
    hdr("Running regression smoke suite")
    run("npm test -w @vatsingranite/api")
    ok("All tests passed")

def cmd_build():
    hdr("Building web bundle")
    run("npm run build:web")
    ok("Build complete → packages/web/dist/")

def cmd_deploy():
    hdr("Deploying to Azure")
    cmd_build()
    staged = subprocess.run("git diff --cached --quiet", shell=True, cwd=ROOT).returncode
    if staged != 0:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        run(f'git commit -m "chore: production build {ts}"')
    else:
        warn("Nothing new staged — pushing existing HEAD")
    run("git push origin main")
    ok("Pushed → GitHub Actions will build and deploy to Azure")
    print(f"\n  Monitor: gh run list --limit 3\n  Health:  {PROD_URL}/health")

def cmd_status():
    hdr("Health check")
    for label, url, timeout in [("Local ", LOCAL_URL, 3), ("Prod  ", PROD_URL, 10)]:
        print(f"  {label} ({url}) ... ", end="", flush=True)
        try:
            data = http("GET", f"{url}/health", timeout=timeout)
            ok("online") if data.get("status") == "ok" else warn(f"unexpected: {data}")
        except Exception:
            warn("offline")
    print()
    try:
        result = subprocess.run(
            "gh run list --limit 1 --json status,conclusion,createdAt",
            shell=True, capture_output=True, text=True, cwd=ROOT
        )
        runs = json.loads(result.stdout)
        if runs:
            r = runs[0]
            print(f"  CI/CD: {r['status']} / {r['conclusion']} @ {r['createdAt'][:16]}")
    except Exception:
        print("  CI/CD: gh cli not available")

def cmd_logs():
    hdr("Azure App Service logs")
    code = run("az webapp log tail --name vatsingranite-prod --resource-group modernex-rg", check=False)
    if code != 0:
        err("az CLI not logged in. Run: az login")

# ── Data Management ───────────────────────────────────────────────────────────

def cmd_purge(env=None):
    base, label = resolve_base(env)
    hdr(f"Purge ALL data — {label} ({base})")
    warn("Deletes ALL data: quarries, customers, employees, transactions.")
    warn("User accounts (logins) are preserved.")
    confirm("Type 'yes' to confirm")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")
    print("  Purging ... ", end="", flush=True)
    result = api_post(base, "/api/admin/purge", token)
    print(result.get("message", "done"))
    ok("Purge complete — system is blank (user accounts retained)")

def cmd_reseed(env=None):
    base, label = resolve_base(env)
    hdr(f"Reseed demo data — {label} ({base})")
    warn("Wipes all data then loads quarries, customers, employees, sample transactions.")
    warn("Use for testing only — NOT for production.")
    confirm("Type 'yes' to confirm")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")
    print("  Reseeding ... ", end="", flush=True)
    result = api_post(base, "/api/admin/reseed", token)
    print(result.get("message", "done"))
    ok("Reseed complete")

def cmd_factory_reset(env=None):
    base, label = resolve_base(env)
    hdr(f"Factory Reset — {label} ({base})")
    print(f"""
  Wipes EVERYTHING — quarries, customers, employees, accounts,
  user accounts (all except admin), and all transactions.

  After reset: only the admin user remains. System is completely blank.
  You must recreate quarries, users, and all master data from scratch.
""")
    warn("ALL data entered via the UI will be permanently deleted.")
    confirm("Type 'factory-reset' to confirm", expected="factory-reset")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")
    print("  Resetting ... ", end="", flush=True)
    result = api_post(base, "/api/admin/factory-reset", token)
    print(result.get("message", "done"))
    ok("Factory reset complete — admin user only, everything else gone")

def cmd_stats(env=None):
    base, label = resolve_base(env)
    hdr(f"Table row counts — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")
    data = api_get(base, "/api/admin/stats", token)

    master       = data.get("master", {})
    transactions = data.get("transactions", {})

    print(f"\n  {'ORG & USER ACCOUNTS (always kept)'}")
    for k in ["organizations", "roles", "users", "user_roles"]:
        print(f"    {k:<30} {master.get(k, 'n/a')}")

    print(f"\n  MASTER DATA (cleared by purge)")
    for k in ["quarries", "varieties", "locations", "customers", "employees",
              "accounts", "suppliers", "leases", "cost_centers"]:
        v = master.get(k, "n/a")
        flag = f" {YELLOW}← has data{RESET}" if isinstance(v, int) and v > 0 else ""
        print(f"    {k:<30} {v}{flag}")

    print(f"\n  TRANSACTIONS (cleared by purge)")
    for k in sorted(transactions):
        v = transactions[k]
        flag = f" {YELLOW}← has data{RESET}" if isinstance(v, int) and v > 0 else ""
        print(f"    {k:<30} {v}{flag}")

    all_clear = data.get("allClear", False)
    all_master_empty = all(
        transactions.get(k, 0) == 0 or transactions.get(k, 0) == "n/a"
        for k in transactions
    ) and all(
        master.get(k, 0) == 0
        for k in ["quarries", "customers", "employees"]
    )

    print()
    if all_master_empty and all_clear:
        ok("System is clean — ready for production data entry")
    elif all_clear:
        ok("All transaction tables empty — master data exists")
    else:
        remaining = sum(1 for v in transactions.values() if isinstance(v, int) and v > 0)
        warn(f"{remaining} transaction table(s) still have data")

# ── Backup & Restore ──────────────────────────────────────────────────────────

def cmd_backup(env=None):
    base, label = resolve_base(env)
    hdr(f"Backup — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    # 1. Server-side local copy
    print("  Creating server-side backup ... ", end="", flush=True)
    try:
        r = api_post(base, "/api/admin/backup/local", token)
        size_kb = r.get("sizeBytes", 0) // 1024
        ok(f"{r.get('file')}  ({size_kb} KB)")
    except Exception as e:
        warn(f"Server backup failed: {e}")

    # 2. Azure Blob Storage
    print("  Uploading to Azure Blob ... ", end="", flush=True)
    try:
        r = api_post(base, "/api/admin/backup/blob", token)
        ok(f"{r.get('container')}/{r.get('blob')}")
    except RuntimeError as e:
        msg = str(e)
        if "Not configured" in msg or "AZURE_STORAGE" in msg:
            warn("Skipped — AZURE_STORAGE_CONNECTION_STRING not set on server")
        else:
            warn(f"Blob upload failed: {msg}")

    # 3. Download to ./backups/ locally
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    local_dir = ROOT / "backups"
    local_dir.mkdir(exist_ok=True)
    local_file = local_dir / f"vatsingranite-{label}-{ts}.db"
    print(f"  Downloading to ./backups/{local_file.name} ... ", end="", flush=True)
    try:
        req = urllib.request.Request(
            f"{base}/api/admin/backup/download",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=60) as r, open(local_file, "wb") as f:
            f.write(r.read())
        ok(f"{local_file.stat().st_size // 1024} KB")
    except Exception as e:
        warn(f"Download failed: {e}")

    print()
    ok("Backup complete")
    _list_local_backups()

def _list_local_backups():
    local_dir = ROOT / "backups"
    if not local_dir.exists():
        return
    files = sorted(local_dir.glob("*.db"), reverse=True)
    if not files:
        return
    print(f"\n  Local backup files ({local_dir}):")
    for f in files[:10]:
        kb = f.stat().st_size // 1024
        print(f"    {f.name:<55} {kb:>6} KB")

def cmd_restore(env=None, filepath=None):
    if not filepath:
        err("Usage: python scripts/vat.py restore [env] <path/to/backup.db>")
    base, label = resolve_base(env)
    hdr(f"Restore — {label} ({base})")

    path = Path(filepath)
    if not path.exists():
        err(f"File not found: {filepath}")
    if path.suffix != ".db":
        err("File must have a .db extension")

    size_kb = path.stat().st_size // 1024
    warn(f"This will REPLACE the live {label} database with: {path.name} ({size_kb} KB)")
    warn("A pre-restore safeguard copy will be kept on the server.")
    confirm("Type 'yes' to confirm")

    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    print(f"  Uploading {path.name} ({size_kb} KB) ... ", end="", flush=True)
    boundary = "----ABGRestoreBoundary"
    with open(path, "rb") as f:
        file_data = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + file_data + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{base}/api/admin/backup/restore",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            result = json.loads(r.read())
        print(result.get("message", "done"))
        ok(f"Restore complete — safeguard: {result.get('safeguard', 'n/a')}")
    except urllib.error.HTTPError as e:
        err(f"Restore failed: HTTP {e.code}: {e.read().decode()}")

def cmd_backups(env=None):
    """List backup files — server-side and local."""
    base, label = resolve_base(env)
    hdr(f"Backup list — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    print(f"\n  Server-side backups ({label}):")
    try:
        r = api_get(base, "/api/admin/backup/list", token)
        files = r.get("backups", [])
        if files:
            for b in files:
                kb = b["sizeBytes"] // 1024
                ts = b["createdAt"][:19].replace("T", " ")
                print(f"    {b['name']:<50} {kb:>6} KB  {ts}")
        else:
            print("    (none)")
    except Exception as e:
        warn(f"Could not list server backups: {e}")

    print()
    _list_local_backups()

# ── User Management ───────────────────────────────────────────────────────────

def cmd_users(env=None):
    base, label = resolve_base(env)
    hdr(f"User accounts — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    data = api_get(base, "/api/users", token)
    users = data.get("users", [])
    if not users:
        print("  No users found."); return

    w = 18
    print(f"\n  {'Username':<{w}} {'Full Name':<22} {'Role':<12} {'Email':<28} {'Active':<8} Last Login")
    print(f"  {'-'*w} {'-'*22} {'-'*12} {'-'*28} {'-'*8} {'-'*16}")
    for u in users:
        active = f"{GREEN}yes{RESET}" if u.get("active") else f"{RED}no{RESET} "
        ll = (u.get("last_login") or "—")[:16]
        print(f"  {u['username']:<{w}} {u.get('full_name',''):<22} {u.get('role',''):<12} {u.get('email',''):<28} {active}    {ll}")
    print(f"\n  Total: {len(users)} user(s)")

def cmd_adduser(env=None):
    base, label = resolve_base(env)
    hdr(f"Add user — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")
    print()

    username  = input("  Username      : ").strip()
    full_name = input("  Full name     : ").strip()
    email     = input("  Email         : ").strip()
    phone     = input("  Phone         : ").strip()
    print("  Roles: ADMIN | MANAGER | SUPERVISOR | ACCOUNTANT | SALES | VIEWER")
    role      = input("  Role          : ").strip().upper() or "VIEWER"
    password  = input("  Password (blank = auto-generate): ").strip() or None

    if not username or not full_name:
        err("Username and full name are required")

    payload = {"username": username, "full_name": full_name,
               "email": email, "phone": phone, "role": role}
    if password:
        payload["password"] = password

    print(f"\n  Creating user '{username}' ... ", end="", flush=True)
    try:
        r = api_post(base, "/api/users", token, body=payload)
        user = r.get("user", {})
        temp = r.get("tempPassword")
        ok(f"Created — id={user.get('id')}")
        if temp:
            print(f"\n  {YELLOW}Temp password: {temp}{RESET}")
            print(f"  Share this with the user — it is shown only once.")
    except RuntimeError as e:
        err(f"Create failed: {e}")

def cmd_resetpwd(env=None, username=None):
    if not username:
        err("Usage: python scripts/vat.py resetpwd [env] <username>")
    base, label = resolve_base(env)
    hdr(f"Reset password — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    # Look up the user id
    data = api_get(base, "/api/users", token)
    users = data.get("users", [])
    user = next((u for u in users if u["username"] == username), None)
    if not user:
        err(f"User '{username}' not found")

    new_pass = input(f"  New password for '{username}' (blank = auto-generate): ").strip() or None
    payload  = {}
    if new_pass:
        payload["password"] = new_pass

    print(f"  Resetting password for '{username}' ... ", end="", flush=True)
    try:
        r = http("PATCH", f"{base}/api/users/{user['id']}/password",
                 token=token, body=payload)
        ok("Done")
        temp = r.get("tempPassword")
        if temp:
            print(f"\n  {YELLOW}Temp password: {temp}{RESET}")
            print(f"  Share this with the user — it is shown only once.")
    except RuntimeError as e:
        err(f"Reset failed: {e}")

# ── Quarry / Org Management ───────────────────────────────────────────────────

def cmd_quarries(env=None):
    base, label = resolve_base(env)
    hdr(f"Quarries — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    data = api_get(base, "/api/quarries", token)
    quarries = data.get("quarries", data) if isinstance(data, dict) else data
    if not quarries:
        print("  No quarries found. Run the setup wizard (login to the web UI).")
        return

    print(f"\n  {'Code':<10} {'Quarry Name':<35} {'District':<18} {'Status':<12} {'Default'}")
    print(f"  {'-'*10} {'-'*35} {'-'*18} {'-'*12} {'-'*7}")
    for q in quarries:
        default = f"{GREEN}✓ Yes{RESET}" if q.get("is_default") else "—"
        print(f"  {q.get('quarry_code',''):<10} {q.get('quarry_name',''):<35} {q.get('district',''):<18} {q.get('operational_status',''):<12} {default}")
    print(f"\n  Total: {len(quarries)} quarry/quarries")

def cmd_org(env=None):
    base, label = resolve_base(env)
    hdr(f"Organisation info — {label} ({base})")
    print("  Logging in ... ", end="", flush=True)
    token = api_login(base); ok("")

    org = api_get(base, "/api/admin/org", token)
    print()
    fields = [
        ("ID",          "id"),
        ("Org Code",    "org_code"),
        ("Org Name",    "org_name"),
        ("PAN",         "pan"),
        ("GSTIN",       "gstin"),
        ("Email",       "contact_email"),
        ("Phone",       "contact_phone"),
        ("Address",     "registered_address"),
    ]
    for label_f, key in fields:
        val = org.get(key) or "—"
        print(f"  {label_f:<18} {val}")
    print()

# ── Go-live ───────────────────────────────────────────────────────────────────

def cmd_golive():
    print(f"""
  {CYAN}╔══════════════════════════════════════════╗
  ║   VATSIN GRANITE ERP — GO-LIVE SEQUENCE     ║
  ║   test → build → purge prod → deploy    ║
  ╚══════════════════════════════════════════╝{RESET}
""")
    warn("Step 3 will purge ALL data in PRODUCTION (user accounts kept).")
    confirm("Type 'go-live' to confirm", expected="go-live")

    hdr("Step 1/4 — Run regression tests")
    cmd_test()

    hdr("Step 2/4 — Build web bundle")
    cmd_build()

    hdr("Step 3/4 — Purge production data")
    print("  Logging in to production ... ", end="", flush=True)
    try:
        token = api_login(PROD_URL); ok("")
    except SystemExit:
        err("Cannot login to production. Is it reachable?")
    print("  Purging ... ", end="", flush=True)
    api_post(PROD_URL, "/api/admin/purge", token)
    ok("Production data cleared (user accounts retained)")

    hdr("Step 4/4 — Deploy to Azure")
    run("git push origin main")
    ok("Pushed. Azure CI/CD will deploy in ~2 minutes.")

    print()
    ok("Go-live complete!")
    print(f"\n  Monitor CI: gh run list --limit 3")
    print(f"  Health:     {PROD_URL}/health")
    print(f"  App:        {PROD_URL}")
    print()
    warn("Reminder: set a strong ADMIN_PASS in Azure App Settings if still default.")

# ── Dispatch ──────────────────────────────────────────────────────────────────
#   (cmd_fn, max_positional_args_after_command)
COMMANDS = {
    "help":           (cmd_help,          0),
    "dev":            (cmd_dev,           0),
    "test":           (cmd_test,          0),
    "build":          (cmd_build,         0),
    "deploy":         (cmd_deploy,        0),
    "status":         (cmd_status,        0),
    "logs":           (cmd_logs,          0),
    "purge":          (cmd_purge,         1),
    "reseed":         (cmd_reseed,        1),
    "factory-reset":  (cmd_factory_reset, 1),
    "factoryreset":   (cmd_factory_reset, 1),
    "stats":          (cmd_stats,         1),
    "backup":         (cmd_backup,        1),
    "backups":        (cmd_backups,       1),
    "restore":        (cmd_restore,       2),
    "users":          (cmd_users,         1),
    "adduser":        (cmd_adduser,       1),
    "resetpwd":       (cmd_resetpwd,      2),
    "quarries":       (cmd_quarries,      1),
    "org":            (cmd_org,           1),
    "go-live":        (cmd_golive,        0),
    "golive":         (cmd_golive,        0),
}

def main():
    args = sys.argv[1:]
    cmd  = args[0].lower() if args else "help"
    rest = args[1:]

    if cmd not in COMMANDS:
        err(f"Unknown command: '{cmd}'. Run: python scripts/vat.py help")

    fn, n_args = COMMANDS[cmd]
    fn(*rest[:n_args]) if n_args else fn()

if __name__ == "__main__":
    main()
