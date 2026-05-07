#!/usr/bin/env bash
# Services management script for Portale Quotazioni 3.0
# Manages: Backend (3000), AI Service (3001), Frontend (4200)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configuration
declare -A SERVICES=(
  ["backend"]="3000"
  ["ai-service"]="3001"
  ["frontend"]="4300"
)

declare -A SERVICE_PATHS=(
  ["backend"]="backend"
  ["ai-service"]="ai-estimation-service"
  ["frontend"]="frontend"
)

declare -A SERVICE_HEALTH_ENDPOINTS=(
  ["backend"]="http://localhost:3000/health"
  ["ai-service"]="http://localhost:3001/health"
  ["frontend"]="http://localhost:4300"
)

# Timeout configurations
STOP_TIMEOUT=10  # seconds to wait for graceful shutdown
START_TIMEOUT=30 # seconds to wait for service to be ready
CHECK_INTERVAL=2 # seconds between checks

# Functions

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Get PID of process using a port
get_pid_by_port() {
  local port=$1
  # Use netstat for Windows compatibility (works in Git Bash)
  local pid=$(netstat -ano | grep ":${port}" | grep LISTENING | awk '{print $5}' | head -1)
  echo "$pid"
}

# Check if service is running on port
is_port_in_use() {
  local port=$1
  netstat -ano | grep ":${port}" | grep LISTENING > /dev/null 2>&1
  return $?
}

# Stop service by port
stop_service() {
  local service_name=$1
  local port=${SERVICES[$service_name]}

  log_info "Stopping $service_name (port $port)..."

  if ! is_port_in_use "$port"; then
    log_warning "$service_name is not running"
    return 0
  fi

  local pid=$(get_pid_by_port "$port")

  if [ -z "$pid" ] || [ "$pid" == "0" ]; then
    log_warning "Could not find PID for $service_name on port $port"
    return 0
  fi

  log_info "Found PID: $pid, sending termination signal..."

  # Try graceful shutdown first (SIGTERM equivalent on Windows)
  taskkill //PID "$pid" //T > /dev/null 2>&1 || true

  # Wait for graceful shutdown
  local elapsed=0
  while is_port_in_use "$port" && [ $elapsed -lt $STOP_TIMEOUT ]; do
    sleep 1
    elapsed=$((elapsed + 1))
    echo -n "."
  done
  echo ""

  # Force kill if still running
  if is_port_in_use "$port"; then
    log_warning "Graceful shutdown failed, forcing termination..."
    taskkill //F //PID "$pid" //T > /dev/null 2>&1 || true
    sleep 2
  fi

  # Final check
  if is_port_in_use "$port"; then
    log_error "Failed to stop $service_name"
    return 1
  else
    log_success "$service_name stopped successfully"
    return 0
  fi
}

# Start service
start_service() {
  local service_name=$1
  local port=${SERVICES[$service_name]}
  local path=${SERVICE_PATHS[$service_name]}

  log_info "Starting $service_name (port $port)..."

  if is_port_in_use "$port"; then
    log_warning "$service_name is already running on port $port"
    return 0
  fi

  # Start service in background
  cd "$path"

  if [ "$service_name" == "frontend" ]; then
    # Angular dev server (with custom port)
    npm start -- --port 4300 > "../logs/${service_name}.log" 2>&1 &
  else
    # NestJS services
    npm run start:dev > "../logs/${service_name}.log" 2>&1 &
  fi

  local start_pid=$!
  log_info "Started with PID: $start_pid (logging to logs/${service_name}.log)"

  cd ..

  return 0
}

# Wait for service to be ready
wait_for_service() {
  local service_name=$1
  local port=${SERVICES[$service_name]}
  local health_url=${SERVICE_HEALTH_ENDPOINTS[$service_name]}

  log_info "Waiting for $service_name to be ready..."

  local elapsed=0
  while [ $elapsed -lt $START_TIMEOUT ]; do
    # Check if port is listening
    if is_port_in_use "$port"; then
      # Try health check
      if curl -s -f "$health_url" > /dev/null 2>&1; then
        log_success "$service_name is ready (${elapsed}s)"
        return 0
      fi
    fi

    sleep $CHECK_INTERVAL
    elapsed=$((elapsed + CHECK_INTERVAL))
    echo -n "."
  done
  echo ""

  log_error "$service_name failed to start within ${START_TIMEOUT}s"
  log_info "Check logs/$(echo $service_name).log for details"
  return 1
}

# Stop all services
stop_all() {
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "   STOPPING ALL SERVICES"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  local failed=0

  # Stop in reverse dependency order
  for service in "frontend" "ai-service" "backend"; do
    stop_service "$service" || failed=$((failed + 1))
    echo ""
  done

  if [ $failed -eq 0 ]; then
    log_success "All services stopped successfully"
  else
    log_error "$failed service(s) failed to stop"
    return 1
  fi
}

# Start all services
start_all() {
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "   STARTING ALL SERVICES"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Create logs directory if not exists
  mkdir -p logs

  local failed=0

  # Start in dependency order
  for service in "backend" "ai-service" "frontend"; do
    start_service "$service" || failed=$((failed + 1))
    wait_for_service "$service" || failed=$((failed + 1))
    echo ""
  done

  if [ $failed -eq 0 ]; then
    log_success "All services started successfully"
    echo ""
    log_info "Services running:"
    log_info "  • Backend:    http://localhost:3000"
    log_info "  • AI Service: http://localhost:3001"
    log_info "  • Frontend:   http://localhost:4300"
  else
    log_error "$failed service(s) failed to start"
    return 1
  fi
}

# Restart all services
restart_all() {
  stop_all && start_all
}

# Check status of all services
status_all() {
  echo ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "   SERVICE STATUS"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for service in "backend" "ai-service" "frontend"; do
    local port=${SERVICES[$service]}

    if is_port_in_use "$port"; then
      local pid=$(get_pid_by_port "$port")
      log_success "$service: RUNNING (port $port, PID $pid)"
    else
      log_error "$service: STOPPED"
    fi
  done
  echo ""
}

# Show usage
usage() {
  echo ""
  echo "Usage: $0 {start|stop|restart|status}"
  echo ""
  echo "Commands:"
  echo "  start   - Start all services (backend, ai-service, frontend)"
  echo "  stop    - Stop all services"
  echo "  restart - Restart all services (stop then start)"
  echo "  status  - Check status of all services"
  echo ""
  echo "Examples:"
  echo "  $0 start"
  echo "  $0 stop"
  echo "  $0 restart"
  echo "  $0 status"
  echo ""
}

# Main
main() {
  # Check if we're in the project root
  if [ ! -d "backend" ] || [ ! -d "ai-estimation-service" ] || [ ! -d "frontend" ]; then
    log_error "Must be run from project root directory"
    exit 1
  fi

  case "${1:-}" in
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      restart_all
      ;;
    status)
      status_all
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
