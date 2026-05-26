#!/usr/bin/env bash
# ============================================================================
# VATSIN GRANITE ERP — Management Script
# Usage: ./scripts/vat.sh <command> [env] [args]
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROD_URL="${PROD_URL:-https://vatsingranite-prod.azurewebsites.net}"
LOCAL_URL="${LOCAL_URL:-http://localhost:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
err()  { echo -e "${RED}✗${NC} $*"; exit 1; }
hdr()  { echo -e "\n${CYAN}━━ $* ━━${NC}"; }

_confirm() {
  local prompt="${1}" expected="${2:-yes}"
  read -rp "  ${prompt}: " answer
  [[ "$answer" == "$expected" ]] || { echo "Aborted."; exit 0; }
}

_resolve_base() {
  case "${1:-local}" in
    prod|production) echo "$PROD_URL" ;;
    local|dev)       echo "$LOCAL_URL" ;;
    *) err "Unknown env '${1}'. Use: local | prod" ;;
  esac
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────
_api_login() {
  local base="$1"
  local token
  token=$(curl -sf -X POST "${base}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null) \
    || err "Login failed — check ADMIN_USER / ADMIN_PASS"
  echo "$token"
}

_api_post() {
  local base="$1" path="$2" token="$3"
  curl -sf -X POST "${base}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json"
}

_api_get() {
  local base="$1" path="$2" token="$3"
  curl -sf "${base}${path}" -H "Authorization: Bearer ${token}"
}

_jq_msg() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','done'))" 2>/dev/null || true; }

# ── Help ──────────────────────────────────────────────────────────────────────
cmd_help() {
  cat <<HELP

${CYAN}AB GRANITE ERP — vat.sh${NC}

${YELLOW}LOCAL DEV${NC}
  dev                     Start dev server (API + Web hot-reload)
  test                    Run 40-test regression smoke suite
  build                   Build web bundle for production

${YELLOW}DEPLOYMENT${NC}
  deploy                  Build + git push → triggers Azure CI/CD
  status                  Health check: local + production + CI/CD
  logs                    Tail Azure App Service live logs

${YELLOW}DATA MANAGEMENT${NC}  (env = local | prod, default: local)
  purge         [env]     Wipe ALL data — quarries, customers, employees,
                            transactions. User accounts kept.
  reseed        [env]     Wipe all data then reload demo sample data
  factory-reset [env]     Wipe EVERYTHING incl. users → admin only
  stats         [env]     Show row counts for all tables

${YELLOW}BACKUP & RESTORE${NC}
  backup        [env]     Create local copy + blob upload + download to ./backups/
  backups       [env]     List backup files (server + local)
  restore       [env] <file>   Upload a .db file to replace the live database

${YELLOW}USER MANAGEMENT${NC}
  users         [env]     List all user accounts
  adduser       [env]     Create a new user (interactive)
  resetpwd      [env] <username>   Reset a user's password

${YELLOW}QUARRY MANAGEMENT${NC}
  quarries      [env]     List all quarries (shows which is the default)
  org           [env]     Show organisation/company details

${YELLOW}GO-LIVE${NC}
  go-live                 Full sequence: test → build → purge prod → deploy

${CYAN}ENVIRONMENT VARS${NC}
  PROD_URL    = ${PROD_URL}
  LOCAL_URL   = ${LOCAL_URL}
  ADMIN_USER  = ${ADMIN_USER}
  ADMIN_PASS  = (set via env var)

${CYAN}EXAMPLES${NC}
  ./scripts/vat.sh dev
  ./scripts/vat.sh stats prod
  ./scripts/vat.sh purge prod
  ./scripts/vat.sh backup prod
  ./scripts/vat.sh restore prod backups/vatsingranite-2025-05-01.db
  ./scripts/vat.sh users prod
  ./scripts/vat.sh go-live

HELP
}

# ── Dev / Build / Deploy ──────────────────────────────────────────────────────
cmd_dev() {
  hdr "Starting dev server"
  cd "$ROOT"
  exec npm run dev
}

cmd_test() {
  hdr "Running regression smoke suite"
  cd "$ROOT"
  npm test -w @vatsingranite/api
  ok "All tests passed"
}

cmd_build() {
  hdr "Building web bundle"
  cd "$ROOT"
  npm run build:web
  ok "Build complete → packages/web/dist/"
}

cmd_deploy() {
  hdr "Deploying to Azure"
  cmd_build
  cd "$ROOT"
  if git diff --cached --quiet; then
    warn "Nothing new staged — pushing existing HEAD"
  else
    git commit -m "chore: production build $(date '+%Y-%m-%d %H:%M')"
  fi
  git push origin main
  ok "Pushed → GitHub Actions will build and deploy to Azure"
  echo -e "\n  Monitor: gh run list --limit 3\n  Health:  ${PROD_URL}/health"
}

cmd_status() {
  hdr "Health check"
  echo -n "  Local  (${LOCAL_URL}) ... "
  if curl -sf --max-time 3 "${LOCAL_URL}/health" \
       | python3 -c "import sys,json; assert json.load(sys.stdin)['status']=='ok'" 2>/dev/null
  then ok "online"; else warn "offline"; fi

  echo -n "  Prod   (${PROD_URL}) ... "
  if curl -sf --max-time 10 "${PROD_URL}/health" \
       | python3 -c "import sys,json; assert json.load(sys.stdin)['status']=='ok'" 2>/dev/null
  then ok "online"; else warn "offline"; fi

  echo ""
  echo "  CI/CD: $(gh run list --limit 1 --json status,conclusion,createdAt 2>/dev/null \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(r[0]['status'],'/',r[0]['conclusion'],'@',r[0]['createdAt'][:16])" 2>/dev/null \
    || echo 'gh cli not available')"
}

