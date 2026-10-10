const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/';
const LOCAL_OUT_DIR = path.resolve(__dirname, '../screenshots/stage5c');
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

  console.log('1. Navigating to TasteMatch...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  // 1. Capture power tags in amenities filter
  console.log('2. Capturing Gate 5C power tags in amenities filter...');
  await page.evaluate(() => window.scrollTo(0, 380));
  await new Promise((r) => setTimeout(r, 400));
  const shot1 = await page.screenshot();
  saveScreenshot('gate5c_power_tags.png', shot1);

  // 1b. Capture restaurant cards with Food Run buttons and badges
  console.log('2b. Capturing restaurant cards with Food Run buttons and badges...');
  await page.evaluate(() => window.scrollTo(0, 980));
  await new Promise((r) => setTimeout(r, 400));
  const shotCards = await page.screenshot();
  saveScreenshot('gate5c_cards_badges.png', shotCards);

  // 1c. Click AC filter chip to show cards with AC badge
  console.log('2c. Clicking AC amenity filter chip...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const acBtn = buttons.find((b) => b.textContent.includes('AC'));
    if (acBtn) acBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => window.scrollTo(0, 980));
  await new Promise((r) => setTimeout(r, 400));
  const shotAcCards = await page.screenshot();
  saveScreenshot('gate5c_ac_filter_cards.png', shotAcCards);

  // Unclick AC filter
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const acBtn = buttons.find((b) => b.textContent.includes('AC'));
    if (acBtn) acBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // 2. Click "Food Run" button on the first restaurant card
  console.log('3. Clicking Food Run button on first restaurant card...');
  const openedModal = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const foodRunBtn = buttons.find((b) => b.textContent.includes('Food Run'));
    if (foodRunBtn) {
      foodRunBtn.click();
      return true;
    }
    return false;
  });

  if (openedModal) {
    await new Promise((r) => setTimeout(r, 600));
    console.log('4. Capturing open Food Run Modal...');
    const shot2 = await page.screenshot();
    saveScreenshot('gate5c_food_run_modal.png', shot2);

    // 3. Add a custom dish and click Copy or check another suggestion
    console.log('5. Interacting with Food Run modal dishes...');
    await page.evaluate(() => {
      // Toggle a third suggestion dish if available
      const buttons = Array.from(document.querySelectorAll('button'));
      const thirdDish = buttons.find((b) => b.textContent.startsWith('+ '));
      if (thirdDish) thirdDish.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const shot3 = await page.screenshot();
    saveScreenshot('gate5c_food_run_wa_link.png', shot3);
  } else {
    console.warn('Food Run button not found');
  }

  await browser.close();
  console.log('Gate 5C screenshots completed successfully.');
}

run().catch((err) => {
  console.error('Error running screenshots:', err);
  process.exit(1);
});
