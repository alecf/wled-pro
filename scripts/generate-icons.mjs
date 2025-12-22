import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgBuffer = readFileSync(join(__dirname, '../public/icon.svg'));

const sizes = [
  { size: 192, name: 'pwa-192x192.png', maskable: false },
  { size: 512, name: 'pwa-512x512.png', maskable: false },
  { size: 192, name: 'pwa-maskable-192x192.png', maskable: true },
  { size: 512, name: 'pwa-maskable-512x512.png', maskable: true },
  { size: 180, name: 'apple-touch-icon.png', maskable: false },
  { size: 32, name: 'favicon.ico', maskable: false }
];

async function generateIcons() {
  for (const { size, name, maskable } of sizes) {
    let image = sharp(svgBuffer).resize(size, size);

    // For maskable icons, add padding (safe zone)
    if (maskable) {
      const paddedSize = Math.round(size * 1.2);
      const padding = Math.round((paddedSize - size) / 2);

      image = sharp(svgBuffer)
        .resize(size, size)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        })
        .resize(size, size);
    }

    await image
      .png()
      .toFile(join(__dirname, '../public', name));

    console.log(`Generated ${name}`);
  }
}

generateIcons().catch(console.error);
