using UnityEngine;

/// <summary>
/// 기본 근접 적 AI (횡스크롤). 일정 범위 안에 플레이어가 있으면 좌우로 쫓아오고,
/// 몸이 닿으면 일정 간격으로 플레이어에게 접촉 데미지를 준다.
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class EnemyController : MonoBehaviour
{
    [Header("이동")]
    [SerializeField] private float moveSpeed = 2f;
    [Tooltip("이 거리(가로) 안에 플레이어가 들어오면 추적 시작")]
    [SerializeField] private float aggroRange = 8f;
    [Tooltip("이 거리보다 가까우면 멈춤 (겹쳐서 떨리는 것 방지)")]
    [SerializeField] private float stopDistance = 0.6f;

    [Header("접촉 공격")]
    [SerializeField] private int contactDamage = 5;
    [Tooltip("접촉 데미지 사이 간격(초)")]
    [SerializeField] private float damageInterval = 1f;

    private Rigidbody2D _rb;
    private SpriteRenderer _sprite;
    private Transform _player;
    private float _nextDamageTime;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
        _sprite = GetComponent<SpriteRenderer>();
    }

    private void Start()
    {
        var player = FindFirstObjectByType<PlayerController>();
        if (player != null) _player = player.transform;
    }

    private void FixedUpdate()
    {
        if (_player == null) return;

        float dx = _player.position.x - transform.position.x;
        float distance = Mathf.Abs(dx);

        if (distance <= aggroRange && distance > stopDistance)
        {
            float dir = Mathf.Sign(dx);
            _rb.linearVelocity = new Vector2(dir * moveSpeed, _rb.linearVelocity.y);
            if (_sprite != null) _sprite.flipX = dir < 0;
        }
        else
        {
            // 추적 범위 밖이거나 너무 가까우면 가로 이동 멈춤 (세로는 중력에 맡김)
            _rb.linearVelocity = new Vector2(0f, _rb.linearVelocity.y);
        }
    }

    private void OnCollisionStay2D(Collision2D collision)
    {
        if (Time.time < _nextDamageTime) return;

        // 부딪힌 게 플레이어이고 데미지를 받을 수 있으면 접촉 데미지
        if (collision.collider.GetComponent<PlayerController>() != null &&
            collision.collider.TryGetComponent<IDamageable>(out var target))
        {
            target.TakeDamage(contactDamage);
            _nextDamageTime = Time.time + damageInterval;
        }
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, aggroRange);
    }
}
