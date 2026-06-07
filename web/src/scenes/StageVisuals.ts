import Phaser from 'phaser';

const WORLD_W = 960;
const WORLD_H = 540;
const FLOOR_Y = 508;

type PropPlacement = {
  id: number;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  depth?: number;
  alpha?: number;
};

const PROP_LAYOUTS: PropPlacement[][] = [
  [
    { id: 38, x: 132, y: 466, scale: 0.78, depth: 2 },
    { id: 37, x: 472, y: 480, scale: 0.68, depth: 2 },
    { id: 33, x: 836, y: 490, scale: 0.78, flip: true, depth: 2 },
    { id: 46, x: 82, y: 500, scale: 0.7, depth: 4 },
    { id: 44, x: 888, y: 503, scale: 0.65, depth: 4 },
    { id: 56, x: 680, y: 500, scale: 0.75, depth: 1, alpha: 0.78 },
    { id: 72, x: 932, y: 492, scale: 0.7, depth: 3 },
  ],
  [
    { id: 34, x: 132, y: 496, scale: 0.82, depth: 2 },
    { id: 51, x: 792, y: 502, scale: 0.72, depth: 2 },
    { id: 55, x: 880, y: 502, scale: 0.78, depth: 3 },
    { id: 45, x: 62, y: 503, scale: 0.68, depth: 3 },
    { id: 39, x: 910, y: 487, scale: 0.72, depth: 2 },
    { id: 60, x: 568, y: 503, scale: 0.72, depth: 1 },
    { id: 65, x: 330, y: 505, scale: 0.7, depth: 1 },
  ],
  [
    { id: 35, x: 116, y: 493, scale: 0.78, depth: 2 },
    { id: 37, x: 504, y: 487, scale: 0.82, depth: 2 },
    { id: 50, x: 820, y: 502, scale: 0.72, depth: 2 },
    { id: 46, x: 905, y: 505, scale: 0.72, depth: 3 },
    { id: 64, x: 290, y: 506, scale: 0.72, depth: 1 },
    { id: 67, x: 690, y: 504, scale: 0.7, depth: 1 },
  ],
  [
    { id: 63, x: 92, y: 502, scale: 0.8, depth: 2 },
    { id: 62, x: 866, y: 503, scale: 0.82, flip: true, depth: 2 },
    { id: 73, x: 176, y: 498, scale: 0.82, depth: 3 },
    { id: 72, x: 792, y: 498, scale: 0.82, flip: true, depth: 3 },
    { id: 66, x: 310, y: 507, scale: 0.82, depth: 1 },
    { id: 65, x: 680, y: 507, scale: 0.8, depth: 1 },
    { id: 55, x: 478, y: 506, scale: 0.7, depth: 1 },
  ],
];

