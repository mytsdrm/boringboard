#!/usr/bin/env bash
# Start BoringBoard with docker compose, picking a free host port if the requested one is taken.
# Usage: docker/up.sh [-f docker-compose-file.yml] [extra docker compose args...]

set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DOCKER_DIR/.." && pwd)"

if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

# shellcheck source=../scripts/ports.sh
source "$ROOT_DIR/scripts/ports.sh"

requested="${EXTERNAL_PORT:-80}"

# A running BoringBoard container already owns its port; restart it on the same port.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx boringboard; then
    current="$(docker port boringboard 8000/tcp 2>/dev/null | head -n1 | sed 's/.*://')"
    if [ -n "$current" ]; then
        requested="$current"
        docker stop boringboard >/dev/null
    fi
fi

EXTERNAL_PORT="$(find_free_port "$requested")"
if [ "$EXTERNAL_PORT" != "$requested" ]; then
    echo "Port $requested is in use; using port $EXTERNAL_PORT instead."
fi
export EXTERNAL_PORT

echo "BoringBoard will be available at http://localhost:$EXTERNAL_PORT"
cd "$DOCKER_DIR"
exec docker compose "$@" up -d --build
