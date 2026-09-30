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
  console.log('Launching browser from:', EDGE_PATH);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  async function setTheme(theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('tm-theme', t);
    }, theme);
    await new Promise(r => setTimeout(r, 200));
  }

  // 1. Mobile 390px Discover Screen with Bottom Nav
  console.log('Capturing Mobile 390px Discover...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await setTheme('dark');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_discover_dark.png') });
  await setTheme('light');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_discover_light.png') });

  // 2. Mobile 390px Detail Drawer with Explainable AI attribution
  console.log('Capturing Mobile 390px Drawer with Explainable AI...');
  await page.click('article');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_drawer_explainable.png') });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // 3. Mobile 390px Group View
  console.log('Capturing Mobile 390px Group View...');
  await page.goto(`${BASE_URL}group`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_group.png') });

  // 4. Tablet 820px Discover Screen
  console.log('Capturing Tablet 820px Discover...');
  await page.setViewport({ width: 820, height: 1000 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await setTheme('dark');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'tablet_820_discover.png') });

  // 5. Desktop 1440px Discover Screen
  console.log('Capturing Desktop 1440px Discover...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_1440_discover.png') });

  // 6. Insights Platform Tabs (Desktop & Mobile)
  console.log('Capturing Insights View Tabs...');
  await page.goto(`${BASE_URL}insights`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Tab 1: Market Analytics (Desktop)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'insights_tab1_market_analytics.png') });

  // Tab 2: Machine Learning & Interpretability
  console.log('Capturing ML & Interpretability Tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const mlTab = tabs.find(t => t.textContent.includes('Machine Learning'));
    if (mlTab) mlTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'insights_tab2_ml_interpretability.png') });

  // Tab 3: Offline Recommender Evaluation Benchmark
  console.log('Capturing Recommender Evaluation Tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const evalTab = tabs.find(t => t.textContent.includes('Recommender Evaluation'));
    if (evalTab) evalTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'insights_tab3_evaluation_benchmark.png') });

  // Tab 2 on Mobile 390px
  console.log('Capturing ML Tab on Mobile 390px...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const mlTab = tabs.find(t => t.textContent.includes('Machine Learning'));
    if (mlTab) mlTab.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_390_insights_ml.png') });

  console.log('All platform screenshots successfully captured!');
  await browser.close();
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
