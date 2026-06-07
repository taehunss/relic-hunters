using System.Collections;
using UnityEngine;

/// <summary>
/// 체력을 가진 대상의 공통 컴포넌트. 플레이어/적 모두 재사용한다.
/// 데미지를 받으면 스프라이트를 잠깐 빨갛게 깜빡이고, HP가 0이 되면 사라진다.
/// </summary>
public class Health : MonoBehaviour, IDamageable
{
    [Header("체력")]
    [SerializeField] private int maxHealth = 30;

    [Header("피격 연출")]
    [SerializeField] private Color hitColor = Color.red;
    [SerializeField] private float hitFlashDuration = 0.08f;

    [Header("사망 처리")]
    [Tooltip("죽으면 오브젝트를 제거할지 (적=true, 플레이어=false 권장)")]
    [SerializeField] private bool destroyOnDeath = true;

    /// <summary>사망 시 호출되는 이벤트 (게임오버/드롭 등에 연결).</summary>
    public event System.Action Died;

    /// <summary>체력이 바뀔 때 호출 (current, max). HUD 갱신용.</summary>
    public event System.Action<int, int> HealthChanged;

    private int _currentHealth;
    private SpriteRenderer _sprite;
    private Color _originalColor;

    public int CurrentHealth => _currentHealth;
    public int MaxHealth => maxHealth;
    public bool IsDead => _currentHealth <= 0;

    private void Awake()
    {
        _currentHealth = maxHealth;
        _sprite = GetComponent<SpriteRenderer>();
        if (_sprite != null) _originalColor = _sprite.color;
    }

    public void TakeDamage(int amount)
    {
        if (IsDead) return;

        _currentHealth -= amount;
        Debug.Log($"{name} 가 {amount} 데미지를 받음 → 남은 HP {_currentHealth}");
        HealthChanged?.Invoke(_currentHealth, maxHealth);

        if (_sprite != null)
        {
            StopAllCoroutines();
            StartCoroutine(HitFlash());
        }

        if (_currentHealth <= 0) Die();
    }

    private IEnumerator HitFlash()
    {
        _sprite.color = hitColor;
        yield return new WaitForSeconds(hitFlashDuration);
        _sprite.color = _originalColor;
    }

    private void Die()
    {
        Debug.Log($"{name} 사망");
        Died?.Invoke();
        if (destroyOnDeath) Destroy(gameObject);
    }
}
