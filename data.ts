import { TextureItem } from './types';

export const UNIFORM_LINK = "https://www.paiho.com/tw/material-hub/b873383c1623dcffafd786ce755b2786";

export const MODELS = [
  { 
    id: 'traveler', 
    name: 'Traveler-shoe', 
    url: 'https://huggingface.co/yayapewn/huggingface/resolve/main/Traveler-shoe.glb',
    wireframeUrl: 'https://huggingface.co/yayapewn/huggingface/resolve/main/Traveler-shoe-wire_compressed.glb',
    scale: 1.53, 
    rotation: [-0.3, Math.PI * 2.5, 0] as [number, number, number], 
    position: [0, 0.03, 0] as [number, number, number], 
    initialEnvRotation: 280
  },
  { 
    id: 'lace', 
    name: 'Lace-shoe', 
    url: 'https://huggingface.co/yayapewn/huggingface/resolve/main/lace-shoe.glb',
    wireframeUrl: 'https://huggingface.co/yayapewn/huggingface/resolve/main/lace-shoe-wire_compressed.glb',
    scale: 2,
    rotation: [0, Math.PI, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
    initialEnvRotation: 280
  },
  { 
    id: 'dna', 
    name: 'D.N.A-shoe', 
    url: null,
    wireframeUrl: null,
    scale: 2,
    rotation: [0, Math.PI, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
    initialEnvRotation: 280
  }
];

export const GENERAL_TEXTURES: TextureItem[] = [
  { id: 'v1', name: 'Fine Fabric 01', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000601%20A%20WP_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000601%20A%20WP_NRM.jpg', title: '4-WAY STRETCH FABRIC', description: 'Dynamic stretchable fabric for peak performance flexibility.', link: UNIFORM_LINK },
  { id: 'v2', name: 'Woven Fabric 02', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000716%20A%20WP_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000716%20A%20WP_NRM.jpg', title: 'ENGINEERED JACQUARD', description: 'Woven patterns for strategic support and breathability.', link: UNIFORM_LINK },
  { id: 'v3', name: 'Tech Mesh 03', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000820%20J%20WP_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT%2000820%20J%20WP_NRM.jpg', title: 'AERO-VENT MESH', description: 'Lightweight open-structure mesh for optimal activity cooling.', link: UNIFORM_LINK },
  { id: 'v4', name: 'Durable 04', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01305-01A-000A_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01305-01A-000A_NRM.jpg', title: 'HEAVY DUTY NYLON', description: 'Abrasion-resistant nylon blend for rugged environments.', link: UNIFORM_LINK },
  { id: 'v5', name: 'Breathable 05', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01317-01A-000A_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01317-01A-000A_NRM.jpg', title: 'ECO-KNIT MATERIAL', description: 'Sustainable yarn offering soft touch and reduced impact.', link: UNIFORM_LINK },
  { id: 'v6', name: 'Digital 06', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01436-01A-000A_BASE.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/EGT01436-01A-000A_NRM.jpg', title: 'DIGITAL PRINT 3D', description: 'Vibrant 3D printed texture for a futuristic aesthetic.', link: UNIFORM_LINK },
];

export const TRAVELER_VAMP_TEXTURES: TextureItem[] = [
  { id: 'traveler_vamp_01', name: 'Vamp 01', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_01.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_01.jpg' },
  { id: 'traveler_vamp_02', name: 'Vamp 02', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_02.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_02.jpg' },
  { id: 'traveler_vamp_03', name: 'Vamp 03', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_03.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_03.jpg' },
  { id: 'traveler_vamp_04', name: 'Vamp 04', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_04.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_04.jpg' },
  { id: 'traveler_vamp_05', name: 'Vamp 05', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_05.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_05.jpg' },
  { id: 'traveler_vamp_06', name: 'Vamp 06', url: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_color_06.jpg', normalUrl: 'https://cdn.jsdelivr.net/gh/yayapewn/shoe-textures@main/texture/traveler_vamp_normal_06.jpg' },
];

