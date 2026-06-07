using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// 플레이어가 장착한 여러 무기를 관리하고, 공격 입력을 현재 무기로 전달한다.
/// 같은 GameObject에 붙은 모든 IWeaponBehaviour 컴포넌트를 무기 슬롯으로 잡고,
/// 숫자키 1~5 로 실시간 교체한다. (PRD: "손에 쥔 유물이 곧 클래스")
/// </summary>
public class WeaponController : MonoBehaviour
{
    private IWeaponBehaviour[] _weapons;
    private int _currentIndex;
    private IWeaponBehaviour Current => _weapons[_currentIndex];

    private void Awake()
    {
        // 컴포넌트로 붙어있는 무기들을 Inspector 표시 순서대로 슬롯에 담는다.
        _weapons = GetComponents<IWeaponBehaviour>();
        if (_weapons.Length == 0)
            Debug.LogWarning($"{name}: 무기(IWeaponBehaviour)가 하나도 없습니다.");
        else
            EquipWeapon(0);
    }

    private void Update()
    {
        // 숫자키로 무기 스왑 (1 → 슬롯0, 2 → 슬롯1 ...). 액션 에셋 없이 직접 키 읽기.
        var kb = Keyboard.current;
        if (kb == null) return;

        if (kb.digit1Key.wasPressedThisFrame) EquipWeapon(0);
        if (kb.digit2Key.wasPressedThisFrame) EquipWeapon(1);
        if (kb.digit3Key.wasPressedThisFrame) EquipWeapon(2);
        if (kb.digit4Key.wasPressedThisFrame) EquipWeapon(3);
        if (kb.digit5Key.wasPressedThisFrame) EquipWeapon(4);
    }

    private void EquipWeapon(int index)
    {
        if (_weapons == null || index < 0 || index >= _weapons.Length) return;
        _currentIndex = index;
        Debug.Log($"무기 교체 → 슬롯 {index + 1}: {(Current as MonoBehaviour).GetType().Name}");
    }

    /// <summary>
    /// PlayerInput(Behavior = Send Messages) 가 "Attack" 액션 발생 시 자동 호출.
    /// </summary>
    public void OnAttack(InputValue value)
    {
        if (value.isPressed && _weapons != null && _weapons.Length > 0)
            Current.Attack();
    }
}
