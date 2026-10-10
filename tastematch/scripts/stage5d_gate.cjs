const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/#/';
const LOCAL_OUT_DIR = path.resolve(__dirname, '../screenshots/stage5d');
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

  // ──────────────────────────────────────────────────────────
  // 1. Data Saver Mode (Feature 7)
  // ──────────────────────────────────────────────────────────
  console.log('1. Navigating to TasteMatch Discover page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  console.log('2. Clicking "Data Saver" toggle button in top bar...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    const dsBtn = buttons.find((b) => b.textContent && b.textContent.includes('Data Saver'));
    if (dsBtn) dsBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  console.log('3. Scrolling to view SVG radar schematic map alongside restaurant results...');
  await page.evaluate(() => window.scrollTo(0, 850));
  await new Promise((r) => setTimeout(r, 600));

  const shotDataSaver = await page.screenshot();
  saveScreenshot('gate5d_datasaver_on.png', shotDataSaver);

  // ──────────────────────────────────────────────────────────
  // 2. Owambe Crawl Mode (Feature 8)
  // ──────────────────────────────────────────────────────────
  console.log('4. Navigating to Group page (http://localhost:5173/#/group)...');
  await page.goto('http://localhost:5173/#/group', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // Reset scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));

  console.log('5. Clicking "Owambe / Food Crawl" tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const crawlTab = buttons.find((b) => b.textContent && b.textContent.includes('Owambe'));
    if (crawlTab) crawlTab.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('6. Capturing Owambe Crawl top view with mode tabs, stop selector, and diet chips...');
  const shotCrawlHeader = await page.screenshot();
  saveScreenshot('gate5d_owambe_crawl_header.png', shotCrawlHeader);

  console.log('7. Scrolling down to showcase crawl stop cards, route details & WhatsApp button...');
  await page.evaluate(() => window.scrollTo(0, 260));
  await new Promise((r) => setTimeout(r, 600));

  const shotCrawlDetail = await page.screenshot();
  saveScreenshot('gate5d_owambe_crawl_itinerary.png', shotCrawlDetail);

  await browser.close();
  console.log('All Gate 5D screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error running stage5d_gate.cjs:', err);
  process.exit(1);
});
