#!/usr/bin/env bash
# ============================================================
# agents_aman — One-command startup script
# Usage:  ./start.sh
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${BOLD}${CYAN}=== Agents Dashboard Startup ===${NC}\n"

# ── Kill any previous instances ────────────────────────────
echo -e "${YELLOW}► Stopping any previous instances...${NC}"
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
lsof -ti :4040 | xargs kill -9 2>/dev/null || true
sleep 1

# ── Build & start backend ──────────────────────────────────
echo -e "${YELLOW}► Building backend...${NC}"
npm --prefix "$SCRIPT_DIR/server" run build 2>&1 | tail -3

echo -e "${YELLOW}► Starting backend on :3001...${NC}"
npm --prefix "$SCRIPT_DIR/server" run start > /tmp/agents_backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
for i in {1..15}; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend ready${NC}"
    break
  fi
  sleep 1
done

# ── Start frontend ─────────────────────────────────────────
echo -e "${YELLOW}► Starting frontend on :5173...${NC}"
npm --prefix "$SCRIPT_DIR/client" run dev > /tmp/agents_frontend.log 2>&1 &
FRONTEND_PID=$!
# Load .env if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

echo "  Frontend PID: $FRONTEND_PID"

# ── Start ngrok tunnel ─────────────────────────────────────
if [ -n "$NGROK_DOMAIN" ]; then
  echo -e "${GREEN}► Starting ngrok on PERMANENT static domain: ${BOLD}$NGROK_DOMAIN${NC}..."
  ngrok http --domain="$NGROK_DOMAIN" 3001 --log=stdout > /tmp/agents_ngrok.log 2>&1 &
else
  echo -e "${YELLOW}► Starting ngrok tunnel (ephemeral URL)...${NC}"
  echo -e "  ${CYAN}Tip: Set NGROK_DOMAIN in .env to keep the URL permanent across restarts!${NC}"
  ngrok http 3001 --log=stdout > /tmp/agents_ngrok.log 2>&1 &
fi
NGROK_PID=$!

# Wait for ngrok to get a URL
LIVE_URL=""
for i in {1..20}; do
  sleep 1
  LIVE_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); urls=[t['public_url'] for t in d.get('tunnels',[]) if t['public_url'].startswith('https')]; print(urls[0] if urls else '')" 2>/dev/null || true)
  if [ -n "$LIVE_URL" ]; then break; fi
done

# ── Save & display URL ─────────────────────────────────────
echo ""
if [ -n "$LIVE_URL" ]; then
  echo "$LIVE_URL" > "$SCRIPT_DIR/LIVE_URL.txt"
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║   🚀 LIVE URL (save this!)                          ║${NC}"
  echo -e "${GREEN}${BOLD}║                                                      ║${NC}"
  echo -e "${GREEN}${BOLD}║   $LIVE_URL   ${NC}"
  echo -e "${GREEN}${BOLD}║                                                      ║${NC}"
  echo -e "${GREEN}${BOLD}║   Frontend:  http://localhost:5173                   ║${NC}"
  echo -e "${GREEN}${BOLD}║   Backend:   http://localhost:3001                   ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  URL also saved to: ${CYAN}LIVE_URL.txt${NC}"
  # Copy to clipboard on macOS
  echo "$LIVE_URL" | pbcopy 2>/dev/null && echo -e "  ${GREEN}✓ Copied to clipboard!${NC}"

  if [ -z "$NGROK_DOMAIN" ]; then
    echo ""
    echo -e "  ${YELLOW}💡 Note: This tunnel URL will change on next restart.${NC}"
    echo -e "     To make it PERMANENT, get 1 free static domain from:"
    echo -e "     ${CYAN}https://dashboard.ngrok.com/cloud-edge/domains${NC}"
    echo -e "     and add: ${BOLD}NGROK_DOMAIN=your-domain.ngrok-free.app${NC} into .env"
  fi
else
  echo -e "${RED}✗ Could not get ngrok URL. Check /tmp/agents_ngrok.log${NC}"
fi

echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f /tmp/agents_backend.log"
echo -e "  Frontend: tail -f /tmp/agents_frontend.log"
echo -e "  Ngrok:    tail -f /tmp/agents_ngrok.log"
echo ""
echo -e "${BOLD}Press Ctrl+C to stop all services.${NC}"

# ── Wait & cleanup on exit ─────────────────────────────────
trap "echo -e '\n${YELLOW}Stopping all services...${NC}'; kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null; echo -e '${GREEN}Done.${NC}'" EXIT INT TERM
wait
