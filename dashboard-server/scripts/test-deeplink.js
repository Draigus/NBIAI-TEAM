const { chromium } = require('playwright');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: [glen] } = await pool.query("SELECT id FROM users WHERE username = 'glen' LIMIT 1");
  if (!glen) { console.error('User not found'); process.exit(1); }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashedToken, glen.id, new Date(Date.now() + 3600000).toISOString()]);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addCookies([{ name: 'nbi_session', value: rawToken, domain: 'localhost', path: '/' }]);

  const page = await context.newPage();
  await page.goto('http://localhost:8888/nbi_project_dashboard.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  await page.evaluate((sid) => {
    if (typeof openInterviewScorecard === 'function') openInterviewScorecard(sid);
  }, '4c97ede2-9dc7-4f72-acb5-0583683a431f');

  await page.waitForTimeout(3000);

  // Check computed styles
  const debug = await page.evaluate(() => {
    const sc = document.getElementById('interviewScorecardView');
    const h2 = sc ? sc.querySelector('h2') : null;
    const btn = sc ? sc.querySelector('.btn') : null;
    const scStyle = sc ? getComputedStyle(sc) : {};
    const h2Style = h2 ? getComputedStyle(h2) : {};
    return {
      scDisplay: sc?.style.display,
      scBg: scStyle.backgroundColor,
      scWidth: scStyle.width,
      scHeight: scStyle.height,
      h2Text: h2?.textContent,
      h2Color: h2Style.color,
      h2FontSize: h2Style.fontSize,
      btnText: btn?.textContent,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      textPrimary: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
      bgBase: getComputedStyle(document.documentElement).getPropertyValue('--bg-base'),
    };
  });
  console.log('Debug:', JSON.stringify(debug, null, 2));

  await page.screenshot({ path: 'screenshots/scorecard-debug.png', fullPage: false });
  const layout = await page.evaluate(() => {
    const sc = document.getElementById('interviewScorecardView');
    const body = sc ? sc.querySelector('.interview-scorecard__body') : null;
    const splash = sc ? sc.querySelector('.interview-scorecard__splash') : null;
    const h2 = sc ? sc.querySelector('h2') : null;
    function info(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { tag: el.tagName, w: r.width, h: r.height, x: r.x, y: r.y, vis: cs.visibility, opacity: cs.opacity, overflow: cs.overflow, display: cs.display, position: cs.position };
    }
    return { sc: info(sc), body: info(body), splash: info(splash), h2: info(h2) };
  });
  console.log('Layout:', JSON.stringify(layout, null, 2));

  await pool.query('DELETE FROM sessions WHERE token = $1', [hashedToken]);
  await pool.end();
  await browser.close();
})();
