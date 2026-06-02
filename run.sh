#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

export FOCALBOARD_BUILD_TAGS="${FOCALBOARD_BUILD_TAGS:-json1 sqlite3}"
export FOCALBOARDSERVER_ARGS="${FOCALBOARDSERVER_ARGS:-}"
PORT="${PORT:-8000}"
APP_PORT="${APP_PORT:-8001}"
CHILD_PIDS=()
CLEANING_UP=0

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

track_pid() {
    CHILD_PIDS+=("$1")
}

terminate_process_tree() {
    local pid="$1"
    local signal="$2"

    if ! kill -0 "$pid" 2>/dev/null; then
        return
    fi

    local child_pids
    if command -v pgrep >/dev/null 2>&1; then
        child_pids="$(pgrep -P "$pid" 2>/dev/null || true)"
    else
        child_pids="$(ps -o pid= --ppid "$pid" 2>/dev/null || true)"
    fi

    for child_pid in $child_pids; do
        terminate_process_tree "$child_pid" "$signal"
    done

    kill "-$signal" "$pid" 2>/dev/null || true
}

cleanup() {
    local status="${1:-$?}"

    if [ "$CLEANING_UP" -eq 1 ]; then
        exit "$status"
    fi

    CLEANING_UP=1
    trap - EXIT INT TERM

    echo
    echo "Stopping BoringBoard and cleaning up ports..."

    for pid in "${CHILD_PIDS[@]}"; do
        terminate_process_tree "$pid" TERM
    done

    sleep 1

    for pid in "${CHILD_PIDS[@]}"; do
        terminate_process_tree "$pid" KILL
    done

    for pid in "${CHILD_PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done

    cleanup_port "$PORT"
    cleanup_port "$APP_PORT"

    exit "$status"
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

trap 'cleanup $?' EXIT
trap 'cleanup 130' INT
trap 'cleanup 143' TERM

start_proxy() {
    PUBLIC_PORT="$PORT" BACKEND_PORT="$APP_PORT" WATCH_DIR="$ROOT_DIR/webapp/pack" node "$ROOT_DIR/scripts/dev-reload-proxy.js"
}

server_signature() {
    find "$ROOT_DIR/server" -type f \( -name '*.go' -o -name '*.sql' \) -printf '%T@ %p\n' | sort
}

watch_server_without_modd() {
    local last_signature=""
    local server_pid=""

    while true; do
        local current_signature
        current_signature="$(server_signature)"

        if [ "$current_signature" != "$last_signature" ]; then
            if [ -n "$server_pid" ]; then
                echo "Restarting BoringBoard server..."
                kill "$server_pid" 2>/dev/null || true
                wait "$server_pid" 2>/dev/null || true
            fi

            if make server; then
                ./bin/focalboard-server -port "$APP_PORT" $FOCALBOARDSERVER_ARGS &
                server_pid="$!"
                last_signature="$current_signature"
            else
                echo "Server build failed; waiting for changes..."
            fi
        fi

        sleep 1
    done
}

if command -v modd >/dev/null 2>&1; then
    export FOCALBOARDSERVER_ARGS="-port $APP_PORT $FOCALBOARDSERVER_ARGS"
    echo "Starting BoringBoard in development watch mode..."
    echo "Open http://localhost:$PORT"
    make watch &
    WATCH_PID="$!"
    track_pid "$WATCH_PID"
    start_proxy &
    PROXY_PID="$!"
    track_pid "$PROXY_PID"
    wait "$PROXY_PID"
    exit $?
fi

echo "modd is not installed, so watch mode is unavailable."
echo "Running fallback auto-rebuild for server and webapp instead."
echo "Install modd for auto-rebuilds: go install github.com/cortesi/modd/cmd/modd@latest"

make webapp

echo "Starting BoringBoard..."
echo "Open http://localhost:$PORT"
watch_server_without_modd &
SERVER_WATCH_PID="$!"
track_pid "$SERVER_WATCH_PID"

(
    cd "$ROOT_DIR/webapp"
    npm run watchdev
) &
WEBAPP_WATCH_PID="$!"
track_pid "$WEBAPP_WATCH_PID"

start_proxy &
PROXY_PID="$!"
track_pid "$PROXY_PID"
wait "$PROXY_PID"
