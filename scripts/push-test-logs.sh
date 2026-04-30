#!/usr/bin/env bash
# push-test-logs.sh — invia i log NDJSON dei test a Loki via kubectl port-forward
# Usage: ./scripts/push-test-logs.sh [--app backend|frontend|all] [--file path/to/file.ndjson]
#
# Richiede kubectl configurato sul cluster kind con Loki in namespace observability.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOKI_NS="observability"
LOKI_SVC="loki"
LOKI_PORT="3100"
LOCAL_PORT="13100"
LOKI_URL="http://localhost:${LOCAL_PORT}/loki/api/v1/push"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── argomenti ─────────────────────────────────────────────────────────────────
APP_FILTER="all"
SINGLE_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --app)   APP_FILTER="$2"; shift 2 ;;
    --file)  SINGLE_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ── prerequisiti ──────────────────────────────────────────────────────────────
command -v kubectl &>/dev/null || die "kubectl non trovato"
command -v curl    &>/dev/null || die "curl non trovato"

# ── port-forward Loki ─────────────────────────────────────────────────────────
info "Avvio port-forward: ${LOKI_NS}/${LOKI_SVC}:${LOKI_PORT} → localhost:${LOCAL_PORT}"
kubectl port-forward -n "${LOKI_NS}" "svc/${LOKI_SVC}" "${LOCAL_PORT}:${LOKI_PORT}" &>/dev/null &
PF_PID=$!
trap "kill ${PF_PID} 2>/dev/null || true" EXIT
sleep 2

# verifica connessione
curl -sf "http://localhost:${LOCAL_PORT}/ready" &>/dev/null || die "Loki non raggiungibile su localhost:${LOCAL_PORT}"
success "Loki raggiungibile"

# ── selezione file ────────────────────────────────────────────────────────────
if [[ -n "${SINGLE_FILE}" ]]; then
  FILES=("${SINGLE_FILE}")
elif [[ "${APP_FILTER}" == "all" ]]; then
  mapfile -t FILES < <(ls "${LOG_DIR}"/test-*.ndjson 2>/dev/null || true)
else
  mapfile -t FILES < <(ls "${LOG_DIR}/test-${APP_FILTER}-"*.ndjson 2>/dev/null || true)
fi

[[ ${#FILES[@]} -eq 0 ]] && die "Nessun file test-*.ndjson trovato in ${LOG_DIR}"

# ── push righe per file ────────────────────────────────────────────────────────
push_file() {
  local file="$1"
  local basename
  basename="$(basename "${file}")"
  info "Processing: ${basename}"

  local pushed=0
  local errors=0

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" ]] && continue

    # estrai campi dalla riga JSON
    local ts status app job level message
    ts=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('timestamp',''))" 2>/dev/null || echo "")
    status=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")
    app=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('app','unknown'))" 2>/dev/null || echo "unknown")
    job=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('job','test-results'))" 2>/dev/null || echo "test-results")
    level=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('level','info'))" 2>/dev/null || echo "info")
    local_type=$(echo "${line}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('type','test'))" 2>/dev/null || echo "test")

    # converti timestamp ISO in nanoseconds unix
    local ts_ns
    ts_ns=$(python3 -c "
import sys, datetime
ts = '${ts}'.replace('Z', '+00:00')
try:
    dt = datetime.datetime.fromisoformat(ts)
    print(int(dt.timestamp() * 1e9))
except:
    import time; print(int(time.time() * 1e9))
" 2>/dev/null || date +%s%N)

    # costruisci payload Loki
    local payload
    payload=$(python3 -c "
import json, sys
line = json.loads(sys.stdin.read())
payload = {
  'streams': [{
    'stream': {
      'job':    '${job}',
      'app':    '${app}',
      'status': '${status}',
      'level':  '${level}',
      'type':   '${local_type}',
      'source': 'test-runner'
    },
    'values': [['${ts_ns}', json.dumps(line)]]
  }]
}
print(json.dumps(payload))
" <<< "${line}" 2>/dev/null || echo "")

    [[ -z "${payload}" ]] && continue

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${LOKI_URL}" \
      -H "Content-Type: application/json" \
      --data-raw "${payload}" 2>/dev/null || echo "000")

    if [[ "${http_code}" == "204" ]]; then
      ((pushed++))
    else
      ((errors++))
      warn "Push fallito per riga (HTTP ${http_code})"
    fi

  done < "${file}"

  success "${basename}: ${pushed} righe inviate, ${errors} errori"
}

TOTAL_PUSHED=0
for file in "${FILES[@]}"; do
  push_file "${file}"
done

echo ""
success "Push completato. Visualizza i risultati su Grafana:"
echo -e "  ${CYAN}Explore → Loki → Label filters:${NC} job=test-results"
echo -e "  ${CYAN}LogQL:${NC} {job=\"test-results\"} | json | status=\"failed\""
echo ""
