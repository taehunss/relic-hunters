# Relic Hunter Runtime Assets

This folder contains extracted transparent PNG sprites ready for a TypeScript
game runtime.

## Important Files

- `manifest.json`: engine-independent sprite, animation, pivot, and background data.
- `assets.ts`: generated typed sprite and animation constants.
- `player/`: Kael Arden animation frames.
- `stage-01/enemies/`: Stage 1 enemy and boss frames.
- `stage-01/environment/tiles-props/`: individual terrain and prop PNGs.
- `stage-01/backgrounds/`: five Stage 1 scene backgrounds.
- `stage-01/npcs-ui/`: individual NPC, story, and UI PNGs.

## Browser Loading

Serve the repository `assets` directory as `/assets`, then load the manifest:

```ts
type RelicManifest = {
  basePath: string;
  sprites: Array<{
    id: string;
    src: string;
    action: string;
    frame: number;
    width: number;
    height: number;
    pivot: { x: number; y: number };
  }>;
  animations: Record<string, string[]>;
};

const manifest: RelicManifest = await fetch(
  '/assets/relic-hunter/runtime/manifest.json',
).then((response) => response.json());

const idleFrameIds = manifest.animations['player/sword-locomotion/idle'];
```

Each sprite uses a bottom-center pivot by default. Flip sprites horizontally at
runtime for the opposite facing direction.

## Regenerate

```bash
node scripts/extract-relic-assets.mjs
```

The source master sheets remain in the parent asset folders.
