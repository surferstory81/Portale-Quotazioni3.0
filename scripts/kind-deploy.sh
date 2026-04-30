#!/usr/bin/env bash
# kind-deploy.sh — local CI/CD for Portale Quotazioni on kind
# Usage: ./scripts/kind-deploy.sh [--skip-build] [--push]
# Flags:
#   --skip-build  skip Docker image builds (use already-built images)
#   --push        also push images to GHCR after building

set -euo pipefail

# ── logging ───────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/kind-deploy-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "${LOG_FILE}") 2>&1
echo "=== kind-deploy started at $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "=== Log file: ${LOG_FILE} ==="

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
die()     { error "$*"; exit 1; }

# ── config ───────────────────────────────────────────────────────────────────
CLUSTER_NAME="portale-quotazioni"
NAMESPACE="portale-quotazioni"
BACKEND_IMAGE="ghcr.io/surferstory81/portale-quotazioni-backend:latest"
FRONTEND_IMAGE="ghcr.io/surferstory81/portale-quotazioni-frontend:latest"
INGRESS_HOST="portale-quotazioni.local"
INGRESS_MANIFEST="https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml"
K8S_DIR="$(cd "$(dirname "$0")/../k8s" && pwd)"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

SKIP_BUILD=false
PUSH=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --push)       PUSH=true ;;
  esac
done

# ── prerequisite checks ───────────────────────────────────────────────────────
info "Checking prerequisites..."
for tool in docker kind kubectl; do
  command -v "$tool" &>/dev/null || die "'$tool' not found in PATH. Install it and retry."
done
success "Prerequisites: docker, kind, kubectl — all present"

# ── cluster ──────────────────────────────────────────────────────────────────
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  info "kind cluster '${CLUSTER_NAME}' already exists — reusing"
else
  info "Creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --config "${K8S_DIR}/kind-config.yaml"
  success "Cluster created"
fi

kubectl cluster-info --context "kind-${CLUSTER_NAME}" >/dev/null
success "Cluster is reachable"

# ── ingress-nginx ────────────────────────────────────────────────────────────
if kubectl get ns ingress-nginx &>/dev/null; then
  info "ingress-nginx already installed — skipping"
else
  info "Installing ingress-nginx controller..."
  kubectl apply -f "${INGRESS_MANIFEST}"
  info "Waiting for ingress-nginx to be ready (up to 90s)..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=90s
  success "ingress-nginx ready"
fi

# ── docker build ─────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  info "Building backend image..."
  docker build -t "${BACKEND_IMAGE}" "${ROOT_DIR}/backend"
  success "Backend image built"

  info "Building frontend image..."
  docker build -t "${FRONTEND_IMAGE}" "${ROOT_DIR}/frontend"
  success "Frontend image built"
else
  warn "--skip-build: using existing local images"
fi

# ── push to GHCR (optional) ──────────────────────────────────────────────────
if [ "$PUSH" = true ]; then
  info "Pushing images to GHCR..."
  docker push "${BACKEND_IMAGE}"
  docker push "${FRONTEND_IMAGE}"
  success "Images pushed to GHCR"
fi

# ── load images into kind ────────────────────────────────────────────────────
info "Loading images into kind cluster (avoids registry pull)..."
kind load docker-image "${BACKEND_IMAGE}" --name "${CLUSTER_NAME}"
kind load docker-image "${FRONTEND_IMAGE}" --name "${CLUSTER_NAME}"
success "Images loaded into kind"

# ── apply manifests ──────────────────────────────────────────────────────────
info "Applying Kubernetes manifests..."
kubectl apply -f "${K8S_DIR}/all-in-one.yaml"
success "Manifests applied"

# ── force rollout of new images ──────────────────────────────────────────────
info "Forcing rollout of backend and frontend..."
kubectl rollout restart deployment/backend  -n "${NAMESPACE}"
kubectl rollout restart deployment/frontend -n "${NAMESPACE}"

# ── wait for rollouts ────────────────────────────────────────────────────────
info "Waiting for postgres rollout (up to 120s)..."
kubectl rollout status deployment/postgres -n "${NAMESPACE}" --timeout=120s
success "postgres ready"

