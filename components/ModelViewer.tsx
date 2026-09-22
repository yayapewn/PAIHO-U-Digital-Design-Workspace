import React, { Component, useEffect, useState, Suspense, useRef, ErrorInfo, useMemo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, useProgress, Environment, PerspectiveCamera, Center, ContactShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowUpRight } from 'lucide-react';
import { SelectedPart, TextureConfig, TextureItem } from '../types';
import { textureCacheManager } from '../services/textureCacheManager';

// 標準化八大部位名稱
const MAIN_PARTS = [
  'VAMP', 'TONGUE', 'COLLAR', 'PULL_TAB', 
  'HEEL_COUNTER', 'WELT', 'MIDSOLE', 'OUTSOLE'
];

// 包含模型原始 ID 的互動關鍵字
const INTERACTIVE_KEYWORDS = [
  ...MAIN_PARTS,
  'Shape027_1', 'Shape027', 'Line040', 'Shape026', 'Line048',
  'OBJECT011', 'OBJECT018', 'OBJECT019', 'TONGUE LABEL', 'QUARTER LABEL', 
  'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 
  'HEEL STRAP', 'QUARTER OVERLAY', 'SHOELACE'
];

const DEFAULT_VIEW = {
    pos: [0.85, 0, 0] as [number, number, number], 
    target: [0, 0, 0] as [number, number, number],
    fov: 37.8
};

const TRUSTED_DOMAINS = [
    'raw.githubusercontent.com',
    'huggingface.co',
    'aistudiocdn.com',
    'cdn.jsdelivr.net'
];

// R3F 內建元素宣告，避免 TypeScript 在某些環境下的編譯錯誤
const Group = 'group' as any;
const AmbientLight = 'ambientLight' as any;
const DirectionalLight = 'directionalLight' as any;
const Primitive = 'primitive' as any;

/**
 * 將模型網格名稱映射為標準化的部位名稱（依據 Traveler 運動鞋設計圖）
 */
