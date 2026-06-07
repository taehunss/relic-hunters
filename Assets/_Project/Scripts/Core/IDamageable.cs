/// <summary>
/// 데미지를 받을 수 있는 모든 대상(플레이어, 적, 파괴 가능한 오브젝트)이
/// 구현하는 인터페이스. 무기는 구체 타입을 몰라도 이 인터페이스로 공격한다.
/// </summary>
public interface IDamageable
{
    void TakeDamage(int amount);
}
