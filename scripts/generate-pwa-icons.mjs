import sharp from "sharp";
import decodeIco from "decode-ico";
import { mkdir, readFile } from "node:fs/promises";

const SRC = "public/favicon.ico";
const PRIMARY = { r: 125, g: 61, b: 240, alpha: 1 };

await mkdir("public/icons", { recursive: true });

const icoBuf = await readFile(SRC);
const frames = decodeIco(icoBuf);
const largest = frames
  .filter((f) => f.type === "png" || f.type === "bmp")
  .sort((a, b) => b.width * b.height - a.width * a.height)[0];

if (!largest) {
  throw new Error("No usable frame in favicon.ico");
}

let frameBuf;
if (largest.type === "png") {
  frameBuf = largest.data;
} else {
  // BMP frame: data is raw RGBA pixel buffer
  frameBuf = await sharp(largest.data, {
    raw: { width: largest.width, height: largest.height, channels: 4 },
  }).png().toBuffer();
}

const base = () => sharp(frameBuf);

await base().resize(192, 192, { fit: "contain", background: PRIMARY }).png().toFile("public/icons/icon-192.png");
await base().resize(512, 512, { fit: "contain", background: PRIMARY }).png().toFile("public/icons/icon-512.png");
await base().resize(410, 410, { fit: "contain", background: PRIMARY })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: PRIMARY })
  .png().toFile("public/icons/icon-maskable-512.png");
await base().resize(180, 180, { fit: "contain", background: PRIMARY }).png().toFile("public/apple-touch-icon.png");

console.log(`PWA icons written (source frame ${largest.width}x${largest.height} ${largest.type}).`);
