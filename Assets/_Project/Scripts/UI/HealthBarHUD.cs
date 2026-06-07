using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 플레이어 체력 바를 화면 좌상단에 코드로 그린다. (Canvas/Image를 직접 만들 필요 없음)
/// 빈 GameObject에 이 컴포넌트 하나만 붙이면 동작한다.
/// </summary>
public class HealthBarHUD : MonoBehaviour
{
    [SerializeField] private Vector2 size = new Vector2(320f, 28f);
    [SerializeField] private Vector2 margin = new Vector2(24f, 24f);
    [SerializeField] private Color backColor = new Color(0f, 0f, 0f, 0.6f);
    [SerializeField] private Color fillColor = new Color(0.85f, 0.16f, 0.16f, 1f);

    private Health _playerHealth;
    private RectTransform _fill;
    private float _fullWidth;

    private void Start()
    {
        var player = FindFirstObjectByType<PlayerController>();
        if (player == null || !player.TryGetComponent(out _playerHealth))
        {
            Debug.LogWarning("HealthBarHUD: 플레이어 Health를 찾지 못했습니다. Player에 Health 컴포넌트가 있는지 확인하세요.");
            return;
        }

        BuildUI();
        _playerHealth.HealthChanged += OnHealthChanged;
        OnHealthChanged(_playerHealth.CurrentHealth, _playerHealth.MaxHealth);
    }

    private void OnDestroy()
    {
        if (_playerHealth != null) _playerHealth.HealthChanged -= OnHealthChanged;
    }

    private void BuildUI()
    {
        var canvasGO = new GameObject("HUD_Canvas");
        canvasGO.transform.SetParent(transform, false);
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920f, 1080f);
        canvasGO.AddComponent<GraphicRaycaster>();

        var bg = CreateImage("HP_Background", canvasGO.transform, backColor);
        AnchorTopLeft(bg.rectTransform, margin, size);

        var fill = CreateImage("HP_Fill", bg.transform, fillColor);
        AnchorTopLeft(fill.rectTransform, new Vector2(2f, 2f), new Vector2(size.x - 4f, size.y - 4f));
        _fill = fill.rectTransform;
        _fullWidth = size.x - 4f;
    }

    private static Image CreateImage(string name, Transform parent, Color color)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var img = go.AddComponent<Image>();
        img.color = color;
        return img;
    }

    // 좌상단 기준으로 배치 (margin 만큼 안쪽, size 크기)
    private static void AnchorTopLeft(RectTransform rt, Vector2 margin, Vector2 size)
    {
        rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
        rt.pivot = new Vector2(0f, 1f);
        rt.anchoredPosition = new Vector2(margin.x, -margin.y);
        rt.sizeDelta = size;
    }

    private void OnHealthChanged(int current, int max)
    {
        float ratio = max > 0 ? Mathf.Clamp01((float)current / max) : 0f;
        _fill.sizeDelta = new Vector2(_fullWidth * ratio, _fill.sizeDelta.y);
    }
}
