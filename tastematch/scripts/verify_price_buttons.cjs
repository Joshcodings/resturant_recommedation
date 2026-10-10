const puppeteer = require('puppeteer-core');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  
  // Wait up to 20s for buttons or article
  await page.waitForSelector('button', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check initial price buttons
  const priceButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const priceOpts = ['Any', 'Budget', 'Moderate', 'Upscale', 'Premium'];
    return buttons
      .filter((b) => priceOpts.some((p) => b.textContent && b.textContent.includes(p)))
      .map((b) => ({ text: b.textContent, disabled: b.disabled }));
  });
  console.log('Price buttons found:', JSON.stringify(priceButtons, null, 2));

  // Click "Budget"
  console.log('Clicking "Budget" price button...');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const budgetBtn = buttons.find((b) => b.textContent && b.textContent.includes('Budget'));
    if (budgetBtn && !budgetBtn.disabled) {
      budgetBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Budget successfully:', clicked);

  await new Promise((r) => setTimeout(r, 1000));

  // Screenshot
  const shot = await page.screenshot();
  fs.writeFileSync('C:\\Users\\hp\\.gemini\\antigravity\\brain\\b696ae01-48d9-452a-8516-65cb11ebc988\\screenshots\\price_range_selected.png', shot);
  console.log('Saved screenshot price_range_selected.png');

  await browser.close();
}

run().catch(console.error);
