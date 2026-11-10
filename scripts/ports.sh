#!/usr/bin/env bash
# Port helpers shared by run.sh and ./deploy. Source this file; do not execute it.

# port_is_free PORT
# Succeeds when nothing is listening on PORT (checked by trying to bind it on all interfaces).
port_is_free() {
    local port="$1"

    if command -v python3 >/dev/null 2>&1; then
        python3 - "$port" <<'PY' 2>/dev/null
import socket, sys
port = int(sys.argv[1])
for family, addr in ((socket.AF_INET, "0.0.0.0"), (socket.AF_INET6, "::")):
    try:
        s = socket.socket(family, socket.SOCK_STREAM)
    except OSError:
        continue  # address family not supported on this host
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if family == socket.AF_INET6:
            s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        s.bind((addr, port))
    except OSError:
        sys.exit(1)
    finally:
        s.close()
sys.exit(0)
PY
        return
    fi

    if command -v lsof >/dev/null 2>&1; then
        ! lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
        return
    fi

    # Last resort: a successful connect means something is listening.
    ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null
}

# find_free_port START [EXCLUDED_PORT...]
# Prints the first free port at or above START that is not in the excluded list.
find_free_port() {
    local port="$1"
    shift
    local last=$((port + 200))
    local excluded

    while [ "$port" -le "$last" ] && [ "$port" -le 65535 ]; do
        local skip=0
        for excluded in "$@"; do
            if [ "$port" = "$excluded" ]; then
                skip=1
                break
            fi
        done

        if [ "$skip" -eq 0 ] && port_is_free "$port"; then
            echo "$port"
            return 0
        fi

        port=$((port + 1))
    done

    echo "No free port found between $1 and $last." >&2
    return 1
}
