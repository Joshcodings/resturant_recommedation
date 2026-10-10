const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/';
const OUT_DIR = path.resolve(__dirname, '../screenshots/stage5b');

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

  // 1. Initial Gate 5B view showing Meal Clock & Landmark Filter UI
  console.log('2. Capturing Gate 5B initial view with Meal Clock and Landmark controls...');
  await page.evaluate(() => window.scrollTo(0, 320));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, 'gate5b_initial_view.png') });
  console.log('Saved: gate5b_initial_view.png');

  // 2. Feature 3: Test "Open Now" filter toggle
  console.log('3. Testing Feature 3 (Naija Meal Clock: "Open Now")...');
  const clickedOpenNow = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Open Now'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clickedOpenNow) {
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.screenshot({ path: path.join(OUT_DIR, 'gate5b_meal_clock_open_now.png') });
    console.log('Saved: gate5b_meal_clock_open_now.png');

    // Untoggle Open Now
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Open Now'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 3. Feature 3: Test "Morning" meal slot quick chip
  console.log('4. Testing Feature 3 ("Morning" meal slot chip)...');
  const clickedMorning = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Morning'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clickedMorning) {
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.screenshot({ path: path.join(OUT_DIR, 'gate5b_meal_clock_slot_morning.png') });
    console.log('Saved: gate5b_meal_clock_slot_morning.png');

    // Untoggle Morning
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Clear slot'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  // 4. Feature 4: Test "Near a Landmark" filter
  console.log('5. Testing Feature 4 (Near a Landmark selector)...');
  // Click landmark selector dropdown
  const openedDropdown = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Choose landmark'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (openedDropdown) {
    await new Promise(r => setTimeout(r, 500));
    // Pick first landmark in list
    const pickedLandmark = await page.evaluate(() => {
      const modalButtons = Array.from(document.querySelectorAll('div[class*="shadow-lg"] button'));
      if (modalButtons.length > 0) {
        modalButtons[0].click();
        return true;
      }
      return false;
    });

    if (pickedLandmark) {
      await new Promise(r => setTimeout(r, 800));
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.screenshot({ path: path.join(OUT_DIR, 'gate5b_landmark_near_landmark.png') });
      console.log('Saved: gate5b_landmark_near_landmark.png');
    }
  }

  await browser.close();
  console.log('Gate 5B screenshots captured successfully.');
}

run().catch(err => {
  console.error('Error running Gate 5B script:', err);
  process.exit(1);
});
