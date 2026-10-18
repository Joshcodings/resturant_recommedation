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

function startServer(port = 4175) {
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
  const server = await startServer(4175);
  console.log('Phase 4 preview server listening on http://localhost:4175');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // iPhone 14 Pro viewport
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Navigating to mobile home / discover view...');
  await page.goto('http://localhost:4175/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Preview 1: Mobile home with Search, Near Me, Dish Chips
  const mobileHomeImgPath = path.join(artifactDir, 'phase4_mobile_analytics_preview.png');
  await page.screenshot({ path: mobileHomeImgPath, fullPage: false });
  console.log('Captured Phase 4 mobile home preview:', mobileHomeImgPath);

  // Preview 2: Open first restaurant card to view place details & owner WhatsApp actions
  await page.evaluate(() => {
    const card = document.querySelector('button[data-testid="restaurant-card"]') ||
                 document.querySelector('article button') ||
                 document.querySelector('.restaurant-card');
    if (card) {
      card.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  const mobileDrawerImgPath = path.join(artifactDir, 'phase4_mobile_drawer_actions_preview.png');
  await page.screenshot({ path: mobileDrawerImgPath, fullPage: false });
  console.log('Captured Phase 4 mobile drawer actions preview:', mobileDrawerImgPath);

  await browser.close();
  server.close();
  console.log('Preview capture complete.');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
