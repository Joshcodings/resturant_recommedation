const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/';
const OUT_DIR = path.resolve(__dirname, '../screenshots/stage5a');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
  await new Promise(r => setTimeout(r, 600));

  // 1. Initial Gate 5A view showing Dish search bar and Pay chips
  console.log('2. Capturing initial Gate 5A view...');
  await page.screenshot({ path: path.join(OUT_DIR, 'gate5a_initial.png') });
  console.log('Saved: gate5a_initial.png');

  // 2. Test Feature 1: Dish search for "suya"
  console.log('3. Testing Feature 1 (Dish search for "suya")...');
  const dishInput = await page.$('input[placeholder*="Search dishes"]');
  if (dishInput) {
    await dishInput.type('suya');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT_DIR, 'gate5a_dish_search_suya.png') });
    console.log('Saved: gate5a_dish_search_suya.png');
    // Clear input
    await page.evaluate(() => {
      const inp = document.querySelector('input[placeholder*="Search dishes"]');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 3. Test Feature 2: Pay-how filter for "Cards"
  console.log('4. Testing Feature 2 (Pay-how filter)...');
  const clickedPay = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cardBtn = buttons.find(b => b.textContent.includes('Cards'));
    if (cardBtn) {
      cardBtn.click();
      return true;
    }
    return false;
  });

  if (clickedPay) {
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT_DIR, 'gate5a_pay_filter_cards.png') });
    console.log('Saved: gate5a_pay_filter_cards.png');
  }

  await browser.close();
  console.log('Gate 5A screenshots captured successfully.');
}

run().catch(err => {
  console.error('Error running Gate 5A script:', err);
  process.exit(1);
});
