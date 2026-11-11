// Records every scene part into rec/<part>/ (jpeg frames + ffconcat list).
// Usage: node scenes.js [part names...]   (default: all, in order)
// Run s01b first (logs in as the demo user) and a01 first for the admin parts a02-a06; each saves its session.
// Nothing on the demo board is changed for good: the card moved in s03 is moved back after recording,
// dialogs are closed without saving, and the Appearance changes are reset to the defaults.
const { Director, sleep, B } = require('./lib');
const cards = require('./cards');
const STATE = __dirname + '/state_demo.json';
const OUT = __dirname + '/rec';
const DEMO_USER = process.env.DEMO_USER || 'demo';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123456';

const parts = {};

// Board and view urls are looked up from the sidebar, so ids from a fresh seed work too.
async function openView(d, viewTitle, extraWait = 1500) {
  await d.goto('/dashboard', 800);
  await d.page.locator('.dashboard-board-name', { hasText: 'Demo Project' }).first().click();
  await d.page.waitForLoadState('networkidle').catch(() => {});
  await sleep(1000);
  await d.page.locator('.octo-sidebar-title').filter({ hasText: new RegExp('^' + viewTitle + '$') }).first().click();
  await d.page.waitForLoadState('networkidle').catch(() => {});
  await sleep(extraWait);
  await d.page.evaluate(() => document.activeElement && document.activeElement.blur());
}
const kanbanCard = (d, title) => d.page.locator('.KanbanCard', { hasText: title }).first();
const column = (d, n) => d.page.locator('.octo-board-column').nth(n);

// ---------- s01: intro card + login ----------
parts.s01a = async (d) => {
  await d.page.setContent('<html><body style="background:#1e1b4b"></body></html>');
  d.mouse = { x: 2100, y: 1200 };
  await d.rec('s01a');
  await d.page.setContent(cards.intro, { waitUntil: 'load' });
  await d.holdUntil(5.4);
  await d.stop();
};
parts.s01b = async (d) => {
  await d.ctx.clearCookies();
  await d.goto('/login', 300);
  await d.page.evaluate(() => localStorage.clear());
  await d.goto('/login', 1500);
  d.mouse = { x: 1500, y: 900 }; await d.placeCursor();
  await d.rec('s01b');
  await sleep(400);
  await d.cam(720, 250, 480, 580, 1200, 1.6);
  await d.click('#login-username', 800); await d.type(DEMO_USER, 110);
  await d.click('#login-password', 600); await d.type(DEMO_PASSWORD, 60);
  await sleep(300);
  await d.moveTo('button[type=submit]', 600);
  await sleep(250);
  await d.page.mouse.down(); await sleep(80); await d.page.mouse.up();
  await d.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {});
  await d.page.evaluate(() => { document.body.style.transition = 'none'; document.body.style.transform = ''; window.__cam = { s: 1, tx: 0, ty: 0 }; });
  await d.holdUntil(7.0);
  await d.stop();
  await d.page.waitForLoadState('networkidle').catch(() => {});
  await sleep(1000);
  await d.ctx.storageState({ path: STATE });
};

// ---------- s02: dashboard ----------
parts.s02 = async (d) => {
  await d.goto('/dashboard', 2000);
  d.mouse = { x: 1100, y: 700 }; await d.placeCursor();
  await d.rec('s02');
  await sleep(600);
  await d.camEl('.dashboard-metric-grid', 30, 1300, 1.5);
  for (let i = 0; i < 4; i++) { await d.moveTo(d.page.locator('.dashboard-metric-card').nth(i), 600, 0.3, 0.5); await sleep(350); }
  await d.camReset(900);
  await d.cam(290, 330, 1600, 750, 1200, 1.25);
  await d.moveTo(d.page.locator('.dashboard-widget-row').first(), 800);
  await sleep(600);
  await d.move(1300, 460, 800); await d.move(1300, 760, 1200);
  await d.holdUntil(13);
  await d.stop();
};

