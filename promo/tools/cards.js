// Title and outro cards, rendered in the browser so they go through the same recorder as the app.
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../../webapp/static/boringboard-logo.webp');
const logo = 'data:image/webp;base64,' + fs.readFileSync(logoPath).toString('base64');
const repoUrl = process.env.PROMO_URL || 'github.com/mytsdrm/boringboard';

const base = `
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;color:#fff;background:radial-gradient(1200px 700px at 75% 20%,#3b82f6 0%,#1d5fd6 38%,#123a8a 75%,#0b2357 100%);}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(900px 600px at 50% 50%,#000,transparent)}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,.32),transparent 60%);left:-200px;bottom:-400px;animation:float 9s ease-in-out infinite alternate}
@keyframes float{to{transform:translate(260px,-120px)}}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.logo{width:230px;height:230px;border-radius:44px;background:#fff;display:grid;place-items:center;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35);opacity:0;transform:scale(.6);animation:pop .9s cubic-bezier(.2,.9,.3,1.3) .2s forwards}
.logo img{width:230px;height:230px}
p.sub{font-size:46px;font-weight:600;color:#e0ecff;margin-top:42px;opacity:0;transform:translateY(30px);animation:up .9s ease .75s forwards}
.chips{display:flex;gap:16px;margin-top:56px;flex-wrap:wrap;justify-content:center;max-width:1500px}
.chip{font-size:26px;font-weight:600;padding:14px 26px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);opacity:0;transform:translateY(20px);animation:up .6s ease forwards}
@keyframes pop{to{opacity:1;transform:scale(1)}}
@keyframes up{to{opacity:1;transform:none}}
.url{font-size:62px;font-weight:800;margin-top:34px;padding:18px 46px;border-radius:24px;background:#fff;color:#1d5fd6;box-shadow:0 30px 80px rgba(0,0,0,.35);opacity:0;transform:translateY(30px);animation:up .9s ease .9s forwards}
.cred{margin-top:44px;font-size:32px;color:#dbe7ff;opacity:0;animation:up .9s ease 1.4s forwards}
.cred b{color:#fff;background:rgba(255,255,255,.14);padding:6px 16px;border-radius:12px;margin:0 6px;font-family:ui-monospace,monospace}
</style>`;

const chips = ['Dashboard', 'Kanban Board', 'Table', 'Calendar', 'Gallery', 'Checklist & Komentar', 'Template', 'Share', 'Dark Mode'];

exports.intro = `<!doctype html><html><head>${base}</head><body><div class="grid"></div><div class="glow"></div>
<div class="wrap"><div class="logo"><img src="${logo}"></div><p class="sub">Tempat untuk semua task "nanti aja deh"</p>
<div class="chips">${chips.map((c, i) => `<span class="chip" style="animation-delay:${1.3 + i * 0.18}s">${c}</span>`).join('')}</div></div></body></html>`;

exports.outro = `<!doctype html><html><head>${base}</head><body><div class="grid"></div><div class="glow"></div>
<div class="wrap"><div class="logo"><img src="${logo}"></div><p class="sub" style="font-size:50px;color:#fff;font-weight:700;margin-top:36px">Open source dan gratis. Coba sekarang</p>
<div class="url">${repoUrl}</div>
<p class="cred">Akun demo: <b>demo</b> / <b>demo123456</b></p></div></body></html>`;
