using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

/// <summary>
/// 플레이어가 죽으면 "GAME OVER" 화면을 띄우고 시간을 멈춘다. R 키로 현재 씬을 재시작.
/// 빈 GameObject에 이 컴포넌트만 붙이면 동작한다.
/// (재시작이 동작하려면 현재 씬이 Build Settings 에 등록돼 있어야 함)
/// </summary>
public class GameOverController : MonoBehaviour
{
    private Health _playerHealth;
    private GameObject _panel;
    private bool _isGameOver;

    private void Start()
    {
        var player = FindFirstObjectByType<PlayerController>();
        if (player == null || !player.TryGetComponent(out _playerHealth))
        {
            Debug.LogWarning("GameOverController: 플레이어 Health를 찾지 못했습니다.");
            return;
        }

        BuildUI();
        _playerHealth.Died += OnPlayerDied;
    }

    private void OnDestroy()
    {
        if (_playerHealth != null) _playerHealth.Died -= OnPlayerDied;
    }

    private void OnPlayerDied()
    {
        _isGameOver = true;
        if (_panel != null) _panel.SetActive(true);
        Time.timeScale = 0f; // 게임 정지
    }

    private void Update()
    {
        if (!_isGameOver) return;

        // 정지 중에도 Input System은 실시간으로 동작한다.
        if (Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame)
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().name);
        }
    }

    private void BuildUI()
    {
        var canvasGO = new GameObject("GameOver_Canvas");
        canvasGO.transform.SetParent(transform, false);
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100; // HUD 위에 표시
        var scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920f, 1080f);
        canvasGO.AddComponent<GraphicRaycaster>();

        _panel = new GameObject("Panel");
        _panel.transform.SetParent(canvasGO.transform, false);
        var bg = _panel.AddComponent<Image>();
        bg.color = new Color(0f, 0f, 0f, 0.75f);
        var bgRT = bg.rectTransform;
        bgRT.anchorMin = Vector2.zero;
        bgRT.anchorMax = Vector2.one;
        bgRT.offsetMin = bgRT.offsetMax = Vector2.zero; // 화면 전체

        CreateText("GAME OVER", 96, new Vector2(0f, 60f), _panel.transform);
        CreateText("R 키를 눌러 재시작", 40, new Vector2(0f, -60f), _panel.transform);

        _panel.SetActive(false);
    }

    private static void CreateText(string content, int fontSize, Vector2 anchoredPos, Transform parent)
    {
        var go = new GameObject("Text");
        go.transform.SetParent(parent, false);
        var text = go.AddComponent<Text>();
        text.text = content;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = fontSize;
        text.alignment = TextAnchor.MiddleCenter;
        text.color = Color.white;

        var rt = text.rectTransform;
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(1000f, 200f);
        rt.anchoredPosition = anchoredPos;
    }
}
