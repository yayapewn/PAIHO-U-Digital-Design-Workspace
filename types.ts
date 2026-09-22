
export interface TextureItem {
  id: string;
  name: string;
  thumbnail?: string; // UI 專用縮圖 (160px ~ 256px WebP / JPG)
  url: string; // BaseColor / Color Map
  normalUrl?: string; // Normal Map
  roughnessUrl?: string; // Roughness Map
  aoUrl?: string; // Ambient Occlusion Map
  // 預留 adaptive texture 架構 (手機 1K, 桌機 2K)
  baseColor1K?: string;
  baseColor2K?: string;
  normal1K?: string;
  normal2K?: string;
  textures?: {
    mobile?: { baseColor?: string; normal?: string };
    desktop?: { baseColor?: string; normal?: string };
  };
  title?: string;
  description?: string;
  link?: string;
}

export interface TextureConfig {
  url: string;
  normalUrl?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number; // in degrees
  // PBR Properties
  roughness: number;
  metalness: number;
  opacity: number;
  // Color Tint
  color?: string;
  originalRoughness?: number; // Roughness for original material
}

export interface SelectedPart {
  name: string;
  materialName: string;
  id: string; // UUID of the mesh
}
