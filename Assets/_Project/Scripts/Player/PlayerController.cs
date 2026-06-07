using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// 플레이어의 기본 이동을 담당. 탑다운(위에서 내려다보는) 2D 액션 기준으로
/// 8방향 이동을 처리한다. 입력은 Input System의 PlayerInput 컴포넌트가
/// "Send Messages" 방식으로 OnMove() 를 호출해 전달한다.
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class PlayerController : MonoBehaviour
{
    [Header("이동")]
    [Tooltip("초당 이동 속도 (Unity 단위/초)")]
    [SerializeField] private float moveSpeed = 5f;

    private Rigidbody2D _rb;
    private Vector2 _moveInput;

    /// <summary>플레이어가 마지막으로 향한 방향. 무기 조준 등에 사용한다. (기본: 오른쪽)</summary>
    public Vector2 FacingDirection { get; private set; } = Vector2.right;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
    }

    /// <summary>
    /// PlayerInput(Behavior = Send Messages) 가 "Move" 액션 값이 바뀔 때마다
    /// 메서드 이름 규칙(On + 액션이름)에 따라 자동으로 호출한다.
    /// </summary>
    public void OnMove(InputValue value)
    {
        _moveInput = value.Get<Vector2>();

        // 움직이고 있을 때만 바라보는 방향을 갱신 (멈췄을 땐 마지막 방향 유지).
        if (_moveInput.sqrMagnitude > 0.01f)
            FacingDirection = _moveInput.normalized;
    }

    private void FixedUpdate()
    {
        // 물리 갱신 주기에서 속도를 직접 설정 → 부드럽고 충돌 처리가 깔끔하다.
        // Unity 6 에서는 velocity 대신 linearVelocity 를 사용한다.
        _rb.linearVelocity = _moveInput * moveSpeed;
    }
}
