import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const repoRoot = "/Users/M1PRO/Documents/code/school-clerk";
const outputDirs = [
  join(repoRoot, "apps/marketing/public"),
  join(repoRoot, "apps/dashboard/public"),
  join(repoRoot, "apps/school-site/public"),
];

const size = 128;
const scale = 4;
const width = size * scale;
const height = size * scale;

const colors = {
  transparent: [0, 0, 0, 0],
  ink: hex("#0F172A"),
  white: hex("#F8FAFC"),
  muted: hex("#64748B"),
  teal: hex("#14B8A6"),
  sky: hex("#38BDF8"),
  amber: hex("#F59E0B"),
  red: hex("#EF4444"),
  redSoft: hex("#FECACA"),
  redDeep: hex("#991B1B"),
};

const assets = [
  { file: "logo.png", variant: "light" },
  { file: "logo-light.png", variant: "light" },
  { file: "favicon.png", variant: "light" },
  { file: "logo_mini.png", variant: "light" },
  { file: "logo-dark.png", variant: "dark" },
  { file: "favicon-dev.png", variant: "dev" },
];

for (const dir of outputDirs) {
  mkdirSync(dir, { recursive: true });
  for (const asset of assets) {
    const png = createAsset(asset.variant);
    writeFileSync(join(dir, asset.file), png);
  }
}

writeFileSync(
  join(repoRoot, "apps/marketing/src/app/favicon.ico"),
  createIco(createAsset("light")),
);

function createAsset(variant) {
  const canvas = makeCanvas();

  if (variant === "dev") {
    drawCommandGrid(canvas, {
      x: 0,
      y: 0,
      scale: 1,
      tile: colors.red,
      path: colors.white,
      first: colors.white,
      second: colors.redSoft,
      third: colors.redDeep,
      accent: colors.white,
    });
    return encodePng(downsample(canvas));
  }

  const isDark = variant === "dark";
  drawCommandGrid(canvas, {
    x: 0,
    y: 0,
    scale: 1,
    tile: isDark ? colors.white : colors.ink,
    path: isDark ? colors.ink : colors.white,
    first: isDark ? colors.ink : colors.white,
    second: colors.sky,
    third: colors.teal,
    accent: colors.amber,
  });

  return encodePng(downsample(canvas));
}

function drawCommandGrid(
  canvas,
  { x, y, scale: markScale, tile, path, first, second, third, accent },
) {
  const p = (value) => x + value * markScale;
  const q = (value) => y + value * markScale;
  const s = (value) => value * markScale;

  roundedRect(canvas, p(18), q(18), s(92), s(92), s(24), tile);
  roundedRect(canvas, p(34), q(34), s(24), s(24), s(7), first);
  roundedRect(canvas, p(70), q(34), s(24), s(24), s(7), second);
  roundedRect(canvas, p(34), q(70), s(24), s(24), s(7), third);

  strokePolyline(
    canvas,
    [
      [p(73), q(77)],
      [p(82), q(77)],
      [p(87.6), q(78.2)],
      [p(91.8), q(82.4)],
      [p(94), q(89)],
      [p(94), q(94)],
    ],
    s(8),
    path,
  );
  strokePolyline(canvas, [[p(52), q(52)], [p(78), q(76)]], s(8), path);
  circle(canvas, p(94), q(94), s(8), accent);
}

function makeCanvas() {
  return new Uint8ClampedArray(width * height * 4);
}

function setPixel(canvas, x, y, color, alpha = 1) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return;

  const idx = (py * width + px) * 4;
  const srcA = (color[3] / 255) * alpha;
  const dstA = canvas[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) return;

  canvas[idx] = Math.round((color[0] * srcA + canvas[idx] * dstA * (1 - srcA)) / outA);
  canvas[idx + 1] = Math.round((color[1] * srcA + canvas[idx + 1] * dstA * (1 - srcA)) / outA);
  canvas[idx + 2] = Math.round((color[2] * srcA + canvas[idx + 2] * dstA * (1 - srcA)) / outA);
  canvas[idx + 3] = Math.round(outA * 255);
}

function rect(canvas, x, y, w, h, color) {
  const x0 = Math.round(x * scale);
  const y0 = Math.round(y * scale);
  const x1 = Math.round((x + w) * scale);
  const y1 = Math.round((y + h) * scale);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      setPixel(canvas, px, py, color);
    }
  }
}

function roundedRect(canvas, x, y, w, h, r, color) {
  const x0 = x * scale;
  const y0 = y * scale;
  const x1 = (x + w) * scale;
  const y1 = (y + h) * scale;
  const radius = r * scale;

  for (let py = Math.floor(y0); py <= Math.ceil(y1); py++) {
    for (let px = Math.floor(x0); px <= Math.ceil(x1); px++) {
      const cx = clamp(px, x0 + radius, x1 - radius);
      const cy = clamp(py, y0 + radius, y1 - radius);
      const distance = Math.hypot(px - cx, py - cy);
      if (distance <= radius) setPixel(canvas, px, py, color);
    }
  }
}

function circle(canvas, cx, cy, r, color) {
  const x0 = Math.floor((cx - r) * scale);
  const y0 = Math.floor((cy - r) * scale);
  const x1 = Math.ceil((cx + r) * scale);
  const y1 = Math.ceil((cy + r) * scale);
  const rcx = cx * scale;
  const rcy = cy * scale;
  const rr = r * scale;

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      if (Math.hypot(px - rcx, py - rcy) <= rr) setPixel(canvas, px, py, color);
    }
  }
}

function strokePolyline(canvas, points, widthValue, color) {
  for (let i = 0; i < points.length - 1; i++) {
    strokeSegment(canvas, points[i], points[i + 1], widthValue, color);
  }
  for (const [x, y] of points) circle(canvas, x, y, widthValue / 2, color);
}

function strokeSegment(canvas, start, end, widthValue, color) {
  const [x0, y0] = start;
  const [x1, y1] = end;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.max(1, Math.hypot(dx, dy));
  const steps = Math.ceil(length * scale * 1.4);
  const radius = widthValue / 2;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    circle(canvas, x0 + dx * t, y0 + dy * t, radius, color);
  }
}

function downsample(canvas) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const idx = ((y * scale + sy) * width + x * scale + sx) * 4;
          totals[0] += canvas[idx];
          totals[1] += canvas[idx + 1];
          totals[2] += canvas[idx + 2];
          totals[3] += canvas[idx + 3];
        }
      }
      const outIdx = (y * size + x) * 4;
      out[outIdx] = Math.round(totals[0] / (scale * scale));
      out[outIdx + 1] = Math.round(totals[1] / (scale * scale));
      out[outIdx + 2] = Math.round(totals[2] / (scale * scale));
      out[outIdx + 3] = Math.round(totals[3] / (scale * scale));
    }
  }
  return out;
}

function encodePng(rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const source = (y * size + x) * 4;
      const target = rowStart + 1 + x * 4;
      raw[target] = rgba[source];
      raw[target + 1] = rgba[source + 1];
      raw[target + 2] = rgba[source + 2];
      raw[target + 3] = rgba[source + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr()),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 128;
  header[7] = 128;
  header[8] = 0;
  header[9] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function ihdr() {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(size, 0);
  data.writeUInt32BE(size, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcValue);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hex(value) {
  const normalized = value.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    255,
  ];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

console.log("Generated Command Grid PNG logo assets.");