export class StageVisuals {
  private readonly scene: Phaser.Scene;
  private readonly background: Phaser.GameObjects.Image;
  private readonly propGroup: Phaser.GameObjects.Group;
  private readonly ashEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emberEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireGlows: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, initialBackground: string) {
    this.scene = scene;
    this.background = scene.add.image(WORLD_W / 2, WORLD_H / 2, initialBackground)
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(-30);

    scene.add.rectangle(WORLD_W / 2, 418, WORLD_W, 245, 0x160c08, 0.17).setDepth(-20);
    scene.add.rectangle(WORLD_W / 2, FLOOR_Y + 22, WORLD_W, 68, 0x100c09, 0.72).setDepth(-8);

    this.propGroup = scene.add.group();
    this.createStoneRoad();
    this.createScreenTreatment();

    this.ashEmitter = scene.add.particles(0, 0, 'ash-particle', {
      x: { min: 0, max: WORLD_W },
      y: -10,
      lifespan: { min: 5000, max: 9000 },
      speedY: { min: 12, max: 30 },
      speedX: { min: -14, max: 10 },
      scale: { start: 0.8, end: 0.15 },
      alpha: { start: 0.45, end: 0 },
      frequency: 95,
      quantity: 1,
    }).setDepth(70);

    this.emberEmitter = scene.add.particles(0, 0, 'ember-particle', {
      x: { min: 0, max: WORLD_W },
      y: { min: 400, max: 520 },
      lifespan: { min: 900, max: 1900 },
      speedY: { min: -65, max: -22 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 0.8, end: 0 },
      frequency: 180,
      quantity: 1,
    }).setDepth(71);
  }

  showArea(index: number, backgroundKey: string) {
    this.scene.cameras.main.fadeOut(180, 25, 12, 6);
    this.scene.time.delayedCall(190, () => {
      this.background.setTexture(backgroundKey).setDisplaySize(WORLD_W, WORLD_H);
      this.buildProps(index);
      this.scene.cameras.main.fadeIn(320, 25, 12, 6);
    });
  }

  spawnPortal(x: number, y: number) {
    const ring = this.scene.add.ellipse(x, y - 48, 82, 125, 0xb64122, 0.16)
      .setStrokeStyle(3, 0xffb05a, 0.75)
      .setDepth(18)
      .setScale(0.2);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: 650,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
  }

  burst(x: number, y: number, color = 0xffc46b, count = 9) {
    for (let i = 0; i < count; i += 1) {
      const spark = this.scene.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.95).setDepth(80);
      this.scene.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-48, 48),
        y: y + Phaser.Math.Between(-50, 24),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(180, 360),
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  setBossAtmosphere(enabled: boolean) {
    this.emberEmitter.setFrequency(enabled ? 70 : 180);
    this.ashEmitter.setFrequency(enabled ? 65 : 95);
  }

  private createStoneRoad() {
    const stoneIds = [2, 4, 2, 3, 2];
    let x = -40;
    for (const id of stoneIds) {
      const stone = this.scene.add.image(x, 534, `prop-${id}`).setOrigin(0, 1).setScale(0.78).setDepth(-6);
      x += stone.displayWidth - 5;
    }

    this.scene.add.ellipse(WORLD_W / 2, 516, WORLD_W * 1.2, 42, 0x050403, 0.36).setDepth(-5);
  }

  private createScreenTreatment() {
    const treatment = this.scene.add.graphics().setDepth(90);
    treatment.fillGradientStyle(0x050507, 0x050507, 0x050507, 0x050507, 0.42, 0.42, 0, 0);
    treatment.fillRect(0, 0, WORLD_W, 120);
    treatment.fillGradientStyle(0x050507, 0x050507, 0x050507, 0x050507, 0, 0, 0.38, 0.38);
    treatment.fillRect(0, WORLD_H - 100, WORLD_W, 100);
    treatment.fillGradientStyle(0x050507, 0x050507, 0x050507, 0x050507, 0.3, 0, 0.3, 0);
    treatment.fillRect(0, 0, 145, WORLD_H);
    treatment.fillGradientStyle(0x050507, 0x050507, 0x050507, 0x050507, 0, 0.3, 0, 0.3);
    treatment.fillRect(WORLD_W - 145, 0, 145, WORLD_H);
  }

  private buildProps(index: number) {
    this.propGroup.clear(true, true);
    this.fireGlows.forEach((glow) => glow.destroy());
    this.fireGlows = [];

    for (const prop of PROP_LAYOUTS[index] ?? PROP_LAYOUTS[0]) {
      const image = this.scene.add.image(prop.x, prop.y, `prop-${prop.id}`)
        .setOrigin(0.5, 1)
        .setScale(prop.scale ?? 1)
        .setFlipX(prop.flip ?? false)
        .setAlpha(prop.alpha ?? 1)
        .setDepth(prop.depth ?? 2);
      this.propGroup.add(image);

      if (prop.id === 55 || prop.id === 38) this.addFireGlow(prop.x, prop.y - image.displayHeight * 0.65);
    }
  }

  private addFireGlow(x: number, y: number) {
    const glow = this.scene.add.circle(x, y, 42, 0xff8a35, 0.15).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.78, to: 1.18 },
      alpha: { from: 0.09, to: 0.2 },
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.fireGlows.push(glow);
  }
}
