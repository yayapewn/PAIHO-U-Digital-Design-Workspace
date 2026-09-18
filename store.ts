import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextureItem, SelectedPart, TextureConfig } from './types';
import { GENERAL_TEXTURES, MODELS } from './data';

interface AppState {
  // Dev Configs
  devConfigs: Record<string, any>;
  setDevConfigs: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  clearDevConfigs: () => void;

  // App State
  activeModelIndex: number;
  setActiveModelIndex: (index: number) => void;
  libraries: { materials: TextureItem[] };
  setLibraries: (libs: { materials: TextureItem[] }) => void;
  selectedPart: SelectedPart | null;
  setSelectedPart: (part: SelectedPart | null) => void;
  activeTexture: TextureItem | null;
  setActiveTexture: (texture: TextureItem | null) => void;
  
  // Environment
  envIntensity: number;
  setEnvIntensity: (intensity: number) => void;
  envRotation: number;
  setEnvRotation: (rotation: number) => void;
  autoRotate: boolean;
  setAutoRotate: (rotate: boolean) => void;
  
  // Textures Configuration
  partTextures: Record<string, TextureConfig | null>;
  setPartTextures: (updater: (prev: Record<string, TextureConfig | null>) => Record<string, TextureConfig | null>) => void;
  
  // UI State
  isModelReady: boolean;
  setIsModelReady: (ready: boolean) => void;
  hasRotated: boolean;
  setHasRotated: (rotated: boolean) => void;
  showSelectPrompt: boolean;
  setShowSelectPrompt: (prompt: boolean) => void;
  hasClickedPart: boolean;
  setHasClickedPart: (clicked: boolean) => void;
  toast: string | null;
  setToast: (toast: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  devConfigs: JSON.parse(localStorage.getItem('paiho_dev_configs') || '{}'),
  setDevConfigs: (updater) => set((state) => {
    const nextConfigs = updater(state.devConfigs);
    localStorage.setItem('paiho_dev_configs', JSON.stringify(nextConfigs));
    return { devConfigs: nextConfigs };
  }),
  clearDevConfigs: () => set(() => {
    localStorage.removeItem('paiho_dev_configs');
    return { devConfigs: {} };
  }),

  activeModelIndex: 0,
  setActiveModelIndex: (index) => set({ activeModelIndex: index }),
  
  libraries: { materials: GENERAL_TEXTURES },
  setLibraries: (libs) => set({ libraries: libs }),
  
  selectedPart: null,
  setSelectedPart: (part) => set({ selectedPart: part }),
  
  activeTexture: null,
  setActiveTexture: (texture) => set({ activeTexture: texture }),

  envIntensity: 1.5,
  setEnvIntensity: (intensity) => set({ envIntensity: intensity }),
  
  envRotation: MODELS[0].initialEnvRotation,
  setEnvRotation: (rotation) => set({ envRotation: rotation }),
  
  autoRotate: false,
  setAutoRotate: (rotate) => set({ autoRotate: rotate }),

  partTextures: {},
  setPartTextures: (updater) => set((state) => ({ partTextures: updater(state.partTextures) })),

  isModelReady: false,
  setIsModelReady: (ready) => set({ isModelReady: ready }),
  
  hasRotated: false,
  setHasRotated: (rotated) => set({ hasRotated: rotated }),
  
  showSelectPrompt: false,
  setShowSelectPrompt: (prompt) => set({ showSelectPrompt: prompt }),
  
  hasClickedPart: false,
  setHasClickedPart: (clicked) => set({ hasClickedPart: clicked }),
  
  toast: null,
  setToast: (toast) => set({ toast }),
}));

