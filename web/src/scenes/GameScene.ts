import Phaser from 'phaser';
import { Enemy, type EnemyKind } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { StageVisuals } from './StageVisuals';

const WORLD_W = 960;
const WORLD_H = 540;
const FLOOR_Y = 508;
const BLADE_HIT_DELAY_MS = 120;
const BLADE_REACH = 215;
const BLADE_BACK_REACH = 35;
const BLADE_VERTICAL_REACH = 110;

type WeaponKind = 'blade' | 'bow';
type WaveDefinition = {
  title: string;
  subtitle: string;
  background: string;
  enemies: EnemyKind[];
};

const WAVES: WaveDefinition[] = [
  {
    title: '1 웨이브 · 마을 입구',
    subtitle: '침입한 고블린 약탈자를 처치하세요',
    background: 'village-entrance',
    enemies: ['raider', 'raider', 'raider', 'raider'],
  },
  {
    title: '2 웨이브 · 불타는 거리',
    subtitle: '궁수의 사선을 피해 거리를 좁히세요',
    background: 'burning-street',
    enemies: ['raider', 'archer', 'raider', 'archer', 'raider'],
  },
  {
    title: '3 웨이브 · 중앙 광장',
    subtitle: '빠르게 달려드는 애시 하운드를 막으세요',
    background: 'central-plaza',
    enemies: ['hound', 'hound', 'archer', 'hound', 'raider'],
  },
  {
    title: '보스 · 무너진 성문',
    subtitle: '식인 오우거 가름',
    background: 'boss-arena',
    enemies: ['boss'],
  },
];

const ENEMY_FRAMES: Record<EnemyKind, Record<'idle' | 'run' | 'attack' | 'death', number[]>> = {
  raider: {
    idle: [1, 2, 3, 4, 5],
    run: [6, 7, 8, 9, 10, 11, 12, 13],
    attack: [14, 15, 16, 17, 18, 19, 20],
    death: [21, 22, 23, 24, 25, 26, 27],
  },
  archer: {
    idle: [1, 2, 3, 4, 5],
    run: [6, 7, 8, 9, 10, 11, 12, 13],
    attack: [14, 15, 16, 17, 18, 19],
    death: [20, 21, 22, 23, 24, 25, 26],
  },
  hound: {
    idle: [1, 2, 3, 4, 5],
    run: [6, 7, 8, 9, 10, 11, 12, 13],
    attack: [14, 15, 16, 17, 18, 19],
    death: [20, 21, 22, 23, 24, 25, 26],
  },
  boss: {
    idle: [41],
    run: [42, 43],
    attack: [44, 45, 46, 47],
    death: [48, 49, 50],
  },
};