// ---------- s03: kanban board, drag a card ----------
let movedCard = false;
parts.s03 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 1000, y: 700 }; await d.placeCursor();
  await d.rec('s03');
  await sleep(500);
  await d.cam(260, 300, 1660, 640, 1200, 1.2);
  await d.moveTo(kanbanCard(d, 'Fix login page typos'), 900, 0.5, 0.3);
  await sleep(300);
  // drag "Fix login page typos" from To Do into In Progress
  await d.page.mouse.down(); await sleep(150);
  const target = await column(d, 3).boundingBox();
  await d.move(target.x + target.width / 2, target.y + target.height - 80, 1400);
  await sleep(200);
  await d.page.mouse.up(); movedCard = true;
  await sleep(1200);
  // show the Done column
  await d.camReset(800);
  await d.page.evaluate(() => { const k = document.querySelector('.Kanban'); k.style.scrollBehavior = 'smooth'; k.scrollLeft = k.scrollWidth; });
  await sleep(1300);
  await d.move(1500, 330, 900);
  await d.holdUntil(13.5);
  await d.stop();
  await d.page.evaluate(() => { const k = document.querySelector('.Kanban'); k.style.scrollBehavior = 'auto'; k.scrollLeft = 0; });
  await sleep(500);
  await restoreMovedCard(d);
};
async function restoreMovedCard(d) {
  if (!movedCard) return;
  const cardBox = await kanbanCard(d, 'Fix login page typos').boundingBox();
  const todo = await column(d, 2).boundingBox();
  await d.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + 20);
  await d.page.mouse.down();
  for (let i = 1; i <= 20; i++) await d.page.mouse.move(cardBox.x + (todo.x + todo.width / 2 - cardBox.x) * i / 20, cardBox.y + (todo.y + todo.height - 60 - cardBox.y) * i / 20);
  await d.page.mouse.up();
  await sleep(1200);
  const inTodo = await column(d, 2).locator('.KanbanCard', { hasText: 'Fix login page typos' }).count();
  console.log(inTodo ? 'card moved back to To Do' : 'WARNING: move "Fix login page typos" back to To Do by hand');
  movedCard = false;
}

// ---------- s04: card detail ----------
parts.s04 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 1300, y: 600 }; await d.placeCursor();
  await d.rec('s04');
  await sleep(300);
  await d.click(kanbanCard(d, 'Design the landing page'), 900);
  await sleep(1300);
  await d.cam(300, 120, 1000, 640, 1200, 1.5);
  await d.move(780, 450, 900); await d.move(780, 640, 900);
  await d.camReset(800);
  const dialog = d.page.locator('.dialog').first();
  await d.move(1000, 700, 500);
  for (let i = 0; i < 9; i++) { await d.page.mouse.wheel(0, 110); await sleep(70); }
  await sleep(700);
  const checklist = d.page.locator('.dialog .CheckboxElement, .dialog .octo-checkbox').first();
  if (await checklist.count()) await d.moveTo(checklist, 900);
  await sleep(500);
  for (let i = 0; i < 6; i++) { await d.page.mouse.wheel(0, -110); await sleep(70); }
  await sleep(500);
  const comment = d.page.locator('.dialog .Comment, .dialog .CommentsList').first();
  if (await comment.count()) await d.moveTo(comment, 900);
  await d.holdUntil(14);
  await d.stop();
  await d.page.keyboard.press('Escape');
  void dialog;
};

// ---------- s05: table view + saved filtered view ----------
parts.s05a = async (d) => {
  await openView(d, 'All tasks');
  d.mouse = { x: 1100, y: 800 }; await d.placeCursor();
  await d.rec('s05a');
  await sleep(400);
  await d.cam(270, 290, 1300, 480, 1200, 1.45);
  await d.move(700, 420, 800); await d.move(700, 720, 1000);
  await d.camReset(800);
  await d.cam(270, 1000, 1300, 80, 1000, 1.6);
  await d.move(1300, 1043, 800);
  await sleep(700);
  await d.camReset(800);
  await d.holdUntil(8);
  await d.stop();
};
parts.s05b = async (d) => {
  await openView(d, 'All tasks');
  d.mouse = { x: 900, y: 500 }; await d.placeCursor();
  await d.rec('s05b');
  await sleep(300);
  await d.click(d.page.locator('.octo-sidebar-title').filter({ hasText: /^Urgent and high$/ }).first(), 900);
  await sleep(1200);
  await d.cam(270, 190, 1640, 460, 1200, 1.2);
  await d.moveTo(d.page.locator('.ViewHeader button', { hasText: 'Filter' }).first(), 800);
  await sleep(300);
  await d.click(d.page.locator('.ViewHeader button', { hasText: 'Filter' }).first(), 200);
  await sleep(1800);
  await d.page.keyboard.press('Escape'); await d.page.mouse.click(1500, 900);
  await d.move(1200, 520, 900);
  await d.holdUntil(8);
  await d.stop();
};

