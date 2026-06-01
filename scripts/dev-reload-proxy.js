#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const publicPort = Number(process.env.PUBLIC_PORT || '8000');
const backendPort = Number(process.env.BACKEND_PORT || '8001');
const watchDir = process.env.WATCH_DIR || path.join(process.cwd(), 'webapp', 'pack');

const clients = new Set();

const reloadScript = `
<script>
(() => {
  const events = new EventSource('/__dev_reload/events');
  events.onmessage = (event) => {
    if (event.data === 'reload') {
      window.location.reload();
    }
  };
})();
</script>`;

function newestMtime(dir) {
    let newest = 0;
    if (!fs.existsSync(dir)) {
        return newest;
    }

    let entries = [];
    try {
        entries = fs.readdirSync(dir, {withFileTypes: true});
    } catch {
        return newest;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            newest = Math.max(newest, newestMtime(fullPath));
            continue;
        }

        try {
            const stats = fs.statSync(fullPath);
            newest = Math.max(newest, stats.mtimeMs);
        } catch {
            // Webpack may replace files while this dev watcher is polling.
        }
    }

    return newest;
}

let lastMtime = newestMtime(watchDir);

setInterval(() => {
    const currentMtime = newestMtime(watchDir);
    if (lastMtime !== 0 && currentMtime > lastMtime) {
        for (const client of clients) {
            client.write('data: reload\n\n');
        }
    }
    lastMtime = currentMtime;
}, 700);

function handleEvents(req, res) {
    res.writeHead(200, {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);

    req.on('close', () => {
        clients.delete(res);
    });
}

function proxyRequest(req, res) {
    const options = {
        hostname: '127.0.0.1',
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
    };

    const backendReq = http.request(options, (backendRes) => {
        const contentType = backendRes.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
            res.writeHead(backendRes.statusCode || 200, backendRes.headers);
            backendRes.pipe(res);
            return;
        }

        const chunks = [];
        backendRes.on('data', (chunk) => chunks.push(chunk));
        backendRes.on('end', () => {
            const headers = {...backendRes.headers};
            delete headers['content-length'];

            const body = Buffer.concat(chunks).toString('utf8').replace('</body>', `${reloadScript}</body>`);
            res.writeHead(backendRes.statusCode || 200, headers);
            res.end(body);
        });
    });

    backendReq.on('error', () => {
        res.writeHead(502, {'Content-Type': 'text/plain; charset=utf-8'});
        res.end('BoringBoard dev server is starting. Refresh in a moment.');
    });

    req.pipe(backendReq);
}

function proxyUpgrade(req, socket, head) {
    const backendSocket = net.connect(backendPort, '127.0.0.1', () => {
        backendSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);

        for (const [name, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    backendSocket.write(`${name}: ${item}\r\n`);
                }
                continue;
            }

            if (value !== undefined) {
                backendSocket.write(`${name}: ${value}\r\n`);
            }
        }

        backendSocket.write('\r\n');

        if (head && head.length > 0) {
            backendSocket.write(head);
        }

        backendSocket.pipe(socket);
        socket.pipe(backendSocket);
    });

    backendSocket.on('error', () => {
        socket.destroy();
    });

    socket.on('error', () => {
        backendSocket.destroy();
    });
}

const server = http.createServer((req, res) => {
    if (req.url === '/__dev_reload/events') {
        handleEvents(req, res);
        return;
    }

    proxyRequest(req, res);
});

server.on('upgrade', proxyUpgrade);

server.listen(publicPort, () => {
    console.log(`Auto-reload proxy: http://localhost:${publicPort} -> http://localhost:${backendPort}`);
    console.log(`Watching ${watchDir}`);
});
