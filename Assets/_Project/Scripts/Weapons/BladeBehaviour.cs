using UnityEngine;

/// <summary>
/// 칼(Blade) — 근접 무기. 공격 시 플레이어 주변 원형 범위 안의 적에게 즉시 데미지를 준다.
/// (1단계 버전: 주변 원형 판정. 추후 방향성 콤보/대시로 확장)
/// </summary>
public class BladeBehaviour : MonoBehaviour, IWeaponBehaviour
{
    [Header("칼 공격")]
    [Tooltip("공격이 닿는 반경 (Unity 단위)")]
    [SerializeField] private float attackRadius = 1.2f;
    [Tooltip("한 번 공격 시 입히는 데미지")]
    [SerializeField] private int damage = 10;
    [Tooltip("어떤 레이어를 적으로 판정할지")]
    [SerializeField] private LayerMask enemyLayers;

    public void Attack()
    {
        // 플레이어 위치를 중심으로 반경 안의 콜라이더를 모두 찾는다.
        Collider2D[] hits = Physics2D.OverlapCircleAll(transform.position, attackRadius, enemyLayers);
        Debug.Log($"칼 공격! 범위 내 대상 {hits.Length}개");

        foreach (Collider2D hit in hits)
        {
            // 맞은 대상이 데미지를 받을 수 있으면 데미지를 준다.
            if (hit.TryGetComponent<IDamageable>(out var target))
                target.TakeDamage(damage);
        }
    }

    // Scene 뷰에서 이 오브젝트를 선택하면 공격 범위를 노란 원으로 그려준다 (디버그용).
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, attackRadius);
    }
}