// ---------- s06: calendar ----------
parts.s06 = async (d) => {
  await openView(d, 'Calendar');
  d.mouse = { x: 1200, y: 800 }; await d.placeCursor();
  await d.rec('s06');
  await sleep(400);
  await d.cam(270, 280, 1640, 560, 1300, 1.25);
  await d.move(700, 470, 900); await d.move(1300, 620, 1100); await d.move(1500, 770, 900);
  await d.holdUntil(8.5);
  await d.stop();
};

// ---------- s07: gallery ----------
parts.s07 = async (d) => {
  await openView(d, 'Gallery');
  d.mouse = { x: 1300, y: 900 }; await d.placeCursor();
  await d.rec('s07');
  await sleep(400);
  await d.cam(270, 290, 1300, 520, 1300, 1.4);
  await d.move(500, 500, 900); await d.move(1000, 500, 900); await d.move(1400, 520, 900);
  await d.holdUntil(7.5);
  await d.stop();
};

// ---------- s08: task board info + settings ----------
parts.s08 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 1200, y: 700 }; await d.placeCursor();
  await d.rec('s08');
  await sleep(400);
  await d.camEl('.ViewTitle__info', 40, 1200, 1.9);
  await d.move(1100, 100, 800); await d.move(1100, 150, 700);
  await d.camReset(900);
  await d.click(d.page.locator('button[title="Board integration settings"]'), 900);
  await sleep(1100);
  await d.camEl('.dialog, .modal-content, [role=dialog]', 30, 1100, 1.6).catch(() => {});
  await d.move(1430, 420, 900); await d.move(1430, 640, 900);
  await d.holdUntil(11.5);
  await d.stop();
};

// ---------- s09: share ----------
parts.s09 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 1300, y: 500 }; await d.placeCursor();
  await d.rec('s09');
  await sleep(300);
  await d.click(d.page.getByRole('button', { name: 'Share' }), 900);
  await sleep(1100);
  await d.cam(700, 250, 520, 560, 1100, 1.6);
  await d.moveTo(d.page.getByText('Search for people and channels'), 700);
  await sleep(400);
  await d.moveTo(d.page.getByRole('button', { name: /Copy link/ }), 800);
  await d.holdUntil(8);
  await d.stop();
};

// ---------- s10: templates ----------
parts.s10 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 600, y: 900 }; await d.placeCursor();
  await d.rec('s10');
  await sleep(300);
  await d.click(d.page.getByText('+ Add Task Board'), 900);
  await sleep(1300);
  await d.cam(80, 190, 1760, 860, 1000, 1.1);
  for (const name of ['Sprint Planner', 'Roadmap', 'Project Tasks']) {
    await d.click(d.page.locator('.BoardTemplateSelectorItem', { hasText: name }).first(), 700);
    await sleep(1100);
  }
  await d.moveTo(d.page.getByRole('button', { name: 'Use this template' }), 900);
  await d.holdUntil(11);
  await d.stop();
};

