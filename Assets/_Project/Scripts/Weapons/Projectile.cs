using UnityEngine;

/// <summary>
/// 화살/표창 등 날아가는 투사체. 발사 시 받은 속도로 직진하다가,
/// 데미지를 줄 수 있는 대상(IDamageable)에 닿으면 데미지를 주고 사라진다.
/// 일정 시간이 지나면 자동으로 사라진다.
/// (1단계: Instantiate/Destroy. 추후 spec §3.5 의 오브젝트 풀링으로 최적화)
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class Projectile : MonoBehaviour
{
    [SerializeField] private int damage = 8;
    [Tooltip("이 시간(초) 후 자동 소멸")]
    [SerializeField] private float lifetime = 3f;

    private Rigidbody2D _rb;

    private void Awake()
    {
        _rb = GetComponent<Rigidbody2D>();
    }

    /// <summary>발사. 진행 속도(방향×속력)를 지정한다.</summary>
    public void Launch(Vector2 velocity)
    {
        _rb.linearVelocity = velocity;
        Destroy(gameObject, lifetime);
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (other.TryGetComponent<IDamageable>(out var target))
        {
            target.TakeDamage(damage);
            Destroy(gameObject);
        }
    }
}
