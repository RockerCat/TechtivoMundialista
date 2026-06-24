const sharp = require("sharp");
const path = require("path");

const BRAND = "#38BDF8";
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

function roundedIconSvg(size, radiusRatio) {
  const r = Math.round(size * radiusRatio);
  const fontSize = Math.round(size * 0.52);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BRAND}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="900"
        font-size="${fontSize}" fill="#0a0a12">P</text>
</svg>`;
}

// Maskable: full-bleed square (no own rounding — host OS applies the mask),
// content kept inside the ~80% safe zone per the maskable icon spec.
function maskableIconSvg(size) {
  const fontSize = Math.round(size * 0.42);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="900"
        font-size="${fontSize}" fill="#0a0a12">P</text>
</svg>`;
}

async function run() {
  const jobs = [
    { name: "icon-192.png", svg: roundedIconSvg(192, 0.22), size: 192 },
    { name: "icon-512.png", svg: roundedIconSvg(512, 0.22), size: 512 },
    { name: "maskable-icon-512.png", svg: maskableIconSvg(512), size: 512 },
    { name: "apple-touch-icon.png", svg: roundedIconSvg(180, 0), size: 180, dest: path.join(__dirname, "..", "public") },
  ];

  for (const job of jobs) {
    const buf = Buffer.from(job.svg);
    const dest = job.dest || OUT_DIR;
    await sharp(buf)
      .resize(job.size, job.size)
      .png()
      .toFile(path.join(dest, job.name));
    console.log("wrote", path.join(dest, job.name));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