// ---------- s11: find boards + Appearance drawer ----------
// Appearance choices are saved to the user's profile, so every s11 part ends by putting the demo user back on defaults.
const APPEARANCE_FIELDS = ['themeName', 'accentColor', 'baseColor', 'layoutName', 'sidebarPosition'];
async function resetAppearance(d) {
  const panelReset = d.page.locator('.AppearancePanel__reset');
  if (await panelReset.count()) { await panelReset.click().catch(() => {}); await sleep(500); }
  const result = await d.page.evaluate(async (fields) => {
    const headers = { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('focalboardSessionId') };
    const me = await (await fetch('/api/v2/users/me', { headers })).json();
    const r = await fetch('/api/v2/users/' + encodeURIComponent(me.id) + '/config', { method: 'PUT', headers, body: JSON.stringify({ deletedFields: fields }) });
    return r.status;
  }, APPEARANCE_FIELDS);
  console.log(result === 200 ? 'appearance reset to defaults' : 'WARNING: reset the demo user appearance by hand (status ' + result + ')');
}
const appearanceButton = (d) => d.page.locator('button[title=Appearance]').first();
const panelButton = (d, kind, name) => d.page.locator('.AppearancePanel__' + kind, { hasText: name }).first();

parts.s11a = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 800, y: 600 }; await d.placeCursor();
  await d.rec('s11a');
  await sleep(300);
  await d.click(d.page.getByText('Find task boards'), 800);
  await sleep(600);
  await d.type('demo', 140);
  await sleep(1300);
  await d.page.keyboard.press('Escape');
  await sleep(400);
  await d.holdUntil(5);
  await d.stop();
};
parts.s11b = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 900, y: 500 }; await d.placeCursor();
  await d.rec('s11b');
  try {
    await sleep(300);
    await d.click(appearanceButton(d), 900);
    await sleep(900);
    for (const theme of ['Sand', 'Midnight', 'Classic', 'Nova']) { await d.click(panelButton(d, 'theme', theme), 650); await sleep(900); }
    await d.page.locator('.AppearancePanel__swatch[title=Teal], .AppearancePanel__swatch[aria-label=Teal]').first().scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    for (const accent of ['Teal', 'Rose', 'Orange']) {
      await d.click(d.page.locator(`.AppearancePanel__swatch:not(.AppearancePanel__swatch--base)[title="${accent}"], .AppearancePanel__swatch:not(.AppearancePanel__swatch--base)[aria-label="${accent}"]`).first(), 550);
      await sleep(700);
    }
    await d.holdUntil(11);
    await d.stop();
  } finally { await resetAppearance(d); }
};
parts.s11c = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 900, y: 500 }; await d.placeCursor();
  await d.rec('s11c');
  try {
    await sleep(300);
    await d.click(appearanceButton(d), 900);
    await sleep(900);
    for (const layout of ['macOS', 'Windows', 'Ubuntu']) { await d.click(panelButton(d, 'layout', layout), 700); await sleep(1500); }
    await d.click(panelButton(d, 'done', 'Done'), 800);
    await sleep(1800);
    await d.holdUntil(11);
    await d.stop();
  } finally { await resetAppearance(d); }
};

