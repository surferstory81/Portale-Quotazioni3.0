# Scripts

Utility scripts for managing the Portale Quotazioni 3.0 project.

---

## 📜 Available Scripts

### `services.sh` - Service Management

Manages all three services (Backend, AI Service, Frontend) with health checks and proper startup/shutdown sequences.

**Usage:**

```bash
# From project root
./scripts/services.sh {start|stop|restart|status}
```

**Commands:**

| Command | Description |
|---------|-------------|
| `start` | Start all services in dependency order (backend → ai-service → frontend) |
| `stop` | Stop all services gracefully (frontend → ai-service → backend) |
| `restart` | Stop then start all services |
| `status` | Check which services are running |

**Features:**

- ✅ **Graceful shutdown** - Tries SIGTERM first, force kills only if needed
- ✅ **Port checking** - Verifies services are actually stopped/started
- ✅ **Health checks** - Waits for services to be ready after start
- ✅ **Timeouts** - Configurable timeouts for stop (10s) and start (30s)
- ✅ **Logging** - All output logged to `logs/{service}.log`
- ✅ **Dependency order** - Starts/stops in correct sequence
- ✅ **PID tracking** - Shows process IDs for running services
- ✅ **Colored output** - Clear visual feedback

**Examples:**

```bash
# Start all services
./scripts/services.sh start
# Output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#    STARTING ALL SERVICES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 
# ℹ️  Starting backend (port 3000)...
# ℹ️  Started with PID: 12345 (logging to logs/backend.log)
# ℹ️  Waiting for backend to be ready...
# ✅ backend is ready (4s)
# 
# ℹ️  Starting ai-service (port 3001)...
# ✅ ai-service is ready (3s)
# 
# ℹ️  Starting frontend (port 4300)...
# ✅ frontend is ready (8s)
# 
# ✅ All services started successfully
# 
# ℹ️  Services running:
# ℹ️    • Backend:    http://localhost:3000
# ℹ️    • AI Service: http://localhost:3001
# ℹ️    • Frontend:   http://localhost:4300

# Check status
./scripts/services.sh status
# ✅ backend: RUNNING (port 3000, PID 12345)
# ✅ ai-service: RUNNING (port 3001, PID 12346)
# ✅ frontend: RUNNING (port 4300, PID 12347)

# Stop all services
./scripts/services.sh stop
# ℹ️  Stopping frontend (port 4300)...
# ✅ frontend stopped successfully
# ℹ️  Stopping ai-service (port 3001)...
# ✅ ai-service stopped successfully
# ℹ️  Stopping backend (port 3000)...
# ✅ backend stopped successfully

# Restart (useful after git pull)
./scripts/services.sh restart
```

**Configuration:**

Edit `services.sh` to customize:

```bash
# Timeouts
STOP_TIMEOUT=10  # seconds to wait for graceful shutdown
START_TIMEOUT=30 # seconds to wait for service to be ready
CHECK_INTERVAL=2 # seconds between health checks

# Service ports
declare -A SERVICES=(
  ["backend"]="3000"
  ["ai-service"]="3001"
  ["frontend"]="4300"
)

# Health check endpoints
declare -A SERVICE_HEALTH_ENDPOINTS=(
  ["backend"]="http://localhost:3000/health"
  ["ai-service"]="http://localhost:3001/health"
  ["frontend"]="http://localhost:4300"
)
```

**Troubleshooting:**

**Problem**: Service fails to stop
```bash
# Check what's using the port
netstat -ano | grep :3000

# Manually kill by PID
taskkill //F //PID <pid> //T
```

**Problem**: Service fails to start
```bash
# Check logs
cat logs/backend.log

# Common issues:
# - Port already in use
# - Missing .env file
# - Database not running
# - npm dependencies not installed
```

**Problem**: Health check timeout
```bash
# Increase timeout in services.sh
START_TIMEOUT=60  # instead of 30

# Or check service manually
curl http://localhost:3000/health
```

---

## 🚀 Quick Development Workflow

```bash
# Morning: Start all services
./scripts/services.sh start

# Check status anytime
./scripts/services.sh status

# After git pull: Restart to pick up changes
git pull origin dev
./scripts/services.sh restart

# End of day: Stop all services
./scripts/services.sh stop
```

---

## 🔧 Windows Compatibility

The script is designed to work in **Git Bash on Windows**:

- Uses `netstat -ano` instead of `lsof` for port checking
- Uses `taskkill` instead of `kill` for process termination
- Works with Windows paths and process IDs

**Requirements:**
- Git Bash (comes with Git for Windows)
- Node.js 20+
- npm

---

## 📊 Service Dependencies

```
┌──────────┐
│ Frontend │ (4300)
└─────┬────┘
      │
      ├─► ┌─────────┐
      │   │ Backend │ (3000)
      │   └────┬────┘
      │        │
      └────────┼─► ┌──────────────┐
               │   │  AI Service  │ (3001)
               └─► └──────────────┘
```

**Startup Order**: Backend → AI Service → Frontend  
**Shutdown Order**: Frontend → AI Service → Backend

---

## 📝 Future Enhancements

Potential improvements (not implemented yet):

- [ ] Support for individual service start/stop (e.g., `services.sh start backend`)
- [ ] Docker Compose integration
- [ ] Database startup check (PostgreSQL)
- [ ] Log rotation for `logs/` directory
- [ ] Service restart on file changes (watch mode)
- [ ] CI/CD integration (GitHub Actions)

---

## 📚 Related Documentation

- [Development Guide](../docs/development/README.md) - Development setup
- [Architecture Overview](../docs/architecture/overview.md) - System design
- [Troubleshooting](../docs/development/troubleshooting.md) - Common issues
