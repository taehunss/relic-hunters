import Phaser from 'phaser';
import type { Player } from './Player';

const SPEED = 90;
const AGGRO_RANGE = 420;  // 이 거리 안이면 추적
const STOP_DISTANCE = 30; // 너무 가까우면 멈춤(떨림 방지)

/**
 * 기본 근접 적 (횡스크롤). 범위 안의 플레이어를 좌우로 쫓아온다.
 * 접촉 데미지는 GameScene의 overlap에서 처리.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  maxHp = 30;
  hp = 30;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
  }

  chase(player: Player) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = player.x - this.x;
    const dist = Math.abs(dx);

    if (dist <= AGGRO_RANGE && dist > STOP_DISTANCE) {
      const dir = Math.sign(dx);
      body.setVelocityX(dir * SPEED);
      this.setFlipX(dir < 0);
    } else {
      body.setVelocityX(0);
    }
  }

  takeDamage(amount: number) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.destroy();
  }
}
