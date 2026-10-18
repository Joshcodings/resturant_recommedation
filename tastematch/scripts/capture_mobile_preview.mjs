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

// Simple static server for dist
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
  const server = await startServer(4173);
  console.log('Static preview server listening on http://localhost:4173');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // Pixel 7 / iPhone 14 mobile viewport
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  console.log('Navigating to http://localhost:4173/ng/lagos...');
  await page.goto('http://localhost:4173/ng/lagos', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for restaurant cards or search bar to be rendered
  await page.waitForSelector('.top-bar-header', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));

  fs.mkdirSync(artifactDir, { recursive: true });
  const previewPath = path.join(artifactDir, 'phase1_mobile_preview.png');
  await page.screenshot({ path: previewPath, fullPage: false });
  console.log(`Mobile screenshot saved to: ${previewPath}`);

  // Also capture a place detail view
  console.log('Navigating to place route: http://localhost:4173/place/aj-fast-food-osm-node-5407647924...');
  await page.goto('http://localhost:4173/place/aj-fast-food-osm-node-5407647924', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  const placePreviewPath = path.join(artifactDir, 'phase1_mobile_place_preview.png');
  await page.screenshot({ path: placePreviewPath, fullPage: false });
  console.log(`Place mobile screenshot saved to: ${placePreviewPath}`);

  await browser.close();
  server.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
