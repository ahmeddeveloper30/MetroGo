/** Probe: replicate pickStation twice with instrumentation to find the TO failure. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: path.join(__dirname, 'user_state.json'),
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173/app/trip', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#trip-from', { timeout: 20000 });
  await page.waitForTimeout(400);

  async function pick(triggerId, query, wanted, tag) {
    console.log(`\n--- ${tag}: clicking #${triggerId}`);
    await page.locator(`#${triggerId}`).click();
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      openInputs: document.querySelectorAll('input[role="combobox"]').length,
      focusedIsCombobox: document.activeElement?.getAttribute('role') === 'combobox',
      focusedAriaLabel: document.activeElement?.getAttribute('aria-label') || null,
      listboxes: document.querySelectorAll('[role="listbox"]').length,
      options: document.querySelectorAll('[role="option"]').length,
    }));
    console.log('after click:', JSON.stringify(state));
    await page.keyboard.type(query, { delay: 50 });
    await page.waitForTimeout(450);
    const after = await page.evaluate(() => ({
      options: document.querySelectorAll('[role="option"]').length,
      query: document.activeElement?.value ?? null,
      first3: Array.from(document.querySelectorAll('[role="option"]')).slice(0, 3).map((o) => o.textContent?.slice(0, 40)),
    }));
    console.log('after typing:', JSON.stringify(after));
    const opt = page.locator('[role="option"]', { hasText: wanted }).first();
    const count = await opt.count();
    console.log(`option "${wanted}" count:`, count);
    if (count) { await opt.click(); console.log('clicked option'); }
    await page.waitForTimeout(400);
    const values = await page.evaluate(() => Array.from(document.querySelectorAll('button[id^="trip-"]')).map((b) => b.id + '=' + (b.textContent || '').trim().slice(0, 30)));
    console.log('fields:', values.join(' | '));
  }

  await pick('trip-from', 'السادات', 'أنور السادات', 'FROM');
  await pick('trip-to', 'المنيب', 'المنيب', 'TO');
  await page.waitForTimeout(1500);
  const map = await page.locator('svg[aria-label="خريطة مترو القاهرة التفاعلية"]').count();
  console.log('\nmap present:', map);
  await browser.close();
})().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1); });