const getNormalizedPartName = (meshName: string): string => {
    const upperName = meshName.toUpperCase();
    
    // Traveler 專屬部位名稱對照
    if (upperName.includes('TONGUE_PULL_TAB')) return 'Tongue Pull Tab';
    if (upperName.includes('TONGUE_LABEL')) return 'Tongue Label';
    if (upperName.includes('TONGUE_REINFORCEMENT')) return 'Tongue Reinforcement';
    if (upperName.includes('TONGUE')) return 'Tongue';
    
    if (upperName.includes('HEEL_PULL_TAB')) return 'Heel Pull Tab';
    if (upperName.includes('HEEL_COLLAR_REINFORCEMENT') || upperName.includes('HEEL COLLAR REINFORCEMENT') || upperName.includes('OBJECT018')) return 'Heel Collar Reinforcement';
    if (upperName.includes('HEEL_COUNTER')) return 'Heel Counter';
    if (upperName.includes('HEEL_STRAP')) return 'Heel Strap';
    
    if (upperName.includes('QUARTER_LABEL')) return 'Quarter Label';
    if (upperName.includes('QUARTER_OVERLAY')) return 'Quarter Overlay';
    
    if (upperName.includes('VAMP') || upperName.includes('SHAPE027')) return 'Vamp';
    if (upperName.includes('SHOELACE') || upperName.includes('SHAPE026')) return 'Shoelace';
    if (upperName.includes('EYELET')) return 'Eyelet';
    if (upperName.includes('OUTSOLE')) return 'Outsole';
    if (upperName.includes('MIDSOLE')) return 'Midsole';
    if (upperName.includes('WELT')) return 'Welt';
    if (upperName.includes('COLLAR')) return 'Collar';
    if (upperName.includes('PULL_TAB')) return 'Pull Tab';
    if (upperName.includes('LINE048')) return 'Line048';
    
    // 預設處理：移除底線與結尾數字，並轉為首字母大寫
    return meshName
        .replace(/_/g, ' ')
        .replace(/\d+$/, '')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const isInteractive = (name: string, modelId?: string) => {
    if (!name) return false;
    const upperName = name.toUpperCase();
    
    // 黑名單：不管什麼鞋款，這些部位絕對不可互動 (Static Read-only)
    const blacklist = ['OBJECT021', 'OBJECT022', 'OBJECT001'];
    if (blacklist.some(bl => upperName.includes(bl))) {
        return false;
    }
    
    // 如果是 traveler 模型，除了黑名單外的所有網格都視為可互動
    if (modelId === 'traveler') {
        return true;
    }
    
    // 其他鞋款則使用白名單機制
    return INTERACTIVE_KEYWORDS.some(keyword => upperName.includes(keyword.toUpperCase()));
};

const isUrlSafe = (url: string) => {
    if (!url) return false;
    if (url.startsWith('blob:') || url.startsWith('data:')) return true;
    try {
        const parsedUrl = new URL(url);
        return TRUSTED_DOMAINS.includes(parsedUrl.hostname);
    } catch {
        return false;
    }
};

const ScreenshotHandler = React.forwardRef<any, any>((props, ref) => {
    const { gl, scene, camera } = useThree();
    React.useImperativeHandle(ref, () => ({
        captureComposition: async () => {
            return new Promise<string>((resolve) => {
                try {
                    const originalPosition = camera.position.clone();
                    const originalRotation = camera.rotation.clone();
                const originalAspect = (camera as THREE.PerspectiveCamera).aspect;
                const totalWidth = 2560;
                const totalHeight = 1440;
                const halfWidth = totalWidth / 2;
                const halfHeight = totalHeight / 2;
                const quarterWidth = halfWidth / 2;
                
                const gutter = 20; // 增加間距以提升視覺舒適度

                const canvas = document.createElement('canvas');
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(''); return; }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, totalWidth, totalHeight);

                const renderAndDraw = (x: number, y: number, w: number, h: number, camPos: THREE.Vector3, lookAt: THREE.Vector3, up?: THREE.Vector3, customFov?: number, customScale?: number) => {
                     const originalUp = camera.up.clone();
                     const originalFov = (camera as THREE.PerspectiveCamera).fov;
                     
                     if (up) camera.up.copy(up);
                     else camera.up.set(0, 1, 0);
                     
                     camera.position.copy(camPos);
                     camera.lookAt(lookAt);
                     
                     // 1. 設定相機的 aspect ratio 為目標區塊的比例，確保擷取範圍完全吻合 (Off-screen render 完美比例)
                     (camera as THREE.PerspectiveCamera).aspect = w / h;
                     // 2. 根據視圖類型微調 FOV，確保模型大小與參考圖一致且不被裁切
                     (camera as THREE.PerspectiveCamera).fov = customFov || 30;
                     camera.updateProjectionMatrix();
                     camera.updateMatrixWorld();
                     
                     // 3. 建立離線渲染目標 (Off-screen Render Target)，大小完全符合要繪製的區域
                     // 為了在沒有 MSAA 支援的情況下達到最佳畫質，我們可以將解析度加倍 (Supersampling)
                     const pixelRatio = 2; // Supersampling factor for anti-aliasing
                     const renderW = w * pixelRatio;
                     const renderH = h * pixelRatio;
                     
                     const renderTarget = new THREE.WebGLRenderTarget(renderW, renderH, {
                         format: THREE.RGBAFormat,
                         colorSpace: gl.outputColorSpace, // Match current color space (SRGBColorSpace)
                         type: THREE.UnsignedByteType
                     });
                     
                     const currentRenderTarget = gl.getRenderTarget();
                     gl.setRenderTarget(renderTarget);
                     
                     // 為了避免背景變黑，將 clear color 設為白色
                     const originalClearColor = new THREE.Color();
                     gl.getClearColor(originalClearColor);
                     const originalClearAlpha = gl.getClearAlpha();
                     gl.setClearColor(0xffffff, 1);
                     
                     gl.render(scene, camera);
                     
                     // 4. 讀取像素
                     const buffer = new Uint8Array(renderW * renderH * 4);
                     gl.readRenderTargetPixels(renderTarget, 0, 0, renderW, renderH, buffer);
                     
                     // 5. 還原渲染狀態
                     gl.setRenderTarget(currentRenderTarget);
                     gl.setClearColor(originalClearColor, originalClearAlpha);
                     renderTarget.dispose();
                     
                     // 6. 將像素轉成 ImageData 並繪製到目標 ctx 上
                     const imgData = new ImageData(new Uint8ClampedArray(buffer), renderW, renderH);
                     const tempCanvas = document.createElement('canvas');
                     tempCanvas.width = renderW;
                     tempCanvas.height = renderH;
                     const tempCtx = tempCanvas.getContext('2d');
                     if (tempCtx) {
                         tempCtx.putImageData(imgData, 0, 0);
                         
                         ctx.save();
                         // 因為 gl.readPixels 是由下往上讀取，所以 2D Canvas 需要垂直翻轉
                         ctx.translate(x, y + h);
                         ctx.scale(1, -1);
                         
                         // 使用預設的 92% 佔比，或套用自訂縮放來調整特定區塊的大小
                         const scaleFactor = customScale || 0.92;
                         const drawW = w * scaleFactor;
                         const drawH = h * scaleFactor;
                         const drawX = (w - drawW) / 2;
                         const drawY = (h - drawH) / 2;
                         
                         // 將大張的 off-screen canvas 縮小繪製上去 (達到 Anti-aliasing 效果)
                         ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
                         ctx.restore();
                     }
                     
                     camera.up.copy(originalUp);
                     (camera as THREE.PerspectiveCamera).fov = originalFov;
                     camera.updateProjectionMatrix();
                };

                const isMobile = window.innerWidth < 768;
                const baseFov = isMobile ? 16 : 30;
                const detailFov = isMobile ? 14 : 28;
                const topScale = isMobile ? 0.874 : undefined; // 縮小 5%
                const lookAtCenter = new THREE.Vector3(0, 0, 0);
                
                // 1. 左上：正側視圖 (Side View)
                renderAndDraw(0, 0, halfWidth - gutter, halfHeight - gutter, new THREE.Vector3(0.75, 0, 0), lookAtCenter, undefined, baseFov, topScale);
                
                // 2. 左下：上視圖 (Top View)
                renderAndDraw(0, halfHeight + gutter, halfWidth - gutter, halfHeight - gutter, new THREE.Vector3(0, 0.75, 0), lookAtCenter, new THREE.Vector3(-1, 0, 0), baseFov);
                
                // 3. 右上：45度角視圖 (Perspective View)
                renderAndDraw(halfWidth + gutter, 0, halfWidth - gutter, halfHeight - gutter, new THREE.Vector3(0.55, 0.4, 0.55), lookAtCenter, undefined, baseFov, topScale);
                
                // 4. 右下左：鞋頭視角 (Toe View) (縮小15% -> 0.92 * 0.85 = 0.782)
                renderAndDraw(halfWidth + gutter, halfHeight + gutter, quarterWidth - gutter, halfHeight - gutter, new THREE.Vector3(0, 0, 0.8), lookAtCenter, undefined, detailFov, 0.782);
                
                // 5. 右下右：鞋跟視角 (Heel View) (縮小15% -> 0.92 * 0.85 = 0.782)
                renderAndDraw(halfWidth + quarterWidth + gutter, halfHeight + gutter, quarterWidth - gutter, halfHeight - gutter, new THREE.Vector3(0, 0, -0.8), lookAtCenter, undefined, detailFov, 0.782);
                camera.position.copy(originalPosition);
                camera.rotation.copy(originalRotation);
                (camera as THREE.PerspectiveCamera).aspect = originalAspect;
                camera.updateProjectionMatrix();
                resolve(canvas.toDataURL('image/png', 0.9));
                } catch (error) {
                    console.error("Screenshot error:", error);
                    resolve('');
                }
            });
        }
    }));
    return null;
});

interface ErrorBoundaryProps { 
    children?: ReactNode;
}

interface ErrorBoundaryState { 
    hasError: boolean; 
    error: any; 
}

// Fixed ErrorBoundary by extending React.Component directly to ensure state, props, and setState are correctly recognized as inherited members.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Model loading error:", error, errorInfo);
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <Html center>
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center w-80">
            <div className="text-red-500 font-bold mb-2 text-lg">Loading Failed</div>
            <p className="text-sm text-gray-500 mb-4">Unable to load the 3D model. Please check the URL or your connection.</p>
            <button 
                onClick={() => this.setState({ hasError: false, error: null })} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition"
            >
                Retry
            </button>
          </div>
        </Html>
      );
    }
    return children;
  }
}

