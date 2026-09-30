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

  // 1. Orlando: price 4, Italian
  console.log('Navigating for Orlando...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });

  // Open location dropdown
  await page.evaluate(() => {
    // Click location segment to open dropdown
    const locationDiv = document.querySelector('[style*="border-top-left-radius"] div[style*="cursor: pointer"]');
    if (locationDiv) locationDiv.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Change country to USA
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      select.value = 'USA';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 200));

  // Select Orlando
  await page.evaluate(() => {
    const cityItems = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.trim() === 'Orlando');
    if (cityItems[0]) cityItems[0].click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Set price to 4
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === '●●●●');
    if (buttons[0]) buttons[0].click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Open cuisine dropdown
  await page.evaluate(() => {
    const cuisineDiv = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Cuisines (0)'));
    if (cuisineDiv) {
      const clickEl = cuisineDiv.querySelector('div[style*="cursor: pointer"]');
      if (clickEl) clickEl.click();
    }
  });
  await new Promise(r => setTimeout(r, 200));

  // Select Italian cuisine
  await page.evaluate(() => {
    const italianItem = Array.from(document.querySelectorAll('div')).find(d => d.textContent.trim() === 'Italian');
    if (italianItem) italianItem.click();
    // close dropdown by clicking document body
    document.body.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'testcase_orlando.png') });
  console.log('Orlando screenshot saved.');

  // 2. Lucknow: price 3, Continental
  console.log('Navigating for Lucknow...');
  // Open location dropdown
  await page.evaluate(() => {
    const locationDiv = document.querySelector('[style*="border-top-left-radius"] div[style*="cursor: pointer"]');
    if (locationDiv) locationDiv.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Change country to India
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      select.value = 'India';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 200));

  // Select Lucknow
  await page.evaluate(() => {
    const cityItems = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.trim() === 'Lucknow');
    if (cityItems[0]) cityItems[0].click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Set price to 3
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === '●●●');
    if (buttons[0]) buttons[0].click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Open cuisine dropdown & select Continental
  await page.evaluate(() => {
    const cuisineDiv = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Cuisines'));
    if (cuisineDiv) {
      const clickEl = cuisineDiv.querySelector('div[style*="cursor: pointer"]');
      if (clickEl) clickEl.click();
    }
  });
  await new Promise(r => setTimeout(r, 200));

  await page.evaluate(() => {
    // Clear any previous cuisines
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear all'));
    if (clearBtn) clearBtn.click();
    const contItem = Array.from(document.querySelectorAll('div')).find(d => d.textContent.trim() === 'Continental');
    if (contItem) contItem.click();
    document.body.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'testcase_lucknow.png') });
  console.log('Lucknow screenshot saved.');

  await browser.close();
}

run().catch(console.error);
