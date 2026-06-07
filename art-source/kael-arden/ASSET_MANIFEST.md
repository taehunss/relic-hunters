# Kael Arden Asset Pack

All PNG files use a transparent background and show Kael facing right.
Flip the renderer on the X axis for left-facing movement.

## Files

- `kael-master-sheet.png`
  - Locked character, costume, face, palette, and Curtana reference.
- `kael-unarmed-actions.png`
  - Row 1: unarmed idle
  - Row 2: unarmed run
  - Row 3: unarmed jump
  - Row 4: hit and death
- `kael-sword-locomotion.png`
  - Row 1: sword-ready idle
  - Row 2: sword-equipped run
  - Row 3: sword-equipped jump
  - Row 4: dash and dodge roll
- `kael-sword-combat.png`
  - Row 1: horizontal light attack
  - Row 2: rising light attack
  - Row 3: overhead heavy attack
  - Row 4: aerial attack
- `kael-special-states.png`
  - Row 1: summon Curtana
  - Row 2: dismiss Curtana
  - Row 3: parry and counter
  - Row 4: relic awakening
- `kael-idle-8f-unity-grid-270x724.png`
  - Earlier standalone idle exploration sheet.

## Unity Import

- Texture Type: `Sprite (2D and UI)`
- Sprite Mode: `Multiple`
- Filter Mode: `Point (no filter)`
- Compression: `None`
- Generate Mip Maps: disabled
- Pivot: bottom center

## Production Note

These sheets are the generated animation masters. Before final release, normalize
each extracted frame to the project's chosen canvas size and align every grounded
frame to the same foot baseline. Pixel-clean the sword silhouette, hands, mantle,
and small facial details where animation frames vary.
