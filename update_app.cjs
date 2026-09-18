const fs = require('fs');

const appContent = `import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { RotateCw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, MousePointer2, Smartphone, Monitor, Code, Save, Copy, Trash2, Share2 } from 'lucide-react';
import ModelViewer from './components/ModelViewer';
import { ProColorPicker } from './components/ProColorPicker';
import { ShareModal } from './components/ShareModal';
import { TextureItem, SelectedPart, TextureConfig } from './types';
import { MODELS, GENERAL_TEXTURES, TRAVELER_VAMP_TEXTURES } from './data';
import { useAppStore } from './store';

const ENABLE_DEV_TOOLS = true;

const App: React.FC = () => {
  const {
    devConfigs, setDevConfigs, clearDevConfigs,
    activeModelIndex, setActiveModelIndex,
    libraries, setLibraries,
    selectedPart, setSelectedPart,
    activeTexture, setActiveTexture,
    envIntensity, setEnvIntensity,
    envRotation, setEnvRotation,
    autoRotate, setAutoRotate,
    partTextures, setPartTextures,
    isModelReady, setIsModelReady,
    hasRotated, setHasRotated,
    showSelectPrompt, setShowSelectPrompt,
    hasClickedPart, setHasClickedPart,
    toast, setToast
  } = useAppStore();

  const [isPickingColor, setIsPickingColor] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [orientationError, setOrientationError] = useState<'mobile-portrait' | 'tablet-landscape' | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const modelViewerRef = useRef<any>(null);
  const currentModel = MODELS[activeModelIndex];

  useEffect(() => {
    if (!selectedPart) {
      setLibraries({ materials: GENERAL_TEXTURES });
      return;
    }
    const partName = selectedPart.name.toUpperCase();
    if (currentModel.id === 'traveler' && partName === 'VAMP') {
      setLibraries({ materials: TRAVELER_VAMP_TEXTURES });
    } else {
      setLibraries({ materials: GENERAL_TEXTURES });
    }
  }, [currentModel.id, selectedPart, setLibraries]);

  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1280;
      setIsMobileView(isMobile);
      if (isMobile && !isPortrait) setOrientationError('mobile-portrait');
      else if (isTablet && isPortrait) setOrientationError('tablet-landscape');
      else setOrientationError(null);
    };
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handleModelSwitch = (index: number) => {
    if (!MODELS[index].url) {
      setToast("COMING SOON");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setIsModelReady(false);
    setActiveModelIndex(index);
    setEnvRotation(MODELS[index].initialEnvRotation);
    setSelectedPart(null);
    setActiveTexture(null);
    setPartTextures(() => ({}));
  };

  const isLibrarySupported = (partName: string) => {
    if (!partName) return false;
    const name = partName.toUpperCase();
    let disabledParts: string[] = [];
    if (currentModel.id === 'traveler') {
      disabledParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'OBJECT019', 'TONGUE LABEL', 'QUARTER LABEL', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY', 'OUTSOLE'];
    } else if (currentModel.id === 'lace') {
      disabledParts = ['TONGUE', 'OBJECT011', 'MIDSOLE', 'LINE048', 'OBJECT019', 'TONGUE LABEL', 'QUARTER LABEL', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY', 'OUTSOLE'];
    } else {
      disabledParts = ['OBJECT011', 'MIDSOLE', 'LINE048', 'OBJECT019', 'TONGUE LABEL', 'QUARTER LABEL', 'TONGUE REINFORCEMENT', 'HEEL COLLAR REINFORCEMENT', 'EYELET', 'HEEL STRAP', 'QUARTER OVERLAY', 'OUTSOLE'];
    }
    return !disabledParts.includes(name);
  };

  const applyTexture = (texture: TextureItem) => {
    if (!selectedPart || !isLibrarySupported(selectedPart.name)) return;
    setActiveTexture(texture);
    const partKey = \`\${currentModel.id}_\${selectedPart.name}\`;
    
    const devKey = \`\${partKey}_\${texture.id}\`;
    const savedConfig = devConfigs[devKey];
    const defaultScale = savedConfig ? savedConfig.scale : 2.5;
    const defaultOffsetX = savedConfig ? savedConfig.offsetX : 0;
    const defaultOffsetY = savedConfig ? savedConfig.offsetY : 0;

    setPartTextures(prev => {
      const existing = prev[partKey];
      const inheritedColor = existing?.color || '#ffffff';
      if (existing) return { ...prev, [partKey]: { ...existing, url: texture.url, normalUrl: texture.normalUrl, color: inheritedColor, scale: defaultScale, offsetX: defaultOffsetX, offsetY: defaultOffsetY } };
      return { ...prev, [partKey]: { url: texture.url, normalUrl: texture.normalUrl, scale: defaultScale, offsetX: defaultOffsetX, offsetY: defaultOffsetY, rotation: 0, roughness: 1, metalness: 0, opacity: 1, color: inheritedColor } };
    });
  };

  const handleColorPicked = (hex: string) => {
    if (selectedPart) {
      updateTextureConfig('color', hex);
      setIsPickingColor(false);
    }
  };

  const updateTextureConfig = (key: keyof TextureConfig, value: any) => {
    if (!selectedPart) return;
    const partKey = \`\${currentModel.id}_\${selectedPart.name}\`;
    setPartTextures(prev => {
        const config = prev[partKey] || { url: '', normalUrl: '', scale: 2.5, offsetX: 0, offsetY: 0, rotation: 0, roughness: 1, metalness: 0, opacity: 1 };
        return { ...prev, [partKey]: { ...config, [key]: value } };
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
    setIsGeneratingScreenshot(true);
    setTimeout(async () => {
        const dataUrl = await modelViewerRef.current?.captureComposition();
        setScreenshotUrl(dataUrl);
        setIsGeneratingScreenshot(false);
    }, 500);
  };

  const currentTextureConfig = selectedPart ? partTextures[\`\${currentModel.id}_\${selectedPart.name}\`] : null;
  const currentColorHex = (currentTextureConfig?.color || '#ffffff').toUpperCase();

  const mappedTextureMap = useMemo(() => {
    const mapped: Record<string, TextureConfig | null> = {};
    Object.keys(partTextures).forEach(id => {
        const config = partTextures[id];
        if (config) mapped[id] = { ...config, scale: 3 + (config.scale * 1.4) };
        else mapped[id] = null;
    });
    return mapped;
  }, [partTextures]);

  useEffect(() => {
    if (selectedPart) {
      setIsPanelVisible(true);
      const partKey = \`\${currentModel.id}_\${selectedPart.name}\`;
      const currentUrl = partTextures[partKey]?.url;
      if (currentUrl) {
          const match = libraries.materials.find(t => t.url === currentUrl);
          setActiveTexture(match || null);
      } else {
          setActiveTexture(null);
      }
    }
  }, [selectedPart, partTextures, libraries, setActiveTexture]);

  const asideClasses = useMemo(() => {
    const base = "fixed z-[60] bg-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-visible pb-[env(safe-area-inset-bottom)]";
    let mobileState = "bottom-0 left-0 w-full h-[32dvh] md:rounded-none border-t border-gray-200";
    if (selectedPart) mobileState += isPanelVisible ? " translate-y-0" : " translate-y-full";
    else mobileState += " translate-y-full";
    
    let desktopState = "md:top-0 md:bottom-0 md:right-0 md:left-auto md:h-full md:w-[320px] xl:w-[400px] md:border-t-0 md:border-l md:border-gray-200 md:translate-y-0";
    if (selectedPart) desktopState += isPanelVisible ? " md:translate-x-0 md:shadow-[-20px_0_40px_rgba(0,0,0,0.03)]" : " md:translate-x-full";
    else desktopState += " md:translate-x-full";
    
    return \`\${base} \${mobileState} \${desktopState}\`;
  }, [selectedPart, isPanelVisible]);

  const handleDownload = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!screenshotUrl) return;
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          try {
              const res = await fetch(screenshotUrl);
              const blob = await res.blob();
              const file = new File([blob], 'design-render.png', { type: 'image/png' });
              
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                      files: [file],
                      title: 'The Masterpiece',
                      text: 'Captured in Ultra High Definition',
                  });
                  return;
              }
          } catch (error) {
              console.error("Share API error:", error);
          }
      }
      
      const link = document.createElement('a');
      link.href = screenshotUrl;
      link.download = 'design-render.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePartSelect = (part: SelectedPart | null) => {
      setSelectedPart(part);
      if (part && !hasClickedPart) {
          setHasClickedPart(true);
      }
  };

  const handleModelReady = useCallback(() => setIsModelReady(true), [setIsModelReady]);

  const handleUserRotated = useCallback(() => {
      if (!hasRotated) {
          setHasRotated(true);
          setTimeout(() => setShowSelectPrompt(true), 350);
      }
  }, [hasRotated, setHasRotated, setShowSelectPrompt]);

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-[#1a1a1a] overflow-hidden font-sans">
      
      {orientationError && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 animate-pulse">
            {orientationError === 'mobile-portrait' ? <Smartphone size={48} className="text-indigo-600 rotate-90" /> : <Monitor size={48} className="text-indigo-600" />}
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">{orientationError === 'mobile-portrait' ? 'Please Rotate to Portrait' : 'Please Rotate to Landscape'}</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs leading-relaxed">{orientationError === 'mobile-portrait' ? 'This mobile experience is optimized for portrait view.' : 'This tablet experience is optimized for landscape view.'}</p>
        </div>
      )}

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-black text-white rounded-full text-[10px] font-black tracking-[0.3em] uppercase animate-in slide-in-from-top-8 duration-500 shadow-2xl">
          {toast}
        </div>
      )}

      <div className="relative flex-1">
        <nav className="absolute top-0 md:top-8 left-0 md:left-1/2 md:-translate-x-1/2 z-[50] flex w-full md:w-auto items-center justify-between md:justify-center p-2 pt-[max(env(safe-area-inset-top),0.5rem)] md:pt-2 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-[2px] border-b border-gray-200/50">
          {MODELS.map((model, idx) => (
            <button
              key={model.id}
              onClick={() => handleModelSwitch(idx)}
              className={\`px-3 md:px-6 py-3 md:py-2 flex-1 md:flex-none text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-300 relative \${activeModelIndex === idx ? 'font-bold text-gray-900' : 'font-medium text-gray-400 hover:text-gray-600'}\`}
            >
              {model.name}
              {activeModelIndex === idx && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-gray-900"></div>
              )}
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); setAutoRotate(!autoRotate); }}
            className={\`px-3 md:ml-4 p-2 transition-all duration-300 \${autoRotate ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}\`}
            title="Toggle Auto Rotate"
          >
            <RotateCw size={14} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
          </button>
        </nav>

        <main className="fixed inset-0 z-0 bg-[#f8f9fa]">
           <ModelViewer 
             ref={modelViewerRef} 
             url={currentModel.url!} 
             wireframeUrl={currentModel.wireframeUrl}
             modelId={currentModel.id}
             modelScale={isMobileView ? currentModel.scale * 0.5 : currentModel.scale} 
             modelRotation={currentModel.rotation}
             modelPosition={currentModel.position}
             selectedPart={selectedPart} 
             onPartSelect={handlePartSelect}
             onModelReady={handleModelReady}
             onUserRotated={handleUserRotated}
             needsDemoRotation={!hasRotated}
             textureMap={mappedTextureMap} 
             activeTexture={activeTexture}
             envPreset="studio" 
             envIntensity={envIntensity / 10} 
             envRotation={envRotation} 
             dirLightRotation={104}
             shadowBlur={0.25}
             shadowNormalBias={0.4}
             autoRotate={autoRotate}
             isPickingColor={isPickingColor}
             onColorPicked={handleColorPicked}
           />

           {ENABLE_DEV_TOOLS && selectedPart && activeTexture && (
               <div className="hidden xl:block absolute left-6 top-32 w-72 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-5 z-50 animate-in fade-in slide-in-from-left-4">
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[11px] font-black tracking-widest text-gray-900 uppercase flex items-center gap-1.5"><Code size={14}/> Dev UV Tool</h3>
                       <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">DEV MODE</span>
                   </div>

                   <div className="mb-4">
                       <h4 className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Saved Textures ({selectedPart.name})</h4>
                       <div className="flex flex-wrap gap-1.5">
                           {Object.values(devConfigs)
                               .filter((c: any) => c.partKey === \`\${currentModel.id}_\${selectedPart.name}\`)
                               .map((c: any) => (
                                   <span key={c.textureId} className="text-[9px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                                       {c.textureName || c.textureId}
                                   </span>
                               ))}
                           {Object.values(devConfigs).filter((c: any) => c.partKey === \`\${currentModel.id}_\${selectedPart.name}\`).length === 0 && (
                               <span className="text-[9px] text-gray-400 font-medium">No saved textures for this part.</span>
                           )}
                       </div>
                   </div>
                   
                   <div className="space-y-4 mb-5">
                       {activeTexture && (
                           <>
                               <div>
                                   <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                       <span>SCALE (縮放)</span>
                                       <span className="text-gray-900">{partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.scale.toFixed(2) || '2.50'}</span>
                                   </div>
                                   <input type="range" min="0.1" max="10" step="0.05" value={partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.scale || 2.5} onChange={(e) => updateTextureConfig('scale', parseFloat(e.target.value))} className="w-full accent-gray-900 h-[2px] bg-gray-200 rounded-full appearance-none cursor-pointer" />
                               </div>
                               <div>
                                   <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                       <span>OFFSET X (水平偏移)</span>
                                       <span className="text-gray-900">{partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.offsetX.toFixed(2) || '0.00'}</span>
                                   </div>
                                   <input type="range" min="-2" max="2" step="0.01" value={partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.offsetX || 0} onChange={(e) => updateTextureConfig('offsetX', parseFloat(e.target.value))} className="w-full accent-gray-900 h-[2px] bg-gray-200 rounded-full appearance-none cursor-pointer" />
                               </div>
                               <div>
                                   <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                       <span>OFFSET Y (垂直偏移)</span>
                                       <span className="text-gray-900">{partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.offsetY.toFixed(2) || '0.00'}</span>
                                   </div>
                                   <input type="range" min="-2" max="2" step="0.01" value={partTextures[\`\${currentModel.id}_\${selectedPart.name}\`]?.offsetY || 0} onChange={(e) => updateTextureConfig('offsetY', parseFloat(e.target.value))} className="w-full accent-gray-900 h-[2px] bg-gray-200 rounded-full appearance-none cursor-pointer" />
                               </div>
                           </>
                       )}
                   </div>
                   <div className="space-y-2">
                       <button 
                           onClick={(e) => {
                               e.stopPropagation();
                               const partKey = \`\${currentModel.id}_\${selectedPart.name}\`;
                               const devKey = \`\${partKey}_\${activeTexture.id}\`;
                               const conf = partTextures[partKey];
                               if(conf) {
                                   setDevConfigs(prev => ({
                                       ...prev, 
                                       [devKey]: {
                                           partKey: partKey,
                                           textureId: activeTexture.id,
                                           textureName: activeTexture.name,
                                           colorUrl: activeTexture?.url || '',
                                           normalUrl: activeTexture?.normalUrl || '',
                                           scale: conf.scale,
                                           offsetX: conf.offsetX,
                                           offsetY: conf.offsetY,
                                           originalRoughness: conf.originalRoughness
                                       }
                                   }));
                                   setToast("Saved to LocalStorage!");
                                   setTimeout(() => setToast(null), 2000);
                               }
                           }}
                           className="w-full bg-gray-100 text-gray-800 border border-gray-200 font-bold text-[11px] py-2.5 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5 transition-colors pointer-events-auto shadow-sm"
                       >
                           <Save size={14} /> 暫存此貼圖設定
                       </button>
                       
                       <button 
                           onClick={(e) => {
                               e.stopPropagation();
                               const partKey = \`\${currentModel.id}_\${selectedPart.name}\`;
                               const configArray = Object.values(devConfigs).filter((c: any) => c.partKey === partKey);
                               if(configArray.length === 0) {
                                   setToast("此部位沒有暫存任何資料");
                                   setTimeout(() => setToast(null), 2000);
                                   return;
                               }
                               const jsonStr = JSON.stringify(configArray, null, 2);
                               navigator.clipboard.writeText(jsonStr);
                               setToast(\`已複製 \${selectedPart.name} 的參數 !\`);
                               setTimeout(() => setToast(null), 2000);
                           }}
                           className="w-full bg-gray-900 text-white font-bold text-[11px] py-2.5 rounded-lg hover:bg-black flex items-center justify-center gap-1.5 transition-colors shadow-md pointer-events-auto"
                       >
                           <Copy size={14} /> 匯出此部位所有暫存 (JSON)
                       </button>
                       <button 
                           onClick={(e) => {
                               e.stopPropagation();
                               clearDevConfigs();
                               setToast("已清空所有暫存");
                               setTimeout(() => setToast(null), 2000);
                           }}
                           className="w-full bg-red-50/50 text-red-500 font-bold text-[11px] py-2 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors mt-2 pointer-events-auto"
                       >
                           <Trash2 size={13} /> 清空所有暫存
                       </button>
                   </div>
               </div>
           )}

           {isModelReady && !showSelectPrompt && (
             <div className={\`absolute inset-0 pointer-events-none transition-opacity duration-[350ms] \${hasRotated ? 'opacity-0' : 'opacity-100'} z-[60]\`}>
                <div className="absolute left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 animate-swipe-in-left">
                  <svg viewBox="0 0 100 100" fill="none" className="w-20 h-20 md:w-32 md:h-32 text-indigo-500 opacity-60 drop-shadow-sm">
                    <path d="M 15 55 C 15 25, 45 15, 85 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 65 10 L 85 25 L 70 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                
                <div className="absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 animate-swipe-in-right">
                  <svg viewBox="0 0 100 100" fill="none" className="w-20 h-20 md:w-32 md:h-32 text-indigo-500 opacity-60 drop-shadow-sm">
                    <path d="M 85 45 C 85 75, 55 85, 15 75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 35 90 L 15 75 L 30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                
                <div className="absolute inset-0 flex items-end justify-center pb-[max(6rem,18dvh)]">
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 opacity-0 pointer-events-none" aria-hidden="true" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 drop-shadow-sm">
                        {isMobileView ? 'Swipe to rotate' : 'Drag to rotate'}
                      </span>
                   </div>
                </div>
             </div>
           )}

           {isModelReady && showSelectPrompt && !hasClickedPart && !selectedPart && (
             <div className="absolute inset-0 flex items-end justify-center pb-[max(6rem,18dvh)] pointer-events-none animate-in fade-in duration-[350ms]">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border border-white animate-bounce">
                    <MousePointer2 size={28} className="text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 drop-shadow-sm">Select Part to customize</span>
               </div>
             </div>
           )}
        </main>

        <aside className={asideClasses} onClick={(e) => e.stopPropagation()}>
            {selectedPart && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsPanelVisible(!isPanelVisible); }}
                className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-10 z-50 items-center justify-center w-10 h-24 bg-white border border-gray-200 border-r-0 shadow-[-4px_0_12px_rgba(0,0,0,0.05)] rounded-l-[2px] transition-all duration-500 hover:bg-gray-50 text-gray-400 hover:text-indigo-600"
              >
                {isPanelVisible ? <ChevronRight size={20} strokeWidth={3} /> : <ChevronLeft size={20} strokeWidth={3} />}
              </button>
            )}

            {selectedPart && (
              <div className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-2">
                 <button 
                  onClick={(e) => { e.stopPropagation(); setIsPanelVisible(!isPanelVisible); }}
                  className="w-20 h-10 bg-white border-t border-x border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-[2px] flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all duration-500"
                >
                   {isPanelVisible ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronUp size={20} strokeWidth={3} />}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col h-full">
                <div className="px-6 pb-10 pt-8 md:px-7 md:pt-12 md:pb-10 flex-1 space-y-10 md:space-y-12">
                    {selectedPart ? (
                        <div key={selectedPart.id} className="space-y-10 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-10 duration-700">
                            
                            {isLibrarySupported(selectedPart.name) && (
                              <section>
                                  <div className="flex justify-between items-center mb-5 px-1">
                                      <div className="flex flex-col gap-1.5">
                                          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 leading-none">Library</h3>
                                          <div className="w-8 h-[2px] bg-indigo-600 rounded-full"></div>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-[2px] border border-gray-200 bg-white rounded-[2px] overflow-hidden">
                                      {libraries.materials.map(t => (
                                          <button key={t.id} onClick={(e) => { e.stopPropagation(); applyTexture(t); }} className={\`aspect-square overflow-hidden transition-all relative group bg-white \${currentTextureConfig?.url === t.url ? 'ring-[3px] ring-inset ring-indigo-600 z-10' : 'hover:opacity-90'}\`}>
                                              <img src={t.url} className="w-full h-full object-cover transition-transform duration-700" alt={t.name} />
                                          </button>
                                      ))}
                                  </div>
                              </section>
                            )}

                            <section>
                                <div className="flex justify-between items-center mb-6 px-1">
                                    <div className="flex flex-col gap-1.5">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 leading-none">COLOR PALETTE</h3>
                                        <div className="w-8 h-[2px] bg-indigo-600 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <ProColorPicker 
                                      color={currentColorHex} 
                                      onChange={(hex) => updateTextureConfig('color', hex)}
                                      onLiveChange={(hex) => {
                                          window.dispatchEvent(new CustomEvent('preview-part-color', {
                                              detail: { partId: selectedPart.id, color: hex }
                                          }));
                                      }}
                                      isPickingColor={isPickingColor}
                                      onTogglePick={() => setIsPickingColor(!isPickingColor)}
                                    />
                                </div>
                            </section>

                            <section>
                                 <div className="flex flex-col gap-1.5 mb-5 px-1">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 leading-none">Atmosphere</h3>
                                    <div className="w-8 h-[2px] bg-indigo-600 rounded-full"></div>
                                </div>
                                <div className="space-y-10 px-1">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            <span>INTENSITY</span>
                                            <span className="text-indigo-600">{envIntensity.toFixed(1)}</span>
                                        </div>
                                        <input type="range" min="0" max="5" step="0.1" value={envIntensity} onChange={(e) => { e.stopPropagation(); setEnvIntensity(parseFloat(e.target.value)); }} className="w-full accent-indigo-600 h-[2px] bg-gray-200/80 rounded-full appearance-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            <span>LIGHT ROTATION</span>
                                            <span className="text-indigo-600">{Math.round(envRotation)}°</span>
                                        </div>
                                        <input type="range" min="0" max="360" step="1" value={envRotation} onChange={(e) => { e.stopPropagation(); setEnvRotation(parseFloat(e.target.value)); }} className="w-full accent-indigo-600 h-[2px] bg-gray-200/80 rounded-full appearance-none cursor-pointer" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : null}
                </div>

                <div className="border-t border-gray-200 shrink-0 mt-auto bg-black">
                    <button onClick={handleShare} className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-gray-900 active:scale-[0.98]">
                        <Share2 size={16} /> <span>Share Design</span>
                    </button>
                </div>
            </div>
          </aside>
      </div>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        isGeneratingScreenshot={isGeneratingScreenshot} 
        screenshotUrl={screenshotUrl} 
        onDownload={handleDownload} 
      />
    </div>
  );
};

export default App;
`;

fs.writeFileSync('App.tsx', appContent);
console.log('App.tsx updated successfully');
