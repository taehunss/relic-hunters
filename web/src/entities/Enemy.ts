import Phaser from 'phaser';
import type { Player } from './Player';

export type EnemyKind = 'raider' | 'archer' | 'hound' | 'boss';

type EnemyConfig = {
  hp: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  damage: number;
  scale: number;
};

const CONFIG: Record<EnemyKind, EnemyConfig> = {
  raider: { hp: 28, speed: 84, aggroRange: 700, attackRange: 72, attackCooldown: 1150, damage: 7, scale: 0.58 },
  archer: { hp: 22, speed: 68, aggroRange: 850, attackRange: 360, attackCooldown: 1600, damage: 6, scale: 0.56 },
  hound: { hp: 38, speed: 145, aggroRange: 900, attackRange: 92, attackCooldown: 1250, damage: 9, scale: 0.62 },
  boss: { hp: 320, speed: 72, aggroRange: 1200, attackRange: 135, attackCooldown: 1800, damage: 16, scale: 0.92 },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly maxHp: number;
  hp: number;
  invulnerable = false;

  private readonly config: EnemyConfig;
  private nextAttackAt = 0;
  private controlledUntil = 0;
  private attacking = false;
  private dead = false;
  private shadow: Phaser.GameObjects.Ellipse;
  private healthBack: Phaser.GameObjects.Rectangle;
  private healthFill: Phaser.GameObjects.Rectangle;
  private onAttack: (enemy: Enemy) => void;
  private onDeath: (enemy: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: EnemyKind,
    onAttack: (enemy: Enemy) => void,
    onDeath: (enemy: Enemy) => void,
  ) {
    super(scene, x, y, `${kind}-idle-1`);
    this.kind = kind;
    this.config = CONFIG[kind];
    this.maxHp = this.config.hp;
    this.hp = this.maxHp;
    this.onAttack = onAttack;
    this.onDeath = onDeath;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setScale(this.config.scale);
    this.setCollideWorldBounds(true);
    this.setDepth(20);

    const shadowWidth = kind === 'boss' ? 120 : kind === 'hound' ? 95 : 62;
    this.shadow = scene.add.ellipse(x, y - 5, shadowWidth, kind === 'boss' ? 22 : 14, 0x000000, 0.38).setDepth(10);
    this.healthBack = scene.add.rectangle(x, y - (kind === 'boss' ? 205 : 145), kind === 'boss' ? 100 : 58, 7, 0x120d0b, 0.88)
      .setDepth(45)
      .setVisible(false);
    this.healthFill = scene.add.rectangle(
      x - (kind === 'boss' ? 48 : 27),
      y - (kind === 'boss' ? 205 : 145),
      kind === 'boss' ? 96 : 54,
      3,
      kind === 'boss' ? 0xc33d32 : 0xd18742,
    ).setOrigin(0, 0.5).setDepth(46).setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyWidth = kind === 'boss' ? 105 : kind === 'hound' ? 125 : 72;
    const bodyHeight = kind === 'boss' ? 175 : kind === 'hound' ? 82 : 125;
    body.setSize(bodyWidth, bodyHeight);
    body.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);

    this.play(`${kind}-idle`);
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key === `${this.kind}-attack`) this.attacking = false;
    });
  }

  updateAI(time: number, player: Player) {
    if (time < this.controlledUntil) return;
    if (this.dead || this.attacking || this.invulnerable) {
      this.setVelocityX(0);
      return;
    }

    const dx = player.x - this.x;
    const distance = Math.abs(dx);
    const direction = Math.sign(dx) || 1;
    this.setFlipX(direction > 0);

    if (distance <= this.config.attackRange && time >= this.nextAttackAt) {
      this.attack(time);
      return;
    }

    const tooCloseForArcher = this.kind === 'archer' && distance < 210;
    if (distance <= this.config.aggroRange && (distance > this.config.attackRange || tooCloseForArcher)) {
      const movementDirection = tooCloseForArcher ? -direction : direction;
      this.setVelocityX(movementDirection * this.config.speed);
      this.play(`${this.kind}-run`, true);
    } else {
      this.setVelocityX(0);
      this.play(`${this.kind}-idle`, true);
    }
  }

  takeDamage(amount: number, impactDirection = 0) {
    if (this.dead || this.invulnerable) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.controlledUntil = this.scene.time.now + 120;
    if (impactDirection !== 0) this.setVelocityX(impactDirection * (this.kind === 'boss' ? 55 : 145));
    this.setTint(0xffe0b0);
    this.healthBack.setVisible(this.kind !== 'boss');
    this.healthFill.setVisible(this.kind !== 'boss');
    this.healthFill.width = (this.kind === 'boss' ? 96 : 54) * (this.hp / this.maxHp);
    this.showDamageNumber(amount);
    this.scene.cameras.main.shake(55, this.kind === 'boss' ? 0.0025 : 0.0016);
    this.scene.time.delayedCall(90, () => {
      if (this.active && !this.invulnerable) this.clearTint();
    });
    this.scene.time.delayedCall(1200, () => {
      if (this.active && this.hp === this.maxHp) return;
      this.healthBack.setVisible(false);
      this.healthFill.setVisible(false);
    });

    if (this.hp <= 0) this.die();
    return true;
  }

  setShielded(shielded: boolean) {
    if (this.dead) return;
    this.invulnerable = shielded;
    this.setTint(shielded ? 0x77bbff : 0xffffff);
    if (!shielded) this.clearTint();
  }

  getDamage() {
    return this.config.damage;
  }

  charge(direction: number, until: number) {
    if (this.dead) return;
    this.controlledUntil = until;
    this.setFlipX(direction > 0);
    this.setVelocityX(direction * 560);
    this.play(`${this.kind}-attack`, true);
  }

  private attack(time: number) {
    this.attacking = true;
    this.nextAttackAt = time + this.config.attackCooldown;
    this.setVelocityX(0);
    this.play(`${this.kind}-attack`, true);
    this.scene.time.delayedCall(this.kind === 'boss' ? 520 : 350, () => {
      if (this.active && !this.dead) this.onAttack(this);
    });
    this.scene.time.delayedCall(this.kind === 'boss' ? 900 : 650, () => {
      if (this.active) this.attacking = false;
    });
  }

  private die() {
    this.dead = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.play(`${this.kind}-death`, true);
    this.healthBack.setVisible(false);
    this.healthFill.setVisible(false);
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 700 });
    this.onDeath(this);
    this.scene.time.delayedCall(900, () => {
      this.shadow.destroy();
      this.healthBack.destroy();
      this.healthFill.destroy();
      this.destroy();
    });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.shadow?.active) return;
    this.shadow.setPosition(this.x, this.y - 4);
    const barY = this.y - (this.kind === 'boss' ? 205 : 145);
    this.healthBack.setPosition(this.x, barY);
    this.healthFill.setPosition(this.x - (this.kind === 'boss' ? 48 : 27), barY);
  }

  private showDamageNumber(amount: number) {
    const text = this.scene.add.text(this.x, this.y - (this.kind === 'boss' ? 210 : 150), `${amount}`, {
      fontFamily: 'Georgia, serif',
      fontSize: this.kind === 'boss' ? '20px' : '17px',
      fontStyle: 'bold',
      color: '#ffe0a3',
      stroke: '#3a1008',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(85);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 42,
      alpha: 0,
      scale: 1.18,
      duration: 620,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    });
  }
}
