const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/#/';
const LOCAL_OUT_DIR = path.resolve(__dirname, '../screenshots/stage5f');
const BRAIN_OUT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\b696ae01-48d9-452a-8516-65cb11ebc988\\screenshots';

for (const dir of [LOCAL_OUT_DIR, BRAIN_OUT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveScreenshot(filename, buffer) {
  fs.writeFileSync(path.join(LOCAL_OUT_DIR, filename), buffer);
  fs.writeFileSync(path.join(BRAIN_OUT_DIR, filename), buffer);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Launching browser from:', BROWSER_PATH);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('1. Navigating to TasteMatch Discover page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  // ──────────────────────────────────────────────────────────
  // 1. Feature 11: Compare Nigerian Attributes
  // ──────────────────────────────────────────────────────────
  console.log('2. Adding 2 restaurants to compare tray via evaluate click...');
  const clickedCount = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-compare-btn="true"]'));
    if (btns.length >= 2) {
      btns[0].click();
      btns[1].click();
      return 2;
    }
    return btns.length;
  });
  console.log(`Clicked ${clickedCount} compare buttons`);
  await new Promise((r) => setTimeout(r, 1000));

  console.log('3. Opening Compare Modal...');
  await page.waitForSelector('[data-compare-tray-open="true"]', { timeout: 8000 });
  await page.evaluate(() => {
    const btn = document.querySelector('[data-compare-tray-open="true"]');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 600));


  const shotCompare = await page.screenshot();
  saveScreenshot('gate5f_compare_nigerian_attributes.png', shotCompare);

  // Close Compare modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[aria-label="Close compare"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // ──────────────────────────────────────────────────────────
  // 2. Feature 12: Switch language to Nigerian Pidgin
  // ──────────────────────────────────────────────────────────
  console.log('4. Opening Language Selector and selecting Nigerian Pidgin...');
  await page.click('[data-testid="language-selector-button"]');
  await new Promise((r) => setTimeout(r, 400));

  // Screenshot the dropdown menu showing all draft labels & disclaimer first
  const shotDisclaimer = await page.screenshot();
  saveScreenshot('gate5f_multilingual_disclaimer_notice.png', shotDisclaimer);

  // Now select Nigerian Pidgin
  console.log('5. Clicking Nigerian Pidgin option...');
  await page.click('[data-testid="language-option-pcm"]');
  await new Promise((r) => setTimeout(r, 1000));

  // Screenshot with Pidgin active (showing draft warning banner and translated nav/search)
  const shotPidgin = await page.screenshot();
  saveScreenshot('gate5f_multilingual_draft_pidgin.png', shotPidgin);

  console.log('All Gate 5F screenshots successfully captured!');
  await browser.close();
}

run().catch((err) => {
  console.error('Gate 5F capture failed:', err);
  process.exit(1);
});
