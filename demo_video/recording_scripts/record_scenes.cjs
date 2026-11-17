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

/** scene -> seconds ON SCREEN (final video length; load/setup time is trimmed in editing)
 *  v8: the Trip Planning scene is expanded to 24.4s (map zoom + journey details +
 *  full itinerary + transfer demo); the other scenes keep identical content with
 *  slightly shorter hold times so the final cut stays at exactly 60s. */
const DUR = { intro: 3.6, home: 5.6, login: 6.6, trip: 24.4, services: 11.0, admin: 6.8, future: 2.8, closing: 2.0 };

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
  /* ---- annotation arrows: minimal modern UI style ----
   * White shaft over a soft dark under-stroke (contrast on any background),
   * symmetric arrowhead oriented along the curve tangent, subtle draw-in.
   */
  .ov-arrow {
    position: fixed; overflow: visible; pointer-events: none;
    opacity: 0; transition: opacity .3s ease;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,.55));
  }
  .ov-arrow.show { opacity: 1; }
  .ov-arrow path { fill: none; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
  .ov-arrow.show path { transition: stroke-dashoffset .45s ease-out; stroke-dashoffset: 0; }
  .ov-arrow .shaft-under { stroke: #0A1B33; stroke-width: 10; opacity: .58; }
  .ov-arrow .shaft { stroke: #FFFFFF; stroke-width: 4.6; }
  .ov-arrow polygon {
    fill: #FFFFFF; stroke: #0A1B33; stroke-width: 2.4; stroke-linejoin: round;
    opacity: 0; transition: opacity .22s ease .34s;
  }
  .ov-arrow.show polygon { opacity: 1; }
`;

async function injectOverlayCSS(page) {
  // Kept as no-op: overlay CSS is now installed per-context via addInitScript.
  return page;
}

/** Wait until an element's bounding box stops changing (layout settled).
 *  Prevents arrows aimed at a bbox measured before the page finished laying out. */
async function waitStableBox(page, selector, { timeout = 4000 } = {}) {
  const loc = page.locator(selector).first();
  const start = Date.now();
  let prev = await loc.boundingBox();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(250);
    const cur = await loc.boundingBox();
    if (prev && cur &&
        Math.abs(cur.x - prev.x) < 1 && Math.abs(cur.y - prev.y) < 1 &&
        Math.abs(cur.width - prev.width) < 1 && Math.abs(cur.height - prev.height) < 1) return cur;
    prev = cur;
  }
  return prev;
}

/** Pan the interactive metro map with real pointer drags so that user-space point
 *  (ux,uy) sits at the canvas center. Reads the live translate/scale transform,
 *  then performs one horizontal + one vertical drag (drag anchors ax/ay/bx/by are
 *  chosen to stay inside the canvas and away from station hover targets). */
async function panMapTo(page, sel, { ux, uy, ax, ay, bx, by }) {
  const rect = await page.locator(sel).first().boundingBox();
  const tr = await page.locator(`${sel} > g[transform]`).first().getAttribute('transform');
  const m = /translate\(([-\d.eE]+)\s+([-\d.eE]+)\)\s+scale\(([-\d.eE]+)\)/.exec(tr ?? '');
  if (!rect || !m) return;
  const tx = +m[1], ty = +m[2], k = +m[3];
  const dx = (500 - k * ux - tx) * rect.width / 1000;  // Δpx = Δuser·(w/1000)
  const dy = (700 - k * uy - ty) * rect.height / 1400; // Δpx = Δuser·(h/1400)
  const drag = async (sx, sy, ddx, ddy) => {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + ddx, sy + ddy, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
  if (Math.abs(dx) > 1) await drag(ax, ay, dx, 0);
  if (Math.abs(dy) > 1) await drag(bx, by, 0, dy);
}

/** Screen (page) coordinates of an SVG user-space point under the interactive
 *  map's live transform. Uses the transform ATTRIBUTE (CSS animations such as
 *  the pulsing walk badge can temporarily override the visual transform, so
 *  never target animated map elements with a selector — compute instead). */
async function mapUserToScreen(page, sel, ux, uy) {
  const rect = await page.locator(sel).first().boundingBox();
  const tr = await page.locator(`${sel} > g[transform]`).first().getAttribute('transform');
  const m = /translate\(([-\d.eE]+)\s+([-\d.eE]+)\)\s+scale\(([-\d.eE]+)\)/.exec(tr ?? '');
  if (!rect || !m) return null;
  const tx = +m[1], ty = +m[2], k = +m[3];
  const s = Math.min(rect.width / 1000, rect.height / 1400);
  const offX = (rect.width - 1000 * s) / 2, offY = (rect.height - 1400 * s) / 2;
  return {
    x: rect.x + offX + (k * ux + tx) * s,
    y: rect.y + offY + (k * uy + ty) * s,
  };
}

/** caption pill at (x,y) + minimal modern arrow from the pill's edge to the target edge.
 * Geometry rules: arrow starts ON the pill boundary (nearest side), ends 8px short of
 * the target edge (never touching/covering it), gentle adaptive curve bowing toward
 * free space, symmetric arrowhead oriented along the curve's end tangent — fully
 * inside the SVG bounds so it can never be clipped. */
async function addCallout(page, { caption, sub, pill, target, point, direction = 'up' }) {
  // target: selector → bbox center; or an explicit page point (point: {x, y})
  const box = point
    ? { x: point.x, y: point.y, width: 0, height: 0 }
    : await page.locator(target).first().boundingBox();
  if (!box) { console.warn('callout target not found:', target); return; }
  const tx = box.x + box.width / 2;
  const ty = direction === 'up' ? box.y : box.y + box.height;
  const px = pill.x, py = pill.y;
  await page.evaluate(({ caption, sub, px, py, tx, ty }) => {
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

    // --- measure the pill, exit from the boundary side facing the target ---
    const r = pillEl.getBoundingClientRect();
    const pcx = r.left + r.width / 2, pcy = r.top + r.height / 2;
    const vdx = tx - pcx, vdy = ty - pcy;
    const vd = Math.hypot(vdx, vdy) || 1;
    const nx = vdx / vd, ny = vdy / vd;
    const halfW = Math.max(1, r.width / 2), halfH = Math.max(1, r.height / 2);
    const tEdgeX = Math.abs(nx) > 1e-6 ? halfW / Math.abs(nx) : Infinity;
    const tEdgeY = Math.abs(ny) > 1e-6 ? halfH / Math.abs(ny) : Infinity;
    const tExit = Math.min(tEdgeX, tEdgeY);
    const sx = pcx + nx * (tExit + 12), sy = pcy + ny * (tExit + 12);

    // --- aim point: stop 8px short of the target edge ---
    const ax = tx, ay = ty;
    const ad = Math.hypot(ax - sx, ay - sy) || 1;
    const ux0 = (ax - sx) / ad, uy0 = (ay - sy) / ad;
    const S = { x: ax - ux0 * 8, y: ay - uy0 * 8 };

    // --- gentle curve: bow perpendicular to the travel direction, choose the side
    //     whose control point sits farther from the viewport center (free space) ---
    const bow = Math.min(70, Math.max(26, ad * 0.18));
    const candidates = [1, -1].map((sign) => ({
      sign,
      mx: (sx + S.x) / 2 - uy0 * bow * sign,
      my: (sy + S.y) / 2 + ux0 * bow * sign,
    }));
    candidates.sort((a, b) =>
      Math.hypot(b.mx - 960, b.my - 540) - Math.hypot(a.mx - 960, a.my - 540));
    const C = candidates[0];
    const Cp = { x: C.mx, y: C.my }; // normalized control point (x/y keys)

    // --- arrowhead: symmetric wedge along the curve's end tangent (S - C) ---
    const hdx = S.x - Cp.x, hdy = S.y - Cp.y;
    const hd = Math.hypot(hdx, hdy) || 1;
    const ux = hdx / hd, uy = hdy / hd;          // tangent at the tip
    const pxv = -uy, pyv = ux;                    // perpendicular
    const headLen = 18, headHalf = 8;
    const base = { x: S.x - ux * headLen, y: S.y - uy * headLen };
    const b1 = { x: base.x + pxv * headHalf, y: base.y + pyv * headHalf };
    const b2 = { x: base.x - pxv * headHalf, y: base.y - pyv * headHalf };
    // shaft ends slightly inside the head so the two connect naturally
    const end = { x: base.x + ux * 3.5, y: base.y + uy * 3.5 };

    // --- svg bounds with generous padding: nothing can ever be clipped ---
    const pts = [S, b1, b2, { x: sx, y: sy }, Cp, end];
    const pad = 60;
    const x0 = Math.min(...pts.map((p) => p.x)) - pad, y0 = Math.min(...pts.map((p) => p.y)) - pad;
    const x1 = Math.max(...pts.map((p) => p.x)) + pad, y1 = Math.max(...pts.map((p) => p.y)) + pad;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ov-arrow');
    svg.setAttribute('width', Math.max(60, x1 - x0));
    svg.setAttribute('height', Math.max(60, y1 - y0));
    svg.style.left = x0 + 'px'; svg.style.top = y0 + 'px';
    const rel = (p) => `${(p.x - x0).toFixed(1)},${(p.y - y0).toFixed(1)}`;
    const d = `M${rel({ x: sx, y: sy })} Q${rel(Cp)} ${rel(end)}`;
    svg.innerHTML =
      `<polygon points="${[S, b1, b2].map(rel).join(' ')}"></polygon>` +
      `<path class="shaft-under" pathLength="1" d="${d}"></path>` +
      `<path class="shaft" pathLength="1" d="${d}"></path>`;
    wrap.appendChild(svg);
    requestAnimationFrame(() => { pillEl.classList.add('show'); svg.classList.add('show'); });
  }, { caption, sub, px, py, tx, ty });
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
    await page.waitForTimeout(1800);
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, -280);
    await page.waitForTimeout(500);
    await addCallout(page, { caption: 'خدمات مترو القاهرة في مكان واحد', pill: { x: 640, y: 26 }, target: 'main .grid >> nth=1', direction: 'down' });
    await page.waitForTimeout(Math.max(0, DUR.home * 1000 - 400 - 1800 - 800 - 500 - 1900));
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

  // ---- Scene 4: trip planning — zoomed map, journey details, full itinerary + transfer
  // Route demonstrated (genuine app data): كوبري القبة (الخط الأول) → فيصل (الخط الثاني)
  // with a transfer at أنور السادات — ١٢ محطة، ٢٩ دقيقة، تبديل واحد.
  await scene('trip', 'user_state.json', async (page) => {
    await page.goto(BASE + '/app/trip');
    await page.waitForSelector('#trip-from', { timeout: 20000 });
    await page.waitForTimeout(350);
    // content timer starts AFTER the page settles — goto/load time is
    // front-of-video setup, which the build trims via timings.loadMs
    const tripT0 = Date.now();

    await addCallout(page, { caption: 'ابحث عن محطتك', sub: 'بالعربية أو الإنجليزية', pill: { x: 640, y: 20 }, target: '#trip-from', direction: 'up' });
    await page.waitForTimeout(1000);
    await pickStation(page, 'trip-from', 'كوبري القبة', 'كوبري القبة');

    await addCallout(page, { caption: 'حدد محطة الوصول', pill: { x: 560, y: 20 }, target: '#trip-to', direction: 'up' });
    await page.waitForTimeout(800);
    await pickStation(page, 'trip-to', 'فيصل', 'فيصل');

    // route auto-calculates → interactive map appears and auto-plays (×1)
    const mapSel = 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]';
    await page.waitForSelector(mapSel, { timeout: 20000 });
    await waitStableBox(page, mapSel); // layout must settle before zooming/aiming

    // bump playback to ×2 so the full 12-hop journey fits the scene — keep it
    // running through the zoom so the route keeps drawing while we move
    await page.locator('button:has-text("سرعة")').first().click();

    // ---- zoom into the map (5 × تكبير → scale cap 3)...
    const zoomBtn = page.locator('button[aria-label="تكبير"]');
    for (let i = 0; i < 5; i++) { await zoomBtn.click().catch(() => {}); await page.waitForTimeout(200); }
    // freeze playback well below the interchange hop (≈ ٣-٤ / ١٢) so the pan
    // and the step-to-transfer below can never overshoot أنور السادات
    await page.locator('button[aria-label="إيقاف مؤقت"]').click();
    // ...then pan so the whole route (bbox center ≈ user 367,557) sits centered
    await panMapTo(page, mapSel, { ux: 367, uy: 557, ax: 1470, ay: 711, bx: 697, by: 859 });

    await addCallout(page, { caption: 'مسارك مرسوم بالألوان على الخريطة', sub: 'من كوبري القبة إلى فيصل', pill: { x: 560, y: 30 }, target: mapSel, direction: 'up' });
    await page.waitForTimeout(500);

    // ---- step the journey forward while the callout is up, exactly onto the
    // interchange hop ٧ (أنور السادات). The first click snaps the paused
    // progress to an exact integer (counter then reads the true hop), then we
    // step one hop at a time. If we ever land past hop ٧, restart and step up
    // from the beginning — always ends paused exactly at the interchange.
    const counter = page.locator('span:has-text("محطة")').first();
    const nextBtn = page.locator('button[aria-label="المحطة التالية"]');
    const counterText = async () => String(await counter.textContent().catch(() => ''));
    const stepTo7 = async () => {
      for (let i = 0; i < 10; i++) {
        if ((await counterText()).includes('٧ / ١٢')) return true;
        if (!(await nextBtn.isEnabled().catch(() => false))) return false;
        await nextBtn.click();
        await page.waitForTimeout(160);
      }
      return false;
    };
    await nextBtn.click(); // → exact integer hop
    await page.waitForTimeout(160);
    if (!(await stepTo7())) { // overshot past the interchange — restart cleanly
      await page.locator('button[aria-label="إعادة تشغيل"]').click();
      await page.waitForTimeout(150);
      await page.locator('button[aria-label="إيقاف مؤقت"]').click();
      await nextBtn.click();
      await page.waitForTimeout(160);
      await stepTo7();
    }
    await page.waitForTimeout(900);

    // ---- transfer demonstration: aim the callout at the app's own walk badge
    // on أنور السادات. The badge's CSS bounce animation corrupts selector
    // bounding boxes, so compute its base position from the transform attribute.
    const walkUser = await page.evaluate((sel) => {
      const g = document.querySelector(`${sel} .rp-walk`);
      const m = /translate\(([-\d.eE]+)\s+([-\d.eE]+)\)/.exec(g?.getAttribute('transform') ?? '');
      return m ? { x: +m[1], y: +m[2] } : null;
    }, mapSel);
    let walkPoint = walkUser ? await mapUserToScreen(page, mapSel, walkUser.x, walkUser.y) : null;
    if (walkPoint) walkPoint = { x: walkPoint.x, y: walkPoint.y + 12 }; // badge hangs below its origin
    await addCallout(page, {
      caption: 'التبديل في أنور السادات', sub: 'انزل من الخط الأول واركب الثاني',
      pill: { x: 350, y: 620 }, point: walkPoint, direction: 'up',
    });
    await page.waitForTimeout(2000);

    // resume — الخط الثاني keeps drawing toward the destination («وصلت!»)
    await page.locator('button[aria-label="تشغيل الرحلة"]').click();

    // ---- scroll to the summary + full station-by-station itinerary
    await page.mouse.move(960, 1035); // off the svg so wheel scrolls, not zooms
    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 180); await page.waitForTimeout(120); }
    await page.locator('button:has-text("تفاصيل المسار خطوة بخطوة")').click();
    await page.waitForTimeout(450);
    const accordions = page.locator('button:has-text("ركب")');
    const nAcc = await accordions.count();
    for (let i = 0; i < Math.min(nAcc, 2); i++) { await accordions.nth(i).click(); await page.waitForTimeout(280); }

    await addCallout(page, { caption: 'ملخص رحلتك', sub: '٢٩ دقيقة · ١٢ محطة · تبديل واحد', pill: { x: 1200, y: 315 }, target: 'text=الزمن التقديري للرحلة', direction: 'up' });
    await page.waitForTimeout(950);
    await addCallout(page, { caption: 'انتقال سريع بين الخطوط', pill: { x: 760, y: 930 }, target: 'p:has-text("انتقل إلى")', direction: 'up' });
    await page.waitForTimeout(Math.max(0, DUR.trip * 1000 - (Date.now() - tripT0)));
  });

  // ---- Scene 5: summary + controls + real logout + real register success
  await scene('services', 'user_state.json', async (page) => {
    await page.goto(BASE + '/app/trip');
    await page.waitForSelector('#trip-from', { timeout: 20000 });
    await page.waitForTimeout(350);
    await pickStation(page, 'trip-from', 'السادات', 'أنور السادات');
    await pickStation(page, 'trip-to', 'المنيب', 'المنيب');
    await page.waitForSelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"]', { timeout: 20000 });
    await waitStableBox(page, 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]');

    const nextBtn = page.locator('button[aria-label="المحطة التالية"]');
    if (await nextBtn.count() && (await nextBtn.isEnabled())) { await nextBtn.click().catch(() => {}); await page.waitForTimeout(300); await nextBtn.click().catch(() => {}); }
    await addCallout(page, { caption: 'تفاصيل الرحلة والتذكرة', sub: 'الزمن · المحطات · سعر التذكرة', pill: { x: 560, y: 30 }, target: 'svg[aria-label="خريطة مترو القاهرة التفاعلية"]', direction: 'up' });
    await page.waitForTimeout(1800);
    await addCallout(page, { caption: 'محاكاة حية لرحلتك', sub: 'تشغيل · إيقاف · سرعة · محطة تلو أخرى', pill: { x: 1010, y: 790 }, target: 'button[aria-label="المحطة التالية"], button[aria-label="تشغيل الرحلة"]', direction: 'up' });
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
    await addCallout(page, { caption: 'تسجيل فوري وآمن', pill: { x: 640, y: 26 }, target: 'h1:has-text("تم إنشاء حسابك بنجاح")', direction: 'up' }).catch(() => {});
    await page.waitForTimeout(Math.max(0, DUR.services * 1000 - 350 - 1800 - 1600 - 2400));
  });

  // ---- Scene 6: real admin login + real admin shell
  await scene('admin', null, async (page) => {
    const adminT0 = Date.now();
    await page.goto(BASE + '/login');
    await page.waitForSelector('form');
    const inputs = page.locator('form input');
    await inputs.nth(0).click();
    await inputs.nth(0).pressSequentially(ADMIN.email, { delay: 38 });
    await page.waitForTimeout(250);
    await inputs.nth(1).click();
    await inputs.nth(1).pressSequentially(ADMIN.pass, { delay: 45 });
    await page.waitForTimeout(350);
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await page.waitForSelector('aside');
    // pill left of the page heading so nothing is covered; arrow arcs above the
    // heading (inside the logo→link gap) and points at the first sidebar link's top edge
    await addCallout(page, { caption: 'لوحة تحكم المسؤول', pill: { x: 950, y: 20 }, target: 'aside nav a >> nth=0', direction: 'up' });
    await page.waitForTimeout(1100);
    // pill below the last sidebar link (empty sidebar area), arrow points up at its bottom edge
    await addCallout(page, { caption: 'إدارة ومتابعة النظام', pill: { x: 1640, y: 700 }, target: 'aside nav a >> nth=8', direction: 'down' });
    await page.waitForTimeout(Math.max(0, DUR.admin * 1000 - (Date.now() - adminT0)));
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
    await page.waitForTimeout(1300);
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
