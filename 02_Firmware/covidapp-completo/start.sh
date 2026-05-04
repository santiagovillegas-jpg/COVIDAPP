#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

TSX="$SCRIPT_DIR/artifacts/api-server/node_modules/.bin/tsx"

export PORT=3000
NODE_ENV=development "$TSX" ./artifacts/api-server/src/index.ts &
BACKEND_PID=$!

sleep 2

export PORT=5000
export BASE_PATH=/
cd artifacts/covidapp
pnpm run dev

wait $BACKEND_PID
