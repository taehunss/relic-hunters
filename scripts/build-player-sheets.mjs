import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CELL_WIDTH = 320;
const CELL_HEIGHT = 280;
const BOTTOM_MARGIN = 8;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const runtimeRoot = path.join(root, 'art-source', 'runtime');
const outputRoot = path.join(root, 'web', 'public', 'assets', 'kael');

const sheets = {
  'sword-idle': 'player/sword-locomotion/idle',
  'sword-run': 'player/sword-locomotion/run',
  'sword-jump': 'player/sword-locomotion/jump',
  'sword-dash': 'player/sword-locomotion/dash-roll',
  'sword-attack': 'player/sword-combat/light-attack-1',
  'sword-aerial-attack': 'player/sword-combat/aerial-attack',
};

const manifest = JSON.parse(
  await fs.readFile(path.join(runtimeRoot, 'manifest.json'), 'utf8'),
);
const spritesById = new Map(manifest.sprites.map((sprite) => [sprite.id, sprite]));

await fs.mkdir(outputRoot, { recursive: true });

async function removeNeighborFragments(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const components = [];

  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 32) continue;

    const pixels = [];
    let minX = info.width;
    let minY = info.height;
    let maxX = 0;
    let maxY = 0;
    const stack = [start];
    visited[start] = 1;

    while (stack.length) {
      const index = stack.pop();
      pixels.push(index);
      const x = index % info.width;
      const y = Math.floor(index / info.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            (dx === 0 && dy === 0) ||
            nx < 0 ||
            nx >= info.width ||
            ny < 0 ||
            ny >= info.height
          ) continue;

          const next = ny * info.width + nx;
          if (!visited[next] && data[next * 4 + 3] >= 32) {
            visited[next] = 1;
            stack.push(next);
          }
        }
      }
    }

    components.push({ pixels, minX, minY, maxX, maxY });
  }

  const anchor = components.reduce((largest, component) =>
    component.pixels.length > largest.pixels.length ? component : largest
  );
  const keepThreshold = anchor.pixels.length * 0.15;
  for (const component of components) {
    const gapX = Math.max(anchor.minX - component.maxX, component.minX - anchor.maxX, 0);
    const gapY = Math.max(anchor.minY - component.maxY, component.minY - anchor.maxY, 0);
    const isNearCharacter = Math.hypot(gapX, gapY) <= 8;
    const touchesCropEdge =
      component !== anchor &&
      (component.minX < 6 || component.maxX >= info.width - 6);
    if (!touchesCropEdge && (component.pixels.length >= keepThreshold || isNearCharacter)) continue;
    for (const index of component.pixels) data[index * 4 + 3] = 0;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

for (const [filename, animationId] of Object.entries(sheets)) {
  const frameIds = manifest.animations[animationId];
  if (!frameIds) throw new Error(`Missing animation: ${animationId}`);

  const composites = await Promise.all(frameIds.map(async (frameId, index) => {
    const sprite = spritesById.get(frameId);
    if (!sprite) throw new Error(`Missing sprite: ${frameId}`);
    const inputPath = path.resolve(runtimeRoot, sprite.src);

    return {
      input: await removeNeighborFragments(inputPath),
      left: index * CELL_WIDTH + Math.round((CELL_WIDTH - sprite.width) / 2),
      top: CELL_HEIGHT - BOTTOM_MARGIN - sprite.height,
    };
  }));

  const outputPath = path.join(outputRoot, `${filename}.png`);
  await sharp({
    create: {
      width: CELL_WIDTH * frameIds.length,
      height: CELL_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);

  console.log(`${filename}.png: ${frameIds.length} frames`);
}
