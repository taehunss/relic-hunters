using UnityEditor;
using UnityEngine;

/// <summary>
/// Assets/_Project/Art/ 아래로 들어오는 모든 텍스처를 픽셀아트 기준으로 자동 임포트한다.
/// (Sprite 타입 / Point 필터 / PPU 16 / 압축 없음 / 밉맵 끔)
/// → 새 픽셀 이미지를 넣을 때마다 손으로 설정할 필요가 없다. (spec §2.3)
/// 이 파일은 "Editor" 폴더 안에 있어 빌드에는 포함되지 않는다.
/// </summary>
public class PixelArtImporter : AssetPostprocessor
{
    private const int PixelsPerUnit = 16; // 한 캐릭터 칸이 16x16 픽셀

    private void OnPreprocessTexture()
    {
        string path = assetPath.Replace('\\', '/');
        if (!path.Contains("/_Project/Art/")) return;

        var importer = (TextureImporter)assetImporter;
        importer.textureType = TextureImporterType.Sprite;
        importer.spriteImportMode = SpriteImportMode.Single;
        importer.filterMode = FilterMode.Point;          // 픽셀이 뭉개지지 않게
        importer.spritePixelsPerUnit = PixelsPerUnit;
        importer.mipmapEnabled = false;
        importer.textureCompression = TextureImporterCompression.Uncompressed;
    }
}
