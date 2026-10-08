import sharp from "sharp";

/**
 * Derive obliques.jpg from abs.jpg:
 * - Rectus abdominis (deep blue six-pack) → muted lavender
 * - Side segments (lighter blue flanks — the obliques) → bright blue
 * Anti-aliased edges are blended by how blue each pixel is, so outlines stay crisp.
 *
 * Run from the repo root: node apps/web/scripts/derive-obliques.mjs
 */
const SRC = "apps/web/public/images/focused_muscles/abs.jpg";
const OUT = "apps/web/public/images/focused_muscles/obliques.jpg";

const LAV = [120, 120, 168];
const BLUE = [1, 42, 251];

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.from(data);

// Which blue a pixel is closest to: rectus (1,42,251) has low green; the
// oblique segments (22,100,248) have green near 100. Lavender body fill and
// the dark outline aren't blue enough to match either.
const at = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const blueness = ([r, , b]) => Math.min(1, Math.max(0, (b - r - 40) / 190));
const kind = ([r, g, b]) => {
  if (b < 200 || b - r < 140) return null;
  return g < 70 ? "rectus" : "oblique";
};

// Grow each region by a few pixels so the anti-aliased rim is recoloured too.
const RIM = 3;
const label = new Array(width * height).fill(null);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const k = kind(at(x, y));
    if (!k) continue;
    for (let dy = -RIM; dy <= RIM; dy++) {
      for (let dx = -RIM; dx <= RIM; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        // A pixel that is itself blue keeps its own kind.
        if (label[j] === null || (dx === 0 && dy === 0)) label[j] = k;
      }
    }
  }
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const j = y * width + x;
    const k = label[j];
    if (!k) continue;
    const px = at(x, y);
    const w = blueness(px);
    if (w === 0) continue;
    const target = k === "rectus" ? LAV : BLUE;
    const i = j * channels;
    for (let c = 0; c < 3; c++) {
      // Replace the blue share of the pixel with the target colour.
      out[i + c] = Math.round(px[c] * (1 - w) + target[c] * w);
    }
  }
}

await sharp(out, { raw: { width, height, channels } }).jpeg({ quality: 92 }).toFile(OUT);
console.log(`Wrote ${OUT}`);
