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
  console.log('Launching Edge for currency verification...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ─── 1. USD SCREENSHOTS ──────────────────────────────────────────────────
  console.log('Loading page in USD...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot of USD search bar
  const searchBarEl = await page.$('[style*="grid-template-columns"]');
  if (searchBarEl) {
    await searchBarEl.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_usd_searchbar.png') });
    console.log('Saved currency_usd_searchbar.png');
  }

  // Screenshot of USD first card
  const firstCard = await page.$('article');
  if (firstCard) {
    await firstCard.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_usd_card.png') });
    console.log('Saved currency_usd_card.png');
  }

  // Open Converter popover in USD
  const currencyBtn = await page.$('header button[title*="Currency"]');
  if (currencyBtn) {
    await currencyBtn.click();
    await page.waitForSelector('[role="dialog"][aria-label="Currency Selector"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_usd_popover.png') });
    console.log('Saved currency_usd_popover.png');
    // close popover
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
  }

  // ─── 2. NGN SCREENSHOTS ──────────────────────────────────────────────────
  console.log('Switching to NGN...');
  await page.evaluate(() => {
    localStorage.setItem('tm-selected-currency', 'NGN');
    window.location.reload();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Search bar in NGN
  const searchBarNgn = await page.$('[style*="grid-template-columns"]');
  if (searchBarNgn) {
    await searchBarNgn.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_ngn_searchbar.png') });
    console.log('Saved currency_ngn_searchbar.png');
  }

  // Card in NGN
  const cardNgn = await page.$('article');
  if (cardNgn) {
    await cardNgn.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_ngn_card.png') });
    console.log('Saved currency_ngn_card.png');
  }

  // Popover in NGN
  const currencyBtnNgn = await page.$('header button[title*="Currency"]');
  if (currencyBtnNgn) {
    await currencyBtnNgn.click();
    await page.waitForSelector('[role="dialog"][aria-label="Currency Selector"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_ngn_popover.png') });
    console.log('Saved currency_ngn_popover.png');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
  }

  // ─── 3. INR SCREENSHOTS ──────────────────────────────────────────────────
  console.log('Switching to INR...');
  await page.evaluate(() => {
    localStorage.setItem('tm-selected-currency', 'INR');
    window.location.reload();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Search bar in INR
  const searchBarInr = await page.$('[style*="grid-template-columns"]');
  if (searchBarInr) {
    await searchBarInr.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_inr_searchbar.png') });
    console.log('Saved currency_inr_searchbar.png');
  }

  // Card in INR (Notice: listed currency equals selected currency -> no "≈"!)
  const cardInr = await page.$('article');
  if (cardInr) {
    await cardInr.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_inr_card.png') });
    console.log('Saved currency_inr_card.png');
  }

  // Popover in INR
  const currencyBtnInr = await page.$('header button[title*="Currency"]');
  if (currencyBtnInr) {
    await currencyBtnInr.click();
    await page.waitForSelector('[role="dialog"][aria-label="Currency Selector"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_inr_popover.png') });
    console.log('Saved currency_inr_popover.png');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
  }

  // ─── 4. SIMULATE RATES-FETCH FAILURE & FALLBACK NOTICE ───────────────────
  console.log('Simulating rate fetch failure...');
  // Intercept requests to currency APIs and abort them, forcing rates-fallback.json
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('jsdelivr') || url.includes('pages.dev') || url.includes('open.er-api.com')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Clear cache and reload
  await page.evaluate(() => {
    localStorage.removeItem('tm_currency_rates_cache');
    window.location.reload();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitForSelector('article', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Open popover to display the fallback notice: "Using saved rates from 2026-09-29"
  const currencyBtnFallback = await page.$('header button[title*="Currency"]');
  if (currencyBtnFallback) {
    await currencyBtnFallback.click();
    await page.waitForSelector('[role="dialog"][aria-label="Currency Selector"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'currency_fallback_notice.png') });
    console.log('Saved currency_fallback_notice.png');
  }

  console.log('All currency verification screenshots captured successfully!');
  await browser.close();
}

run().catch(console.error);
