// Recording helpers: CDP screencast recorder, fake cursor, in-page camera (CSS transform on <body>).
const fs = require('fs');
const path = require('path');
// PLAYWRIGHT_PATH: a playwright package folder, when playwright is not installed next to these tools.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const B = (process.env.BB_URL || 'http://localhost:8000').replace(/\/$/, '');
const W = 1920, H = 1080;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INIT = `
(() => {
  if (window.__promoInit) return; window.__promoInit = true; window.print = function(){};
  const install = () => {
    if (document.getElementById('__cur')) return;
    const st = document.createElement('style');
    st.textContent = \`
      #__cur{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));}
      .__rip{position:fixed;z-index:2147483646;pointer-events:none;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
        border:3px solid rgba(37,99,235,.9);background:rgba(37,99,235,.18);animation:__rip .6s ease-out forwards}
      @keyframes __rip{from{transform:scale(.2);opacity:1}to{transform:scale(1.4);opacity:0}}
      body{transform-origin:0 0;}
      ::-webkit-scrollbar{width:0!important;height:0!important}
    \`;
    document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l15 10.5-6.6 1.2 3.9 7.4-2.9 1.5-3.9-7.5L4 19.6z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    window.__cam = { s: 1, tx: 0, ty: 0 };
  };
  if (document.body) install(); else document.addEventListener('DOMContentLoaded', install);
  const __mv = (e) => { const c = document.getElementById('__cur'); if (c) c.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 2) + 'px)'; };
  document.addEventListener('mousemove', __mv, true); document.addEventListener('dragover', __mv, true); document.addEventListener('drag', (e) => { if (e.clientX || e.clientY) __mv(e); }, true);
  document.addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
})();
`;

class Director {
  constructor(outDir) { this.outDir = outDir; this.mouse = { x: W / 2, y: H / 2 }; }

  async start(statePath) {
    this.browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
    const opts = { viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Asia/Jakarta' };
    if (statePath && fs.existsSync(statePath)) opts.storageState = statePath;
    this.ctx = await this.browser.newContext(opts);
    await this.ctx.addInitScript(INIT);
    this.page = await this.ctx.newPage();
    this.page.on('dialog', (d) => d.accept().catch(() => {}));
    this.cdp = await this.ctx.newCDPSession(this.page);
  }

  async goto(u, extraWait = 1200) {
    await this.page.goto(u.startsWith('http') ? u : B + u, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await this.page.evaluate(INIT).catch(() => {});
    await sleep(extraWait);
    await this.placeCursor();
  }

  async placeCursor() {
    await this.page.mouse.move(this.mouse.x, this.mouse.y);
  }

  // ---- recording ----
  async rec(name) {
    const dir = path.join(this.outDir, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    this.frames = []; this.recDir = dir; let n = 0;
    this.onFrame = async (f) => {
      const file = path.join(dir, String(n++).padStart(5, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      this.frames.push({ file, t: f.metadata.timestamp });
      this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    };
    this.cdp.on('Page.screencastFrame', this.onFrame);
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    // nudge a repaint so the first frame arrives
    await this.page.mouse.move(this.mouse.x + 1, this.mouse.y); await this.page.mouse.move(this.mouse.x, this.mouse.y);
    this.recStart = Date.now() / 1000; this.recording = true;
  }

  async stop() {
    await sleep(120);
    const end = Date.now() / 1000;
    this.recording = false;
    await this.cdp.send('Page.stopScreencast');
    this.cdp.off('Page.screencastFrame', this.onFrame);
    await sleep(200);
    const fr = this.frames.sort((a, b) => a.t - b.t);
    // concat list with durations (timestamps are wall-clock seconds)
    let lines = ['ffconcat version 1.0'];
    const t0 = fr[0].t;
    for (let i = 0; i < fr.length; i++) {
      const next = i + 1 < fr.length ? fr[i + 1].t : Math.max(end, fr[i].t + 0.05);
      lines.push(`file '${path.basename(fr[i].file)}'`, `duration ${Math.max(0.001, next - fr[i].t).toFixed(4)}`);
    }
    lines.push(`file '${path.basename(fr[fr.length - 1].file)}'`);
    fs.writeFileSync(path.join(this.recDir, 'list.txt'), lines.join('\n'));
    console.log('recorded', path.basename(this.recDir), fr.length, 'frames', (end - t0).toFixed(1) + 's');
  }

  // hold for a total part length (seconds) since rec() started
  async holdUntil(sec) { const left = this.recStart + sec - Date.now() / 1000; if (left > 0) await sleep(left * 1000); }

  // ---- cursor ----
  async move(x, y, ms = 700) {
    const sx = this.mouse.x, sy = this.mouse.y; const steps = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps; const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      await this.page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
      await sleep(ms / steps);
    }
    this.mouse = { x, y };
  }
  async box(sel) {
    const l = typeof sel === 'string' ? this.page.locator(sel).first() : sel;
    await l.waitFor({ state: 'attached', timeout: 15000 });
    return await l.boundingBox();
  }
  async moveTo(sel, ms = 700, dx = 0.5, dy = 0.5) {
    const l = typeof sel === 'string' ? this.page.locator(sel).first() : sel;
    let b = await this.box(l);
    if (!b || b.y + b.height > 1075 || b.y < 0) { await l.scrollIntoViewIfNeeded().catch(() => {}); await new Promise(r => setTimeout(r, 400)); b = await this.box(l); } await this.move(b.x + b.width * dx, b.y + b.height * dy, ms); return b;
  }
  async click(sel, ms = 700) {
    await this.moveTo(sel, ms); await sleep(120);
    await this.page.mouse.down(); await sleep(90); await this.page.mouse.up(); await sleep(250);
  }
  async type(text, delay = 70) { await this.page.keyboard.type(text, { delay }); }

  // ---- camera ----
  // focus on an untransformed page rectangle; scale chosen to fit, capped
  async cam(x, y, w, h, ms = 1100, maxS = 2.2) {
    await this.page.evaluate(({ x, y, w, h, ms, maxS, W, H }) => {
      let s = Math.min(W / w, H / h, maxS); if (s < 1) s = 1;
      const cx = x + w / 2, cy = y + h / 2;
      let tx = W / 2 - cx * s, ty = H / 2 - cy * s;
      tx = Math.min(0, Math.max(W - W * s, tx)); ty = Math.min(0, Math.max(H - H * s, ty));
      const b = document.body;
      b.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
      b.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
      window.__cam = { s, tx, ty };
    }, { x, y, w, h, ms, maxS, W, H });
    await sleep(ms + 60);
  }
  async camEl(sel, pad = 40, ms = 1100, maxS = 2.2) {
    // measure in untransformed coordinates
    const b = await this.box(sel);
    const cam = await this.page.evaluate(() => window.__cam || { s: 1, tx: 0, ty: 0 });
    const x = (b.x - cam.tx) / cam.s, y = (b.y - cam.ty) / cam.s, w = b.width / cam.s, h = b.height / cam.s;
    await this.cam(x - pad, y - pad, w + 2 * pad, h + 2 * pad, ms, maxS);
  }
  async camReset(ms = 1000) { await this.cam(0, 0, W, H, ms); }

  async close() { await this.browser.close(); }
}

module.exports = { Director, sleep, B, W, H };
