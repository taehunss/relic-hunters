# [기술 명세서] 렐릭 헌터 (Relic Hunter): 다섯 개의 병기

> 이 문서는 [prd.md](prd.md)의 기획을 **Unity 기반으로 어떻게 구현할지**를 정의합니다.
> 대상 독자는 "개발 경험은 있으나 게임 개발은 처음인" 개발자입니다. 따라서 각 선택에 대해 *왜 이 기술을 쓰는지*와 *어떤 구조로 짜는지*를 함께 설명합니다.
>
> **타깃 플랫폼:** PC 데스크톱 (Windows / macOS / Linux) 전용. *(모바일은 범위에서 제외 — 추후 확장 시 Unity 동일 코드로 빌드 타깃만 추가 가능)*
> **개발 환경:** Unity Editor(씬·프리팹·빌드) + **Cursor**(C# 스크립트 편집). 두 도구를 병행하는 표준 Unity 워크플로우.
> **비용:** 전부 무료. Unity Personal(연 매출 $200K 미만 무료, 런타임 요금 2024년 폐지) + Cursor 무료 플랜.

---

## 1. 기술 스택 요약

| 영역 | 선택 | 이유 |
|---|---|---|
| **게임 엔진** | Unity 6 LTS (6000.x) | 2D 성숙도, 데스크톱 빌드 안정성, 방대한 자료/에셋스토어. **Personal 무료**. LTS는 장기 버그픽스 보장 |
| **코드 에디터** | Cursor (VS Code 포크) | C# 편집 + AI 보조. Unity의 외부 에디터로 지정해 사용 |
| **언어** | C# | 기존 C#/Java 배경과 직결. 정적 타입 + OOP라 진입장벽 낮음 |
| **렌더 파이프라인** | URP (Universal Render Pipeline) + 2D Renderer | 2D 라이트/그림자(타격감·분위기) 지원, 데스크톱에서 여유로운 성능 |
| **입력** | Input System (신형 패키지) | 키보드/마우스 + 게임패드를 **하나의 코드**로 추상화 |
| **물리** | 2D Physics (Rigidbody2D, Collider2D) | 히트박스 충돌, 투사체 판정 |
| **UI** | uGUI (Canvas) 메인 + UI Toolkit (메뉴) | 인게임 HUD는 uGUI가 성숙, 정적 메뉴는 UI Toolkit이 유지보수 유리 |
| **데이터 정의** | ScriptableObject | 무기/렐릭/적/스테이지를 **코드 수정 없이** 에디터에서 데이터로 관리 |
| **세이브** | JSON 직렬화 (`JsonUtility`) → 로컬 파일 | 단순하고 디버깅 쉬움. 진척도/인벤토리 저장 |
| **버전 관리** | Git + Git LFS + `.gitignore`(Unity) | 에셋(png, 오디오) 바이너리는 LFS로 관리 |
| **에셋 스토어/툴** | Aseprite(픽셀아트), DOTween(트위닝), Tiled/Tilemap(맵) | 표준 인디 툴체인 |

> **버전 메모:** 실제 설치 시 Unity Hub에서 최신 **LTS** 버전을 받으세요. 메이저 버전이 올라도 아래 아키텍처는 그대로 유효합니다.

---

## 2. 프로젝트 셋업

### 2.1 설치 (전부 무료)
1. **Unity Hub** 설치 → 무료 Unity 계정 로그인 → **Personal 라이선스** 활성화
2. Hub로 **Unity 6 LTS 에디터** 설치 + 모듈에서 **Windows / Mac / Linux Build Support** 체크 *(모바일 모듈은 불필요 → 용량 절약)*
3. **Cursor** 설치 → Unity `Edit > Preferences > External Tools`에서 외부 스크립트 에디터를 **Cursor**로 지정
4. (C# 자동완성용) **.NET SDK** 설치 후, Cursor에 C# 확장 설정 — 아래 2.4절 참고

### 2.2 초기 프로젝트 생성
1. 새 프로젝트: **Universal 2D** 템플릿 선택 (URP + 2D Renderer가 미리 구성됨)
2. Package Manager에서 추가:
   - `Input System`
   - `2D Pixel Perfect` (Pixel Perfect Camera)
   - `2D Tilemap Editor` / `2D Tilemap Extras`
   - `Cinemachine` (카메라 추적/흔들림)
   - `Addressables` (Phase 3 에셋 로딩, 처음엔 생략 가능)

### 2.3 픽셀아트 렌더링 규칙 (중요)

픽셀아트는 설정을 틀리면 화면이 뭉개집니다. 아래는 **필수 체크리스트**:

- 스프라이트 Import Settings: `Filter Mode = Point (no filter)`, `Compression = None`
- **PPU(Pixels Per Unit) 고정**: 예) 16 또는 32. 프로젝트 전체에서 단일 값 사용
- 카메라에 **Pixel Perfect Camera** 컴포넌트 부착 (Reference Resolution를 기준 해상도로 설정, 예: 384×216)
- Sprite Atlas로 묶어 드로우콜 절감

### 2.4 Cursor + C# 연동

Unity는 게임 로직(C# 스크립트)을 **외부 에디터에서 편집**하는 구조입니다. Cursor를 그 외부 에디터로 씁니다.

- Unity `Edit > Preferences > External Tools` → External Script Editor = **Cursor**
- 스크립트를 더블클릭하면 Cursor가 열리고, Unity가 자동 생성한 `.sln`/`.csproj`를 인식해 자동완성/정의 이동이 동작
- **C# 인텔리센스:** Cursor는 VS Code 포크지만 MS의 *C# Dev Kit*은 라이선스상 정식 VS Code 전용입니다. Cursor에선 오픈소스 **C# 확장(OmniSharp 기반)** 또는 대체 확장을 설치해 사용 (`.NET SDK` 필요)
- **주의:** 코드는 Cursor에서 짜되, **씬 배치·프리팹·인스펙터 값 연결·빌드는 Unity Editor에서** 합니다. 두 창을 오가는 게 정상 워크플로우
- Cursor의 AI에게 이 `spec.md`와 `prd.md`를 컨텍스트로 주면 무기 Behaviour 등 보일러플레이트 생성에 도움

### 2.5 폴더 구조

```
Assets/
├── _Project/              # 우리가 만드는 모든 것 (_ 로 최상단 고정)
│   ├── Art/               # 스프라이트, 애니메이션, 타일셋
│   ├── Audio/             # BGM, SFX
│   ├── Prefabs/           # 플레이어, 적, 투사체, UI
│   ├── ScriptableObjects/ # 무기/렐릭/적/스테이지 데이터 에셋
│   ├── Scenes/            # Boot, MainMenu, Stage01 ...
│   ├── Scripts/
│   │   ├── Core/          # 게임 매니저, 이벤트버스, 오브젝트풀, 세이브
│   │   ├── Player/        # 이동, 입력, 체력
│   │   ├── Weapons/       # 무기 시스템 (핵심)
│   │   ├── Enemies/       # 적/보스 AI
│   │   ├── Stage/         # 웨이브 스포너, 스테이지 흐름
│   │   ├── UI/            # HUD, 인벤토리, 강화
│   │   └── Data/          # ScriptableObject 정의 클래스
│   └── Settings/          # URP 에셋, Input Actions
└── Plugins/               # 서드파티 (DOTween 등)
```

---

## 3. 핵심 아키텍처

### 3.1 설계 원칙
- **데이터와 로직 분리**: 무기 수치/옵션은 `ScriptableObject` 데이터, 행동은 C# 클래스. → 밸런싱을 코드 빌드 없이 진행
- **컴포넌트 조합**: Unity는 상속보다 컴포넌트 조합이 기본. `Health`, `Movement`, `Hitbox` 등을 잘게 쪼개 붙임
- **이벤트 기반 소통**: 객체 간 직접 참조 대신 이벤트로 느슨하게 연결 (적 사망 → HUD/스포너/사운드가 각자 반응)

### 3.2 멀티 웨폰 시스템 (게임의 심장)
PRD의 "손에 쥔 유물이 곧 클래스"를 구현하는 핵심. **전략(Strategy) 패턴 + ScriptableObject**로 설계합니다.

```
WeaponDefinition (ScriptableObject)   ← 데이터: 이름, 타입, 기본 공격력, 공속, 이동속도 보정, 스킬 쿨다운, 스프라이트
        ▲
        │ 참조
WeaponInstance (런타임 객체)           ← WeaponDefinition + 부착된 렐릭 옵션(화염/흡혈 등) 합산 → 실제 스탯
        ▲
        │ 사용
IWeaponBehaviour (인터페이스)          ← Attack(), UseSkill(), OnEquip(), OnUnequip()
        ├── BladeBehaviour    (근접 콤보 + 대시)
        ├── SpearBehaviour    (관통 찌르기)
        ├── BowBehaviour      (투사체 발사 + 유도)
        ├── ShurikenBehaviour (다중 투척 + 독 DoT)
        └── WandBehaviour     (광역 원소 마법)
```

- 플레이어는 `WeaponController` 하나를 들고, 장착된 무기에 따라 `IWeaponBehaviour` 구현체를 **교체**만 함 → 실시간 스왑이 깔끔하게 됨
- 무기 스왑 시 `OnUnequip()`/`OnEquip()`에서 이동속도·애니메이터 등 갱신
- 무기별 완전히 다른 메커니즘(근접/투사체/광역)은 각 Behaviour 안에 캡슐화

### 3.3 렐릭(Relic) 옵션 시스템
- `RelicAffix` (ScriptableObject): 화염 대미지, 흡혈, 공속 증가 등 **모디파이어** 정의
- 무기에 affix들을 부착 → `WeaponInstance`가 기본 스탯 + affix 합산하여 최종 스탯 계산
- 데미지 계산은 `DamagePacket`(값 + 속성 + 출처) 구조체로 전달 → 화염/빙결/독 등 속성 처리 일원화

### 3.4 데미지 / 히트 판정
- **Hitbox**(공격 판정, Trigger Collider2D) ↔ **Hurtbox**(피격 판정) 분리
- 충돌 시 공격자가 `IDamageable.TakeDamage(DamagePacket)` 호출
- **레이어 매트릭스**로 플레이어 공격 ↔ 적, 적 공격 ↔ 플레이어만 충돌하도록 제한 (Project Settings → Physics 2D)
- 권장 레이어: `Player`, `Enemy`, `PlayerHitbox`, `EnemyHitbox`, `Projectile`, `Environment`

### 3.5 투사체 & 오브젝트 풀링
활/표창/마법은 투사체를 대량 생성합니다. `Instantiate/Destroy`를 매번 하면 모바일에서 GC 끊김 발생 → **오브젝트 풀링** 필수.
- `ObjectPool<T>` 제너릭 풀 (Unity 내장 `UnityEngine.Pool.ObjectPool` 활용)
- 투사체는 비활성화 후 풀에 반납, 재사용

### 3.6 적 / 보스 AI — 상태 머신(FSM)
- 적: `Idle → Chase → Attack → Dead` 단순 FSM (enum 기반 switch 또는 State 클래스)
- **보스**: PRD의 장판/돌진/무적 패턴 → **패턴 기반 FSM**
  - 각 패턴을 `BossPattern` 클래스로 분리, 보스가 페이즈/체력에 따라 패턴 시퀀스 선택
  - 텔레그래프(공격 예고) → 장판 표시 → 발동 순서를 Coroutine으로 연출
  - 약점 속성을 데이터로 두어 "무기 스왑 공략"이 성립하도록 함

### 3.7 스테이지 / 웨이브 흐름
- `StageController`가 스테이지 상태를 관리: `Wave1 → Wave2 → Wave3 → Elite → Boss → Clear`
- `WaveSpawner`: `StageDefinition`(ScriptableObject)에 정의된 적 구성/수/스폰 위치를 읽어 생성
- 모든 적 처치 → 다음 웨이브 트리거 (이벤트 기반)
- 맵은 **Tilemap**으로 구성 (충돌은 Tilemap Collider2D + Composite Collider2D)

---

## 4. 입력 (데스크톱)

- **Input System**의 Action Map으로 `Move`, `Attack`, `Skill`, `SwapWeapon`, `Dash`를 추상 액션으로 정의
- **키보드/마우스**(주력) + **게임패드**(Xbox/PS 컨트롤러) 바인딩을 함께 등록
- 무기 스왑은 숫자키(1~5) 또는 휠/범퍼로 바인딩 — 실시간 스왑이 핵심이므로 즉각적 입력 보장
- 게임 로직은 액션만 구독하므로 **입력 장치가 바뀌어도 동일 코드** 동작

---

## 5. UI 시스템

- **인게임 HUD (uGUI/Canvas)**: 체력바, 무기 슬롯/쿨다운, 미니 알림. Canvas는 `Screen Space - Overlay`, 다양한 데스크톱 해상도/창 크기 대응 위해 **Canvas Scaler = Scale With Screen Size**
- **메뉴/인벤토리/강화 화면 (Phase 3)**: 데이터 바인딩이 많아 UI Toolkit(USS/UXML) 고려, 단 처음엔 uGUI로 통일해도 무방
- 해상도 옵션(전체화면/창모드/해상도 선택)을 설정 메뉴에 노출
- 트윈/연출은 **DOTween**으로 (버튼 팝, 데미지 텍스트 등)

---

## 6. 데이터 & 세이브

- 진행도(클리어 스테이지), 인벤토리(보유 무기/렐릭), 강화 수치를 직렬화 가능한 `SaveData` 클래스로 정의
- `JsonUtility.ToJson` → `Application.persistentDataPath`에 파일 저장 (OS별 적절한 유저 데이터 폴더로 매핑됨)
- 설정값(볼륨, 해상도, 키 바인딩) 같은 단순 키-값은 `PlayerPrefs`
- ScriptableObject는 **정적 정의(마스터 데이터)**, 세이브는 **런타임 진행 상태**로 역할 분리

---

## 7. 오디오

- BGM(스테이지/보스) + SFX(타격/스킬/UI). AudioMixer로 BGM/SFX 그룹 분리, 볼륨 노출
- 동일 SFX 연타 시 풀링된 AudioSource 사용 (피격음 등)

---

## 8. 성능 고려사항 (데스크톱)

데스크톱은 모바일보다 여유롭지만, 투사체·이펙트가 많은 액션 게임은 여전히 아래를 지킵니다.

- **타깃 프레임레이트** `Application.targetFrameRate = 60` (옵션으로 V-Sync/프레임 상한 노출)
- Sprite Atlas로 드로우콜 최소화
- `Update()` 남용 금지 — 이벤트/코루틴/타이머로 대체
- GC 압박 줄이기: 풀링, 구조체 활용, 매 프레임 `new` 금지
- Profiler로 병목 측정. 사양 낮은 노트북도 고려해 그래픽 옵션(이펙트 품질) 한두 단계 제공

---

## 9. 빌드 & 배포 파이프라인

| 플랫폼 | 방법 |
|---|---|
| **Windows** | Build Settings → Windows Standalone (`.exe`). 주력 배포 타깃 |
| **macOS** | Standalone (`.app`). 배포 시 공증(notarization)은 추후 고려 |
| **Linux** | Standalone (선택). Steam 출시 시 가산점 |

- 개발 내내 **Unity Editor 플레이 모드**에서 로직 검증 → 마일스톤마다 실제 빌드(.exe 등)로 확인
- 배포처: **Steam**(인디 표준, Steamworks 수수료) 또는 **itch.io**(무료/간편, 인디 친화적). MVP·테스트는 itch.io가 부담 없음
- (선택) GitHub Actions로 빌드 자동화

---

## 10. 마일스톤 → 기술 작업 매핑

### Phase 1 — 조작 + 무기 2종 (칼·활)
**목표:** 게임의 뼈대 검증.
- [ ] 프로젝트 셋업(2장), 픽셀 퍼펙트 카메라, 입력 액션 맵
- [ ] `PlayerController`(이동, Rigidbody2D), `Health`/`Hurtbox`
- [ ] `WeaponController` + `IWeaponBehaviour` 골격
- [ ] `BladeBehaviour`(근접 콤보·대시), `BowBehaviour`(투사체+풀링)
- [ ] 무기 스왑 동작, 더미 허수아비 적으로 데미지 판정 확인

### Phase 2 — 스테이지 1개 전투 루프
**목표:** 핵심 루프가 "재미있는지" 검증.
- [ ] 적 FSM(`Idle/Chase/Attack/Dead`), `WaveSpawner`, `StageController`
- [ ] 3웨이브 → 보스 진입 흐름
- [ ] 보스 1종: 패턴 FSM(장판/돌진/무적), 약점 속성 → 무기 스왑 공략 성립
- [ ] HUD(체력/무기 쿨다운), 스테이지 클리어/실패 처리

### Phase 3 — 무기 5종 + 장비/강화 시스템
**목표:** 파밍·성장 루프 완성.
- [ ] `SpearBehaviour`, `ShurikenBehaviour`(독 DoT), `WandBehaviour`(광역 원소)
- [ ] 렐릭 드롭/인벤토리/장착/강화 UI
- [ ] `RelicAffix` 옵션 시스템(화염/흡혈 등) + 세이브
- [ ] (선택) Addressables로 에셋 로딩 정리

---

## 11. 처음이라면 — 권장 학습/진행 순서

1. **공식 2D 입문**: Unity Learn의 2D 튜토리얼로 씬/프리팹/컴포넌트 감 잡기 (1~2일)
2. **Editor와 Cursor의 역할 분담 체득**: 무엇을 에디터에서 하고 무엇을 코드로 하는지 익히기 (2.4절)
3. **작게 시작**: 화면에서 캐릭터를 움직이고 → 화살 하나 쏘는 것부터. 전체 시스템을 한 번에 짜지 말 것
4. **수직 슬라이스 우선**: Phase 1을 "허접해도 끝까지 도는 한 판"으로 만들고, 그 위에 살을 붙이기
5. **데이터부터 하드코딩 금지**: 무기 수치는 처음부터 ScriptableObject로. 나중에 밸런싱이 압도적으로 편함
6. **Git 커밋 자주**: Unity는 깨지기 쉬우니 동작하는 지점마다 커밋

---

## 12. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| 픽셀아트가 화면에서 뭉개짐 | 2.3절 규칙 엄수, PPU 통일, Pixel Perfect Camera |
| 무기 5종 메커니즘이 코드를 스파게티로 만듦 | `IWeaponBehaviour` 인터페이스로 격리, 무기 간 직접 참조 금지 |
| 이펙트/투사체 과다로 프레임 드랍(GC) | 투사체/사운드 풀링, `Update` 최소화, Profiling |
| Cursor에서 C# 자동완성이 안 잡힘 | `.NET SDK` 설치 + OmniSharp 기반 C# 확장, Unity가 `.csproj` 생성하도록 External Tools 설정 |
| 보스 패턴 구현 복잡 | 패턴을 작은 단위로 쪼개고 Coroutine으로 순차 연출 |
| 범위(스코프) 과욕 | MVP는 무기 2종·스테이지 1개로 못박고, 재미 확인 후 확장 |