cmd_logs() {
  hdr "Azure App Service logs"
  az webapp log tail --name vatsingranite-prod --resource-group modernex-rg 2>/dev/null \
    || err "az CLI not logged in. Run: az login"
}

# ── Data Management ───────────────────────────────────────────────────────────
cmd_purge() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Purge ALL data — ${env} (${base})"
  warn "Deletes ALL data: quarries, customers, employees, transactions."
  warn "User accounts (logins) are preserved."
  _confirm "Type 'yes' to confirm"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""
  echo -n "  Purging ... "
  _api_post "$base" "/api/admin/purge" "$token" | _jq_msg
  ok "Purge complete — system is blank (user accounts retained)"
}

cmd_reseed() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Reseed demo data — ${env} (${base})"
  warn "Wipes all data then loads quarries, customers, employees, sample transactions."
  warn "Use for testing only — NOT for production."
  _confirm "Type 'yes' to confirm"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""
  echo -n "  Reseeding ... "
  _api_post "$base" "/api/admin/reseed" "$token" | _jq_msg
  ok "Reseed complete"
}

cmd_factory_reset() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Factory Reset — ${env} (${base})"
  echo ""
  echo "  Wipes EVERYTHING — quarries, customers, employees, accounts,"
  echo "  user accounts (all except admin), and all transactions."
  echo ""
  echo "  After reset: only the admin user remains. System is completely blank."
  echo ""
  warn "ALL data entered via the UI will be permanently deleted."
  _confirm "Type 'factory-reset' to confirm" "factory-reset"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""
  echo -n "  Resetting ... "
  _api_post "$base" "/api/admin/factory-reset" "$token" | _jq_msg
  ok "Factory reset complete — admin user only, everything else gone"
}

cmd_stats() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Table row counts — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  _api_get "$base" "/api/admin/stats" "$token" | python3 -c "
import sys, json
d = json.load(sys.stdin)
master = d.get('master', {})
txn    = d.get('transactions', {})
Y = '\033[1;33m'; NC = '\033[0m'

print('\n  ORG & USER ACCOUNTS (always kept)')
for k in ['organizations','roles','users','user_roles']:
    print(f'    {k:<30} {master.get(k,\"n/a\")}')

print('\n  MASTER DATA (cleared by purge)')
for k in ['quarries','varieties','locations','customers','employees',
          'accounts','suppliers','leases','cost_centers']:
    v = master.get(k,'n/a')
    flag = f' {Y}<- has data{NC}' if isinstance(v, int) and v > 0 else ''
    print(f'    {k:<30} {v}{flag}')