const ENEMY_FOLDERS: Record<EnemyKind, string> = {
  raider: 'goblin-raider',
  archer: 'goblin-archer',
  hound: 'ash-hound',
  boss: 'enemy-boss-pack',
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private arrows!: Phaser.GameObjects.Group;
  private enemyArrows!: Phaser.GameObjects.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private stageVisuals!: StageVisuals;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private boss?: Enemy;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private currentWeapon: WeaponKind = 'blade';
  private attackCooldown = 0;
  private skillCooldown = 0;
  private contactCooldownUntil = 0;
  private waveIndex = -1;
  private enemiesAlive = 0;
  private bossPatternIndex = 0;
  private bossPatternEvent?: Phaser.Time.TimerEvent;
  private finished = false;

  private hpBar!: Phaser.GameObjects.Rectangle;
  private skillBar!: Phaser.GameObjects.Rectangle;
  private bladeSlot!: Phaser.GameObjects.Rectangle;
  private bowSlot!: Phaser.GameObjects.Rectangle;
  private weaponText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private waveMarkers: Phaser.GameObjects.Rectangle[] = [];
  private bossBarBack!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossName!: Phaser.GameObjects.Text;
  private announcement!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.makePlaceholderTextures();
    const kaelSheet = { frameWidth: 320, frameHeight: 280 };
    this.load.spritesheet('kael-sword-idle', 'assets/kael/sword-idle.png', kaelSheet);
    this.load.spritesheet('kael-sword-run', 'assets/kael/sword-run.png', kaelSheet);
    this.load.spritesheet('kael-sword-jump', 'assets/kael/sword-jump.png', kaelSheet);
    this.load.spritesheet('kael-sword-dash', 'assets/kael/sword-dash.png', kaelSheet);
    this.load.spritesheet('kael-sword-attack', 'assets/kael/sword-attack.png', kaelSheet);
    this.load.spritesheet('kael-sword-aerial-attack', 'assets/kael/sword-aerial-attack.png', kaelSheet);

    const base = 'assets/relic-hunter/runtime/stage-01';
    for (const background of WAVES.map((wave) => wave.background)) {
      this.load.image(background, `${base}/backgrounds/${background}.png`);
    }
    this.load.image('kael-portrait', `${base}/npcs-ui/sprite-039.png`);
    for (let index = 1; index <= 76; index += 1) {
      const file = `sprite-${String(index).padStart(3, '0')}.png`;
      this.load.image(`prop-${index}`, `${base}/environment/tiles-props/${file}`);
    }

    for (const kind of Object.keys(ENEMY_FRAMES) as EnemyKind[]) {
      for (const [action, frameNumbers] of Object.entries(ENEMY_FRAMES[kind])) {
        frameNumbers.forEach((frame, index) => {
          const file = `sprite-${String(frame).padStart(3, '0')}.png`;
          this.load.image(`${kind}-${action}-${index + 1}`, `${base}/enemies/${ENEMY_FOLDERS[kind]}/${file}`);
        });
      }
    }
  }

  create() {
    const requestedWave = import.meta.env.DEV
      ? Number(new URLSearchParams(window.location.search).get('wave') ?? '1')
      : 1;
    this.finished = false;
    this.waveIndex = Phaser.Math.Clamp(requestedWave, 1, WAVES.length) - 2;
    this.enemiesAlive = 0;
    this.attackCooldown = 0;
    this.skillCooldown = 0;
    this.contactCooldownUntil = 0;
    this.bossPatternIndex = 0;
    this.boss = undefined;
    this.createAnimations();
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.stageVisuals = new StageVisuals(this, 'village-entrance');

    this.ground = this.physics.add.staticGroup();
    this.addSolid(WORLD_W / 2, FLOOR_Y + 20, WORLD_W, 40);

    this.player = new Player(this, 130, FLOOR_Y - 20);
    this.playerShadow = this.add.ellipse(this.player.x, FLOOR_Y - 2, 76, 16, 0x000000, 0.42).setDepth(12);
    this.physics.add.collider(this.player, this.ground);

    this.enemies = this.add.group();
    this.arrows = this.add.group();
    this.enemyArrows = this.add.group();
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.overlap(this.arrows, this.enemies, (arrow, enemy) => {
      const target = enemy as Enemy;
      const projectile = arrow as Phaser.Physics.Arcade.Sprite;
      const impactDirection = Math.sign((projectile.body as Phaser.Physics.Arcade.Body).velocity.x);
      if (target.takeDamage(projectile.getData('damage') ?? 14, impactDirection)) {
        this.stageVisuals.burst(target.x, target.y - 75, projectile.getData('powerShot') ? 0xffe079 : 0xffbd72, projectile.getData('powerShot') ? 14 : 8);
        (arrow as Phaser.GameObjects.GameObject).destroy();
      }
    });
    this.physics.add.overlap(this.enemyArrows, this.player, (arrow) => {
      (arrow as Phaser.GameObjects.GameObject).destroy();
      this.damagePlayer(7);
    });

    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,A,D,SPACE,C,X,ONE,TWO,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.createHud();
    this.time.delayedCall(700, () => this.startNextWave());
  }

  update(time: number, delta: number) {
    if (this.finished) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
      return;
    }

    const left = this.keys.LEFT.isDown || this.keys.A.isDown;
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown;
    this.player.handleInput(left, right, Phaser.Input.Keyboard.JustDown(this.keys.SPACE), delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.setWeapon('blade');
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.setWeapon('bow');

    this.attackCooldown -= delta;
    this.skillCooldown -= delta;
    if (Phaser.Input.Keyboard.JustDown(this.keys.C) && this.attackCooldown <= 0) {
      if (this.currentWeapon === 'blade') {
        this.player.playAttack();
        this.meleeAttack();
        this.attackCooldown = 330;
      } else {
        this.shootArrow();
        this.attackCooldown = 470;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.X) && this.skillCooldown <= 0) {
      if (this.currentWeapon === 'blade') this.player.dash();
      else this.shootArrow(true);
      this.skillCooldown = 2200;
    }

    this.enemies.getChildren().forEach((enemy) => (enemy as Enemy).updateAI(time, this.player));
    const heightFromFloor = Math.abs(this.player.y - (FLOOR_Y - 20));
    this.playerShadow.setPosition(this.player.x, FLOOR_Y - 2).setScale(Phaser.Math.Clamp(1 - heightFromFloor / 300, 0.55, 1));
    if (this.boss?.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y) < 95) {
      this.applyContactDamage(this.boss.getDamage());
    }

    this.hpBar.width = 212 * Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.skillBar.width = 212 * Phaser.Math.Clamp(1 - this.skillCooldown / 2200, 0, 1);
    this.enemyCountText.setText(this.boss?.active ? '' : `남은 적 ${this.enemiesAlive}`);
    if (this.boss?.active) {
      this.bossBar.width = 440 * Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
    }
  }

  private startNextWave() {
    this.waveIndex += 1;
    if (this.waveIndex >= WAVES.length) {
      this.stageClear();
      return;
    }

    const wave = WAVES[this.waveIndex];
    this.stageVisuals.showArea(this.waveIndex, wave.background);
    this.stageVisuals.setBossAtmosphere(this.waveIndex === WAVES.length - 1);
    this.waveText.setText(wave.title);
    this.showAnnouncement(`${wave.title}\n${wave.subtitle}`, 1700);
    this.enemiesAlive = wave.enemies.length;
    this.waveMarkers.forEach((marker, index) => marker.setFillStyle(index <= this.waveIndex ? 0xd29a4a : 0x43362d, index <= this.waveIndex ? 1 : 0.8));
    this.player.setPosition(130, FLOOR_Y - 20);

    const spawnPoints = [760, 640, 850, 540, 710, 900];
    wave.enemies.forEach((kind, index) => {
      this.time.delayedCall(index * 230, () => this.spawnEnemy(spawnPoints[index], kind));
    });
  }

  private spawnEnemy(x: number, kind: EnemyKind) {
    this.stageVisuals.spawnPortal(x, FLOOR_Y - 8);
    const enemy = new Enemy(
      this,
      x,
      FLOOR_Y - 8,
      kind,
      (attacker) => this.enemyAttack(attacker),
      (defeated) => this.enemyDefeated(defeated),
    );
    this.enemies.add(enemy);
    const targetScale = enemy.scaleX;
    enemy.setAlpha(0).setScale(targetScale * 0.35);
    this.tweens.add({
      targets: enemy,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: kind === 'boss' ? 680 : 380,
      ease: 'Back.Out',
    });
    if (kind === 'boss') {
      this.boss = enemy;
      this.bossBarBack.setVisible(true);
      this.bossBar.setVisible(true);
      this.bossName.setVisible(true);
      this.cameras.main.shake(450, 0.009);
      this.showAnnouncement('식인 오우거 가름\n잿빛 마을의 포식자', 1800);
      this.startBossPatterns();
    }
  }

  private enemyAttack(enemy: Enemy) {
    if (enemy.kind === 'archer') {
      const arrow = this.physics.add.sprite(enemy.x, enemy.y - 75, 'enemy-arrow');
      (arrow.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      arrow.setVelocityX(Math.sign(this.player.x - enemy.x) * 350);
      this.enemyArrows.add(arrow);
      this.time.delayedCall(2600, () => arrow.active && arrow.destroy());
      return;
    }

    const range = enemy.kind === 'boss' ? 155 : enemy.kind === 'hound' ? 115 : 90;
    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <= range) {
      this.damagePlayer(enemy.getDamage());
    }
  }

  private enemyDefeated(enemy: Enemy) {
    this.enemiesAlive -= 1;
    this.stageVisuals.burst(enemy.x, enemy.y - (enemy.kind === 'boss' ? 110 : 70), enemy.kind === 'boss' ? 0xff744d : 0xdba15e, enemy.kind === 'boss' ? 28 : 12);
    if (enemy.kind === 'boss') {
      this.bossPatternEvent?.remove(false);
      this.boss = undefined;
      this.bossBarBack.setVisible(false);
      this.bossBar.setVisible(false);
      this.bossName.setVisible(false);
    }
    if (this.enemiesAlive <= 0) this.time.delayedCall(1300, () => this.startNextWave());
  }

  private meleeAttack() {
    const attackOriginX = this.player.x;
    const attackOriginY = this.player.y;
    const attackFacing = this.player.facing;

    // 검광이 가장 길게 뻗는 프레임에 판정을 맞춘다.
    this.time.delayedCall(BLADE_HIT_DELAY_MS, () => {
      if (!this.player.active) return;

      this.enemies.getChildren().forEach((obj) => {
        const enemy = obj as Enemy;
        const forwardDistance = (enemy.x - attackOriginX) * attackFacing;
        const verticalDistance = Math.abs(enemy.y - attackOriginY);
        if (
          forwardDistance >= -BLADE_BACK_REACH &&
          forwardDistance <= BLADE_REACH &&
          verticalDistance <= BLADE_VERTICAL_REACH
        ) {
          if (enemy.takeDamage(18, attackFacing)) {
            this.stageVisuals.burst(enemy.x, enemy.y - 78, 0xffc47a, 11);
          }
        }
      });
    });
  }

  private shootArrow(powerShot = false) {
    const arrow = this.physics.add.sprite(this.player.x + this.player.facing * 30, this.player.y - 65, 'arrow');
    (arrow.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    arrow.setScale(powerShot ? 1.8 : 1);
    arrow.setTint(powerShot ? 0xffcc55 : 0xffffff);
    arrow.setData('damage', powerShot ? 32 : 14);
    arrow.setData('powerShot', powerShot);
    arrow.setVelocityX(this.player.facing * (powerShot ? 760 : 560));
    arrow.setFlipX(this.player.facing < 0);
    this.arrows.add(arrow);
    this.time.delayedCall(2200, () => arrow.active && arrow.destroy());
  }

  private startBossPatterns() {
    this.bossPatternEvent?.remove(false);
    this.bossPatternEvent = this.time.addEvent({
      delay: 4300,
      loop: true,
      callback: () => this.runBossPattern(),
    });
  }

  private runBossPattern() {
    if (!this.boss?.active || this.finished) return;
    const pattern = this.bossPatternIndex++ % 3;

    if (pattern === 0) {
      this.showAnnouncement('가름이 돌진을 준비합니다!', 900);
      const warning = this.add.rectangle(WORLD_W / 2, FLOOR_Y - 35, WORLD_W, 70, 0xff3b22, 0.22).setDepth(5);
      this.time.delayedCall(750, () => {
        warning.destroy();
        if (!this.boss?.active) return;
        const direction = Math.sign(this.player.x - this.boss.x) || 1;
        this.boss.charge(direction, this.time.now + 650);
      });
      return;
    }

    if (pattern === 1) {
      const targetX = this.player.x;
      this.showAnnouncement('대지 강타 · 붉은 장판을 피하세요', 900);
      const danger = this.add.circle(targetX, FLOOR_Y - 8, 125, 0xff2211, 0.3).setScale(1, 0.28).setDepth(4);
      this.tweens.add({ targets: danger, alpha: 0.75, duration: 750, yoyo: true, repeat: 1 });
      this.time.delayedCall(1150, () => {
        danger.destroy();
        this.cameras.main.shake(260, 0.012);
        if (Math.abs(this.player.x - targetX) < 135) this.damagePlayer(22);
      });
      return;
    }

    this.showAnnouncement('가름이 재의 갑옷을 두릅니다', 900);
    this.boss.setShielded(true);
    this.time.delayedCall(1800, () => this.boss?.setShielded(false));
  }

  private applyContactDamage(amount: number) {
    if (this.time.now < this.contactCooldownUntil) return;
    this.contactCooldownUntil = this.time.now + 900;
    this.damagePlayer(amount);
  }

  private damagePlayer(amount: number) {
    if (this.finished || this.player.isDashing()) return;
    this.player.takeDamage(amount);
    this.cameras.main.shake(100, 0.006);
    if (this.player.hp <= 0) this.gameOver();
  }

  private createHud() {
    this.add.rectangle(14, 14, 294, 72, 0x100c0a, 0.82).setOrigin(0).setStrokeStyle(1, 0xa4753d, 0.8).setDepth(100);
    this.add.image(48, 51, 'kael-portrait').setScale(0.31).setDepth(102);
    this.add.text(82, 20, 'KAEL ARDEN', {
      fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#e7c48c',
    }).setDepth(103);
    this.add.rectangle(80, 43, 218, 15, 0x080706, 0.95).setOrigin(0).setStrokeStyle(1, 0x6e4a2b).setDepth(101);
    this.hpBar = this.add.rectangle(83, 46, 212, 9, 0xb9312f).setOrigin(0).setDepth(102);
    this.add.rectangle(80, 64, 218, 10, 0x080706, 0.95).setOrigin(0).setStrokeStyle(1, 0x6e4a2b).setDepth(101);
    this.skillBar = this.add.rectangle(83, 67, 212, 4, 0xd09a45).setOrigin(0).setDepth(102);

    this.add.text(WORLD_W / 2, 18, 'STAGE 01  ·  ASHEN BORDER VILLAGE', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#d8b986', letterSpacing: 2,
      stroke: '#140d09', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(104);

    this.add.rectangle(WORLD_W - 14, 14, 250, 72, 0x100c0a, 0.78).setOrigin(1, 0).setStrokeStyle(1, 0xa4753d, 0.72).setDepth(100);
    this.waveText = this.add.text(WORLD_W - 26, 22, '', {
      fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#f1d098', stroke: '#160d08', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(103);
    this.enemyCountText = this.add.text(WORLD_W - 26, 47, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#e6ddd0', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(103);
    this.waveMarkers = Array.from({ length: WAVES.length }, (_, index) => (
      this.add.rectangle(WORLD_W - 224 + index * 25, 68, 17, 4, 0x43362d, 0.8).setOrigin(0).setDepth(103)
    ));

    this.bladeSlot = this.add.rectangle(18, WORLD_H - 56, 128, 38, 0x2a1b13, 0.9).setOrigin(0).setStrokeStyle(2, 0xd49a4e).setDepth(100);
    this.bowSlot = this.add.rectangle(154, WORLD_H - 56, 128, 38, 0x171310, 0.8).setOrigin(0).setStrokeStyle(1, 0x6b5946).setDepth(100);
    this.add.text(28, WORLD_H - 48, '[1]  RELIC BLADE', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f2d39c' }).setDepth(103);
    this.add.text(164, WORLD_H - 48, '[2]  HUNTER BOW', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#d4c5af' }).setDepth(103);
    this.weaponText = this.add.text(28, WORLD_H - 31, '', {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#b9aa96',
    }).setDepth(103);
    this.add.text(WORLD_W - 18, WORLD_H - 18, 'A / D 이동    SPACE 점프    C 공격    X 렐릭 스킬', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#c7b9a4', stroke: '#080604', strokeThickness: 3,
    }).setOrigin(1, 1).setDepth(103);

    this.announcement = this.add.text(WORLD_W / 2, 120, '', {
      fontFamily: 'Georgia, serif', fontSize: '27px', fontStyle: 'bold', color: '#f6dca9', align: 'center', stroke: '#210d08', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(110).setAlpha(0);
    this.bossName = this.add.text(WORLD_W / 2, WORLD_H - 76, 'GARM · THE MAN-EATING OGRE', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#e8c48a', stroke: '#120907', strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false).setDepth(103);
    this.bossBarBack = this.add.rectangle(WORLD_W / 2, WORLD_H - 58, 448, 18, 0x090706, 0.94).setStrokeStyle(1, 0xa7753b).setVisible(false).setDepth(100);
    this.bossBar = this.add.rectangle(WORLD_W / 2 - 220, WORLD_H - 58, 440, 10, 0xa62d28).setOrigin(0, 0.5).setVisible(false).setDepth(101);
    this.setWeapon('blade');
  }

  private setWeapon(weapon: WeaponKind) {
    this.currentWeapon = weapon;
    this.bladeSlot.setFillStyle(weapon === 'blade' ? 0x2a1b13 : 0x171310, weapon === 'blade' ? 0.92 : 0.8)
      .setStrokeStyle(weapon === 'blade' ? 2 : 1, weapon === 'blade' ? 0xd49a4e : 0x6b5946);
    this.bowSlot.setFillStyle(weapon === 'bow' ? 0x2a1b13 : 0x171310, weapon === 'bow' ? 0.92 : 0.8)
      .setStrokeStyle(weapon === 'bow' ? 2 : 1, weapon === 'bow' ? 0xd49a4e : 0x6b5946);
    this.weaponText.setText(weapon === 'blade' ? 'X · DASH STRIKE' : 'X · POWER SHOT').setX(weapon === 'blade' ? 28 : 164);
  }

  private showAnnouncement(message: string, duration: number) {
    this.announcement.setText(message).setAlpha(1).setScale(0.92);
    this.tweens.add({ targets: this.announcement, alpha: 0, scale: 1, delay: duration, duration: 400 });
  }

  private stageClear() {
    this.finished = true;
    this.physics.pause();
    this.showEndCard('STAGE CLEAR', '잿빛 국경 마을을 지켜냈습니다\n\nR 키로 다시 도전');
  }

  private gameOver() {
    this.finished = true;
    this.physics.pause();
    this.showEndCard('GAME OVER', '마을은 아직 당신을 기다립니다\n\nR 키로 재시작');
  }

  private showEndCard(title: string, subtitle: string) {
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x080604, 0.72).setDepth(180);
    this.add.text(WORLD_W / 2, WORLD_H / 2 - 30, `${title}\n\n${subtitle}`, {
      fontFamily: 'sans-serif', fontSize: '38px', color: '#ffe3a6', align: 'center', stroke: '#210d08', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(200);
  }

  private addSolid(x: number, y: number, width: number, height: number) {
    const rectangle = this.add.rectangle(x, y, width, height, 0x000000, 0);
    this.physics.add.existing(rectangle, true);
    this.ground.add(rectangle);
  }

  private createAnimations() {
    if (!this.anims.exists('kael-idle-anim')) {
      this.anims.create({ key: 'kael-idle-anim', frames: this.anims.generateFrameNumbers('kael-sword-idle', { start: 0, end: 4 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'kael-run-anim', frames: this.anims.generateFrameNumbers('kael-sword-run', { start: 0, end: 7 }), frameRate: 14, repeat: -1 });
      this.anims.create({ key: 'kael-dash-anim', frames: this.anims.generateFrameNumbers('kael-sword-dash', { start: 0, end: 9 }), frameRate: 32 });
      this.anims.create({ key: 'kael-attack-anim', frames: this.anims.generateFrameNumbers('kael-sword-attack', { start: 0, end: 5 }), frameRate: 16 });
      this.anims.create({ key: 'kael-aerial-attack-anim', frames: this.anims.generateFrameNumbers('kael-sword-aerial-attack', { start: 0, end: 5 }), frameRate: 16 });
    }

    for (const kind of Object.keys(ENEMY_FRAMES) as EnemyKind[]) {
      for (const [action, frames] of Object.entries(ENEMY_FRAMES[kind])) {
        const key = `${kind}-${action}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: frames.map((_, index) => ({ key: `${kind}-${action}-${index + 1}` })),
          frameRate: action === 'run' ? 10 : action === 'attack' ? 9 : 6,
          repeat: action === 'idle' || action === 'run' ? -1 : 0,
        });
      }
    }
  }

  private makePlaceholderTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffe08a).fillRect(0, 0, 28, 7);
    graphics.generateTexture('arrow', 28, 7);
    graphics.clear();
    graphics.fillStyle(0xff704d).fillRect(0, 0, 24, 6);
    graphics.generateTexture('enemy-arrow', 24, 6);
    graphics.clear();
    graphics.fillStyle(0xc6b7a3).fillCircle(3, 3, 3);
    graphics.generateTexture('ash-particle', 6, 6);
    graphics.clear();
    graphics.fillStyle(0xff9b42).fillCircle(3, 3, 3);
    graphics.generateTexture('ember-particle', 6, 6);
    graphics.destroy();
  }
}
