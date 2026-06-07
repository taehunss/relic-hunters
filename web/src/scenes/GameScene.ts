import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const WORLD_W = 3000;
const WORLD_H = 540;

type WeaponKind = 'blade' | 'bow';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private arrows!: Phaser.GameObjects.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private currentWeapon: WeaponKind = 'blade';
  private attackCooldown = 0;
  private contactCooldownUntil = 0;
  private isGameOver = false;

  // HUD
  private hpBar!: Phaser.GameObjects.Rectangle;
  private weaponText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.makePlaceholderTextures();
  }

  create() {
    this.isGameOver = false;
    this.attackCooldown = 0;
    this.contactCooldownUntil = 0;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // --- 바닥/발판 ---
    this.ground = this.physics.add.staticGroup();
    this.addSolid(WORLD_W / 2, WORLD_H - 20, WORLD_W, 40); // 긴 바닥
    this.addSolid(640, 380, 220, 24);
    this.addSolid(1040, 290, 220, 24);
    this.addSolid(1500, 360, 260, 24);

    // --- 플레이어 ---
    this.player = new Player(this, 200, 300);
    this.physics.add.collider(this.player, this.ground);

    // --- 적 ---
    this.enemies = this.add.group();
    this.spawnEnemy(820, 300);
    this.spawnEnemy(1250, 300);
    this.spawnEnemy(1600, 300);
    this.physics.add.collider(this.enemies, this.ground);

    // --- 화살 ---
    this.arrows = this.add.group();
    this.physics.add.overlap(
      this.arrows,
      this.enemies,
      (arrow, enemy) => {
        (enemy as Enemy).takeDamage(8);
        (arrow as Phaser.GameObjects.GameObject).destroy();
      },
    );

    // --- 적 접촉 데미지 ---
    this.physics.add.overlap(this.player, this.enemies, () => this.applyContactDamage());

    // --- 카메라 ---
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // --- 입력 ---
    this.keys = this.input.keyboard!.addKeys(
      'LEFT,RIGHT,A,D,SPACE,C,ONE,TWO,R',
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    // --- HUD ---
    this.createHud();
  }

  update(_time: number, delta: number) {
    const k = this.keys;

    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(k.R)) this.scene.restart();
      return;
    }

    // 이동/점프
    const left = k.LEFT.isDown || k.A.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(k.SPACE);
    this.player.handleInput(left, right, jump, delta);

    // 무기 교체
    if (Phaser.Input.Keyboard.JustDown(k.ONE)) this.setWeapon('blade');
    if (Phaser.Input.Keyboard.JustDown(k.TWO)) this.setWeapon('bow');

    // 공격
    this.attackCooldown -= delta;
    if (Phaser.Input.Keyboard.JustDown(k.C) && this.attackCooldown <= 0) {
      if (this.currentWeapon === 'blade') this.meleeAttack();
      else this.shootArrow();
      this.attackCooldown = 250;
    }

    // 적 추적
    this.enemies.getChildren().forEach((e) => (e as Enemy).chase(this.player));

    // HUD 갱신
    this.hpBar.width = 316 * Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
  }

  // ---------- 무기 ----------

  private meleeAttack() {
    const range = 64;
    const cx = this.player.x + this.player.facing * 34;
    const cy = this.player.y;

    // 휘두름 표시
    const slash = this.add.rectangle(cx, cy, range, 54, 0xffffff, 0.25);
    this.time.delayedCall(80, () => slash.destroy());

    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy;
      if (Phaser.Math.Distance.Between(cx, cy, e.x, e.y) <= range) e.takeDamage(10);
    });
  }

  private shootArrow() {
    const arrow = this.physics.add.sprite(
      this.player.x + this.player.facing * 24,
      this.player.y,
      'arrow',
    );
    (arrow.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    arrow.setVelocityX(this.player.facing * 520);
    arrow.setFlipX(this.player.facing < 0);
    this.arrows.add(arrow);
    this.time.delayedCall(3000, () => arrow.active && arrow.destroy());
  }

  // ---------- 적/피해 ----------

  private spawnEnemy(x: number, y: number) {
    this.enemies.add(new Enemy(this, x, y));
  }

  private applyContactDamage() {
    if (this.time.now < this.contactCooldownUntil) return;
    this.player.takeDamage(5);
    this.contactCooldownUntil = this.time.now + 1000;
    if (this.player.hp <= 0) this.gameOver();
  }

  // ---------- HUD / 게임오버 ----------

  private createHud() {
    this.add.rectangle(20, 20, 320, 26, 0x000000, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.hpBar = this.add
      .rectangle(22, 22, 316, 22, 0xd62828)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(101);
    this.weaponText = this.add
      .text(20, 56, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);
    this.setWeapon('blade');
  }

  private setWeapon(w: WeaponKind) {
    this.currentWeapon = w;
    const name = w === 'blade' ? '칼 [1]' : '활 [2]';
    this.weaponText.setText(`무기: ${name}   |   이동 ←→/AD · 점프 Space · 공격 C · 교체 1/2`);
  }

  private gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER\n\nR 키로 재시작', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }

  // ---------- 임시 텍스처 (아트 들어오면 교체) ----------

  private addSolid(x: number, y: number, w: number, h: number) {
    const rect = this.add.rectangle(x, y, w, h, 0x3a3f5c);
    this.physics.add.existing(rect, true);
    this.ground.add(rect);
  }

  private makePlaceholderTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x4aa3ff).fillRect(0, 0, 32, 48);
    g.generateTexture('player', 32, 48);
    g.clear();

    g.fillStyle(0xff7777).fillRect(0, 0, 32, 32);
    g.generateTexture('enemy', 32, 32);
    g.clear();

    g.fillStyle(0xffe08a).fillRect(0, 0, 22, 6);
    g.generateTexture('arrow', 22, 6);
    g.clear();

    g.destroy();
  }
}
