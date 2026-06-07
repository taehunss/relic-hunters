/// <summary>
/// 모든 무기(칼/창/활/표창/마법봉)가 구현하는 동작 인터페이스.
/// WeaponController 는 어떤 무기인지 몰라도 이 인터페이스로 공격을 지시한다.
/// 무기마다 완전히 다른 매커니즘은 각 구현체 안에 캡슐화한다.
/// </summary>
public interface IWeaponBehaviour
{
    /// <summary>기본 공격.</summary>
    void Attack();

    // 추후 확장: void UseSkill(); void OnEquip(); void OnUnequip();
}
