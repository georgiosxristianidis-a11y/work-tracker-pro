import fs from 'fs';
import sharp from 'sharp';

async function convert() {
  const files = ['home', 'shop', 'search', 'bag', 'profile'];
  for (const f of files) {
    try {
      await sharp(`./public/Gio/${f}.svg`)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(`./public/Gio/${f}.png`);
      console.log(`Successfully generated ${f}.png`);
    } catch(e) {
      console.error(`Failed on ${f}:`, e);
    }
  }
}

convert();
