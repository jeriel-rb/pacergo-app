import sharp from "sharp";

/**
 * Derive adductors.jpg from quadriceps.jpg:
 * - Quads blue → muted lavender
 * - Medial lavender/dark strips (inner thigh) → bright blue
 */
const SRC = "apps/web/public/images/focused_muscles/quadriceps.jpg";
const OUT = "apps/web/public/images/focused_muscles/adductors.jpg";

const { data, info } = await sharp(SRC)
  .raw()
  .ensureAlpha()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;

function isBlue(r, g, b) {
  return b > 160 && b > r + 35 && b > g + 25 && r < 130;
}
function isLav(r, g, b) {
  return r >= 85 && r <= 170 && g >= 85 && g <= 180 && b >= 120 && b <= 210 && b >= r - 10;
}
function isDarkFill(r, g, b) {
  return r >= 30 && r < 110 && g >= 35 && g < 120 && b < 150 && b > r;
}
function isOutline(r, g, b) {
  return r < 55 && g < 65 && b < 95;
}
function isBg(r, g, b) {
  return r > 220 && g > 220 && b > 220;
}

const LAV = [120, 120, 168];
const BLUE = [8, 40, 248];

// Collect original blue pixels to find thigh medial edges
let minBlueY = height,
  maxBlueY = 0;
const leftBlueXs = [];
const rightBlueXs = [];
const cx = width / 2;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (!isBlue(data[i], data[i + 1], data[i + 2])) continue;
    minBlueY = Math.min(minBlueY, y);
    maxBlueY = Math.max(maxBlueY, y);
    if (x < cx) leftBlueXs.push(x);
    else rightBlueXs.push(x);
  }
}
const leftMedial = Math.max(...leftBlueXs); // ~204
const rightMedial = Math.min(...rightBlueXs); // ~309
const y0 = Math.max(0, minBlueY - 5);
const y1 = Math.min(height - 1, maxBlueY + 25);

console.log({ leftMedial, rightMedial, y0, y1 });

const out = Buffer.from(data);

// 1) Deactivate all blue → lavender
for (let i = 0; i < data.length; i += 4) {
  if (isBlue(data[i], data[i + 1], data[i + 2])) {
    out[i] = LAV[0];
    out[i + 1] = LAV[1];
    out[i + 2] = LAV[2];
  }
}

// 2) Activate medial band (between medial edges of quads, excluding center crotch outline)
// Expand slightly into each thigh so we catch the full adductor segment
const xL = leftMedial - 8;
const xR = rightMedial + 8;
let painted = 0;
for (let y = y0; y <= y1; y++) {
  for (let x = xL; x <= xR; x++) {
    const i = (y * width + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (isBg(r, g, b) || isOutline(r, g, b)) continue;
    // Paint lavender + soft dark fills that sit in the inner-thigh corridor
    if (isLav(r, g, b) || isDarkFill(r, g, b)) {
      out[i] = BLUE[0];
      out[i + 1] = BLUE[1];
      out[i + 2] = BLUE[2];
      painted++;
    }
  }
}

console.log("painted", painted);

await sharp(out, { raw: { width, height, channels: 4 } })
  .jpeg({ quality: 92 })
  .toFile(OUT);

console.log("wrote", OUT);
