#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ "$(uname -s)" != "Linux" ]; then
    echo "This run script can only install system requirements on Linux."
    exit 1
fi

if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

export FOCALBOARD_BUILD_TAGS="${FOCALBOARD_BUILD_TAGS:-json1 sqlite3}"
export FOCALBOARDSERVER_ARGS="${FOCALBOARDSERVER_ARGS:-}"
export DISABLE_BROWSER_CONSOLE_LOGS=false
PORT="${EXTERNAL_PORT:-${PORT:-8000}}"
APP_PORT="${APP_PORT:-8001}"
CHILD_PIDS=()
CLEANING_UP=0

missing_commands() {
    local missing=()
    local command_name

    for command_name in go make git lsof pgrep setsid gcc g++ python3 pkg-config curl; do
        if ! command -v "$command_name" >/dev/null 2>&1; then
            missing+=("$command_name")
        fi
    done

    printf '%s\n' "${missing[@]}"
}

install_system_requirements() {
    local missing
    local sudo_cmd=""

    missing="$(missing_commands)"

    if [ -z "$missing" ]; then
        return
    fi

    if [ "$(id -u)" -ne 0 ]; then
        if command -v sudo >/dev/null 2>&1; then
            sudo_cmd="sudo"
        else
            echo "sudo is required to install missing system requirements."
            exit 1
        fi
    fi

    echo "Missing system requirement(s):"
    echo "$missing" | sed 's/^/  - /'
    echo "Installing missing system requirements..."

    if command -v apt-get >/dev/null 2>&1; then
        $sudo_cmd apt-get update
        $sudo_cmd env DEBIAN_FRONTEND=noninteractive apt-get install -y \
            build-essential \
            curl \
            git \
            golang-go \
            lsof \
            make \
            pkg-config \
            procps \
            python3 \
            util-linux
    elif command -v dnf >/dev/null 2>&1; then
        $sudo_cmd dnf install -y \
            gcc \
            gcc-c++ \
            curl \
            git \
            golang \
            lsof \
            make \
            pkgconf-pkg-config \
            procps-ng \
            python3 \
            util-linux
    elif command -v yum >/dev/null 2>&1; then
        $sudo_cmd yum install -y \
            gcc \
            gcc-c++ \
            curl \
            git \
            golang \
            lsof \
            make \
            pkgconfig \
            procps-ng \
            python3 \
            util-linux
    elif command -v pacman >/dev/null 2>&1; then
        $sudo_cmd pacman -Sy --needed --noconfirm \
            base-devel \
            curl \
            git \
            go \
            lsof \
            make \
            pkgconf \
            procps-ng \
            python \
            util-linux
    elif command -v zypper >/dev/null 2>&1; then
        $sudo_cmd zypper --non-interactive install \
            gcc \
            gcc-c++ \
            curl \
            git \
            go \
            lsof \
            make \
            pkg-config \
            procps \
            python3 \
            util-linux
    elif command -v apk >/dev/null 2>&1; then
        $sudo_cmd apk add \
            build-base \
            curl \
            git \
            go \
            lsof \
            make \
            pkgconf \
            procps \
            python3 \
            util-linux
    else
        echo "Unsupported Linux package manager. Install these manually and rerun:"
        echo "$missing" | sed 's/^/  - /'
        exit 1
    fi

    missing="$(missing_commands)"
    if [ -n "$missing" ]; then
        echo "Some system requirements are still missing after install:"
        echo "$missing" | sed 's/^/  - /'
        exit 1
    fi
}

load_nvm() {
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    if [ -s "$NVM_DIR/nvm.sh" ]; then
        # shellcheck disable=SC1091
        source "$NVM_DIR/nvm.sh"
    fi
}

node_version_to_use() {
    if [ -n "${NODE_VERSION:-}" ]; then
        echo "$NODE_VERSION"
    elif [ -f "$ROOT_DIR/.nvmrc" ]; then
        tr -d '[:space:]' < "$ROOT_DIR/.nvmrc"
    elif [ -f "$ROOT_DIR/webapp/.nvmrc" ]; then
        tr -d '[:space:]' < "$ROOT_DIR/webapp/.nvmrc"
    else
        echo "20"
    fi
}

install_node_with_nvm() {
    local node_version
    node_version="$(node_version_to_use)"

    load_nvm

    if ! command -v nvm >/dev/null 2>&1; then
        echo "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
        load_nvm
    fi

    if ! command -v nvm >/dev/null 2>&1; then
        echo "nvm installation failed. Please install nvm manually and rerun this script."
        exit 1
    fi

    echo "Using Node.js $node_version via nvm..."
    nvm install "$node_version"
    nvm use "$node_version"

    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo "Node.js/npm are still unavailable after nvm setup."
        exit 1
    fi
}

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

run_tracked() {
    setsid "$@" &
    track_pid "$!"
}

terminate_process_tree() {
    local pid="$1"
    local signal="$2"

    if ! kill -0 "$pid" 2>/dev/null && ! kill -0 "-$pid" 2>/dev/null; then
        return
    fi

    kill "-$signal" "-$pid" 2>/dev/null || true

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

install_system_requirements
install_node_with_nvm

if command -v go >/dev/null 2>&1; then
    export PATH="$(go env GOPATH)/bin:$PATH"
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

    cleanup_watched_server() {
        if [ -n "$server_pid" ]; then
            terminate_process_tree "$server_pid" TERM
            sleep 1
            terminate_process_tree "$server_pid" KILL
            wait "$server_pid" 2>/dev/null || true
        fi
    }

    trap cleanup_watched_server EXIT INT TERM

    while true; do
        local current_signature
        current_signature="$(server_signature)"

        if [ "$current_signature" != "$last_signature" ]; then
            if [ -n "$server_pid" ]; then
                echo "Restarting BoringBoard server..."
                terminate_process_tree "$server_pid" TERM
                wait "$server_pid" 2>/dev/null || true
            fi

            if make server; then
                setsid ./bin/focalboard-server -port "$APP_PORT" $FOCALBOARDSERVER_ARGS &
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
    run_tracked make watch
    run_tracked env PUBLIC_PORT="$PORT" BACKEND_PORT="$APP_PORT" WATCH_DIR="$ROOT_DIR/webapp/pack" node "$ROOT_DIR/scripts/dev-reload-proxy.js"
    PROXY_PID="${CHILD_PIDS[$((${#CHILD_PIDS[@]} - 1))]}"
    wait "$PROXY_PID"
    exit $?
fi

echo "modd is not installed, so watch mode is unavailable."
echo "Running fallback auto-rebuild for server and webapp instead."
echo "Install modd for auto-rebuilds: go install github.com/cortesi/modd/cmd/modd@latest"

make webapp

echo "Starting BoringBoard..."
echo "Open http://localhost:$PORT"
export ROOT_DIR APP_PORT FOCALBOARDSERVER_ARGS
export -f server_signature terminate_process_tree watch_server_without_modd
run_tracked bash -c 'cd "$ROOT_DIR" && watch_server_without_modd'

run_tracked bash -c 'cd "$1/webapp" && npm run watchdev' bash "$ROOT_DIR"

run_tracked env PUBLIC_PORT="$PORT" BACKEND_PORT="$APP_PORT" WATCH_DIR="$ROOT_DIR/webapp/pack" node "$ROOT_DIR/scripts/dev-reload-proxy.js"
PROXY_PID="${CHILD_PIDS[$((${#CHILD_PIDS[@]} - 1))]}"
wait "$PROXY_PID"
