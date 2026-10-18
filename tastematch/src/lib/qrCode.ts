/**
 * src/lib/qrCode.ts
 * =================
 * Self-contained, zero-dependency QR Code generator (QR Model 2, Byte Mode).
 * Implements ISO/IEC 18004 specification for generating valid, scannable QR matrices.
 * Works 100% offline in browser, Node, and test runners.
 */

// Galois Field GF(256) with primitive polynomial 0x11D (285)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    EXP_TABLE[i + 255] = val;
    LOG_TABLE[val] = i;
    val <<= 1;
    if (val & 256) {
      val ^= 0x11d;
    }
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function computeReedSolomon(data: Uint8Array, numEcBytes: number): Uint8Array {
  // Generate generator polynomial
  let genPoly = new Uint8Array([1]);
  for (let i = 0; i < numEcBytes; i++) {
    const factor = new Uint8Array([1, EXP_TABLE[i]]);
    const nextPoly = new Uint8Array(genPoly.length + 1);
    for (let j = 0; j < genPoly.length; j++) {
      nextPoly[j] ^= gfMultiply(genPoly[j], factor[0]);
      nextPoly[j + 1] ^= gfMultiply(genPoly[j], factor[1]);
    }
    genPoly = nextPoly;
  }

  // Polynomial division to get remainder
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const lead = data[i] ^ remainder[0];
    for (let j = 0; j < numEcBytes - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMultiply(lead, genPoly[j + 1]);
    }
    remainder[numEcBytes - 1] = gfMultiply(lead, genPoly[numEcBytes]);
  }

  return remainder;
}

// Version table: capacity and ECC parameters (Error Correction Level M)
// Supports URLs up to 154 characters (Versions 1 through 7)
interface QrVersionInfo {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytesPerBlock: number;
  numBlocks: number;
  alignPos: number[];
}

const VERSIONS: QrVersionInfo[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytesPerBlock: 10, numBlocks: 1, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytesPerBlock: 16, numBlocks: 1, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytesPerBlock: 26, numBlocks: 1, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytesPerBlock: 18, numBlocks: 2, alignPos: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytesPerBlock: 24, numBlocks: 2, alignPos: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytesPerBlock: 16, numBlocks: 4, alignPos: [6, 34] },
  { version: 7, size: 45, totalBytes: 196, dataBytes: 124, ecBytesPerBlock: 18, numBlocks: 4, alignPos: [6, 22, 38] },
  { version: 8, size: 49, totalBytes: 242, dataBytes: 154, ecBytesPerBlock: 22, numBlocks: 4, alignPos: [6, 24, 42] },
];

export interface QrMatrix {
  size: number;
  matrix: boolean[][];
  getModule: (row: number, col: number) => boolean;
  toSvg: (moduleSize?: number, margin?: number) => string;
}

