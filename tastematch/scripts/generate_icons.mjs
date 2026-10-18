import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function generateIcons() {
  if (!fs.existsSync(chromePath)) {
    console.error('Chrome executable not found at:', chromePath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <rect width="512" height="512" rx="128" fill="#0C0D10"/>
      <circle cx="256" cy="256" r="110" fill="#C8F03C"/>
      <text x="256" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700" fill="#F4F5F6" text-anchor="middle" letter-spacing="2">TASTEMATCH</text>
    </svg>
  `;

  for (const size of [192, 512]) {
    await page.setViewport({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
        <rect width="512" height="512" rx="128" fill="#0C0D10"/>
        <circle cx="256" cy="256" r="110" fill="#C8F03C"/>
        <text x="256" y="430" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="#F4F5F6" text-anchor="middle" letter-spacing="2">TASTEMATCH</text>
      </svg>
    </body></html>`);

    const dest = path.join(publicDir, `icon-${size}.png`);
    await page.screenshot({ path: dest, omitBackground: false });
    console.log(`Generated ${dest} (${size}x${size})`);
  }

  await browser.close();
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