// ---------- s12-s16: admin ----------
// The admin user is read from the project's .env (BORINGBOARD_DEFAULTADMIN*), the same account ./deploy creates.
function readEnvFile() {
  const env = {};
  try {
    for (const line of require('fs').readFileSync(__dirname + '/../../.env', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  } catch (e) { /* no .env: fall back to the defaults below */ }
  return env;
}
const dotenv = readEnvFile();
const ADMIN_USER = process.env.ADMIN_USER || dotenv.BORINGBOARD_DEFAULTADMINUSERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || dotenv.BORINGBOARD_DEFAULTADMINPASSWORD || '';
const ADMIN_STATE = __dirname + '/state_admin.json';
const adminMenu = (d, label) => d.page.locator('.octo-sidebar').getByText(label, { exact: true }).first();

parts.a01 = async (d) => {
  await d.ctx.clearCookies();
  await d.goto('/login', 300);
  await d.page.evaluate(() => localStorage.clear());
  await d.goto('/login', 1500);
  d.mouse = { x: 1500, y: 900 }; await d.placeCursor();
  await d.rec('a01');
  await sleep(300);
  await d.cam(720, 250, 480, 580, 1100, 1.6);
  await d.click('#login-username', 700); await d.type(ADMIN_USER, 110);
  await d.click('#login-password', 500); await d.type(ADMIN_PASSWORD, 60);
  await sleep(250);
  await d.moveTo('button[type=submit]', 500);
  await d.page.mouse.down(); await sleep(80); await d.page.mouse.up();
  await d.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {});
  await d.page.evaluate(() => { document.body.style.transition = 'none'; document.body.style.transform = ''; window.__cam = { s: 1, tx: 0, ty: 0 }; });
  await sleep(1200);
  await d.move(120, 330, 900);
  await d.holdUntil(7.5);
  await d.stop();
  await d.ctx.storageState({ path: ADMIN_STATE });
};
parts.a02 = async (d) => {
  await d.goto('/users', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a02');
  await sleep(400);
  await d.cam(250, 0, 1670, 560, 1200, 1.3);
  await d.move(1000, 270, 900); await d.move(1000, 330, 600);
  await d.moveTo(d.page.getByRole('button', { name: /Add User/ }), 900);
  await d.holdUntil(7);
  await d.stop();
};
parts.a03 = async (d) => {
  await d.goto('/system-settings', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a03');
  await sleep(400);
  await d.cam(250, 60, 1300, 640, 1200, 1.4);
  await d.move(700, 330, 800); await d.move(700, 520, 800);
  for (const tab of ['Modules', 'Notification', 'General']) {
    await d.click(d.page.getByText(tab, { exact: true }).first(), 700);
    await sleep(1300);
  }
  await d.holdUntil(13);
  await d.stop();
};
parts.a04 = async (d) => {
  await d.goto('/activity-logs', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a04');
  await sleep(400);
  await d.cam(250, 60, 1670, 700, 1200, 1.25);
  await d.move(1100, 470, 900); await d.move(1100, 700, 1200);
  await d.camReset(800);
  await d.holdUntil(7.5);
  await d.stop();
};
parts.a05a = async (d) => {
  await d.goto('/reminders', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a05a');
  await sleep(400);
  await d.cam(250, 60, 1670, 560, 1200, 1.3);
  await d.move(800, 500, 900);
  await d.moveTo(d.page.getByRole('button', { name: /Add Reminder/ }), 900);
  await d.holdUntil(6);
  await d.stop();
};
parts.a05b = async (d) => {
  await d.goto('/announcements', 1800);
  d.mouse = { x: 1500, y: 300 }; await d.placeCursor();
  await d.rec('a05b');
  await sleep(400);
  await d.cam(250, 60, 1670, 560, 1200, 1.3);
  await d.moveTo(d.page.getByRole('button', { name: /Add Announcement/ }), 900);
  await d.holdUntil(5.5);
  await d.stop();
};
parts.a06a = async (d) => {
  await d.goto('/plugin', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a06a');
  await sleep(400);
  await d.cam(250, 60, 1300, 700, 1200, 1.4);
  await d.move(500, 280, 800); await d.move(900, 480, 900);
  await d.holdUntil(6);
  await d.stop();
};
parts.a06b = async (d) => {
  await d.goto('/templates', 1800);
  d.mouse = { x: 900, y: 600 }; await d.placeCursor();
  await d.rec('a06b');
  await sleep(400);
  for (const name of ['Sprint Planner', 'Roadmap']) {
    await d.click(d.page.locator('.BoardTemplateSelectorItem', { hasText: name }).first(), 800).catch(() => {});
    await sleep(1200);
  }
  await d.holdUntil(6);
  await d.stop();
};

// ---------- outro ----------
parts.outro = async (d) => {
  await d.page.setContent('<html><body style="background:#1e1b4b"></body></html>');
  d.mouse = { x: 2100, y: 1200 };
  await d.rec('outro');
  await d.page.setContent(cards.outro, { waitUntil: 'load' });
  await d.holdUntil(7);
  await d.stop();
};

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(parts);
  const d = new Director(OUT);
  await d.start(STATE);
  try {
    for (const n of names) {
      if (!parts[n]) { console.log('unknown part', n); continue; }
      await d.useState(/^a\d/.test(n) ? ADMIN_STATE : STATE);
      try { await parts[n](d); } catch (e) {
        console.log('FAILED', n, e.message.split('\n')[0]);
        if (d.recording) await d.stop().catch(() => {});
        if (movedCard) await restoreMovedCard(d).catch(() => {});
      }
    }
  } finally {
    await d.close();
  }
})();
