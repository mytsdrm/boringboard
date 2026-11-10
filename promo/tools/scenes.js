// Records every scene part into rec/<part>/ (jpeg frames + ffconcat list).
// Usage: node scenes.js [part names...]   (default: all, in order)
// Run s01b first: it logs in as the demo user and saves the session for the other parts.
// Nothing on the demo board is changed for good: the card moved in s03 is moved back after recording,
// dialogs are closed without saving, and the theme is set back to the default.
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
  await d.page.setContent('<html><body style="background:#0b2357"></body></html>');
  d.mouse = { x: 2100, y: 1200 };
  await d.rec('s01a');
  await d.page.setContent(cards.intro, { waitUntil: 'load' });
  await d.holdUntil(5.4);
  await d.stop();
};
parts.s01b = async (d) => {
  await d.ctx.clearCookies();
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

// ---------- s11: find boards + dark theme ----------
parts.s11 = async (d) => {
  await openView(d, 'Board');
  d.mouse = { x: 800, y: 600 }; await d.placeCursor();
  await d.rec('s11');
  await sleep(300);
  await d.click(d.page.getByText('Find task boards'), 800);
  await sleep(600);
  await d.type('demo', 140);
  await sleep(1200);
  await d.page.keyboard.press('Escape');
  await sleep(500);
  await d.click(d.page.locator('.octo-sidebar .menu-entry, .octo-sidebar').getByText('Settings', { exact: true }).last(), 900);
  await sleep(500);
  await d.moveTo(d.page.locator('.menu-name', { hasText: /^Set theme$/ }), 700);
  await sleep(600);
  // Go sideways into the submenu first: a diagonal path crosses "Set language" and opens that submenu instead.
  const dark = await d.box(d.page.locator('.menu-name', { hasText: /^Dark theme$/ }));
  await d.move(dark.x + 30, d.mouse.y, 400);
  await d.click(d.page.locator('.menu-name', { hasText: /^Dark theme$/ }), 500);
  await sleep(500);
  await d.move(1200, 600, 900);
  await d.holdUntil(9.5);
  await d.stop();
  // The theme lives in this browser's localStorage only; switch back anyway so later parts record in the default theme.
  await setTheme(d, 'Default theme').catch(() => console.log('theme not switched back'));
};
async function setTheme(d, name) {
  await d.page.keyboard.press('Escape');
  await d.page.locator('.octo-sidebar').getByText('Settings', { exact: true }).last().click();
  await sleep(400);
  await d.page.locator('.menu-name', { hasText: /^Set theme$/ }).hover();
  await sleep(500);
  await d.page.locator('.menu-name', { hasText: new RegExp('^' + name + '$') }).click();
  await sleep(600);
}

// ---------- s12: outro ----------
parts.s12 = async (d) => {
  await d.page.setContent('<html><body style="background:#0b2357"></body></html>');
  d.mouse = { x: 2100, y: 1200 };
  await d.rec('s12');
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
