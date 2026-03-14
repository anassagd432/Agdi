#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  start-dev.sh  –  One-command Agdi local dev stack launcher
#  Usage: bash start-dev.sh [--build] [--stop] [--logs]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.dev"
COMPOSE_CMD="docker compose -f $COMPOSE_FILE"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "\033[1;36m[Agdi]\033[0m $*"; }
success() { echo -e "\033[1;32m[Agdi]\033[0m $*"; }
warn()    { echo -e "\033[1;33m[Agdi]\033[0m $*"; }
error()   { echo -e "\033[1;31m[Agdi]\033[0m $*" >&2; exit 1; }

# ── Flags ────────────────────────────────────────────────────────────────────
STOP=false; BUILD=false; LOGS=false
for arg in "$@"; do
  case $arg in
    --stop)  STOP=true ;;
    --build) BUILD=true ;;
    --logs)  LOGS=true ;;
  esac
done

# ── Stop flow ────────────────────────────────────────────────────────────────
if $STOP; then
  info "Stopping all Agdi dev services..."
  $COMPOSE_CMD down
  success "All services stopped."
  exit 0
fi

# ── Logs flow ────────────────────────────────────────────────────────────────
if $LOGS; then
  $COMPOSE_CMD logs -f
  exit 0
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Install it from https://docker.com"
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 is required. Update Docker Desktop."

# Copy env template if missing
if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env.dev not found – copying from .env.dev.example"
  cp .env.dev.example "$ENV_FILE"
  warn "Edit .env.dev with your API keys before re-running."
fi

# ── Launch ────────────────────────────────────────────────────────────────────
info "Starting Agdi full-stack dev environment..."

if $BUILD; then
  info "Rebuilding images (this may take a few minutes)..."
  $COMPOSE_CMD up -d --build
else
  $COMPOSE_CMD up -d
fi

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
success "✨  Agdi dev stack is running!"
echo ""
echo "  🌐 Dashboard   → http://localhost:3000"
echo "  🔌 Gateway WS  → ws://localhost:18789"
echo "  🔄 n8n         → http://localhost:5678   (admin / agdi-local)"
echo ""
info "Run logs with:  bash start-dev.sh --logs"
info "Stop stack with: bash start-dev.sh --stop"
