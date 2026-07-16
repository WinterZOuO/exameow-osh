#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════╗"
echo "  ║         ExamBot v0.1.0           ║"
echo "  ║  AI Exam Question Generator      ║"
echo "  ╚══════════════════════════════════╝"
echo -e "${NC}"

# ---- check prerequisites ----
command -v cargo >/dev/null 2>&1 || { echo -e "${RED}Error: cargo not found. Install Rust: https://rustup.rs${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}Error: pnpm not found. Install: npm i -g pnpm${NC}"; exit 1; }

# ---- proxy (only if reachable) ----
if [ -z "$http_proxy" ] && nc -z -w 1 127.0.0.1 7892 2>/dev/null; then
    export http_proxy="http://127.0.0.1:7892"
    export https_proxy="http://127.0.0.1:7892"
fi

# ---- install deps if needed ----
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    pnpm install 2>&1 | tail -1
fi

echo ""
echo "  Select launch mode:"
echo "  [1] Desktop (Tauri)  — full desktop app with native shell"
echo "  [2] Web (Browser)    — Axum server + Vue dev, open http://localhost:5273"
echo "  [3] Web Production   — Axum serving built frontend, open http://localhost:3000"
echo ""
read -p "  Choice [1-3] (default: 1): " MODE
MODE=${MODE:-1}

case $MODE in
    1)
        echo ""
        echo -e "${GREEN}Starting Tauri desktop app...${NC}"
        echo "  Vite:  http://localhost:5273"
        echo "  Press Ctrl+C to stop"
        echo ""
        set +e
        export PATH="$SCRIPT_DIR/frontend/node_modules/.bin:$PATH"
        tauri dev
        ;;
    2)
        echo ""
        echo -e "${GREEN}Starting Web dev mode...${NC}"
        echo "  Frontend:      http://localhost:5273"
        echo "  API server:    http://localhost:3000"
        echo "  Press Ctrl+C to stop both"
        echo ""

        set +e
        # start Axum server in background
        source ~/.zshrc 2>/dev/null || true
        cargo run -p exambot-server &
        SERVER_PID=$!

        # start Vite dev server
        cd frontend
        source ~/.zshrc 2>/dev/null || true
        pnpm dev &
        VITE_PID=$!
        cd "$SCRIPT_DIR"

        # cleanup on exit
        trap "kill $SERVER_PID $VITE_PID 2>/dev/null; echo ''; echo -e '${GREEN}Servers stopped.${NC}'" EXIT INT TERM

        # wait for any to finish
        wait
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Building frontend...${NC}"
        cd frontend && source ~/.zshrc 2>/dev/null || true && pnpm build && cd "$SCRIPT_DIR"

        echo -e "${GREEN}Starting production server...${NC}"
        echo "  App:  http://localhost:3000"
        echo "  Press Ctrl+C to stop"
        echo ""
        set +e
        cargo run -p exambot-server
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
