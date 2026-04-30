#!/usr/bin/env bash
# build-push.sh — build Docker images and push to GHCR
# Usage: ./scripts/build-push.sh [TAG]
#   TAG  optional image tag (default: git short SHA)
#
# Requirements:
#   docker login ghcr.io -u <github_username> -p <GITHUB_TOKEN>

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="ghcr.io/surferstory81"

# Auto-derive tag from git SHA; allow manual override
SHA_TAG="$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "")"
[ -n "${SHA_TAG}" ] || die "Cannot determine git SHA — is this a git repository?"
TAG="${1:-${SHA_TAG}}"

BACKEND_IMAGE="${REGISTRY}/portale-quotazioni-backend:${TAG}"
FRONTEND_IMAGE="${REGISTRY}/portale-quotazioni-frontend:${TAG}"
BACKEND_LATEST="${REGISTRY}/portale-quotazioni-backend:latest"
FRONTEND_LATEST="${REGISTRY}/portale-quotazioni-frontend:latest"

command -v docker &>/dev/null || die "docker not found"

info "Tag: ${TAG}"

info "Building backend → ${BACKEND_IMAGE}"
docker build \
  --no-cache \
  --platform linux/amd64 \
  -t "${BACKEND_IMAGE}" \
  -t "${BACKEND_LATEST}" \
  "${ROOT_DIR}/backend"
success "Backend built"

info "Building frontend → ${FRONTEND_IMAGE}"
docker build \
  --no-cache \
  --platform linux/amd64 \
  -t "${FRONTEND_IMAGE}" \
  -t "${FRONTEND_LATEST}" \
  "${ROOT_DIR}/frontend"
success "Frontend built"

info "Pushing images to GHCR..."
docker push "${BACKEND_IMAGE}"
docker push "${FRONTEND_IMAGE}"
docker push "${BACKEND_LATEST}"
docker push "${FRONTEND_LATEST}"

success "All images pushed successfully"
echo ""
echo "  Backend:  ${BACKEND_IMAGE}"
echo "  Frontend: ${FRONTEND_IMAGE}"
echo "  (also tagged as :latest)"
