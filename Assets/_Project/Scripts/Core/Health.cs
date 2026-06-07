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

    private int _currentHealth;
    private SpriteRenderer _sprite;
    private Color _originalColor;

    public int CurrentHealth => _currentHealth;
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
        // TODO: 사망 연출/드롭 처리. 지금은 단순히 제거.
        Destroy(gameObject);
    }
}
