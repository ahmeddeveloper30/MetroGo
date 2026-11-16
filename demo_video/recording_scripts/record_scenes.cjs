/**
 * Smart Metro — 60s seminar demo: real-website scene recorder.
 *
 * Records each storyboard scene as a separate WebM video (1920x1080) using
 * Playwright Chromium on the local dev server. Arabic captions + animated
 * arrows are injected INTO the live page (accurate positioning, real RTL).
 * No credentials are ever shown: password fields stay masked by the app.
 *
 * Usage:
 *   node demo_video/recording_scripts/record_scenes.js prep     # login sessions → storage states (not recorded)
 *   node demo_video/recording_scripts/record_scenes.js record   # record all 8 scenes
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const DIR = path.join(__dirname, '..');
const RAW = path.join(DIR, 'raw');
const ASSETS = path.join(DIR, 'assets');
const SCRIPTS = path.join(__dirname);

const USER = { email: 'passenger@metro.eg', pass: 'Metro1234' };
const ADMIN = { email: 'admin@metro.eg', pass: 'Admin1234' };
const DEMO_REG = { name: 'مستخدم تجريبي', email: 'demo.video@metro.eg', phone: '01000000000', pass: 'Demo1234' };

/** scene -> seconds ON SCREEN (final video length; load/setup time is trimmed in editing) */
const DUR = { intro: 5.4, home: 7.4, login: 8.4, trip: 15.4, services: 11.0, admin: 8.4, future: 4.4, closing: 2.4 };

fs.mkdirSync(RAW, { recursive: true });

// ---------------------------------------------------------------- overlays
const OVERLAY_CSS = `
  .ov-wrap { position: fixed; inset: 0; pointer-events: none; z-index: 99999; font-family: 'IBM Plex Sans Arabic','Segoe UI',sans-serif; }
  .ov-pill {
    position: fixed; padding: 14px 30px; border-radius: 9999px;
    background: rgba(7,18,36,.92); border: 1.5px solid rgba(231,36,52,.75);
    color: #fff; font-size: 26px; font-weight: 800; line-height: 1;
    box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 24px rgba(231,36,52,.25);
    opacity: 0; transform: translateY(14px); transition: opacity .45s ease, transform .45s ease;
  }
  .ov-pill.show { opacity: 1; transform: translateY(0); }
  .ov-pill small { display: block; margin-top: 7px; font-size: 15px; font-weight: 600; color: rgba(255,255,255,.65); }
  .ov-arrow { position: fixed; overflow: visible; opacity: 0; transition: opacity .45s ease .2s; }
  .ov-arrow.show { opacity: 1; }
  .ov-arrow path { stroke: #E72434; stroke-width: 5; fill: none; stroke-linecap: round;
    stroke-dasharray: 700; stroke-dashoffset: 700; animation: ovdraw .8s ease-out .35s forwards;
    filter: drop-shadow(0 0 6px rgba(231,36,52,.8)); }
  .ov-arrow polygon { fill: #E72434; opacity: 0; animation: ovhead .35s ease-out .95s forwards;
    filter: drop-shadow(0 0 6px rgba(231,36,52,.8)); }
  @keyframes ovdraw { to { stroke-dashoffset: 0; } }
  @keyframes ovhead { to { opacity: 1; } }
`;

async function injectOverlayCSS(page) {
  // Kept as no-op: overlay CSS is now installed per-context via addInitScript.
  return page;
}

/** caption pill at (x,y) + curved arrow from pill to element edge */
async function addCallout(page, { caption, sub, pill, target, direction = 'up' }) {
  const box = await page.locator(target).first().boundingBox();
  if (!box) { console.warn('callout target not found:', target); return; }
  const tx = box.x + box.width / 2;
  const ty = direction === 'up' ? box.y : box.y + box.height;
  const px = pill.x, py = pill.y;
  await page.evaluate(({ caption, sub, px, py, tx, ty, direction }) => {
    let wrap = document.querySelector('.ov-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ov-wrap'; document.body.appendChild(wrap); }
    // sequential captions: clear previous pill/arrow so they never accumulate
    wrap.querySelectorAll('.ov-pill, .ov-arrow').forEach(el => el.remove());
    const pillEl = document.createElement('div');
    pillEl.className = 'ov-pill';
    pillEl.style.left = px + 'px'; pillEl.style.top = py + 'px';
    pillEl.textContent = caption;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; pillEl.appendChild(s); }
    wrap.appendChild(pillEl);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ov-arrow');
    const pad = 90;
    const x0 = Math.min(px, tx) - pad, y0 = Math.min(py, ty) - pad;
    const x1 = Math.max(px, tx) + pad, y1 = Math.max(py, ty) + pad;
    svg.setAttribute('width', Math.max(60, x1 - x0)); svg.setAttribute('height', Math.max(60, y1 - y0));
    svg.style.left = x0 + 'px'; svg.style.top = y0 + 'px';
    const cx = tx - x0, cy = ty - y0, sx = px - x0, sy = py - y0;
    const mx = (sx + cx) / 2 + (direction === 'up' ? -55 : 55);
    const my = (sy + cy) / 2;
    svg.innerHTML =
      `<path d="M${sx},${sy} Q${mx},${my} ${cx},${cy}"></path>` +
      `<polygon points="${cx},${cy} ${cx - 9},${cy - (direction === 'up' ? 16 : 2)} ${cx + 9},${cy - (direction === 'up' ? 2 : -16)}"></polygon>`;
    wrap.appendChild(svg);
    requestAnimationFrame(() => { pillEl.classList.add('show'); svg.classList.add('show'); });
  }, { caption, sub, px, py, tx, ty, direction });
}