info "Waiting for backend rollout (up to 180s)..."
kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=180s
success "backend ready"

info "Waiting for frontend rollout (up to 60s)..."
kubectl rollout status deployment/frontend -n "${NAMESPACE}" --timeout=60s
success "frontend ready"

# ── health checks ─────────────────────────────────────────────────────────────
info "Running connectivity checks..."

# 1. Frontend reachability via ingress (requires /etc/hosts entry)
check_frontend() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    -H "Host: ${INGRESS_HOST}" \
    http://localhost/ 2>/dev/null || echo "000")
  echo "$code"
}

# 2. Backend /health via port-forward
check_backend_health() {
  kubectl port-forward svc/backend 13000:3000 -n "${NAMESPACE}" &>/dev/null &
  local PF_PID=$!
  sleep 2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:13000/health 2>/dev/null || echo "000")
  kill "$PF_PID" 2>/dev/null || true
  echo "$code"
}

# 3. Backend /health/ready (DB connectivity) via port-forward
check_backend_ready() {
  kubectl port-forward svc/backend 13001:3000 -n "${NAMESPACE}" &>/dev/null &
  local PF_PID=$!
  sleep 2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:13001/health/ready 2>/dev/null || echo "000")
  kill "$PF_PID" 2>/dev/null || true
  echo "$code"
}

# 4. Frontend nginx-health via port-forward
check_frontend_pod() {
  kubectl port-forward svc/frontend 18080:80 -n "${NAMESPACE}" &>/dev/null &
  local PF_PID=$!
  sleep 2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:18080/nginx-health 2>/dev/null || echo "000")
  kill "$PF_PID" 2>/dev/null || true
  echo "$code"
}

# Run checks
echo ""
echo "────────────────────────────────────────────────────────────"
echo "  Health Check Results"
echo "────────────────────────────────────────────────────────────"

# Backend liveness
BACKEND_LIVE=$(check_backend_health)
if [ "$BACKEND_LIVE" = "200" ]; then
  success "Backend  GET /health                → HTTP $BACKEND_LIVE"
else
  error   "Backend  GET /health                → HTTP $BACKEND_LIVE (expected 200)"
fi

# Backend readiness (DB)
BACKEND_READY=$(check_backend_ready)
if [ "$BACKEND_READY" = "200" ]; then
  success "Backend  GET /health/ready (DB)     → HTTP $BACKEND_READY"
else
  error   "Backend  GET /health/ready (DB)     → HTTP $BACKEND_READY (expected 200)"
fi

# Frontend pod health
FRONTEND_POD=$(check_frontend_pod)
if [ "$FRONTEND_POD" = "200" ]; then
  success "Frontend GET /nginx-health           → HTTP $FRONTEND_POD"
else
  error   "Frontend GET /nginx-health           → HTTP $FRONTEND_POD (expected 200)"
fi

# Ingress (needs /etc/hosts)
FRONTEND_INGRESS=$(check_frontend)
if [ "$FRONTEND_INGRESS" = "200" ]; then
  success "Ingress  GET http://${INGRESS_HOST}/ → HTTP $FRONTEND_INGRESS"
else
  warn    "Ingress  GET http://${INGRESS_HOST}/ → HTTP $FRONTEND_INGRESS"
  warn    "  If not 200, add this line to /etc/hosts:"
  warn    "  127.0.0.1  ${INGRESS_HOST}"
fi

echo "────────────────────────────────────────────────────────────"
echo ""

# ── pod status summary ────────────────────────────────────────────────────────
info "Pod status in namespace '${NAMESPACE}':"
kubectl get pods -n "${NAMESPACE}" -o wide

echo ""
success "Deployment complete!"
echo ""
echo -e "  ${CYAN}Application URL:${NC}  http://${INGRESS_HOST}/"
echo -e "  ${CYAN}Ensure /etc/hosts contains:${NC}  127.0.0.1  ${INGRESS_HOST}"
echo -e "  ${CYAN}Log file:${NC}  ${LOG_FILE}"
echo ""
echo "=== kind-deploy finished at $(date '+%Y-%m-%d %H:%M:%S') ==="
