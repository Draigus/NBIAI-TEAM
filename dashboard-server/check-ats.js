const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('https://worksage.nbi-consulting.com/nbi_project_dashboard.html', { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.locator('#loginUser').fill('glen');
  await page.locator('#loginPass').fill('admin123');
  await page.locator('#loginBtn').click();
  await page.waitForTimeout(5000);
  await page.click('#si_Hiring');
  await page.waitForTimeout(3000);

  // Screenshot the full pipeline with scroll
  await page.screenshot({ path: '../ats-pipeline-now.png', fullPage: false });
  console.log('pipeline screenshot done');

  // Count visible candidates and log filter state
  const count = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-action="_actOpenCandidateDetailIfNotDrag"]');
    const filters = document.querySelectorAll('.ats-filter-chips .chip, .ats-filter-btn.active');
    const filterTexts = Array.from(filters).map(f => f.textContent.trim());
    return { cards: cards.length, filters: filterTexts };
  });
  console.log('Visible candidates: ' + count.cards);
  console.log('Active filters: ' + JSON.stringify(count.filters));

  await browser.close();
  console.log('ALL DONE');
})().catch(e => { console.error(e.message); process.exit(1); });