const CustomLoader = ({ hasWireframe }: { hasWireframe: boolean }) => {
  const { active, progress, item } = useProgress();
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const mountTime = useRef(Date.now());
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (active) {
        mountTime.current = Date.now();
        setShow(true);
        setVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
        timeoutRef.current = setTimeout(() => {
            setShow(false);
            setTimeout(() => setVisible(false), 500);
        }, 0);
    }
    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  if (!visible || hasWireframe) return null;

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'} bg-[#0a0a0a]`}>
      <div className="w-72 flex flex-col gap-5">
        {/* Wireframe Hexagon Icon */}
        <div className="w-full flex justify-center mb-4">
          <svg className="w-12 h-12 text-indigo-500/80 animate-[spin_4s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
            <line x1="12" y1="22" x2="12" y2="15.5"></line>
            <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
            <polyline points="2 15.5 12 8.5 22 15.5"></polyline>
            <line x1="12" y1="2" x2="12" y2="8.5"></line>
          </svg>
        </div>
        
        {/* Data HUD */}
        <div className="flex justify-between items-end">
          <span className="text-[9px] font-mono tracking-[0.3em] text-gray-500 uppercase">System Ready</span>
          <span className="text-[12px] font-mono tracking-widest text-indigo-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-[1px] w-full bg-gray-900 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-indigo-500/80 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[8px] font-mono tracking-[0.4em] text-gray-600 truncate uppercase">
          {item ? `Building: ${item.split('/').pop()}` : 'Initializing Geometry...'}
        </div>
      </div>
    </div>
  );
};

const animatedModels = new Set<string>();

const LoadingWireframeMesh = ({ url, scale, rotation, position, active, onComplete }: { url: string, scale: number, rotation: any, position: any, active: boolean, onComplete: () => void }) => {
    const { scene } = useGLTF(url);
    const meshRef = useRef<THREE.Group>(null);
    const progress = useRef(0);
    
    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        const DURATION = 3.0; // Slowed down by 1x (half speed)
        const safeDelta = Math.min(delta, 0.1); 
        progress.current += safeDelta / DURATION;
        
        let isDone = false;
        if (progress.current >= 1.0) {
            if (!active) {
                isDone = true;
                progress.current = 1.0;
            } else {
                progress.current -= 1.0; // Loop seamlessly
            }
        }
        
        const p = Math.max(0, Math.min(progress.current, 1.0));
        // easeInOutCubic
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        
        meshRef.current.rotation.x = rotation[0];
        meshRef.current.rotation.z = rotation[2];
        meshRef.current.scale.setScalar(scale);
        
        const targetY = rotation[1];
        const startY = targetY - Math.PI * 2;
        meshRef.current.rotation.y = startY + (Math.PI * 2) * ease;
        
        if (isDone) {
            onComplete();
        }
    });

    useMemo(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.material = new THREE.MeshStandardMaterial({
                    color: '#818cf8',
                    emissive: '#4f46e5',
                    emissiveIntensity: 0.8,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3,
                });
            }
        });
    }, [scene]);

    return (
        <group position={position} pointerEvents="none">
            <Center>
                <primitive object={scene} ref={meshRef} scale={scale} rotation={rotation} />
            </Center>
        </group>
    );
};

const LoadingWireframeOverlay = ({ url, scale, rotation, position, modelId, onComplete }: { url: string, scale: number, rotation: any, position: any, modelId: string, onComplete: () => void }) => {
    const { active } = useProgress();
    
    const adjustedScale = modelId === 'traveler' ? scale * 0.98 : scale;
    
    if (!url) return null;
    
    return (
        <Suspense fallback={null}>
            <LoadingWireframeMesh 
                url={url} 
                scale={adjustedScale} 
                rotation={rotation} 
                position={position} 
                active={active} 
                onComplete={() => {
                    animatedModels.add(modelId || '');
                    onComplete();
                }} 
            />
        </Suspense>
    );
};

interface ModelProps {
  url: string;
  modelId?: string;
  modelScale: number;
  modelRotation: [number, number, number];
  modelPosition: [number, number, number];
  selectedPart: SelectedPart | null;
  onPartSelect: (part: SelectedPart | null) => void;
  textureMap: Record<string, TextureConfig | null>;
  controls: any;
  isPickingColor?: boolean;
  onColorPicked?: (hex: string) => void;
}

