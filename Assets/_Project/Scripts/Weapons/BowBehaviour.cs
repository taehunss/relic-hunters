using UnityEngine;

/// <summary>
/// 활(Bow) — 원거리 무기. 공격 시 플레이어가 바라보는(마지막으로 움직인) 방향으로 화살을 발사한다.
/// </summary>
[RequireComponent(typeof(PlayerController))]
public class BowBehaviour : MonoBehaviour, IWeaponBehaviour
{
    [Header("활 공격")]
    [Tooltip("발사할 화살 프리팹 (Projectile 컴포넌트가 붙은)")]
    [SerializeField] private Projectile arrowPrefab;
    [Tooltip("화살 속력 (Unity 단위/초)")]
    [SerializeField] private float arrowSpeed = 12f;
    [Tooltip("플레이어 중심에서 화살이 생성되는 거리")]
    [SerializeField] private float spawnOffset = 0.6f;

    private PlayerController _player;

    private void Awake()
    {
        _player = GetComponent<PlayerController>();
    }

    public void Attack()
    {
        if (arrowPrefab == null)
        {
            Debug.LogWarning($"{name}: 화살 프리팹(arrowPrefab)이 지정되지 않았습니다.");
            return;
        }

        Vector2 dir = AimDirection();
        Vector3 spawnPos = transform.position + (Vector3)(dir * spawnOffset);
        float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg; // 화살이 진행 방향을 바라보게 회전

        Projectile arrow = Instantiate(arrowPrefab, spawnPos, Quaternion.Euler(0f, 0f, angle));
        arrow.Launch(dir * arrowSpeed);
        Debug.Log("활 발사!");
    }

    /// <summary>플레이어가 바라보는(마지막으로 움직인) 방향.</summary>
    private Vector2 AimDirection()
    {
        return _player.FacingDirection;
    }
}
