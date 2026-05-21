import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('static/icon.svg');
const outputDir = path.resolve('static');

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

async function generate() {
  console.log(`Reading SVG from: ${svgPath}`);
  const svgBuffer = fs.readFileSync(svgPath);

  for (const target of targets) {
    const outputPath = path.join(outputDir, target.name);
    console.log(`Generating ${target.name} (${target.size}x${target.size})...`);
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Saved to ${outputPath}`);
  }
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
