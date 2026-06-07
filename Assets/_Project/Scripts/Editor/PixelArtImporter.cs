using UnityEditor;
using UnityEngine;

/// <summary>
/// Assets/_Project/Art/ 아래 텍스처를 폴더에 따라 자동 임포트한다. (spec §2.3)
///  - Art/HD/...  : 고해상도 부드러운 아트 → Bilinear 필터, PPU 100
///  - 그 외 Art/  : 도트(픽셀) 아트       → Point 필터, PPU 16
/// 새 이미지를 넣을 때마다 손으로 설정할 필요가 없다.
/// 이 파일은 "Editor" 폴더 안에 있어 빌드에는 포함되지 않는다.
/// </summary>
public class PixelArtImporter : AssetPostprocessor
{
    private void OnPreprocessTexture()
    {
        string path = assetPath.Replace('\\', '/');
        if (!path.Contains("/_Project/Art/")) return;

        bool isHD = path.Contains("/_Project/Art/HD/");

        var importer = (TextureImporter)assetImporter;
        importer.textureType = TextureImporterType.Sprite;
        importer.spriteImportMode = SpriteImportMode.Single;
        importer.mipmapEnabled = false;

        if (isHD)
        {
            // 메이플풍 고해상도: 부드럽게 스케일, 픽셀당 단위 크게
            importer.filterMode = FilterMode.Bilinear;
            importer.spritePixelsPerUnit = 100;
            importer.textureCompression = TextureImporterCompression.Compressed;
        }
        else
        {
            // 도트: 또렷하게(픽셀 유지), 16px = 1칸
            importer.filterMode = FilterMode.Point;
            importer.spritePixelsPerUnit = 16;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
        }
    }
}
