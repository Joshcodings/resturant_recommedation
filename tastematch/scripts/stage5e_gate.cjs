const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = 'http://localhost:5173/#/';
const LOCAL_OUT_DIR = path.resolve(__dirname, '../screenshots/stage5e');
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
  await new Promise((r) => setTimeout(r, 600));

  // ──────────────────────────────────────────────────────────
  // 1. State Capital Switcher Modal (Feature 10)
  // ──────────────────────────────────────────────────────────
  console.log('2. Opening State Capital Switcher modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('State Capitals'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const shotCapitals = await page.screenshot();
  saveScreenshot('gate5e_capitals_modal.png', shotCapitals);

  // ──────────────────────────────────────────────────────────
  // 2. Click Unmapped Capital (Umuahia) -> Friendly Empty State
  // ──────────────────────────────────────────────────────────
  console.log('3. Selecting unmapped capital Umuahia via data-capital-card...');
  await page.evaluate(() => {
    const card = document.querySelector('[data-capital-card="Umuahia"]');
    if (card) card.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Scroll to show friendly empty state centered
  await page.evaluate(() => window.scrollTo(0, 520));
  await new Promise((r) => setTimeout(r, 600));

  const shotEmpty = await page.screenshot();
  saveScreenshot('gate5e_unmapped_capital_empty_state.png', shotEmpty);

  // ──────────────────────────────────────────────────────────
  // 3. Open "Add a Food Spot" Modal from empty state (Feature 9)
  // ──────────────────────────────────────────────────────────
  console.log('4. Clicking "Be the first to add one" button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent && b.textContent.includes('Be the first to add one'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const shotAddModal = await page.screenshot();
  saveScreenshot('gate5e_add_place_modal.png', shotAddModal);

  // ──────────────────────────────────────────────────────────
  // 4. Fill and submit local place using puppeteer typing
  // ──────────────────────────────────────────────────────────
  console.log('5. Typing local food spot details with page.type...');
  await page.type('[data-input-name="true"]', 'Abia Delights & Grills');
  await page.type('[data-input-locality="true"]', 'Bank Road GRA');
  await page.type('[data-input-cost="true"]', '4500');

  // Click AC amenity chip
  await page.evaluate(() => {
    const acBtn = document.querySelector('[data-btn-ac="true"]');
    if (acBtn) acBtn.click();

    const centerBtn = document.querySelector('[data-btn-center="true"]');
    if (centerBtn) centerBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('6. Submitting local place form...');
  await page.evaluate(() => {
    const submitBtn = document.querySelector('[data-btn-submit="true"]');
    if (submitBtn) submitBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Scroll to show newly added card with "Added by you (local)" badge
  await page.evaluate(() => window.scrollTo(0, 680));
  await new Promise((r) => setTimeout(r, 600));

  const shotAddedCard = await page.screenshot();
  saveScreenshot('gate5e_added_place_card.png', shotAddedCard);

  // ──────────────────────────────────────────────────────────
  // 5. Open Export Tab in Add Place Modal
  // ──────────────────────────────────────────────────────────
  console.log('7. Reopening modal to showcase Export to OSM / PR tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent && b.textContent.includes('+ Add a Food Spot'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.evaluate(() => {
    const exportTab = document.querySelector('[data-tab-export="true"]');
    if (exportTab) exportTab.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const shotExportTab = await page.screenshot();
  saveScreenshot('gate5e_export_geojson_tab.png', shotExportTab);

  await browser.close();
  console.log('All Gate 5E screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error running stage5e_gate.cjs:', err);
  process.exit(1);
});
