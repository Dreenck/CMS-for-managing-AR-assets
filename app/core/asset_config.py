# app/core/asset_config.py

from app.models import AssetType

ASSET_RULES = {
    AssetType.model_3d: {
        "extensions": {".glb", ".gltf", ".usdz"},
        "mime_types": {
            "model/gltf-binary",
            "model/gltf+json",
        },
        "max_size_mb": 100,
    },
    AssetType.texture: {
        "extensions": {".png", ".jpg", ".jpeg", ".webp"},
        "max_size_mb": 20,
    },
    AssetType.audio: {
        "extensions": {".mp3", ".wav", ".ogg"},
        "max_size_mb": 50,
    },
    AssetType.marker: {
        "extensions": {".png", ".jpg", ".jpeg", ".patt"},
        "mime_types": {
            "image/png",
            "image/jpeg",
            "application/octet-stream",
        },
        "max_size_mb": 5,
    },
}