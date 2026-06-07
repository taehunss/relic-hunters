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

    [Header("점프 손맛")]
    [Tooltip("바닥에서 떨어진 뒤에도 점프를 허용하는 짧은 시간(초)")]
    [SerializeField] private float coyoteTime = 0.1f;
    [Tooltip("착지 직전에 점프를 미리 눌러도 인정해주는 시간(초)")]
    [SerializeField] private float jumpBufferTime = 0.1f;

    private Rigidbody2D _rb;
    private SpriteRenderer _sprite;
    private float _moveX;
    private float _coyoteTimer;
    private float _jumpBufferTimer;

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
        // 실제 점프는 Update에서 타이머로 처리. 여기선 "방금 점프를 눌렀다"만 기록.
        if (value.isPressed) _jumpBufferTimer = jumpBufferTime;
    }

    private void Update()
    {
        // 코요테 타이머: 바닥에 있으면 가득 채우고, 공중이면 줄인다.
        if (IsGrounded()) _coyoteTimer = coyoteTime;
        else _coyoteTimer -= Time.deltaTime;

        _jumpBufferTimer -= Time.deltaTime;

        // 최근에 점프를 눌렀고(버퍼) + 최근까지 바닥이었으면(코요테) → 점프!
        if (_jumpBufferTimer > 0f && _coyoteTimer > 0f)
        {
            _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, jumpForce);
            _jumpBufferTimer = 0f;
            _coyoteTimer = 0f;
        }
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