print('\n  TRANSACTIONS (cleared by purge)')
for k in sorted(txn):
    v = txn[k]
    flag = f' {Y}<- has data{NC}' if isinstance(v, int) and v > 0 else ''
    print(f'    {k:<30} {v}{flag}')
print()
"
}

# ── Backup & Restore ──────────────────────────────────────────────────────────
cmd_backup() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Backup — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  # Server-side local copy
  echo -n "  Creating server-side backup ... "
  _api_post "$base" "/api/admin/backup/local" "$token" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file','?'), '('+str(d.get('sizeBytes',0)//1024)+'KB)')" 2>/dev/null \
    && ok "" || warn "Server backup failed"

  # Azure Blob Storage
  echo -n "  Uploading to Azure Blob ... "
  local blob_result
  blob_result=$(_api_post "$base" "/api/admin/backup/blob" "$token" 2>&1) && {
    echo "$blob_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('container','?')+'/'+d.get('blob','?'))" 2>/dev/null
    ok ""
  } || warn "Blob skipped (AZURE_STORAGE_CONNECTION_STRING not configured)"

  # Download to ./backups/ locally
  local ts; ts=$(date '+%Y-%m-%d_%H-%M-%S')
  local local_dir="${ROOT}/backups"
  mkdir -p "$local_dir"
  local local_file="${local_dir}/vatsingranite-${env}-${ts}.db"
  echo -n "  Downloading to ./backups/$(basename "$local_file") ... "
  curl -sf "${base}/api/admin/backup/download" \
    -H "Authorization: Bearer ${token}" \
    -o "$local_file" \
    && ok "$(du -k "$local_file" | cut -f1) KB" \
    || warn "Download failed"

  echo ""
  ok "Backup complete"

  echo ""
  echo "  Local backup files:"
  ls -lht "${ROOT}/backups/"*.db 2>/dev/null \
    | awk '{printf "    %-55s %s %s\n", $NF, $5, $6" "$7}' \
    | head -10 || echo "    (none)"
}

cmd_backups() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Backup list — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  echo -e "\n  Server-side backups (${env}):"
  _api_get "$base" "/api/admin/backup/list" "$token" | python3 -c "
import sys, json
d = json.load(sys.stdin)
files = d.get('backups', [])
if not files:
    print('    (none)')
for b in files:
    kb = b['sizeBytes'] // 1024
    ts = b['createdAt'][:19].replace('T',' ')
    print(f\"    {b['name']:<50} {kb:>6} KB  {ts}\")
" 2>/dev/null

  echo -e "\n  Local backup files (./backups/):"
  ls -lht "${ROOT}/backups/"*.db 2>/dev/null \
    | awk '{printf "    %-55s %s\n", $NF, $5}' \
    | head -10 || echo "    (none)"
}

cmd_restore() {
  local env="${1:-local}" filepath="${2:-}"
  [[ -n "$filepath" ]] || err "Usage: ./scripts/vat.sh restore [env] <path/to/backup.db>"
  local base; base=$(_resolve_base "$env")
  hdr "Restore — ${env} (${base})"

  [[ -f "$filepath" ]] || err "File not found: $filepath"
  [[ "$filepath" == *.db ]] || err "File must have a .db extension"

  local size_kb; size_kb=$(du -k "$filepath" | cut -f1)
  warn "This will REPLACE the live ${env} database with: $(basename "$filepath") (${size_kb} KB)"
  warn "A pre-restore safeguard copy will be kept on the server."
  _confirm "Type 'yes' to confirm"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  echo -n "  Uploading $(basename "$filepath") (${size_kb} KB) ... "
  curl -sf -X POST "${base}/api/admin/backup/restore" \
    -H "Authorization: Bearer ${token}" \
    -F "file=@${filepath}" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('message','done'))
print(f\"  Safeguard: {d.get('safeguard','n/a')}\")
" 2>/dev/null
  ok "Restore complete"
}

