/**
 * src/lib/pdfPoster.ts
 * ====================
 * Client-side, zero-dependency A4 Printable PDF Poster Generator for restaurant owners.
 * Generates valid PDF 1.4 with vector QR codes, crisp typography, and print-optimized layout.
 * Works 100% offline in browser and test environments.
 */

import { generateQrCode } from '@/lib/qrCode';
import { SITE_URL } from '@/config/site';

export interface PosterOptions {
  restaurantName: string;
  locality?: string | null;
  city: string;
  placeSlug: string;
  phone?: string | null;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Builds a valid, self-contained PDF 1.4 document string containing an A4 poster (595.28 x 841.89 points).
 */
export function buildPosterPdfBytes(options: PosterOptions): Uint8Array {
  const { restaurantName, locality, city, placeSlug } = options;
  const canonicalUrl = `${SITE_URL}/place/${placeSlug}`;
  const qr = generateQrCode(canonicalUrl);

  // A4 dimensions in points
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Stream content instructions
  const ops: string[] = [];

  // 1. Clean White Background (ink-saving)
  ops.push('1 1 1 rg');
  ops.push(`0 0 ${pageWidth} ${pageHeight} re f`);

  // 2. Decorative Border & Lime Accent Banner
  // Outer subtle border
  ops.push('0.85 0.85 0.85 RG');
  ops.push('1.5 w');
  ops.push(`24 24 ${pageWidth - 48} ${pageHeight - 48} re s`);

  // Top header bar (TasteMatch Brand Dark `#0C0D10`)
  ops.push('0.05 0.05 0.06 rg');
  ops.push(`24 ${pageHeight - 94} ${pageWidth - 48} 70 re f`);

  // TasteMatch Lime Accent line (`#C8F03C`)
  ops.push('0.78 0.94 0.24 rg');
  ops.push(`24 ${pageHeight - 98} ${pageWidth - 48} 4 re f`);

  // Header Text
  ops.push('BT');
  ops.push('/F2 18 Tf');
  ops.push('1 1 1 rg');
  ops.push(`40 ${pageHeight - 56} Td`);
  ops.push('(TasteMatch) Tj');
  ops.push('ET');

  ops.push('BT');
  ops.push('/F1 11 Tf');
  ops.push('0.78 0.94 0.24 rg');
  ops.push(`148 ${pageHeight - 56} Td`);
  ops.push('(VERIFIED RESTAURANT LISTING) Tj');
  ops.push('ET');

  // 3. Restaurant Name (Large & Centered)
  const nameClean = restaurantName.length > 38 ? restaurantName.substring(0, 35) + '...' : restaurantName;
  const approxNameWidth = nameClean.length * 15;
  const nameX = Math.max(40, (pageWidth - approxNameWidth) / 2);

  ops.push('BT');
  ops.push('/F2 26 Tf');
  ops.push('0.05 0.05 0.06 rg');
  ops.push(`${nameX.toFixed(1)} ${pageHeight - 160} Td`);
  ops.push(`(${escapePdfText(nameClean)}) Tj`);
  ops.push('ET');

  // Location Subheading
  const locationText = locality ? `${locality}, ${city}, Nigeria` : `${city}, Nigeria`;
  const approxLocWidth = locationText.length * 7;
  const locX = Math.max(40, (pageWidth - approxLocWidth) / 2);

  ops.push('BT');
  ops.push('/F1 13 Tf');
  ops.push('0.4 0.4 0.4 rg');
  ops.push(`${locX.toFixed(1)} ${pageHeight - 188} Td`);
  ops.push(`(${escapePdfText(locationText)}) Tj`);
  ops.push('ET');

  // 4. Center QR Code Frame
  const qrBoxSize = 340;
  const qrBoxX = (pageWidth - qrBoxSize) / 2;
  const qrBoxY = pageHeight - 560;

  // Background card for QR code
  ops.push('0.96 0.96 0.96 rg');
  ops.push(`${qrBoxX} ${qrBoxY} ${qrBoxSize} ${qrBoxSize} re f`);
  ops.push('0.85 0.85 0.85 RG');
  ops.push('1 w');
  ops.push(`${qrBoxX} ${qrBoxY} ${qrBoxSize} ${qrBoxSize} re s`);

  // Draw QR Modules as vector squares
  const marginModules = 3;
  const totalModules = qr.size + marginModules * 2;
  const modulePixelSize = qrBoxSize / totalModules;
  const qrOriginX = qrBoxX + marginModules * modulePixelSize;
  const qrOriginY = qrBoxY + (qr.size + marginModules) * modulePixelSize;

  ops.push('0 0 0 rg');
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.getModule(r, c)) {
        const mx = qrOriginX + c * modulePixelSize;
        const my = qrOriginY - (r + 1) * modulePixelSize;
        ops.push(`${mx.toFixed(2)} ${my.toFixed(2)} ${modulePixelSize.toFixed(2)} ${modulePixelSize.toFixed(2)} re f`);
      }
    }
  }

  // 5. Call-To-Action (Under QR)
  const cta1 = 'SCAN WITH YOUR PHONE CAMERA';
  const cta1X = (pageWidth - cta1.length * 8.5) / 2;
  ops.push('BT');
  ops.push('/F2 15 Tf');
  ops.push('0.05 0.05 0.06 rg');
  ops.push(`${cta1X.toFixed(1)} ${pageHeight - 600} Td`);
  ops.push(`(${cta1}) Tj`);
  ops.push('ET');

  const cta2 = 'View Our Menu, Opening Hours & Order on WhatsApp';
  const cta2X = (pageWidth - cta2.length * 6.5) / 2;
  ops.push('BT');
  ops.push('/F1 12 Tf');
  ops.push('0.2 0.5 0.2 rg');
  ops.push(`${cta2X.toFixed(1)} ${pageHeight - 622} Td`);
  ops.push(`(${cta2}) Tj`);
  ops.push('ET');

  // Canonical Link
  const urlX = (pageWidth - canonicalUrl.length * 5.2) / 2;
  ops.push('BT');
  ops.push('/F1 9 Tf');
  ops.push('0.5 0.5 0.5 rg');
  ops.push(`${urlX.toFixed(1)} ${pageHeight - 650} Td`);
  ops.push(`(${escapePdfText(canonicalUrl)}) Tj`);
  ops.push('ET');

  // 6. Owner Free Toolkit Footer
  ops.push('0.92 0.92 0.92 rg');
  ops.push(`40 46 ${pageWidth - 80} 54 re f`);

  ops.push('BT');
  ops.push('/F2 10 Tf');
  ops.push('0.1 0.1 0.1 rg');
  ops.push(`52 78 Td`);
  ops.push('(TasteMatch Restaurant Owner Toolkit - 100% Free · No Commissions) Tj');
  ops.push('ET');

  ops.push('BT');
  ops.push('/F1 9 Tf');
  ops.push('0.4 0.4 0.4 rg');
  ops.push(`52 62 Td`);
  ops.push('(Claim your place or update your WhatsApp number anytime at tastematch.pages.dev) Tj');
  ops.push('ET');

  const contentStream = ops.join('\n');
  const streamBytes = new TextEncoder().encode(contentStream);

  // Assemble PDF 1.4 structure
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
  );

  // Object 4: Font F1 (Helvetica Regular)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // Object 5: Font F2 (Helvetica Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // Object 6: Stream Contents
  objects.push(`6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

  // Build full PDF with xref table
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0]; // offset 0 for object 0

  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj;
  }

  const startXref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;

  for (let i = 1; i < offsets.length; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    pdf += `${padded} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

/**
 * Returns a downloadable PDF Blob for offline poster printing.
 */
export function generateQrPosterPdfBlob(options: PosterOptions): Blob {
  const bytes = buildPosterPdfBytes(options);
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Triggers a browser download of the A4 PDF Poster.
 */
export function downloadQrPosterPdf(options: PosterOptions): void {
  if (typeof window === 'undefined') return;
  const blob = generateQrPosterPdfBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.placeSlug}-tastematch-poster.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
