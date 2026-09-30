const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173/#/';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Loading page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });

  // Wait 1.5s for map tiles to load
  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot of dark map
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fixed_map_dark.png') });
  console.log('Saved fixed_map_dark.png');

  // Toggle to light theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('tm-theme', 'light');
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fixed_map_light.png') });
  console.log('Saved fixed_map_light.png');

  await browser.close();
}

run().catch(console.error);