# ── User Management ───────────────────────────────────────────────────────────
cmd_users() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "User accounts — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  _api_get "$base" "/api/users" "$token" | python3 -c "
import sys, json
G = '\033[0;32m'; R = '\033[0;31m'; NC = '\033[0m'
users = json.load(sys.stdin).get('users', [])
if not users:
    print('  No users found.'); sys.exit(0)
print(f\"\n  {'Username':<18} {'Full Name':<22} {'Role':<12} {'Email':<28} {'Active':<7} Last Login\")
print(f\"  {'-'*18} {'-'*22} {'-'*12} {'-'*28} {'-'*7} {'-'*16}\")
for u in users:
    active = f'{G}yes{NC}' if u.get('active') else f'{R}no {NC}'
    ll = (u.get('last_login') or '—')[:16]
    print(f\"  {u['username']:<18} {u.get('full_name',''):<22} {u.get('role',''):<12} {u.get('email',''):<28} {active}   {ll}\")
print(f\"\n  Total: {len(users)} user(s)\")
" 2>/dev/null
}

cmd_adduser() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Add user — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""
  echo ""

  read -rp "  Username      : " username
  read -rp "  Full name     : " full_name
  read -rp "  Email         : " email
  read -rp "  Phone         : " phone
  echo "  Roles: ADMIN | MANAGER | SUPERVISOR | ACCOUNTANT | SALES | VIEWER"
  read -rp "  Role          : " role
  read -rsp "  Password (blank = auto-generate): " password; echo ""

  [[ -n "$username" && -n "$full_name" ]] || err "Username and full name are required"
  role="${role:-VIEWER}"

  local payload
  if [[ -n "$password" ]]; then
    payload=$(python3 -c "import json; print(json.dumps({'username':'$username','full_name':'$full_name','email':'$email','phone':'$phone','role':'$role','password':'$password'}))")
  else
    payload=$(python3 -c "import json; print(json.dumps({'username':'$username','full_name':'$full_name','email':'$email','phone':'$phone','role':'$role'}))")
  fi

  echo -n "  Creating user '$username' ... "
  curl -sf -X POST "${base}/api/users" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload" | python3 -c "
import sys, json
Y = '\033[1;33m'; NC = '\033[0m'
d = json.load(sys.stdin)
u = d.get('user', {})
temp = d.get('tempPassword')
print(f\"Created — id={u.get('id')}\")
if temp:
    print(f'\n  {Y}Temp password: {temp}{NC}')
    print('  Share this with the user — shown only once.')
" 2>/dev/null
  ok ""
}

cmd_resetpwd() {
  local env="${1:-local}" username="${2:-}" base
  [[ -n "$username" ]] || err "Usage: ./scripts/vat.sh resetpwd [env] <username>"
  base=$(_resolve_base "$env")
  hdr "Reset password — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  # Get user id
  local user_id
  user_id=$(_api_get "$base" "/api/users" "$token" \
    | python3 -c "import sys,json; users=json.load(sys.stdin).get('users',[]); u=next((x for x in users if x['username']=='$username'),None); print(u['id'] if u else '')" 2>/dev/null)
  [[ -n "$user_id" ]] || err "User '$username' not found"

  read -rsp "  New password (blank = auto-generate): " password; echo ""
  local payload
  if [[ -n "$password" ]]; then
    payload=$(python3 -c "import json; print(json.dumps({'password':'$password'}))")
  else
    payload="{}"
  fi

  echo -n "  Resetting password for '$username' ... "
  curl -sf -X PATCH "${base}/api/users/${user_id}/password" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload" | python3 -c "
import sys, json
Y = '\033[1;33m'; NC = '\033[0m'
d = json.load(sys.stdin)
temp = d.get('tempPassword')
print('Done')
if temp:
    print(f'\n  {Y}Temp password: {temp}{NC}')
    print('  Share this with the user — shown only once.')
" 2>/dev/null
  ok ""
}

# ── Quarry / Org Management ──────────────────────────────────────────────────
cmd_quarries() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Quarries — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  _api_get "$base" "/api/quarries" "$token" | python3 -c "
import sys, json
G = '\033[0;32m'; NC = '\033[0m'
data = json.load(sys.stdin)
quarries = data.get('quarries', data) if isinstance(data, dict) else data
if not quarries:
    print('  No quarries found. Run the setup wizard (login to the web UI).')
    sys.exit(0)
print(f\"\n  {'Code':<10} {'Quarry Name':<35} {'District':<18} {'Status':<12} {'Default'}\")
print(f\"  {'-'*10} {'-'*35} {'-'*18} {'-'*12} {'-'*7}\")
for q in quarries:
    dflt = f'{G}✓ Yes{NC}' if q.get('is_default') else '—'
    print(f\"  {q.get('quarry_code',''):<10} {q.get('quarry_name',''):<35} {q.get('district',''):<18} {q.get('operational_status',''):<12} {dflt}\")
print(f'\n  Total: {len(quarries)} quarry/quarries')
" 2>/dev/null
}

cmd_org() {
  local env="${1:-local}" base
  base=$(_resolve_base "$env")
  hdr "Organisation info — ${env} (${base})"

  echo -n "  Logging in ... "
  local token; token=$(_api_login "$base"); ok ""

  _api_get "$base" "/api/admin/org" "$token" | python3 -c "
import sys, json
org = json.load(sys.stdin)
print()
fields = [('Org Code','org_code'),('Org Name','org_name'),('PAN','pan'),
          ('GSTIN','gstin'),('Email','contact_email'),('Phone','contact_phone'),
          ('Address','registered_address')]
for lbl, key in fields:
    print(f'  {lbl:<18} {org.get(key) or \"—\"}')
print()
" 2>/dev/null
}

# ── Go-live ───────────────────────────────────────────────────────────────────
cmd_golive() {
  cat <<'BANNER'

  ╔══════════════════════════════════════════╗
  ║   VATSIN GRANITE ERP — GO-LIVE SEQUENCE     ║
  ║   test → build → purge prod → deploy    ║
  ╚══════════════════════════════════════════╝

BANNER
  warn "Step 3 will purge ALL data in PRODUCTION (user accounts kept)."
  _confirm "Type 'go-live' to confirm" "go-live"

  hdr "Step 1/4 — Run regression tests"
  cmd_test

  hdr "Step 2/4 — Build web bundle"
  cmd_build

  hdr "Step 3/4 — Purge production data"
  echo -n "  Logging in to production ... "
  local token; token=$(_api_login "$PROD_URL"); ok ""
  echo -n "  Purging ... "
  _api_post "$PROD_URL" "/api/admin/purge" "$token" | _jq_msg
  ok "Production data cleared (user accounts retained)"

  hdr "Step 4/4 — Deploy to Azure"
  git push origin main
  ok "Pushed. Azure CI/CD will deploy in ~2 minutes."

  echo ""
  ok "Go-live complete!"
  echo ""
  echo "  Monitor CI: gh run list --limit 3"
  echo "  Health:     ${PROD_URL}/health"
  echo "  App:        ${PROD_URL}"
  echo ""
  warn "Reminder: set a strong ADMIN_PASS in Azure App Settings if still default."
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
cd "$ROOT"
cmd="${1:-help}"; shift || true

case "$cmd" in
  dev)                    cmd_dev "$@" ;;
  test)                   cmd_test "$@" ;;
  build)                  cmd_build "$@" ;;
  deploy)                 cmd_deploy "$@" ;;
  status)                 cmd_status "$@" ;;
  logs)                   cmd_logs "$@" ;;
  purge)                  cmd_purge "$@" ;;
  reseed)                 cmd_reseed "$@" ;;
  factory-reset|factoryreset) cmd_factory_reset "$@" ;;
  stats)                  cmd_stats "$@" ;;
  backup)                 cmd_backup "$@" ;;
  backups)                cmd_backups "$@" ;;
  restore)                cmd_restore "$@" ;;
  users)                  cmd_users "$@" ;;
  adduser)                cmd_adduser "$@" ;;
  resetpwd)               cmd_resetpwd "$@" ;;
  quarries)               cmd_quarries "$@" ;;
  org)                    cmd_org "$@" ;;
  go-live|golive)         cmd_golive ;;
  help|-h|--help)         cmd_help ;;
  *) err "Unknown command: '$cmd'. Run: ./scripts/vat.sh help" ;;
esac