const Model: React.FC<ModelProps & { interactive?: boolean }> = ({ url, modelId, modelScale, modelRotation, selectedPart, onPartSelect, textureMap, controls, isPickingColor, onColorPicked, interactive = true }) => {
  const { scene } = useGLTF(url);
  
  // 用於判斷是拖曳旋轉還是點擊部位
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const cachedMeshes = useMemo(() => {
    const interactive: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (!mesh.userData.hasClonedMaterial) {
            if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(m => m.clone());
            } else {
                mesh.material = (mesh.material as THREE.Material).clone();
            }
            mesh.userData.hasClonedMaterial = true;
        }

        if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = Array.isArray(mesh.material) 
                ? mesh.material[0].clone() 
                : (mesh.material as THREE.Material).clone();
                
            // 針對鞋墊 (OBJECT019)，從最源頭剝離其光澤度，確保初始與還原時都無光澤
            if (getNormalizedPartName(mesh.name).toUpperCase() === 'OBJECT019') {
                mesh.userData.originalMaterial.roughness = 1.0;
                mesh.userData.originalMaterial.roughnessMap = null;
            }
        }
        
        // 使用 isInteractive 來判斷是否為可互動部位 (支援黑白名單機制)
        const interactiveFlag = isInteractive(mesh.name, modelId);

        if (interactiveFlag) {
            interactive.push(mesh);
            if (!mesh.userData.isCustomMaterial) {
                const originalMat = Array.isArray(mesh.userData.originalMaterial) 
                    ? mesh.userData.originalMaterial[0] 
                    : mesh.userData.originalMaterial;
                const newMat = originalMat.clone();
                newMat.side = THREE.DoubleSide;
                newMat.transparent = true;
                if (newMat.emissive) {
                    newMat.emissive.setHex(0xffffff);
                    newMat.emissiveIntensity = 0;
                }

                // SMART COLOR LOGIC FOR LOGO RETENTION
                const pName = getNormalizedPartName(mesh.name).toUpperCase();
                const isSmartPart = ['OBJECT019', 'TONGUE LABEL', 'QUARTER LABEL', 'OUTSOLE'].includes(pName);

                if (isSmartPart) {
                    newMat.userData.shaderUniforms = {
                        uSmartColorEnabled: { value: 0.0 },
                        uIsSmartInsole: { value: pName === 'OBJECT019' ? 1.0 : 0.0 }
                    };

                    newMat.onBeforeCompile = (shader: any) => {
                        shader.uniforms.uSmartColorEnabled = newMat.userData.shaderUniforms.uSmartColorEnabled;
                        shader.uniforms.uIsSmartInsole = newMat.userData.shaderUniforms.uIsSmartInsole;

                        shader.fragmentShader = `
                            uniform float uSmartColorEnabled;
                            uniform float uIsSmartInsole;
                            ${shader.fragmentShader}
                        `;

                        shader.fragmentShader = shader.fragmentShader.replace(
                            '#include <map_fragment>',
                            `
                            #include <map_fragment>
                            #ifdef USE_MAP
                                if ( uSmartColorEnabled > 0.5 ) {
                                    // 1. Multiply blending for the background and black text
                                    // This natively perfectly handles anti-aliasing for black text and gray shadows.
                                    vec3 tintedCanvas = sampledDiffuseColor.rgb * diffuse;
                                    
                                    // 2. Logo Protection Mask (Red Dominance)
                                    // Extract how "red" the pixel is. 1.5 multiplier ensures the core logo is fully protected 
                                    // even if it's a slightly darker red, while smoothstep/clamp handles the anti-aliased edges.
                                    float redDominance = sampledDiffuseColor.r - max(sampledDiffuseColor.g, sampledDiffuseColor.b);
                                    float logoAlpha = clamp(redDominance * 1.5, 0.0, 1.0);
                                    
                                    // 3. Mathematical Un-Premultiply for Red Logo
                                    // We only need to restore the Red channel that might be destroyed by tintedCanvas (e.g. if diffuse is Cyan).
                                    // The G and B channels of the red logo are naturally dark and can safely be multiplied.
                                    vec3 redRestore = vec3(sampledDiffuseColor.r, 0.0, 0.0);
                                    
                                    // Final Color: Tinted Canvas + Restored Red (only where background color suppressed it)
                                    diffuseColor.rgb = tintedCanvas + logoAlpha * redRestore * (vec3(1.0) - diffuse);
                                }
                            #endif
                            `
                        );
                    };
                }
                mesh.material = newMat;
                mesh.userData.isCustomMaterial = true;
                mesh.userData.glowEnergy = 0;
            }
        }
      }
    });

    return interactive;
  }, [scene, modelId]);

  useEffect(() => {
    const handlePreviewColor = (e: any) => {
      const { partId, color } = e.detail;
      const clickedMesh = cachedMeshes.find(m => m.uuid === partId);
      
      if (clickedMesh) {
        const targetPartName = getNormalizedPartName(clickedMesh.name);
        
        cachedMeshes.forEach(mesh => {
            if (getNormalizedPartName(mesh.name) === targetPartName) {
                const material = mesh.material as THREE.MeshStandardMaterial;
                if (material && material.color) {
                    material.color.set(color);
                    
                    const upperName = targetPartName.toUpperCase();
                    
                    let categoryBParts: string[] = [];
                    if (modelId === 'traveler') {
                        categoryBParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
                    } else if (modelId === 'lace') {
                        categoryBParts = ['TONGUE', 'OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
                    } else {
                        categoryBParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
                    }

                    if (categoryBParts.includes(upperName)) {
                        let changed = false;
                        if (material.map !== null) { 
                    if (material.map !== origMat.map) material.map.dispose(); 
                    material.map = null; 
                    changed = true; 
                }
                        if (material.aoMap !== null) { material.aoMap = null; changed = true; }
                        if (material.lightMap !== null) { material.lightMap = null; changed = true; }
                        if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                        if (material.vertexColors) { material.vertexColors = false; changed = true; }
                        if (changed) material.needsUpdate = true;
                    }
                }
            }
        });
      }
    };
    window.addEventListener('preview-part-color', handlePreviewColor);
    return () => window.removeEventListener('preview-part-color', handlePreviewColor);
  }, [cachedMeshes]);

  useEffect(() => {
    cachedMeshes.forEach(mesh => {
      const partName = getNormalizedPartName(mesh.name);
      const partKey = `${modelId}_${partName}`;
      const config = textureMap[partKey];
      if (config) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (config.color) material.color.set(config.color);
        else material.color.setHex(0xffffff);

        const origMat = Array.isArray(mesh.userData.originalMaterial) ? mesh.userData.originalMaterial[0] : mesh.userData.originalMaterial;

        if (config.url && isUrlSafe(config.url)) {
            material.roughness = config.roughness;
            if (material.roughnessMap !== null) { material.roughnessMap = null; material.needsUpdate = true; }
            if (material.metalnessMap !== null) { material.metalnessMap = null; material.needsUpdate = true; }
        } else {
            material.roughness = origMat.roughness;
            if (material.roughnessMap !== origMat.roughnessMap) { material.roughnessMap = origMat.roughnessMap; material.needsUpdate = true; }
            if (material.metalnessMap !== origMat.metalnessMap) { material.metalnessMap = origMat.metalnessMap; material.needsUpdate = true; }
        }
        material.metalness = config.metalness !== undefined ? config.metalness : origMat.metalness;
        material.opacity = config.opacity;
        material.alphaTest = 0.05;
        
        const hasColorMap = Boolean(config.url && isUrlSafe(config.url));
        const hasNormalMap = Boolean(config.normalUrl && isUrlSafe(config.normalUrl));

        if (material.userData.shaderUniforms) {
            material.userData.shaderUniforms.uSmartColorEnabled.value = hasColorMap ? 0.0 : 1.0;
        }

        // 定義材質組合 Key 以辨識是否有貼圖變更
        const textureComboKey = `${config.url || ''}|${config.normalUrl || ''}`;

        if (hasColorMap || hasNormalMap) {
            if (mesh.userData.currentTextureComboKey !== textureComboKey) {
                mesh.userData.currentTextureComboKey = textureComboKey;

                // 產生請求版本號以徹底防止 Race Condition
                const currentToken = (mesh.userData.selectionToken || 0) + 1;
                mesh.userData.selectionToken = currentToken;

                // 若該貼圖在預載佇列中，立即將優先度升至最高
                if (config.url) textureCacheManager.boostPriority(config.url);
                if (config.normalUrl) textureCacheManager.boostPriority(config.normalUrl);

                const loadPromises: Promise<{ type: 'color' | 'normal'; texture: THREE.Texture | null }>[] = [];

                if (hasColorMap && config.url) {
                    loadPromises.push(
                        textureCacheManager.loadTexture(config.url, false)
                            .then(texture => ({ type: 'color' as const, texture }))
                            .catch(() => ({ type: 'color' as const, texture: null }))
                    );
                }

                if (hasNormalMap && config.normalUrl) {
                    loadPromises.push(
                        textureCacheManager.loadTexture(config.normalUrl, true)
                            .then(texture => ({ type: 'normal' as const, texture }))
                            .catch(() => ({ type: 'normal' as const, texture: null }))
                    );
                }

                Promise.all(loadPromises).then((results) => {
                    // 若在非同步載入期間使用者已點選其他材質，直接捨棄此過時回應
                    if (mesh.userData.selectionToken !== currentToken) {
                        return;
                    }

                    let colorTexture: THREE.Texture | null = null;
                    let normalTexture: THREE.Texture | null = null;

                    results.forEach(res => {
                        if (res.type === 'color') colorTexture = res.texture;
                        if (res.type === 'normal') normalTexture = res.texture;
                    });

                    // 釋放先前以此 Mesh 保留的貼圖引用計數
                    if (mesh.userData.appliedColorUrl && mesh.userData.appliedColorUrl !== config.url) {
                        textureCacheManager.releaseTexture(mesh.userData.appliedColorUrl);
                        mesh.userData.appliedColorUrl = null;
                    }
                    if (mesh.userData.appliedNormalUrl && mesh.userData.appliedNormalUrl !== config.normalUrl) {
                        textureCacheManager.releaseTexture(mesh.userData.appliedNormalUrl);
                        mesh.userData.appliedNormalUrl = null;
                    }

                    // 套用 Color 貼圖
                    if (hasColorMap && colorTexture) {
                        colorTexture.repeat.set(config.scale, config.scale);
                        colorTexture.offset.set(config.offsetX, config.offsetY);
                        colorTexture.rotation = (config.rotation * Math.PI) / 180;
                        colorTexture.center.set(0.5, 0.5);
                        colorTexture.needsUpdate = true;
                        
                        material.map = colorTexture;
                        if (mesh.userData.appliedColorUrl !== config.url) {
                            textureCacheManager.retainTexture(config.url);
                            mesh.userData.appliedColorUrl = config.url;
                        }
                    } else if (!hasColorMap) {
                        material.map = origMat.map;
                    }

                    // 套用 Normal 貼圖
                    if (hasNormalMap && normalTexture) {
                        normalTexture.repeat.set(config.scale, config.scale);
                        normalTexture.offset.set(config.offsetX, config.offsetY);
                        normalTexture.rotation = (config.rotation * Math.PI) / 180;
                        normalTexture.center.set(0.5, 0.5);
                        normalTexture.needsUpdate = true;

                        material.normalMap = normalTexture;
                        if (mesh.userData.appliedNormalUrl !== config.normalUrl) {
                            textureCacheManager.retainTexture(config.normalUrl);
                            mesh.userData.appliedNormalUrl = config.normalUrl;
                        }
                    } else if (!hasNormalMap) {
                        material.normalMap = origMat.normalMap;
                    }

                    material.needsUpdate = true;
                });
            } else {
                // 若為同一套材質，僅即時更新 UV 變形 (Scale, Offset, Rotation)
                if (material.map && material.map !== origMat.map) {
                    material.map.repeat.set(config.scale, config.scale);
                    material.map.rotation = (config.rotation * Math.PI) / 180;
                    material.map.offset.set(config.offsetX, config.offsetY);
                }
                if (material.normalMap && material.normalMap !== origMat.normalMap) {
                    material.normalMap.repeat.set(config.scale, config.scale);
                    material.normalMap.rotation = (config.rotation * Math.PI) / 180;
                    material.normalMap.offset.set(config.offsetX, config.offsetY);
                }
            }
        } else {
            // 無貼圖要求：釋放已套用的貼圖引用
            if (mesh.userData.appliedColorUrl) {
                textureCacheManager.releaseTexture(mesh.userData.appliedColorUrl);
                mesh.userData.appliedColorUrl = null;
            }
            if (mesh.userData.appliedNormalUrl) {
                textureCacheManager.releaseTexture(mesh.userData.appliedNormalUrl);
                mesh.userData.appliedNormalUrl = null;
            }
            mesh.userData.currentTextureComboKey = null;
            
            const upperName = getNormalizedPartName(mesh.name).toUpperCase();
            
            let categoryBParts: string[] = [];
            if (modelId === 'traveler') {
                categoryBParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
            } else if (modelId === 'lace') {
                categoryBParts = ['TONGUE', 'OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
            } else {
                categoryBParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY'];
            }
            
            const isCategoryB = categoryBParts.includes(upperName);
            
            if (isCategoryB) {
                let changed = false;
                if (material.map !== null) { material.map = null; changed = true; }
                if (material.aoMap !== null) { material.aoMap = null; changed = true; }
                if (material.lightMap !== null) { material.lightMap = null; changed = true; }
                if (material.emissiveMap !== null) { material.emissiveMap = null; changed = true; }
                if (material.vertexColors) { material.vertexColors = false; changed = true; }
                if (changed) {
                    material.needsUpdate = true;
                }
            } else {
                let changed = false;
                if (material.map !== origMat.map) {
                    material.map = origMat.map;
                    changed = true;
                }
                if (material.aoMap !== origMat.aoMap) {
                    material.aoMap = origMat.aoMap;
                    changed = true;
                }
                if (material.lightMap !== origMat.lightMap) {
                    material.lightMap = origMat.lightMap;
                    changed = true;
                }
                if (material.emissiveMap !== origMat.emissiveMap) {
                    material.emissiveMap = origMat.emissiveMap;
                    changed = true;
                }
                if (material.vertexColors !== origMat.vertexColors) {
                    material.vertexColors = origMat.vertexColors;
                    changed = true;
                }
                
                if (material.normalMap !== origMat.normalMap) {
                    material.normalMap = origMat.normalMap;
                    changed = true;
                }

                if (changed) {
                    material.needsUpdate = true;
                }
            }
        }
      } else {
        // config 為空：釋放先前可能引用的貼圖
        if (mesh.userData.appliedColorUrl) {
            textureCacheManager.releaseTexture(mesh.userData.appliedColorUrl);
            mesh.userData.appliedColorUrl = null;
        }
        if (mesh.userData.appliedNormalUrl) {
            textureCacheManager.releaseTexture(mesh.userData.appliedNormalUrl);
            mesh.userData.appliedNormalUrl = null;
        }
        mesh.userData.currentTextureComboKey = null;

        const origMat = Array.isArray(mesh.userData.originalMaterial) ? mesh.userData.originalMaterial[0] : mesh.userData.originalMaterial;
        if (!origMat) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        
        let changed = false;
        
        if (!material.color.equals(origMat.color)) {
            material.color.copy(origMat.color);
            changed = true;
        }
        if (material.roughness !== origMat.roughness) {
            material.roughness = origMat.roughness;
            changed = true;
        }
        if (material.metalness !== origMat.metalness) {
            material.metalness = origMat.metalness;
            changed = true;
        }
        
        if (material.map !== origMat.map) {
            material.map = origMat.map;
            mesh.userData.currentTextureUrl = null;
            changed = true;
        }
        if (material.normalMap !== origMat.normalMap) {
            material.normalMap = origMat.normalMap;
            mesh.userData.currentNormalUrl = null;
            changed = true;
        }
        if (material.roughnessMap !== origMat.roughnessMap) {
            material.roughnessMap = origMat.roughnessMap;
            changed = true;
        }
        if (material.metalnessMap !== origMat.metalnessMap) {
            material.metalnessMap = origMat.metalnessMap;
            changed = true;
        }
        if (material.aoMap !== origMat.aoMap) {
            material.aoMap = origMat.aoMap;
            changed = true;
        }
        if (material.lightMap !== origMat.lightMap) {
            material.lightMap = origMat.lightMap;
            changed = true;
        }
        if (material.emissiveMap !== origMat.emissiveMap) {
            material.emissiveMap = origMat.emissiveMap;
            changed = true;
        }
        if (material.vertexColors !== origMat.vertexColors) {
            material.vertexColors = origMat.vertexColors;
            changed = true;
        }
        
        if (material.userData.shaderUniforms && material.userData.shaderUniforms.uSmartColorEnabled) {
            if (material.userData.shaderUniforms.uSmartColorEnabled.value !== 0.0) {
                material.userData.shaderUniforms.uSmartColorEnabled.value = 0.0;
            }
        }
        
        if (changed) {
            material.needsUpdate = true;
        }
      }
    });

    return () => {
      cachedMeshes.forEach(mesh => {
        if (mesh.userData.appliedColorUrl) {
          textureCacheManager.releaseTexture(mesh.userData.appliedColorUrl);
          mesh.userData.appliedColorUrl = null;
        }
        if (mesh.userData.appliedNormalUrl) {
          textureCacheManager.releaseTexture(mesh.userData.appliedNormalUrl);
          mesh.userData.appliedNormalUrl = null;
        }
      });
    };
  }, [cachedMeshes, textureMap, modelId]);

  useFrame((state, delta) => {
    cachedMeshes.forEach(mesh => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && 'emissive' in material) {
            if (mesh.userData.glowEnergy > 0) {
                mesh.userData.glowEnergy = THREE.MathUtils.lerp(mesh.userData.glowEnergy, 0, delta * 2.0);
                const pulse = Math.sin(mesh.userData.glowEnergy * Math.PI) * 0.1;
                material.emissiveIntensity = pulse;
            } else {
                material.emissiveIntensity = 0;
            }
        }
    });
  });

  return <Primitive 
            object={scene} 
            scale={[modelScale, modelScale, modelScale]} 
            rotation={modelRotation} 
            onPointerDown={(e: any) => {
                if (!interactive) return;
                pointerDownPos.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerOver={(e: any) => { 
                if (!interactive) return;
                e.stopPropagation(); 
                if (isPickingColor) {
                    document.body.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><g stroke='rgba(255,255,255,0.8)' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><path d='m2 22 1-1h3l9-9'/><path d='M3 21v-3l9-9'/><path d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/></g><g stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polygon points='3,21 3,18 12,9 15,12 6,21' fill='white'/><path d='m2 22 1-1' stroke-width='2'/><path d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z' fill='black'/></g></svg>") 0 24, crosshair`;
                    return;
                }
                const interactiveFlag = isInteractive(e.object.name, modelId);
                if(interactiveFlag) document.body.style.cursor = 'pointer'; 
            }}
            onPointerOut={() => { if (!interactive) return; document.body.style.cursor = 'auto'; }}
            onClick={(e: any) => {
                if (!interactive) return;
                e.stopPropagation();
                
                // 計算滑鼠按下與放開的距離，如果大於 10 像素則視為拖曳旋轉
                const dist = Math.sqrt(
                    Math.pow(e.clientX - pointerDownPos.current.x, 2) +
                    Math.pow(e.clientY - pointerDownPos.current.y, 2)
                );
                if (!isPickingColor && dist > 10) return;

                const mesh = e.object as THREE.Mesh;
                const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

                if (isPickingColor && onColorPicked) {
                    let pickedHex = null;
                    const standardMat = mat as THREE.MeshStandardMaterial;
                    const baseHex = '#' + standardMat.color.getHexString();

                    if (baseHex.toLowerCase() !== '#ffffff') {
                        pickedHex = baseHex;
                    } else if (standardMat.map && standardMat.map.image && e.uv) {
                        // 1. 如果有貼圖且未染色，嘗試讀取貼圖的該像素顏色 (未受光影影響的原始色)
                        try {
                            const canvas = document.createElement('canvas');
                            const img = standardMat.map.image;
                            canvas.width = img.width || img.videoWidth || 1024;
                            canvas.height = img.height || img.videoHeight || 1024;
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            if (ctx) {
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                
                                // 套用材質的 UV 轉換矩陣 (處理 offset, repeat, rotation)
                                const uv = e.uv.clone();
                                if (standardMat.map.matrixAutoUpdate) {
                                    standardMat.map.updateMatrix();
                                }
                                uv.applyMatrix3(standardMat.map.matrix);
                                
                                let u = uv.x % 1.0;
                                let v = uv.y % 1.0;
                                
                                if (u < 0) u += 1.0;
                                if (v < 0) v += 1.0;
                                
                                const px = Math.floor(u * canvas.width);
                                // 根據貼圖的 flipY 屬性決定 Y 軸方向 (GLTF 預設為 false)
                                const py = Math.floor((standardMat.map.flipY ? (1.0 - v) : v) * canvas.height);
                                
                                const pixel = ctx.getImageData(px, py, 1, 1).data;
                                const toHex = (c: number) => {
                                    const hex = Math.round(c).toString(16).toUpperCase();
                                    return hex.length === 1 ? '0' + hex : hex;
                                };
                                pickedHex = `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
                            }
                        } catch(err) {
                            console.warn("Texture pixel read failed, falling back to material color", err);
                        }
                    }

                    // 2. 如果沒有貼圖或讀取失敗，回退讀取材質的 Base Color
                    if (!pickedHex && standardMat.color) {
                        pickedHex = '#' + standardMat.color.getHexString();
                    }

                    if (pickedHex) onColorPicked(pickedHex);
                    document.body.style.cursor = 'auto'; // Reset cursor immediately
                    return;
                }

                const interactiveFlag = isInteractive(mesh.name, modelId);
                
                if (!interactiveFlag) { onPartSelect(null); return; }
                
                // 使用標準化的部位名稱以更新 UI
                const normalizedPartName = getNormalizedPartName(mesh.name);

                // 使所有同名部位一起發光
                cachedMeshes.forEach(m => {
                    if (getNormalizedPartName(m.name) === normalizedPartName) {
                        m.userData.glowEnergy = 1.0;
                    }
                });

                onPartSelect({ name: normalizedPartName, materialName: mat.name, id: mesh.uuid });
            }}
          />;
};

const InnerScene = React.memo(({ visible = true, url, modelId, modelScale, modelRotation, modelPosition, selectedPart, onPartSelect, textureMap, controls, isPickingColor, onColorPicked }: ModelProps & { visible?: boolean }) => {
    const [modelBottom, setModelBottom] = useState(-0.1);
    return (
        <group position={modelPosition} visible={visible}>
            <Center onCentered={({ height }) => setModelBottom(-height / 2)}>
                <Model 
                    interactive={visible}
                    url={url} 
                    modelId={modelId}
                    modelScale={modelScale}
                    modelRotation={modelRotation}
                    modelPosition={modelPosition}
                    selectedPart={selectedPart} 
                    onPartSelect={onPartSelect}
                    textureMap={textureMap}
                    controls={controls}
                    isPickingColor={isPickingColor}
                    onColorPicked={onColorPicked}
                />
            </Center>
            <ContactShadows position={[0, modelBottom - 0.001, 0]} opacity={0.6} scale={1.5} blur={0.8} far={1.0} resolution={256} color="#000000" />
        </group>
    );
});

interface ModelViewerProps {
  url: string;
  wireframeUrl?: string | null;
  modelId?: string;
  modelScale: number;
  modelRotation: [number, number, number];
  modelPosition: [number, number, number];
  selectedPart: SelectedPart | null;
  onPartSelect: (part: SelectedPart | null) => void;
  textureMap: Record<string, TextureConfig | null>;
  activeTexture?: TextureItem | null; 
  envPreset: string;
  envIntensity: number;
  envRotation: number;
  dirLightRotation: number;
  shadowBlur: number;
  shadowNormalBias: number;
  autoRotate: boolean;
  isPickingColor?: boolean;
  onColorPicked?: (hex: string) => void;
  onModelReady?: () => void;
  onRotateStart?: () => void;
  needsDemoRotation?: boolean;
  onUserRotated?: () => void;
}

const DemoRotationController = ({ controlsRef, needsDemoRotation, transitionState, onUserRotated, modelId }: any) => {
    const demoState = useRef({ active: false, time: 0, startAngle: 0, completed: false });
    const interactionStartAngle = useRef<number | null>(null);

    const listenersAttached = useRef(false);
    const handleStartRef = useRef<any>(null);
    const handleChangeRef = useRef<any>(null);
    const handleEndRef = useRef<any>(null);

    useEffect(() => {
        demoState.current.completed = false;
        demoState.current.active = false;
        listenersAttached.current = false;
    }, [modelId]);

    useEffect(() => {
        if (transitionState === 'complete' && needsDemoRotation && !demoState.current.completed) {
            demoState.current = { active: true, time: 0, startAngle: controlsRef.current?.getAzimuthalAngle() || 0, completed: true };
        }
    }, [transitionState, needsDemoRotation, controlsRef, modelId]);

    useEffect(() => {
        return () => {
            if (controlsRef.current && listenersAttached.current) {
                controlsRef.current.removeEventListener('start', handleStartRef.current);
                controlsRef.current.removeEventListener('change', handleChangeRef.current);
                controlsRef.current.removeEventListener('end', handleEndRef.current);
            }
        };
    }, [controlsRef]);

    useFrame((state, delta) => {
        const controls = controlsRef.current;
        
        if (controls && !listenersAttached.current) {
            // 清除可能殘留的舊監聽器
            if (handleStartRef.current) controls.removeEventListener('start', handleStartRef.current);
            if (handleChangeRef.current) controls.removeEventListener('change', handleChangeRef.current);
            if (handleEndRef.current) controls.removeEventListener('end', handleEndRef.current);

            listenersAttached.current = true;
            
            handleStartRef.current = () => {
                demoState.current.active = false; 
                interactionStartAngle.current = controls.getAzimuthalAngle();
            };
            
            handleChangeRef.current = () => {
                if (interactionStartAngle.current !== null && onUserRotated) {
                    const currentAngle = controls.getAzimuthalAngle();
                    if (Math.abs(currentAngle - interactionStartAngle.current) > 0.05) { // ~2.8 degrees
                        onUserRotated();
                        interactionStartAngle.current = null;
                    }
                }
            };
            
            handleEndRef.current = () => {
                interactionStartAngle.current = null;
            };

            controls.addEventListener('start', handleStartRef.current);
            controls.addEventListener('change', handleChangeRef.current);
            controls.addEventListener('end', handleEndRef.current);
        }

        if (demoState.current.active && controls) {
            demoState.current.time += delta;
            const t = demoState.current.time;
            if (t < 2.5) {
                const angleOffset = Math.sin(t * Math.PI / 1.25) * 0.17; // ~10 degrees
                controls.setAzimuthalAngle(demoState.current.startAngle + angleOffset);
                controls.update();
            } else {
                demoState.current.active = false;
            }
        }
    });

    return null;
}

const CameraResetter = ({ modelId, controlsRef }: { modelId?: string, controlsRef: any }) => {
    const { camera } = useThree();
    
    useEffect(() => {
        camera.position.set(...DEFAULT_VIEW.pos);
        camera.lookAt(...DEFAULT_VIEW.target);
        camera.updateProjectionMatrix();
        
        if (controlsRef.current) {
            controlsRef.current.target.set(...DEFAULT_VIEW.target);
            controlsRef.current.update();
        }
    }, [modelId, camera, controlsRef]);
    
    return null;
};

// 監聽 WebGL Context Lost，及時釋放非釘選貼圖保護 GPU
const WebGLContextWatcher: React.FC = () => {
    const { gl } = useThree();
    useEffect(() => {
        const handleContextLost = (e: Event) => {
            e.preventDefault();
            console.warn('[ModelViewer] WebGL Context Lost detected. Releasing unpinned textures and cooling down GPU.');
            textureCacheManager.onModelSwitch();
        };
        const handleContextRestored = () => {
            console.info('[ModelViewer] WebGL Context Restored.');
        };
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
        return () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost);
            canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        };
    }, [gl]);
    return null;
};

const ModelViewer = React.forwardRef<any, ModelViewerProps>(({ 
    url, wireframeUrl, modelId, modelScale, modelRotation, modelPosition, selectedPart, onPartSelect, textureMap, activeTexture, envPreset, envIntensity, envRotation, dirLightRotation, shadowBlur, shadowNormalBias, autoRotate, isPickingColor, onColorPicked, onModelReady, needsDemoRotation, onUserRotated
}, ref) => {
  const controlsRef = useRef<any>(null);
  const screenshotHandlerRef = useRef<any>(null);
  const [transitionState, setTransitionState] = useState<'loading' | 'complete'>('loading');
  const [prevModelId, setPrevModelId] = useState(modelId);

  if (modelId !== prevModelId) {
      setPrevModelId(modelId);
      // 模型切換時釋放前一個模型的未引用貼圖與預載隊列
      textureCacheManager.onModelSwitch();
      if (modelId && animatedModels.has(modelId)) {
          setTransitionState('complete');
      } else if (!wireframeUrl) {
          setTransitionState('complete');
      } else {
          setTransitionState('loading');
      }
  }

  useEffect(() => {
      if (transitionState === 'complete' && onModelReady) {
          onModelReady();
      }
  }, [transitionState, onModelReady, modelId]);

  React.useImperativeHandle(ref, () => ({
      captureComposition: () => screenshotHandlerRef.current?.captureComposition() || Promise.resolve('')
  }));

  const rad = (dirLightRotation * Math.PI) / 180;
  const dirLightX = Math.cos(rad) * 6;
  const dirLightZ = Math.sin(rad) * 6;

  return (
    <div className="w-full h-full bg-[#f8f9fa] relative">
      <Canvas shadows dpr={[1, 2]}
          gl={{ 
            preserveDrawingBuffer: true, 
            antialias: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping, 
            toneMappingExposure: 1.2
          }}
          onPointerMissed={(e) => { if (e.type === 'click') onPartSelect(null); }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <WebGLContextWatcher />
        <PerspectiveCamera makeDefault position={DEFAULT_VIEW.pos} fov={DEFAULT_VIEW.fov} near={0.01} />
        <CameraResetter modelId={modelId} controlsRef={controlsRef} />
        <DemoRotationController 
            key={modelId}
            controlsRef={controlsRef} 
            needsDemoRotation={needsDemoRotation} 
            transitionState={transitionState} 
            onUserRotated={onUserRotated} 
            modelId={modelId}
        />
        <OrbitControls 
            ref={controlsRef}
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 1.5} 
            enableDamping={true}
            dampingFactor={0.05}
            autoRotate={autoRotate}
            autoRotateSpeed={3.0}
            enabled={!isPickingColor}
        />
        <ScreenshotHandler ref={screenshotHandlerRef} />
        {wireframeUrl && transitionState === 'loading' && (
            <LoadingWireframeOverlay 
                url={wireframeUrl} 
                scale={modelScale} 
                rotation={modelRotation} 
                position={modelPosition} 
                modelId={modelId || ''}
                onComplete={() => setTransitionState('complete')}
            />
        )}
        <Suspense fallback={null}>
            {/* Fixed key error by ensuring ErrorBoundary is recognized as a standard React component */}
            <ErrorBoundary key={url}>
                <InnerScene 
                    visible={!wireframeUrl || transitionState === 'complete'}
                    url={url}
                    modelId={modelId}
                    modelScale={modelScale}
                    modelRotation={modelRotation}
                    modelPosition={modelPosition}
                    selectedPart={selectedPart}
                    onPartSelect={onPartSelect}
                    textureMap={textureMap}
                    controls={controlsRef.current}
                    isPickingColor={isPickingColor}
                    onColorPicked={onColorPicked}
                />
                <Suspense fallback={null}>
                  <Environment preset={envPreset as any} environmentIntensity={envIntensity} environmentRotation={[0, (envRotation * Math.PI) / 180, 0]} />
                </Suspense>
                <AmbientLight intensity={0.5} />
                <DirectionalLight 
                    position={[dirLightX, 8, dirLightZ]} 
                    intensity={0.8} 
                    castShadow 
                    shadow-mapSize={[512, 512]} 
                    shadow-bias={-0.001} 
                    shadow-normalBias={shadowNormalBias} 
                />
            </ErrorBoundary>
        </Suspense>
      </Canvas>
      <CustomLoader hasWireframe={!!wireframeUrl} />
      {selectedPart && (
        <div className={`
            absolute left-1/2 -translate-x-1/2 z-10 
            transition-all duration-500 ease-out animate-in fade-in slide-in-from-top-4
            flex flex-col items-center gap-4 w-full px-8 max-w-xl text-center
            top-[85px] lg:top-32
        `}>
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.05)] whitespace-nowrap">
            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] uppercase text-gray-900 leading-none">
              EDITING <span className="text-indigo-600 ml-1">{selectedPart.name.toUpperCase() === 'OBJECT019' ? 'INSOLE' : selectedPart.name.toUpperCase() === 'OBJECT011' ? 'AGLET' : selectedPart.name}</span>
            </span>
          </div>

          {activeTexture && (
            <div className="flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-700 delay-150 w-full md:hidden">
                <h2 className="text-[15px] lg:text-[18px] font-black tracking-tighter text-gray-900 uppercase">
                    {activeTexture.title || activeTexture.name}
                </h2>
                <div className="text-center text-[11px] lg:text-[13px] text-gray-500 font-medium w-full max-w-xs px-2">
                    <span className="whitespace-normal break-words leading-relaxed">
                        {activeTexture.description}
                    </span>
                    <a
                       href={activeTexture.link || "https://www.paiho.com/tw/material-hub/b873383c1623dcffafd786ce755b2786"}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="ml-1 inline-flex items-center align-middle text-indigo-600 hover:text-indigo-800 transition-colors pointer-events-auto"
                      title="Read more"
                    >
                        <ArrowUpRight size={14} strokeWidth={3} />
                    </a>
                </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
});

export default ModelViewer;