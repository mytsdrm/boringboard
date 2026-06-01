#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

export FOCALBOARD_BUILD_TAGS="${FOCALBOARD_BUILD_TAGS:-json1 sqlite3}"
export FOCALBOARDSERVER_ARGS="${FOCALBOARDSERVER_ARGS:-}"
PORT="${PORT:-8000}"

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

if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -ti tcp:"$PORT" || true)"
    if [ -n "$PIDS" ]; then
        echo "Stopping process(es) on port $PORT: $PIDS"
        kill $PIDS
        sleep 1
    fi

    PIDS="$(lsof -ti tcp:"$PORT" || true)"
    if [ -n "$PIDS" ]; then
        echo "Force stopping process(es) on port $PORT: $PIDS"
        kill -9 $PIDS
    fi
else
    echo "lsof is not installed; skipping port $PORT cleanup."
fi

if command -v modd >/dev/null 2>&1; then
    echo "Starting BoringBoard in development watch mode..."
    echo "Open http://localhost:$PORT"
    exec make watch
fi

echo "modd is not installed, so watch mode is unavailable."
echo "Running a one-shot local build instead."
echo "Install modd for auto-rebuilds: go install github.com/cortesi/modd/cmd/modd@latest"

make server webapp

echo "Starting BoringBoard..."
echo "Open http://localhost:$PORT"
exec ./bin/focalboard-server $FOCALBOARDSERVER_ARGS
