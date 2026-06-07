import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve('assets/relic-hunter');
const outRoot = join(root, 'runtime');

const sheets = [
  [
    'player/unarmed',
    'kael-arden/kael-unarmed-actions.png',
    2500,
    ['idle', 'run', 'jump', 'hit-death'],
  ],
  [
    'player/sword-locomotion',
    'kael-arden/kael-sword-locomotion.png',
    2500,
    ['idle', 'run', 'jump', 'dash-roll'],
  ],
  [
    'player/sword-combat',
    'kael-arden/kael-sword-combat.png',
    2500,
    ['light-attack-1', 'light-attack-2', 'heavy-attack', 'aerial-attack'],
  ],
  [
    'player/special-states',
    'kael-arden/kael-special-states.png',
    1800,
    ['summon-sword', 'dismiss-sword', 'parry-counter', 'relic-awakening'],
  ],
  [
    'stage-01/environment/tiles-props',
    'stage-01-ashen-village/environment/tiles-props.png',
    700,
  ],
  [
    'stage-01/enemies/goblin-raider',
    'stage-01-ashen-village/enemies/goblin-raider.png',
    1800,
  ],
  [
    'stage-01/enemies/goblin-archer',
    'stage-01-ashen-village/enemies/goblin-archer.png',
    1800,
  ],
  [
    'stage-01/enemies/ash-hound',
    'stage-01-ashen-village/enemies/ash-hound.png',
    1800,
  ],
  [
    'stage-01/enemies/enemy-boss-pack',
    'stage-01-ashen-village/enemies/enemy-boss-pack.png',
    1400,
  ],
  [
    'stage-01/npcs-ui',
    'stage-01-ashen-village/npcs-ui/npc-ui-story-pack.png',
    700,
  ],
];

function getComponents(source, minArea) {
  const output = execFileSync(
    'magick',
    [
      source,
      '-alpha',
      'extract',
      '-threshold',
      '1%',
      '-define',
      'connected-components:verbose=true',
      '-connected-components',
      '8',
      'null:',
    ],
    { encoding: 'utf8' },
  );

  const components = [];
  const pattern =
    /^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[\d.]+,[\d.]+\s+([\de+.-]+)\s+(.+)$/;

  for (const line of output.split('\n')) {
    const match = line.match(pattern);
    if (!match) continue;

    const [, width, height, x, y, area, color] = match;
    const component = {
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
      area: Number(area),
    };

    if (
      component.area >= minArea &&
      !color.includes('srgb(0,0,0)') &&
      component.width > 16 &&
      component.height > 16
    ) {
      components.push(component);
    }
  }

  return components;
}

function assignRows(components) {
  const sorted = [...components].sort(
    (a, b) => a.y + a.height / 2 - (b.y + b.height / 2),
  );
  const rows = [];

  for (const component of sorted) {
    const centerY = component.y + component.height / 2;
    let row = rows.find((candidate) => Math.abs(candidate.centerY - centerY) < 105);
    if (!row) {
      row = { centerY, components: [] };
      rows.push(row);
    }
    row.components.push(component);
    row.centerY =
      row.components.reduce(
        (sum, item) => sum + item.y + item.height / 2,
        0,
      ) / row.components.length;
  }

  return rows
    .sort((a, b) => a.centerY - b.centerY)
    .map((row) => row.components.sort((a, b) => a.x - b.x));
}

function extractSheet(group, sourcePath, minArea, actionNames = []) {
  const source = join(root, sourcePath);
  const outputDir = join(outRoot, group);
  mkdirSync(outputDir, { recursive: true });

  let spriteIndex = 0;
  return assignRows(getComponents(source, minArea)).flatMap(
    (components, rowIndex) =>
      components.map((component, frameIndex) => {
        spriteIndex += 1;
        const padding = 6;
        const x = Math.max(0, component.x - padding);
        const y = Math.max(0, component.y - padding);
        const width = component.width + padding * 2;
        const height = component.height + padding * 2;
        const filename = `sprite-${String(spriteIndex).padStart(3, '0')}.png`;
        const output = join(outputDir, filename);

        execFileSync('magick', [
          source,
          '-crop',
          `${width}x${height}+${x}+${y}`,
          '+repage',
          output,
        ]);

        return {
          id: `${group}/${filename.replace('.png', '')}`,
          src: `./${relative(outRoot, output)}`,
          action: actionNames[rowIndex] ?? `row-${rowIndex + 1}`,
          frame: frameIndex,
          width,
          height,
          pivot: { x: 0.5, y: 1 },
          sourceRect: { x, y, width, height },
        };
      }),
  );
}

mkdirSync(outRoot, { recursive: true });

const sprites = sheets.flatMap(([group, source, minArea, actions]) =>
  extractSheet(group, source, minArea, actions),
);

const groupedAnimations = sprites.reduce((groups, sprite) => {
  const id = `${dirname(sprite.id)}/${sprite.action}`;
  groups[id] ??= [];
  groups[id].push(sprite);
  return groups;
}, {});

const animations = Object.fromEntries(
  Object.entries(groupedAnimations).map(([id, frames]) => [
    id,
    frames
      .sort((a, b) => a.frame - b.frame)
      .map((frame) => frame.id),
  ]),
);

const backgroundDir = join(outRoot, 'stage-01/backgrounds');
mkdirSync(backgroundDir, { recursive: true });
const backgroundSource = join(
  root,
  'stage-01-ashen-village/environment/environment-concept.png',
);
const backgroundCrops = [
  ['village-entrance.png', '326x268+8+25'],
  ['burning-street.png', '310x268+338+25'],
  ['central-plaza.png', '281x268+652+25'],
  ['collapsed-gate.png', '257x268+936+25'],
  ['boss-arena.png', '331x268+1197+25'],
];
for (const [filename, crop] of backgroundCrops) {
  execFileSync('magick', [
    backgroundSource,
    '-crop',
    crop,
    '+repage',
    join(backgroundDir, filename),
  ]);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  basePath: '/assets/relic-hunter/runtime',
  sprites,
  animations,
  backgrounds: backgroundCrops.map(([filename]) => ({
    id: filename.replace('.png', ''),
    src: `./stage-01/backgrounds/${filename}`,
  })),
};

writeFileSync(
  join(outRoot, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const ts = `// Generated by scripts/extract-relic-assets.mjs
export const RELIC_HUNTER_ASSET_BASE = '/assets/relic-hunter/runtime';

export const relicHunterSprites = ${JSON.stringify(
  Object.fromEntries(sprites.map((sprite) => [sprite.id, sprite])),
  null,
  2,
)} as const;

export const relicHunterAnimations = ${JSON.stringify(animations, null, 2)} as const;

export type RelicHunterSpriteId = keyof typeof relicHunterSprites;
export type RelicHunterAnimationId = keyof typeof relicHunterAnimations;
`;

writeFileSync(join(outRoot, 'assets.ts'), ts);

console.log(`Extracted ${sprites.length} runtime sprites into ${outRoot}`);
