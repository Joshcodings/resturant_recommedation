import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\846c539b-3a08-49d2-b83e-c07ec0d9496b';

function startServer(port = 4173) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const server = createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath.endsWith('/')) reqPath += 'index.html';
      let filePath = path.join(distDir, reqPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () => resolve(server));
  });
}

async function capture() {
  const server = await startServer(4174);
  console.log('Phase 3 preview server listening on http://localhost:4174');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // iPhone 14 Pro viewport
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Navigating to mobile home / launch area view...');
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Scroll to launch area focus card so the completeness meter and worklist are fully visible
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('LAUNCH AREA FOCUS'));
    if (card) {
      card.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const launchAreaImgPath = path.join(artifactDir, 'phase3_mobile_launch_area_preview.png');
  await page.screenshot({ path: launchAreaImgPath, fullPage: false });
  console.log('Saved Launch Area preview to:', launchAreaImgPath);

  // Navigate to Lagos city page with Gaps
  console.log('Navigating to Lagos Gaps view...');
  await page.goto('http://localhost:4174/ng/lagos', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Click on Data Gaps button to expand gaps explorer
  await page.evaluate(() => {
    const gapsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Data Gaps'));
    if (gapsBtn) {
      gapsBtn.click();
      gapsBtn.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  const gapsImgPath = path.join(artifactDir, 'phase3_mobile_gaps_preview.png');
  await page.screenshot({ path: gapsImgPath, fullPage: false });
  console.log('Saved Gaps preview to:', gapsImgPath);

  await browser.close();
  server.close();
  console.log('Phase 3 capture complete.');
}

capture().catch(err => {
  console.error('Error capturing Phase 3 mobile preview:', err);
  process.exit(1);
});
