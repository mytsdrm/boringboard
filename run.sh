#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

export FOCALBOARD_BUILD_TAGS="${FOCALBOARD_BUILD_TAGS:-json1 sqlite3}"
export FOCALBOARDSERVER_ARGS="${FOCALBOARDSERVER_ARGS:-}"
PORT="${PORT:-8000}"
APP_PORT="${APP_PORT:-8001}"

cleanup_port() {
    local port="$1"

    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids="$(lsof -ti tcp:"$port" || true)"
        if [ -n "$pids" ]; then
            echo "Stopping process(es) on port $port: $pids"
            kill $pids
            sleep 1
        fi

        pids="$(lsof -ti tcp:"$port" || true)"
        if [ -n "$pids" ]; then
            echo "Force stopping process(es) on port $port: $pids"
            kill -9 $pids
        fi
    else
        echo "lsof is not installed; skipping port $port cleanup."
    fi
}

if ! command -v go >/dev/null 2>&1; then
    echo "Go is required to run BoringBoard locally."
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to build the BoringBoard web app."
    exit 1
fi

if [ ! -d "$ROOT_DIR/webapp/node_modules" ]; then
    echo "Installing webapp dependencies..."
    make prebuild
fi

mkdir -p "$ROOT_DIR/bin"

cleanup_port "$PORT"
cleanup_port "$APP_PORT"

start_proxy() {
    PUBLIC_PORT="$PORT" BACKEND_PORT="$APP_PORT" WATCH_DIR="$ROOT_DIR/webapp/pack" node "$ROOT_DIR/scripts/dev-reload-proxy.js"
}

if command -v modd >/dev/null 2>&1; then
    export FOCALBOARDSERVER_ARGS="-port $APP_PORT $FOCALBOARDSERVER_ARGS"
    echo "Starting BoringBoard in development watch mode..."
    echo "Open http://localhost:$PORT"
    make watch &
    WATCH_PID="$!"
    trap 'kill "$WATCH_PID" 2>/dev/null || true' EXIT INT TERM
    start_proxy
    exit 0
fi

echo "modd is not installed, so watch mode is unavailable."
echo "Running server once with webapp auto-rebuild instead."
echo "Install modd for auto-rebuilds: go install github.com/cortesi/modd/cmd/modd@latest"

make server webapp

echo "Starting BoringBoard..."
echo "Open http://localhost:$PORT"
./bin/focalboard-server -port "$APP_PORT" $FOCALBOARDSERVER_ARGS &
SERVER_PID="$!"

(
    cd "$ROOT_DIR/webapp"
    npm run watchdev
) &
WEBAPP_WATCH_PID="$!"

trap 'kill "$SERVER_PID" "$WEBAPP_WATCH_PID" 2>/dev/null || true' EXIT INT TERM
start_proxy
