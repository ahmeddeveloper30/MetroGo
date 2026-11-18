/* Phase I — Interactive Map E2E verification (read-only; runs against the live dev server).
 * Usage: node e2e/verify_map_e2e.cjs
 * Produces: console PASS/FAIL log + e2e/results.json + e2e/shots/*.png
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const HERE = __dirname;
const SHOTS = path.join(HERE, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const USER = { email: 'passenger@metro.eg', pass: 'Metro1234' };

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function parseAr(text) {
  const latin = String(text).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  return (latin.match(/\d+/g) || []).map(Number);
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const errors = [];
function logError(kind, msg) { errors.push({ kind, msg }); console.log(`[console ${kind}] ${msg}`); }

async function pickStation(page, triggerId, query, wanted) {
  await page.locator(`#${triggerId}`).click();
  await page.keyboard.type(query, { delay: 50 });
  await page.waitForTimeout(450);
  await page.locator('[role="option"]', { hasText: wanted }).first().click();
  await page.waitForTimeout(400);
}

async function counterText(page) {
  // playback counter reads «N / M محطة»; the itinerary accordions read «ركب N محطة»,
  // so key on the " / " separator to disambiguate.
  const loc = page.locator('span', { hasText: 'محطة' }).filter({ hasText: '/' }).first();
  await loc.waitFor({ timeout: 10000 });
  return loc.textContent();
}

async function viewTransform(page) {
  return page.evaluate(() => {
    const g = document.querySelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"] > g');
    return g ? g.getAttribute('transform') : null;
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ================= desktop context =================
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => logError('pageerror', String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const loc = m.location && m.location();
      logError('console.error', m.text() + (loc && loc.url ? ' @ ' + loc.url : ''));
    }
  });
  page.on('response', (r) => { if (r.status() >= 400) logError('http.' + r.status(), r.url()); });

  // --- login ---
  await page.goto(BASE + '/login');
  await page.waitForSelector('form');
  const inputs = page.locator('form input');
  await inputs.nth(0).fill(USER.email);
  await inputs.nth(1).fill(USER.pass);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/app', { timeout: 20000 });
  await page.goto(BASE + '/app/trip');
  await page.waitForSelector('#trip-from', { timeout: 20000 });

  // ================= Route 1: أنور السادات → المنيب (same line, 9 hops) =================
  await pickStation(page, 'trip-from', 'السادات', 'أنور السادات');
  await pickStation(page, 'trip-to', 'المنيب', 'المنيب');
  await page.waitForSelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"]', { timeout: 20000 });
  record('map appears after route calc', true);
  await page.screenshot({ path: path.join(SHOTS, 't01_map_initial.png') });

  // T2 auto-play
  await page.waitForTimeout(2000);
  let c1 = parseAr(await counterText(page));
  record('auto-play on route calc', c1.length === 2 && c1[0] > 0, `counter ${await counterText(page)}`);

  // T3 pause / resume
  await page.locator('button[aria-label="إيقاف مؤقت"]').click();
  await page.waitForTimeout(300);
  record('pause works', await page.locator('button[aria-label="تشغيل الرحلة"]').isVisible());
  const c2 = parseAr(await counterText(page));
  await page.waitForTimeout(1200);
  const c3 = parseAr(await counterText(page));
  record('counter frozen while paused', c2[0] === c3[0], `${c2[0]} -> ${c3[0]}`);

  // T4 next-station steps (wait for the counter to settle between clicks)
  const c4 = parseAr(await counterText(page));
  for (let i = 0; i < 3; i++) { await page.locator('button[aria-label="المحطة التالية"]').click(); await page.waitForTimeout(450); }
  const c5 = parseAr(await counterText(page));
  record('next-station advances +1 per click', c5[0] > c4[0] && c5[0] <= Math.min(c4[0] + 3, c4[1]), `${c4[0]} -> ${c5[0]}`);
  await page.screenshot({ path: path.join(SHOTS, 't04_next_station.png') });

  // T5 speed cycling
  const speedBtn = page.locator('button:has-text("سرعة")');
  const seq = [];
  for (let i = 0; i < 4; i++) { seq.push(await speedBtn.textContent()); await speedBtn.click(); await page.waitForTimeout(200); }
  seq.push(await speedBtn.textContent());
  const cycleOk = /×١/.test(seq[0]) && /×٢/.test(seq[1]) && /×٤/.test(seq[2]) && /×٠٫٥|×0/.test(seq[3]) && /×١/.test(seq[4]);
  record('speed cycles ×1→×2→×4→×0.5→×1', cycleOk, seq.map((s) => s.trim()).join(' | '));

  // T6 restart
  await page.locator('button[aria-label="إعادة تشغيل"]').click();
  await page.waitForTimeout(400);
  const c6 = parseAr(await counterText(page));
  record('restart resets progress and resumes', c6[0] <= 1, `counter ${await counterText(page)}`);

  // T7 full playback at ×4
  await speedBtn.click(); await speedBtn.click(); // ×1 → ×2 → ×4
  try {
    await page.locator('text=وصلت! 🎉').waitFor({ timeout: 30000 });
    record('full playback completes (وصلت! 🎉)', true);
    const doneInfo = await page.locator('text=وصلت إلى وجهتك').isVisible();
    record('info panel switches to done state', doneInfo);
    const nextDisabled = await page.locator('button[aria-label="المحطة التالية"]').isDisabled();
    record('next-station disabled at destination', nextDisabled);
    await page.screenshot({ path: path.join(SHOTS, 't07_done.png') });
  } catch {
    record('full playback completes (وصلت! 🎉)', false, 'did not finish within 30s at ×4');
  }

  // T8 play after done restarts (auto-play resumes, so progress may already be > 1)
  await page.locator('button[aria-label="تشغيل الرحلة"]').click();
  await page.waitForTimeout(700);
  const c7 = parseAr(await counterText(page));
  const doneGone = !(await page.locator('text=وصلت! 🎉').isVisible());
  record('play after done restarts journey', doneGone && c7.length === 2 && c7[0] < c7[1] && c7[0] <= 3, `counter ${await counterText(page)}`);
  await page.locator('button[aria-label="إيقاف مؤقت"]').click();

  // T9 zoom buttons
  const t0 = await viewTransform(page);
  await page.locator('button[aria-label="تكبير"]').click();
  await page.waitForTimeout(200);
  const t1 = await viewTransform(page);
  record('zoom-in changes view transform', t0 !== t1, `${t0} -> ${t1}`);
  await page.locator('button[aria-label="تصغير"]').click();
  await page.waitForTimeout(200);
  const t2 = await viewTransform(page);
  record('zoom-out changes view transform', t1 !== t2, `${t1} -> ${t2}`);

  // T10 wheel zoom
  const svg = page.locator('svg[aria-label="خريطة مترو القاهرة التفاعلية"]');
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(300);
  const t3 = await viewTransform(page);
  record('wheel zoom-in works (non-passive listener)', t2 !== t3, `${t2} -> ${t3}`);
  await page.screenshot({ path: path.join(SHOTS, 't10_wheel_zoom.png') });

  // T11 reset view
  await page.locator('button[aria-label="إعادة العرض"]').click();
  await page.waitForTimeout(200);
  const t4 = await viewTransform(page);
  record('reset view restores default transform', /translate\(0 0\)\s*scale\(1\)/.test(t4 || ''), t4);

  // T12 drag pan
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 140, box.y + box.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const t5 = await viewTransform(page);
  record('drag pan changes view transform', t4 !== t5, `${t4} -> ${t5}`);
  await page.locator('button[aria-label="إعادة العرض"]').click();

  // T13 hover tooltip
  const hits = page.locator('svg circle[r="11"]');
  const hb = await hits.first().boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.waitForTimeout(400);
  const tipCount = await page.locator('svg rect[stroke="#C8102E"]').count();
  record('hover tooltip appears on station', tipCount > 0, `${tipCount} tooltip box(es)`);
  await page.screenshot({ path: path.join(SHOTS, 't13_tooltip.png') });

  // ================= Route 2: حلوان → المنيب (transfer at السادات) =================
  await pickStation(page, 'trip-from', 'حلوان', 'حلوان');
  await page.waitForSelector('svg[aria-label="خريطة مترو القاهرة التفاعلية"]');
  await page.waitForTimeout(600);
  // info panel should report 1 تبديل
  const infoText = await page.locator('svg[aria-label="خريطة مترو القاهرة التفاعلية"]').evaluate(() => document.body.innerText);
  record('transfer route reports تبديل', /تبديل/.test(infoText));
  // dashed transfer connector present
  const dashed = await page.locator('svg line[stroke-dasharray="5 5"]').count();
  record('dashed transfer connector drawn', dashed >= 1, `${dashed} connector(s)`);
  // walk badge appears at the transfer hop during playback — speed up to ×4 so
  // the long حلوان → السادات leg is reached well inside the timeout
  const sb2 = page.locator('button:has-text("سرعة")');
  await sb2.click(); await page.waitForTimeout(150); // ×1 → ×2
  await sb2.click(); await page.waitForTimeout(150); // ×2 → ×4
  try {
    await page.locator('svg g.rp-walk').waitFor({ timeout: 90000 });
    record('walk badge appears at interchange during playback', true);
    await page.screenshot({ path: path.join(SHOTS, 't14_walk_badge.png') });
  } catch {
    record('walk badge appears at interchange during playback', false, 'no .rp-walk within 90s at ×4');
  }
  // connector turns red once reached
  const red = await page.locator('svg line[stroke="#e72434"][stroke-dasharray="5 5"]').count();
  record('transfer connector highlights when reached', red >= 1, `${red} highlighted connector(s)`);

  // ================= Route 3: same-station edge case =================
  await pickStation(page, 'trip-from', 'السادات', 'أنور السادات');
  await pickStation(page, 'trip-to', 'السادات', 'أنور السادات');
  await page.waitForTimeout(500);
  const sameAlert = await page.locator('[role="alert"]:has-text("المحطتان متطابقتان")').isVisible();
  record('same-station shows alert, no route', sameAlert);
  await page.screenshot({ path: path.join(SHOTS, 't15_same_station.png') });

  // ================= console errors (desktop) =================
  record('no console/page errors (desktop session)', errors.length === 0,
    errors.length ? errors.slice(0, 3).map((e) => e.kind + ': ' + e.msg).join(' ; ') : '');
  await ctx.close();

  // ================= responsive contexts =================
  for (const [w, h, tag] of [[1280, 800, 'laptop'], [768, 1024, 'tablet'], [390, 844, 'phone']]) {
    const rctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
    const rpage = await rctx.newPage();
    rpage.on('pageerror', (e) => logError(`pageerror@${tag}`, String(e)));
    rpage.on('console', (m) => { if (m.type() === 'error') logError(`console.error@${tag}`, m.text()); });
    await rpage.goto(BASE + '/login');
    await rpage.waitForSelector('form');
    const ri = rpage.locator('form input');
    await ri.nth(0).fill(USER.email);
    await ri.nth(1).fill(USER.pass);
    await rpage.locator('form button[type=submit]').click();
    await rpage.waitForURL('**/app', { timeout: 20000 });
    await rpage.goto(BASE + '/app/trip');
    await rpage.waitForSelector('#trip-from', { timeout: 20000 });
    await pickStation(rpage, 'trip-from', 'السادات', 'أنور السادات');
    await pickStation(rpage, 'trip-to', 'المنيب', 'المنيب');
    const mapOk = await rpage.locator('svg[aria-label="خريطة مترو القاهرة التفاعلية"]').isVisible();
    const playOk = await rpage.locator('button[aria-label="إيقاف مؤقت"], button[aria-label="تشغيل الرحلة"]').first().isVisible();
    const overflow = await rpage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    record(`responsive ${w}×${h}: map + controls render`, mapOk && playOk);
    record(`responsive ${w}×${h}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);
    await rpage.screenshot({ path: path.join(SHOTS, `t16_${tag}.png`) });
    await rctx.close();
  }

  await browser.close();

  // ================= summary =================
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const errs = errors.filter((e) => !String(e.msg).includes('favicon'));  fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify({ results, errors: errs }, null, 2));
  console.log(`\n==== E2E SUMMARY: ${pass}/${results.length} passed, ${fail} failed, ${errs.length} runtime error(s) ====`);
  process.exit(fail || errs.length ? 1 : 0);
})().catch((e) => { console.error('RUNNER ERROR:', e); process.exit(2); });
