
export interface TextureItem {
  id: string;
  name: string;
  url: string; // Blob URL or Data URL
  normalUrl?: string;
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
