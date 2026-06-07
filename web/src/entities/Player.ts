import Phaser from 'phaser';

const MOVE_SPEED = 240;
const JUMP_SPEED = 620;
const COYOTE_MS = 100;      // 절벽에서 떨어진 뒤에도 점프 허용
const JUMP_BUFFER_MS = 100; // 착지 직전에 미리 눌러도 점프 인정

/** 주인공 Kael (횡스크롤). 좌우 이동 + 점프(코요테/버퍼) + 체력. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp = 100;
  hp = 100;
  facing: 1 | -1 = 1; // 1 = 오른쪽, -1 = 왼쪽

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private attacking = false;
  private attackAnimation = '';
  private dashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kael-sword-idle', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(30);

    // 모든 프레임은 320x280 캔버스의 발 중심에 정렬되어 있다.
    this.setScale(0.55);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(58, 205);
    body.setOffset(131, 67);

    this.play('kael-idle-anim');

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key === this.attackAnimation) this.attacking = false;
    });
  }

  playAttack() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.attacking = true;
    this.attackAnimation = body.blocked.down ? 'kael-attack-anim' : 'kael-aerial-attack-anim';
    this.play(this.attackAnimation, true);
  }

  isAttacking() {
    return this.attacking;
  }

  dash() {
    this.dashUntil = this.scene.time.now + 300;
    this.attacking = false;
    this.setVelocityX(this.facing * 720);
    this.play('kael-dash-anim', true);
    this.setTint(0xaadfff);
    this.scene.time.delayedCall(320, () => this.active && this.clearTint());
  }

  isDashing() {
    return this.scene.time.now < this.dashUntil;
  }

  handleInput(left: boolean, right: boolean, jumpJustPressed: boolean, dt: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isDashing()) {
      body.setVelocityX(this.facing * 720);
      return;
    }

    // 좌우 이동
    let vx = 0;
    if (left) { vx = -MOVE_SPEED; this.facing = -1; this.setFlipX(true); }
    else if (right) { vx = MOVE_SPEED; this.facing = 1; this.setFlipX(false); }
    this.setFlipX(this.facing < 0);
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

    // 상태에 따른 애니메이션 (공격 중에는 다른 모션으로 덮어쓰지 않음)
    if (this.attacking) return;
    if (!body.blocked.down) this.showJumpPose(body.velocity.y);
    else if (vx !== 0) this.play('kael-run-anim', true);
    else this.play('kael-idle-anim', true);
  }

  private showJumpPose(velocityY: number) {
    let frame = 2;
    if (velocityY < -360) frame = 0;
    else if (velocityY < -100) frame = 1;
    else if (velocityY > 420) frame = 4;
    else if (velocityY > 140) frame = 3;

    this.anims.stop();
    this.setTexture('kael-sword-jump', frame);
  }

  takeDamage(amount: number) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff5555);
    this.scene.time.delayedCall(90, () => this.clearTint());
  }
}
