#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

log_info "Starting clean build of all components (no cache)"
echo "=================================================="

log_info "Step 1: Cleaning build artifacts..."

log_info "  - Cleaning backend build..."
if [ -d "backend/dist" ]; then
    rm -rf backend/dist
    log_success "    Removed backend/dist"
fi

log_info "  - Cleaning ai-estimation-service build..."
if [ -d "ai-estimation-service/dist" ]; then
    rm -rf ai-estimation-service/dist
    log_success "    Removed ai-estimation-service/dist"
fi

log_info "  - Cleaning frontend build..."
if [ -d "frontend/dist" ]; then
    rm -rf frontend/dist
    log_success "    Removed frontend/dist"
fi

if [ -d "frontend/.angular" ]; then
    rm -rf frontend/.angular
    log_success "    Removed frontend/.angular cache"
fi

log_info "  - Cleaning TypeScript cache files..."
find backend -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
find ai-estimation-service -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
find frontend -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
log_success "    Removed .tsbuildinfo files"

log_info "  - Cleaning npm cache (local)..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf backend/node_modules/.cache 2>/dev/null || true
rm -rf ai-estimation-service/node_modules/.cache 2>/dev/null || true
rm -rf frontend/node_modules/.cache 2>/dev/null || true
log_success "    Removed node_modules/.cache directories"

log_success "All build artifacts cleaned"
echo ""

log_info "Step 2: Building backend service..."
echo "--------------------------------------------------"
cd "$PROJECT_ROOT/backend"
npm run build
if [ $? -eq 0 ]; then
    log_success "Backend build completed successfully"
else
    log_error "Backend build failed"
    exit 1
fi
echo ""

log_info "Step 3: Building AI estimation service..."
echo "--------------------------------------------------"
cd "$PROJECT_ROOT/ai-estimation-service"
npm run build
if [ $? -eq 0 ]; then
    log_success "AI estimation service build completed successfully"
else
    log_error "AI estimation service build failed"
    exit 1
fi
echo ""

log_info "Step 4: Building frontend application..."
echo "--------------------------------------------------"
cd "$PROJECT_ROOT/frontend"
rm -rf .angular/cache 2>/dev/null || true
npm run build -- --configuration production
if [ $? -eq 0 ]; then
    log_success "Frontend build completed successfully"
else
    log_error "Frontend build failed"
    exit 1
fi
echo ""

cd "$PROJECT_ROOT"

log_info "Build summary:"
echo "=================================================="
if [ -d "backend/dist" ]; then
    BACKEND_SIZE=$(du -sh backend/dist | cut -f1)
    log_success "  Backend:              OK (size: $BACKEND_SIZE)"
else
    log_error "  Backend:              FAILED"
fi

if [ -d "ai-estimation-service/dist" ]; then
    AI_SERVICE_SIZE=$(du -sh ai-estimation-service/dist | cut -f1)
    log_success "  AI Estimation Service: OK (size: $AI_SERVICE_SIZE)"
else
    log_error "  AI Estimation Service: FAILED"
fi

if [ -d "frontend/dist" ]; then
    FRONTEND_SIZE=$(du -sh frontend/dist | cut -f1)
    log_success "  Frontend:             OK (size: $FRONTEND_SIZE)"
else
    log_error "  Frontend:             FAILED"
fi

echo "=================================================="
log_success "All builds completed successfully!"
log_info "Build artifacts are ready for deployment"