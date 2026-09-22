import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * front_deltoid = top rounded shoulder-cap fill (above the middle strip), solid blue.
 * Source blue (middle/lateral strip) is cleared back to lav.
 * middle_deltoid stays a straight copy of the source.
 */
const SRC =
  "C:/Users/roy_d/.cursor/projects/c-Users-roy-d-Documents-Projects-pacergo-app/assets/front_deltoid_from_neck.jpg";
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/images/focused_muscles");

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const src = Buffer.from(data);

const get = (x, y) => {
  const i = (y * width + x) * channels;
  return { r: src[i], g: src[i + 1], b: src[i + 2], a: src[i + 3] };
};
const set = (buf, x, y, c) => {
  const i = (y * width + x) * channels;
  buf[i] = c.r;
  buf[i + 1] = c.g;
  buf[i + 2] = c.b;
  if (channels > 3) buf[i + 3] = c.a ?? 255;
};
const avg = (c) => (c.r + c.g + c.b) / 3;
const isBlue = (c) => c.b >= 185 && c.r <= 95 && c.b - c.r >= 85;
const isOutline = (c) => avg(c) < 80;
const isBg = (c) => avg(c) > 235;
const isBodyTone = (c) => !isBlue(c) && !isBg(c) && avg(c) >= 55 && avg(c) <= 215;
const isFill = (c) => isBodyTone(c) && !isOutline(c);

let blue = null;
for (let y = 0; y < height && !blue; y++) {
  for (let x = 0; x < width; x++) {
    const c = get(x, y);
    if (isBlue(c)) {
      blue = { r: c.r, g: c.g, b: c.b, a: 255 };
      break;
    }
  }
}
let lav = null;
for (let y = Math.floor(height * 0.32); y < Math.floor(height * 0.42) && !lav; y++) {
  for (let x = Math.floor(width * 0.4); x < Math.floor(width * 0.6); x++) {
    const c = get(x, y);
    if (isFill(c) && Math.abs(c.r - c.g) < 30 && avg(c) >= 125) {
      lav = { r: c.r, g: c.g, b: c.b, a: 255 };
      break;
    }
  }
}
if (!blue || !lav) throw new Error(`sample failed blue=${!!blue} lav=${!!lav}`);

const idx = (x, y) => y * width + x;
const nbrs4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const middleMask = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isBlue(get(x, y))) middleMask[idx(x, y)] = 1;
  }
}

// Dilate middle upward/outward so we can find fill that touches the top of the strip
const dil = Uint8Array.from(middleMask);
for (let pass = 0; pass < 14; pass++) {
  const snap = Uint8Array.from(dil);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (snap[idx(x, y)]) continue;
      if (
        snap[idx(x - 1, y)] ||
        snap[idx(x + 1, y)] ||
        snap[idx(x, y - 1)] ||
        snap[idx(x, y + 1)]
      ) {
        dil[idx(x, y)] = 1;
      }
    }
  }
}

const visit = new Uint8Array(width * height);
const midBlobs = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = idx(x, y);
    if (!middleMask[p] || visit[p]) continue;
    let n = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = x;
    let maxX = x;
    let minY = y;
    let maxY = y;
    const q = [[x, y]];
    visit[p] = 1;
    while (q.length) {
      const [cx, cy] = q.pop();
      n++;
      sumX += cx;
      sumY += cy;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      for (const [dx, dy] of nbrs4) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = idx(nx, ny);
        if (visit[ni] || !middleMask[ni]) continue;
        visit[ni] = 1;
        q.push([nx, ny]);
      }
    }
    if (n > 200) {
      midBlobs.push({
        n,
        cx: sumX / n,
        cy: sumY / n,
        minX,
        maxX,
        minY,
        maxY,
      });
    }
  }
}

const midX = width / 2;
const frontMask = new Uint8Array(width * height);

