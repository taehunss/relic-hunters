using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// 횡스크롤(옆에서 보는) 플랫포머 이동. 좌우 이동 + 점프 + 중력.
/// 입력은 PlayerInput(Send Messages)이 OnMove/OnJump 로 전달한다.
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class PlayerController : MonoBehaviour
{
    [Header("이동")]
    [SerializeField] private float moveSpeed = 6f;

    [Header("점프")]
    [SerializeField] private float jumpForce = 12f;

    [Header("바닥 체크")]
    [Tooltip("발밑에 둘 빈 자식 오브젝트 (GroundCheck)")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundCheckRadius = 0.15f;
    [Tooltip("어떤 레이어를 '바닥'으로 볼지")]
    [SerializeField] private LayerMask groundLayer;

    private Rigidbody2D _rb;
    private SpriteRenderer _sprite;
    private float _moveX;

    /// <summary>플레이어가 바라보는 방향(좌/우). 무기 조준에 사용. (기본: 오른쪽)</summary>
    public Vector2 FacingDirection { get; private set; } = Vector2.right;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
        _sprite = GetComponent<SpriteRenderer>();
    }

    public void OnMove(InputValue value)
    {
        _moveX = value.Get<Vector2>().x; // 좌우(X)만 사용

        if (Mathf.Abs(_moveX) > 0.01f)
        {
            FacingDirection = _moveX > 0 ? Vector2.right : Vector2.left;
            if (_sprite != null) _sprite.flipX = _moveX < 0; // 왼쪽을 보면 스프라이트 좌우반전
        }
    }

    public void OnJump(InputValue value)
    {
        // 바닥에 닿아 있을 때만 점프
        if (value.isPressed && IsGrounded())
            _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, jumpForce);
    }

    private void FixedUpdate()
    {
        // 가로 속도는 입력으로, 세로 속도는 물리(중력/점프)에 맡긴다.
        _rb.linearVelocity = new Vector2(_moveX * moveSpeed, _rb.linearVelocity.y);
    }

    private bool IsGrounded()
    {
        if (groundCheck == null) return false;
        return Physics2D.OverlapCircle(groundCheck.position, groundCheckRadius, groundLayer);
    }

    private void OnDrawGizmosSelected()
    {
        if (groundCheck == null) return;
        Gizmos.color = Color.green;
        Gizmos.DrawWireSphere(groundCheck.position, groundCheckRadius);
    }
}
