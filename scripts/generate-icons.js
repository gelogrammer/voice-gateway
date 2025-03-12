import sharp from 'sharp';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
};

async function generateIcons() {
  const inputSvg = join(__dirname, '../public/microphone-icon.svg');
  
  for (const [filename, size] of Object.entries(sizes)) {
    await sharp(inputSvg)
      .resize(size, size)
      .toFile(join(__dirname, '../public', filename));
    
    console.log(`Generated ${filename}`);
  }
  
  // Generate safari-pinned-tab.svg (black version)
  const svgContent = await fs.readFile(inputSvg, 'utf8');
  const blackVersion = svgContent
    .replace('fill="#0EA5E9"', 'fill="#000000"')
    .replace(/fill="white"/g, 'fill="#000000"');
  
  await fs.writeFile(
    join(__dirname, '../public/safari-pinned-tab.svg'),
    blackVersion
  );
  
  console.log('Generated safari-pinned-tab.svg');
}

generateIcons().catch(console.error); 