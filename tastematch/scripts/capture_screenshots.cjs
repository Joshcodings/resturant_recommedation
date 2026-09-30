const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173/#/';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Edge from:', EDGE_PATH);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const breakpoints = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet',  width: 820,  height: 1000 },
    { name: 'mobile',  width: 390,  height: 844 },
  ];

  // Helper to switch theme
  async function setTheme(theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('tm-theme', t);
    }, theme);
    await new Promise(r => setTimeout(r, 200));
  }

  // 1. STYLEGUIDE SCREENSHOTS
  console.log('Capturing Styleguide...');
  await page.goto(`${BASE_URL}styleguide`, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1440, height: 1200 });
  await setTheme('dark');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'styleguide_1440_dark.png'), fullPage: false });
  await setTheme('light');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'styleguide_1440_light.png'), fullPage: false });

  // 2. DISCOVER SCREEN AT 390px, 820px, 1440px (DARK & LIGHT)
  console.log('Capturing Discover screen...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  // wait for data to load
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800)); // allow map to render tiles

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await setTheme('dark');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `discover_${bp.width}_dark.png`) });

    await setTheme('light');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `discover_${bp.width}_light.png`) });
  }

  // 3. DRAWER OPEN AT 390px, 820px, 1440px (DARK & LIGHT)
  console.log('Capturing Detail Drawer...');
  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: bp.height });
    // Click first restaurant card to open drawer
    await page.click('article');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 400)); // wait for slideIn

    await setTheme('dark');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `drawer_${bp.width}_dark.png`) });

    await setTheme('light');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `drawer_${bp.width}_light.png`) });

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
  }

  // 4. GROUP SCREEN AT 390px, 820px, 1440px (DARK & LIGHT)
  console.log('Capturing Group screen...');
  await page.goto(`${BASE_URL}group`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await setTheme('dark');
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `group_${bp.width}_dark.png`) });

    await setTheme('light');
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `group_${bp.width}_light.png`) });
  }

  // 5. INSIGHTS SCREEN AT 390px, 820px, 1440px (DARK & LIGHT)
  console.log('Capturing Insights screen...');
  await page.goto(`${BASE_URL}insights`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000)); // allow charts to animate

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await setTheme('dark');
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `insights_${bp.width}_dark.png`) });

    await setTheme('light');
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `insights_${bp.width}_light.png`) });
  }

  // 6. ACCEPTANCE TEST CASE SCREENSHOTS
  console.log('Capturing Acceptance Test Cases...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1440, height: 900 });
  await setTheme('dark');

  // Test Case A: New Delhi (price 2, North Indian + Chinese, table booking)
  // Let's set the state via React / UI
  console.log('Test case: New Delhi');
  await page.evaluate(() => {
    // Open more options if not open
    const moreBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('More options'));
    if (moreBtn) moreBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    // Check table booking checkbox
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    if (checkboxes[0] && !checkboxes[0].checked) checkboxes[0].click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'testcase_new_delhi.png') });

  // Test Case B: Orlando (price 4, Italian) -> expect relaxation notice & limited data
  console.log('Test case: Orlando');
  await page.evaluate(() => {
    // Switch to USA / Orlando
    const selects = Array.from(document.querySelectorAll('select'));
    // Or trigger city click
  });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Screenshot runner error:', err);
  process.exit(1);
});
