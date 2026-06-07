import Phaser from 'phaser';

const MOVE_SPEED = 240;
const JUMP_SPEED = 620;
const COYOTE_MS = 100;      // 절벽에서 떨어진 뒤에도 점프 허용
const JUMP_BUFFER_MS = 100; // 착지 직전에 미리 눌러도 점프 인정

/**
 * 주인공 Kael (횡스크롤). 좌우 이동 + 점프(코요테/버퍼) + 체력.
 * 지금은 정적 스프라이트(idle 1프레임). 걷기/공격 애니메이션은 프레임 정규화 후 추가.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp = 100;
  hp = 100;
  facing: 1 | -1 = 1; // 1 = 오른쪽, -1 = 왼쪽

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kael');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // 원본 텍스처 109x223 → 화면 크기 조정 + 몸통에 맞춘 충돌 박스
    this.setScale(0.55);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(55, 215);
    body.setOffset(27, 6);
  }

  handleInput(left: boolean, right: boolean, jumpJustPressed: boolean, dt: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 좌우 이동
    let vx = 0;
    if (left) { vx = -MOVE_SPEED; this.facing = -1; this.setFlipX(true); }
    else if (right) { vx = MOVE_SPEED; this.facing = 1; this.setFlipX(false); }
    body.setVelocityX(vx);

    // 코요테 + 점프 버퍼
    if (body.blocked.down) this.coyoteTimer = COYOTE_MS;
    else this.coyoteTimer -= dt;

    if (jumpJustPressed) this.jumpBufferTimer = JUMP_BUFFER_MS;
    else this.jumpBufferTimer -= dt;

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-JUMP_SPEED);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    }
  }

  takeDamage(amount: number) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff5555);
    this.scene.time.delayedCall(90, () => this.clearTint());
  }
}