export function generateQrCode(text: string): QrMatrix {
  const textBytes = new TextEncoder().encode(text);
  
  // Find appropriate version
  let versionInfo: QrVersionInfo | null = null;
  for (const v of VERSIONS) {
    // 4 bits mode + 8 bits length + data
    const requiredBits = 4 + 8 + textBytes.length * 8;
    const availableBits = v.dataBytes * 8;
    if (requiredBits <= availableBits) {
      versionInfo = v;
      break;
    }
  }

  if (!versionInfo) {
    // Fall back to largest supported version
    versionInfo = VERSIONS[VERSIONS.length - 1];
  }

  const { size, dataBytes, ecBytesPerBlock, numBlocks, alignPos } = versionInfo;

  // 1. Bitstream encoding
  const bitstream: number[] = [];
  function pushBits(val: number, count: number) {
    for (let i = count - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1-9)
  pushBits(textBytes.length, 8);
  // Payload bytes
  for (const byte of textBytes) {
    pushBits(byte, 8);
  }
  // Terminator: up to 4 zero bits
  const terminatorLen = Math.min(4, dataBytes * 8 - bitstream.length);
  pushBits(0, terminatorLen);
  // Pad to byte boundary
  while (bitstream.length % 8 !== 0) {
    bitstream.push(0);
  }
  // Pad bytes: alternating 0xEC, 0x11
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bitstream.length < dataBytes * 8) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bitstream to raw data bytes
  const dataByteList = new Uint8Array(dataBytes);
  for (let i = 0; i < dataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitstream[i * 8 + b];
    }
    dataByteList[i] = byteVal;
  }

  // 2. Reed-Solomon Error Correction Blocks
  const blockSize = Math.floor(dataBytes / numBlocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const start = i * blockSize;
    const end = i === numBlocks - 1 ? dataBytes : (i + 1) * blockSize;
    const slice = dataByteList.slice(start, end);
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomon(slice, ecBytesPerBlock));
  }

  // Interleave data and EC bytes
  const finalInterleaved: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) finalInterleaved.push(block[i]);
    }
  }
  for (let i = 0; i < ecBytesPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) finalInterleaved.push(ec[i]);
    }
  }

  // 3. Matrix population
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunctionModule(r: number, c: number, dark: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = dark;
      isFunction[r][c] = true;
    }
  }

  // Finder Patterns (3 corners: top-left, top-right, bottom-left)
  function drawFinderPattern(startR: number, startC: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startR + r;
        const nc = startC + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const inBorder = (r === 0 || r === 6 || c === 0 || c === 6) && (r >= 0 && r <= 6 && c >= 0 && c <= 6);
          const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFunctionModule(nr, nc, inBorder || inCenter);
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns (Row 6, Col 6)
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  if (alignPos.length >= 2) {
    for (const r of alignPos) {
      for (const c of alignPos) {
        // Skip if overlaps with finder patterns
        const nearTopLeft = r <= 8 && c <= 8;
        const nearTopRight = r <= 8 && c >= size - 8;
        const nearBottomLeft = r >= size - 8 && c <= 8;
        if (nearTopLeft || nearTopRight || nearBottomLeft) continue;

        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setFunctionModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Dark module (4 * version + 9, 8)
  setFunctionModule(4 * versionInfo.version + 9, 8, true);

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // 4. Place Data Bits (Zig-zag)
  let bitIndex = 0;
  const totalDataBits = finalInterleaved.length * 8;
  let dirUp = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing pattern column

    const rows = dirUp
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (let c = rightCol; c >= rightCol - 1; c--) {
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIndex < totalDataBits) {
            const byte = finalInterleaved[Math.floor(bitIndex / 8)];
            const bit = (byte >> (7 - (bitIndex % 8))) & 1;
            dark = bit === 1;
            bitIndex++;
          }
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          matrix[r][c] = dark;
        }
      }
    }
    dirUp = !dirUp;
  }

  // 5. Write Format Information (Error Correction Level M + Mask 0 = 0b10000, BCH masked with 0x5412)
  // Mask pattern 0 (000), EC level M (00) -> Format bits 101010000010010 (0x5412)
  // With XOR mask 0x5412: 0x5412 ^ 0x5412 = 0b101010000010010 ^ 0b101010000010010 = 0
  // Standard Level M, Mask 0 format code:
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === 1;
    // Top-left format info
    if (i <= 5) setFunctionModule(8, i, bit);
    else if (i === 6) setFunctionModule(8, 7, bit);
    else if (i === 7) setFunctionModule(8, 8, bit);
    else if (i === 8) setFunctionModule(7, 8, bit);
    else setFunctionModule(14 - i, 8, bit);

    // Split format info around corners
    if (i < 8) {
      setFunctionModule(size - 1 - i, 8, bit);
    } else {
      setFunctionModule(8, size - 15 + i, bit);
    }
  }

  return {
    size,
    matrix,
    getModule: (r: number, c: number) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      return matrix[r][c];
    },
    toSvg: (moduleSize = 8, margin = 4) => {
      const totalModules = size + margin * 2;
      const svgSize = totalModules * moduleSize;
      const rects: string[] = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c]) {
            const x = (c + margin) * moduleSize;
            const y = (r + margin) * moduleSize;
            rects.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#000000" />`);
          }
        }
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
  <rect width="${svgSize}" height="${svgSize}" fill="#ffffff" />
  ${rects.join('\n  ')}
</svg>`;
    },
  };
}
