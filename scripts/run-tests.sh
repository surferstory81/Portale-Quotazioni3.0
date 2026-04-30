#!/usr/bin/env bash
# run-tests.sh — esegue tutti i test e invia i risultati a Loki
# Usage: ./scripts/run-tests.sh [--backend-only] [--frontend-only] [--no-push]
#
# Flags:
#   --backend-only   solo test backend (Jest)
#   --frontend-only  solo test frontend (Karma headless)
#   --no-push        non inviare i log a Loki (solo esecuzione locale)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/run-tests-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=== run-tests avviato: $(date '+%Y-%m-%d %H:%M:%S') ==="

# ── argomenti ─────────────────────────────────────────────────────────────────
RUN_BACKEND=true
RUN_FRONTEND=true
PUSH_LOGS=true

for arg in "$@"; do
  case $arg in
    --backend-only)  RUN_FRONTEND=false ;;
    --frontend-only) RUN_BACKEND=false ;;
    --no-push)       PUSH_LOGS=false ;;
  esac
done

BACKEND_EXIT=0
FRONTEND_EXIT=0

# ── backend (Jest) ────────────────────────────────────────────────────────────
if [[ "${RUN_BACKEND}" == "true" ]]; then
  info "Esecuzione test backend (Jest)..."
  cd "${ROOT_DIR}/backend"
  npm test -- --forceExit 2>&1 || BACKEND_EXIT=$?

  if [[ ${BACKEND_EXIT} -eq 0 ]]; then
    success "Backend: tutti i test passati"
  else
    warn "Backend: ${BACKEND_EXIT} test falliti"
  fi
  cd "${ROOT_DIR}"
fi

# ── frontend (Karma headless) ─────────────────────────────────────────────────
if [[ "${RUN_FRONTEND}" == "true" ]]; then
  info "Esecuzione test frontend (Karma headless)..."
  cd "${ROOT_DIR}/frontend"
  npx ng test --watch=false --browsers=ChromeHeadless 2>&1 || FRONTEND_EXIT=$?

  if [[ ${FRONTEND_EXIT} -eq 0 ]]; then
    success "Frontend: tutti i test passati"
  else
    warn "Frontend: alcuni test falliti (exit ${FRONTEND_EXIT})"
  fi
  cd "${ROOT_DIR}"
fi

# ── push a Loki ───────────────────────────────────────────────────────────────
if [[ "${PUSH_LOGS}" == "true" ]]; then
  info "Invio log a Loki..."
  kubectl port-forward -n observability svc/loki 13100:3100 &>/dev/null &
  PF_PID=$!
  sleep 2
  node "${SCRIPT_DIR}/push-to-loki.js" || warn "Push a Loki fallito (cluster non raggiungibile?)"
  kill "${PF_PID}" 2>/dev/null || true
else
  info "--no-push: log salvati in ${LOG_DIR} ma non inviati a Loki"
fi

# ── exit code finale ──────────────────────────────────────────────────────────
echo ""
echo "=== run-tests completato: $(date '+%Y-%m-%d %H:%M:%S') ==="
echo -e "  Backend:  $([ ${BACKEND_EXIT} -eq 0 ] && echo "${GREEN}OK${NC}" || echo "${RED}FAIL${NC}")"
echo -e "  Frontend: $([ ${FRONTEND_EXIT} -eq 0 ] && echo "${GREEN}OK${NC}" || echo "${RED}FAIL${NC}")"
echo -e "  Log:      ${LOG_FILE}"
echo ""

[[ ${BACKEND_EXIT} -ne 0 || ${FRONTEND_EXIT} -ne 0 ]] && exit 1
exit 0