// Flood-fill body fills that touch dilated middle AND sit above / on the
// shoulder crown (centroid above the middle strip's mid-height, near the blob).
const FILL_Y_MAX = Math.floor(height * 0.55);
visit.fill(0);
const candidates = [];
for (let y = 0; y < FILL_Y_MAX; y++) {
  for (let x = 0; x < width; x++) {
    const p = idx(x, y);
    if (visit[p] || middleMask[p] || !isFill(get(x, y))) continue;
    const cells = [];
    const q = [[x, y]];
    visit[p] = 1;
    let sx = 0;
    let sy = 0;
    let touches = false;
    let minY = y;
    let maxY = y;
    while (q.length) {
      const [cx, cy] = q.pop();
      cells.push([cx, cy]);
      sx += cx;
      sy += cy;
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      if (dil[idx(cx, cy)]) touches = true;
      for (const [dx, dy] of nbrs4) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= FILL_Y_MAX) continue;
        const ni = idx(nx, ny);
        if (visit[ni] || middleMask[ni]) continue;
        const c = get(nx, ny);
        if (!isFill(c)) continue;
        visit[ni] = 1;
        q.push([nx, ny]);
      }
    }
    if (!touches || cells.length < 200) continue;
    candidates.push({
      cells,
      size: cells.length,
      cx: sx / cells.length,
      cy: sy / cells.length,
      minY,
      maxY,
      minX: Math.min(...cells.map(([x]) => x)),
      maxX: Math.max(...cells.map(([x]) => x)),
    });
  }
}

// Outer rounded shoulder corner — down and out from the neck-side top cap.
// Take only the upper rounded lobe (geodesic from the top edge), not the
// long strip that continues down the arm.
const picked = [];
for (const c of candidates) {
  const nearest = midBlobs.reduce((best, m) => {
    const d = Math.hypot(m.cx - c.cx, m.cy - c.cy);
    return !best || d < best.d ? { m, d } : best;
  }, null);
  if (!nearest || nearest.d > 120) continue;
  const left = nearest.m.cx < midX;
  if (left && c.cx > nearest.m.cx) continue;
  if (!left && c.cx < nearest.m.cx) continue;
  if (c.minY > nearest.m.minY + 5) continue;
  picked.push({ ...c, near: nearest.m, d: nearest.d });
}

for (const side of ["left", "right"]) {
  const sideComps = picked
    .filter((c) => (side === "left" ? c.cx < midX : c.cx >= midX))
    .sort((a, b) => a.minY - b.minY || b.size - a.size);
  for (const comp of sideComps.slice(0, 1)) {
    // Full closed segment — current blue was the top of this piece; fill it all
    for (const [x, y] of comp.cells) frontMask[idx(x, y)] = 1;
  }
}

// Close tiny holes inside the crown
for (let pass = 0; pass < 3; pass++) {
  const snap = Uint8Array.from(frontMask);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (snap[idx(x, y)] || middleMask[idx(x, y)]) continue;
      if (!isFill(get(x, y))) continue;
      let n = 0;
      for (const [dx, dy] of nbrs4) if (snap[idx(x + dx, y + dy)]) n++;
      if (n >= 3) frontMask[idx(x, y)] = 1;
    }
  }
}

const out = Buffer.from(src);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = idx(x, y);
    // Clear middle highlight back to body grey
    if (middleMask[p]) set(out, x, y, lav);
    // Paint shoulder-crown front delt
    if (frontMask[p]) set(out, x, y, blue);
  }
}

await sharp(out, { raw: { width, height, channels } })
  .jpeg({ quality: 100, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile(path.join(DIR, "front_deltoid.jpg"));

fs.copyFileSync(SRC, path.join(DIR, "middle_deltoid.jpg"));

let f = 0;
for (const v of frontMask) f += v;
console.log(
  JSON.stringify(
    {
      frontPixels: f,
      candidates: candidates.map((c) => ({
        size: c.size,
        cx: Math.round(c.cx),
        cy: Math.round(c.cy),
        minY: c.minY,
      })),
      picked: picked.map((c) => ({
        size: c.size,
        cx: Math.round(c.cx),
        cy: Math.round(c.cy),
        minY: c.minY,
        d: Math.round(c.d),
      })),
    },
    null,
    2,
  ),
);
