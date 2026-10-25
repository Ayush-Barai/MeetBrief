import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const iconSvg = (size, maskable = false) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${maskable ? 0 : 108}" fill="#17201d"/>
  ${maskable ? '<circle cx="256" cy="256" r="210" fill="#17201d"/>' : ""}
  <g transform="translate(104 104)">
    <rect width="304" height="304" rx="76" fill="#f7f5f0"/>
    <path d="M78 112h150M78 160h106M78 208h128" stroke="#17201d" stroke-width="18" stroke-linecap="round"/>
    <path d="M190 246l30 30 62-70" stroke="#146b58" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });
await sharp(Buffer.from(iconSvg(192))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(iconSvg(512))).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(iconSvg(180))).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(iconSvg(512, true))).png().toFile("public/icons/icon-maskable-512.png");
await sharp(Buffer.from(iconSvg(32))).png().toFile("public/icons/favicon-32.png");
console.log("Icons generated in public/icons");