// ---------------------------------------------------------------- helpers
async function doLogin(page, account, urlGlob) {
  await page.goto(BASE + '/login');
  await page.waitForSelector('form', { timeout: 20000 });
  const inputs = page.locator('form input');
  await inputs.nth(0).fill(account.email);
  await inputs.nth(1).fill(account.pass);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL(urlGlob, { timeout: 20000 });
}

async function pickStation(page, triggerId, query, wanted) {
  const btn = page.locator(`#${triggerId}`);
  if (!(await btn.count())) { console.warn('missing trigger', triggerId); return; }
  await btn.click();
  await page.keyboard.type(query, { delay: 50 });
  await page.waitForTimeout(450);
  await page.locator('[role="option"]', { hasText: wanted }).first().click();
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------- prep
async function prep(browser) {
  let ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  let page = await ctx.newPage();
  await doLogin(page, USER, '**/app');
  await ctx.storageState({ path: path.join(SCRIPTS, 'user_state.json') });
  await ctx.close();
  console.log('✓ user session saved');

  ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  page = await ctx.newPage();
  await doLogin(page, ADMIN, '**/dashboard');
  await ctx.storageState({ path: path.join(SCRIPTS, 'admin_state.json') });
  await ctx.close();
  console.log('✓ admin session saved');
}

// ---------------------------------------------------------------- recording
async function record(browser) {
  const timings = {};

  /** create a fresh recording context, run the scene body, close, save video */
  async function scene(name, stateFile, body) {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
      ...(stateFile ? { storageState: path.join(SCRIPTS, stateFile) } : {}),
    });
    // Overlay CSS on EVERY document — survives navigations (addStyleTag did not).
    await ctx.addInitScript((css) => {
      const add = () => {
        const s = document.createElement('style');
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
      else add();
    }, OVERLAY_CSS);
    const page = await ctx.newPage();
    const t0 = Date.now();
    await body(page);
    timings[name] = { dur: DUR[name], loadMs: Math.max(0, Date.now() - t0 - DUR[name] * 1000) };
    const video = page.video();
    await ctx.close();
    await video.saveAs(path.join(RAW, `${name}.webm`));
    console.log(`✓ ${name} (on-screen ${DUR[name]}s, load+setup ${timings[name].loadMs}ms)`);
  }

  // ---- Scene 1: intro card
  await scene('intro', null, async (page) => {
    await page.goto('file:///' + path.join(ASSETS, 'intro.html').replace(/\\/g, '/'));
    await page.waitForSelector('h2');
    await page.waitForTimeout(DUR.intro * 1000);
  });

  // ---- Scene 2: homepage (logged-in passenger)
  await scene('home', 'user_state.json', async (page) => {
    await page.goto(BASE + '/app');
    await page.waitForSelector('main');
    await page.waitForTimeout(400);
    await addCallout(page, { caption: 'واجهة ذكية وسهلة الاستخدام', pill: { x: 640, y: 26 }, target: 'main form input >> nth=0', direction: 'down' });
    await page.waitForTimeout(2200);
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, -280);
    await page.waitForTimeout(500);
    await addCallout(page, { caption: 'خدمات مترو القاهرة في مكان واحد', pill: { x: 640, y: 26 }, target: 'main .grid >> nth=1', direction: 'down' });
    await page.waitForTimeout(Math.max(0, DUR.home * 1000 - 400 - 2200 - 800 - 500 - 2400));
  });

  // ---- Scene 3: real user login (password masked)
  await scene('login', null, async (page) => {
    await page.goto(BASE + '/login');
    await page.waitForSelector('form');
    await addCallout(page, { caption: 'تسجيل دخول المستخدم', pill: { x: 1160, y: 235 }, target: 'form button[type=submit]', direction: 'up' });
    const inputs = page.locator('form input');
    await inputs.nth(0).click();
    await inputs.nth(0).pressSequentially(USER.email, { delay: 45 });
    await page.waitForTimeout(350);
    await inputs.nth(1).click();
    await inputs.nth(1).pressSequentially(USER.pass, { delay: 55 }); // masked by the app itself
    await page.waitForTimeout(450);
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/app', { timeout: 20000 });
    await page.waitForTimeout(Math.max(0, DUR.login * 1000 - 3500));
  });

  // ---- Scene 4: trip planning + animated journey on the interactive map
  await scene('trip', 'user_state.json', async (page) => {
    await page.goto(BASE + '/app/trip');
    await page.waitForSelector('#trip-from', { timeout: 20000 });
    await page.waitForTimeout(400);

    await addCallout(page, { caption: 'ابحث عن محطتك', sub: 'بالعربية أو الإنجليزية', pill: { x: 1180, y: 30 }, target: '#trip-from', direction: 'down' });
    await page.waitForTimeout(1700);
    await pickStation(page, 'trip-from', 'السادات', 'أنور السادات');

    await addCallout(page, { caption: 'حدد نقطة الانطلاق والوجهة', pill: { x: 1180, y: 30 }, target: '#trip-to', direction: 'down' });
    await page.waitForTimeout(900);
    await pickStation(page, 'trip-to', 'المنيب', 'المنيب');

    // route auto-calculates → interactive map appears and auto-plays
    await page.waitForSelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"]', { timeout: 20000 });
    await page.waitForTimeout(800);
    await addCallout(page, { caption: 'اكتشف المسار المناسب', sub: 'رسم متحرك للرحلة على الخريطة', pill: { x: 560, y: 30 }, target: 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]', direction: 'up' });
    await page.waitForTimeout(4300); // watch the moving train
    await addCallout(page, { caption: 'خطط رحلتك بسهولة', pill: { x: 560, y: 30 }, target: 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]', direction: 'up' });
    await page.waitForTimeout(Math.max(0, DUR.trip * 1000 - 400 - 1700 - 900 - 800 - 4300 - 2400));
  });

  // ---- Scene 5: summary + controls + real logout + real register success
  await scene('services', 'user_state.json', async (page) => {
    await page.goto(BASE + '/app/trip');
    await page.waitForSelector('#trip-from', { timeout: 20000 });
    await page.waitForTimeout(350);
    await pickStation(page, 'trip-from', 'السادات', 'أنور السادات');
    await pickStation(page, 'trip-to', 'المنيب', 'المنيب');
    await page.waitForSelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"]', { timeout: 20000 });

    const nextBtn = page.locator('button[aria-label="المحطة التالية"]');
    if (await nextBtn.count() && (await nextBtn.isEnabled())) { await nextBtn.click().catch(() => {}); await page.waitForTimeout(300); await nextBtn.click().catch(() => {}); }
    await addCallout(page, { caption: 'تفاصيل الرحلة والتذكرة', sub: 'الزمن · المحطات · سعر التذكرة', pill: { x: 560, y: 30 }, target: 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]', direction: 'up' });
    await page.waitForTimeout(1800);
    await addCallout(page, { caption: 'محاكاة حية لرحلتك', sub: 'تشغيل · إيقاف · سرعة · محطة تلو أخرى', pill: { x: 1150, y: 820 }, target: 'button[aria-label="المحطة التالية"], button[aria-label="تشغيل الرحلة"]', direction: 'up' });
    await page.waitForTimeout(1600);

    // real logout on camera (pick the visible button — sidebar on desktop)
    const logout = page.locator('button[aria-label="تسجيل الخروج"]:visible').first();
    await logout.click();
    await page.waitForURL('**/login', { timeout: 20000 });

    // real registration → real success animation (demo account, disclosed in docs)
    await page.goto(BASE + '/register');
    await page.waitForSelector('form');
    const regInputs = page.locator('form input');
    await regInputs.nth(0).fill(DEMO_REG.name);
    await regInputs.nth(1).fill(DEMO_REG.email);
    await regInputs.nth(2).fill(DEMO_REG.phone);
    await regInputs.nth(3).fill(DEMO_REG.pass);
    await regInputs.nth(4).fill(DEMO_REG.pass);
    await page.locator('form button[type=submit]').click();
    try {
      await page.waitForSelector('text=تم إنشاء حسابك بنجاح', { timeout: 12000 });
    } catch { /* truthful failure state is captured as-is */ }
    await addCallout(page, { caption: 'تسجيل فوري وآمن', pill: { x: 640, y: 26 }, target: 'h1:has-text("تم إنشاء حسابك بنجاح")', direction: 'down' }).catch(() => {});
    await page.waitForTimeout(Math.max(0, DUR.services * 1000 - 350 - 1800 - 1600 - 2400));
  });

  // ---- Scene 6: real admin login + real admin shell
  await scene('admin', null, async (page) => {
    await page.goto(BASE + '/login');
    await page.waitForSelector('form');
    const inputs = page.locator('form input');
    await inputs.nth(0).click();
    await inputs.nth(0).pressSequentially(ADMIN.email, { delay: 45 });
    await page.waitForTimeout(300);
    await inputs.nth(1).click();
    await inputs.nth(1).pressSequentially(ADMIN.pass, { delay: 55 });
    await page.waitForTimeout(400);
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await page.waitForSelector('aside');
    await addCallout(page, { caption: 'لوحة تحكم المسؤول', pill: { x: 1380, y: 30 }, target: 'aside nav a >> nth=0', direction: 'down' });
    await page.waitForTimeout(2500);
    await addCallout(page, { caption: 'إدارة ومتابعة النظام', pill: { x: 1380, y: 30 }, target: 'aside nav a >> nth=8', direction: 'down' });
    await page.waitForTimeout(Math.max(0, DUR.admin * 1000 - 3500 - 2500 - 2400));
  });

  // ---- Scene 7: future features (honest stub pages)
  await scene('future', 'admin_state.json', async (page) => {
    await page.goto(BASE + '/users');
    await page.waitForSelector('main');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      let wrap = document.querySelector('.ov-wrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ov-wrap'; document.body.appendChild(wrap); }
      const big = document.createElement('div');
      big.className = 'ov-pill show';
      big.style.cssText += 'left:50%;top:44%;font-size:40px;padding:26px 60px;background:rgba(7,18,36,.85);border-color:rgba(242,178,27,.8);transform:translate(-50%,-50%);';
      big.textContent = 'مميزات قيد التطوير';
      wrap.appendChild(big);
      const small = document.createElement('div');
      small.className = 'ov-pill';
      small.style.cssText += 'left:50%;top:57%;font-size:21px;font-weight:600;background:rgba(7,18,36,.75);border-color:rgba(255,255,255,.25);transform:translate(-50%,-50%);';
      small.textContent = 'توقعات الازدحام بالذكاء الاصطناعي · تحليلات متقدمة · إشعارات ذكية';
      wrap.appendChild(small);
      requestAnimationFrame(() => { big.classList.add('show'); small.classList.add('show'); });
    });
    await page.waitForTimeout(1800);
    await page.goto(BASE + '/ai');
    await page.waitForSelector('main');
    await page.evaluate(() => {
      let wrap = document.querySelector('.ov-wrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ov-wrap'; document.body.appendChild(wrap); }
      const big = document.createElement('div');
      big.className = 'ov-pill show';
      big.style.cssText += 'left:50%;top:44%;font-size:40px;padding:26px 60px;background:rgba(7,18,36,.85);border-color:rgba(242,178,27,.8);transform:translate(-50%,-50%);';
      big.textContent = 'مميزات قيد التطوير';
      wrap.appendChild(big);
      const small = document.createElement('div');
      small.className = 'ov-pill';
      small.style.cssText += 'left:50%;top:57%;font-size:21px;font-weight:600;background:rgba(7,18,36,.75);border-color:rgba(255,255,255,.25);transform:translate(-50%,-50%);';
      small.textContent = 'توقعات الازدحام بالذكاء الاصطناعي · تحليلات متقدمة · إشعارات ذكية';
      wrap.appendChild(small);
      requestAnimationFrame(() => { big.classList.add('show'); small.classList.add('show'); });
    });
    await page.waitForTimeout(800);
  });

  // ---- Scene 8: closing card
  await scene('closing', null, async (page) => {
    await page.goto('file:///' + path.join(ASSETS, 'closing.html').replace(/\\/g, '/'));
    await page.waitForSelector('.tagline');
    await page.waitForTimeout(DUR.closing * 1000);
  });

  fs.writeFileSync(path.join(RAW, 'timings.json'), JSON.stringify(timings, null, 2));
  console.log('timings.json written');
}

// ---------------------------------------------------------------- main
(async () => {
  const mode = process.argv[2] || 'all';
  // system Chrome — no browser download required (CDN kept resetting)
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    if (mode === 'prep' || mode === 'all') { await prep(browser); console.log('✓ prep done'); }
    if (mode === 'record' || mode === 'all') await record(browser);
  } finally { await browser.close(); }
})().catch((e) => { console.error('RECORD FAILED:', e); process.exit(1); });
