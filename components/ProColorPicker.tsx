import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Pipette } from 'lucide-react';

// --- Color Conversion Helpers ---
const hsvToRgb = (h: number, s: number, v: number) => {
  s /= 100; v /= 100;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const rgbToXyz = (r: number, g: number, b: number) => {
  let [R, G, B] = [r / 255, g / 255, b / 255].map(v => v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
  R *= 100; G *= 100; B *= 100;
  return [R * 0.4124 + G * 0.3576 + B * 0.1805, R * 0.2126 + G * 0.7152 + B * 0.0722, R * 0.0193 + G * 0.1192 + B * 0.9505];
};

const xyzToLab = (x: number, y: number, z: number) => {
  let [X, Y, Z] = [x / 95.047, y / 100.0, z / 108.883].map(v => v > 0.008856 ? Math.pow(v, 1/3) : (7.787 * v) + (16 / 116));
  return [(116 * Y) - 16, 500 * (X - Y), 200 * (Y - Z)];
};

const rgbToLab = (r: number, g: number, b: number) => {
  const [x, y, z] = rgbToXyz(r, g, b);
  const [L, A, B] = xyzToLab(x, y, z);
  return { l: Math.round(L), a: Math.round(A), b: Math.round(B) };
};

const labToXyz = (l: number, a: number, b: number) => {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  [x, y, z] = [x, y, z].map(v => Math.pow(v, 3) > 0.008856 ? Math.pow(v, 3) : (v - 16 / 116) / 7.787);
  return [x * 95.047, y * 100.0, z * 108.883];
};

const xyzToRgb = (x: number, y: number, z: number) => {
  let [X, Y, Z] = [x / 100, y / 100, z / 100];
  let r = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  let g = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  let b = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  [r, g, b] = [r, g, b].map(v => v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v);
  return { 
    r: Math.max(0, Math.min(255, Math.round(r * 255))), 
    g: Math.max(0, Math.min(255, Math.round(g * 255))), 
    b: Math.max(0, Math.min(255, Math.round(b * 255))) 
  };
};

const labToRgb = (l: number, a: number, b: number) => {
  const [x, y, z] = labToXyz(l, a, b);
  return xyzToRgb(x, y, z);
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const ProColorPicker: React.FC<{ color: string, onChange: (hex: string) => void, onLiveChange?: (hex: string) => void, isPickingColor: boolean, onTogglePick: () => void }> = ({ color, onChange, onLiveChange, isPickingColor, onTogglePick }) => {
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(color).r, hexToRgb(color).g, hexToRgb(color).b));
  
  type ColorMode = 'HEX' | 'RGB' | 'HSL' | 'LAB';
  const [colorMode, setColorMode] = useState<ColorMode>('HEX');
  const [inputText, setInputText] = useState(color);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    if (isModeDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModeDropdownOpen]);

  const formatColorString = (hexString: string, mode: ColorMode) => {
    const rgb = hexToRgb(hexString);
    if (mode === 'HEX') return hexString.toUpperCase();
    if (mode === 'RGB') return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    if (mode === 'HSL') {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
    }
    if (mode === 'LAB') {
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
      return `${lab.l}, ${lab.a}, ${lab.b}`;
    }
    return hexString;
  };

  const colorRef = useRef(color);
  const hsvRef = useRef(hsv);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setInputText(formatColorString(colorRef.current, colorMode));
  }, [colorMode]);

  useEffect(() => {
    if (colorRef.current !== color) {
       colorRef.current = color;
       setInputText(formatColorString(color, colorMode));
       const newRgb = hexToRgb(color);
       const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
       setHsv(newHsv);
       hsvRef.current = newHsv;
    }
  }, [color]);

  const updateHsv = (updates: Partial<{h:number, s:number, v:number}>, isCommit = false) => {
    const nextHsv = { ...hsvRef.current, ...updates };
    setHsv(nextHsv);
    hsvRef.current = nextHsv;
    
    const newRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    
    setInputText(formatColorString(newHex, colorMode));
    
    if (newHex !== colorRef.current) {
        colorRef.current = newHex;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        if (isCommit) {
            onChange(newHex);
        } else if (onLiveChange) {
            rafRef.current = requestAnimationFrame(() => {
                onLiveChange(newHex);
            });
        }
    } else if (isCommit) {
        onChange(newHex);
    }
  };

  const hsRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);

  const handlePointerDownHS = (e: React.PointerEvent) => {
    if (!hsRef.current) return;
    const rect = hsRef.current.getBoundingClientRect();
    const update = (clientX: number, clientY: number, isCommit = false) => {
      const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
      const s = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
      updateHsv({ h, s }, isCommit);
    };
    update(e.clientX, e.clientY);
    const onMove = (m: PointerEvent) => update(m.clientX, m.clientY);
    const onUp = (m: PointerEvent) => { 
        update(m.clientX, m.clientY, true);
        window.removeEventListener('pointermove', onMove); 
        window.removeEventListener('pointerup', onUp); 
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handlePointerDownV = (e: React.PointerEvent) => {
    if (!vRef.current) return;
    const rect = vRef.current.getBoundingClientRect();
    const update = (clientY: number, isCommit = false) => {
      const v = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
      updateHsv({ v }, isCommit);
    };
    update(e.clientY);
    const onMove = (m: PointerEvent) => update(m.clientY);
    const onUp = (m: PointerEvent) => { 
        update(m.clientY, true);
        window.removeEventListener('pointermove', onMove); 
        window.removeEventListener('pointerup', onUp); 
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex gap-1 items-stretch bg-gray-100 border border-gray-200 rounded-[2px] overflow-hidden">
        <div 
          ref={hsRef}
          className="relative flex-1 aspect-[3/2] cursor-crosshair overflow-hidden touch-none"
          style={{ 
            background: `
              linear-gradient(to bottom, transparent, #fff),
              linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)
            ` 
          }}
          onPointerDown={handlePointerDownHS}
        >
          <div 
            className="absolute w-5 h-5 border-2 border-white rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${(hsv.h / 360) * 100}%`, top: `${100 - hsv.s}%` }}
          ></div>
        </div>

        <div 
          ref={vRef}
          className="relative w-8 cursor-pointer touch-none border-l border-gray-200"
          style={{ 
              background: `linear-gradient(to bottom, ${rgbToHex(hsvToRgb(hsv.h, hsv.s, 100).r, hsvToRgb(hsv.h, hsv.s, 100).g, hsvToRgb(hsv.h, hsv.s, 100).b)}, #000)` 
          }}
          onPointerDown={handlePointerDownV}
        >
          <div 
            className="absolute left-0 w-full h-2 bg-white border-y border-gray-400 shadow-sm -translate-y-1/2 pointer-events-none"
            style={{ top: `${100 - hsv.v}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_0.8fr] gap-3 items-end">
          <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1 mb-1.5">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">COLOR CODE</span>
                  <div className="relative flex items-center" ref={dropdownRef}>
                      <button 
                          onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                          className="flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-bold text-gray-500 bg-transparent outline-none cursor-pointer hover:text-indigo-600 hover:bg-gray-100 rounded-[2px] transition-all"
                      >
                          <span className="leading-none pt-[1px]">{colorMode}</span>
                          <ChevronDown size={10} strokeWidth={3} className={`transition-transform duration-300 ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isModeDropdownOpen && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-gray-200 shadow-lg rounded-[2px] overflow-hidden z-[100] min-w-[72px] animate-in fade-in zoom-in-95 duration-200">
                              {(['HEX', 'RGB', 'HSL', 'LAB'] as ColorMode[]).map((mode) => (
                                  <button
                                      key={mode}
                                      onClick={() => {
                                          setColorMode(mode);
                                          setIsModeDropdownOpen(false);
                                      }}
                                      className={`w-full text-center px-3 py-2 text-[9px] font-bold tracking-widest transition-colors ${
                                          colorMode === mode 
                                              ? 'bg-indigo-50 text-indigo-600' 
                                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                      }`}
                                  >
                                      {mode}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 border border-gray-200 focus-within:border-indigo-600 transition-all flex items-center h-[52px] rounded-[2px]">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputText(val);
                        
                        let hexValue = '';
                        try {
                          if (colorMode === 'HEX') {
                            if (/^#[0-9A-Fa-f]{6}$/i.test(val)) hexValue = val.toUpperCase();
                          } else if (colorMode === 'RGB') {
                            const match = val.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
                            if (match) {
                               const r = Math.min(255, Math.max(0, parseInt(match[1])));
                               const g = Math.min(255, Math.max(0, parseInt(match[2])));
                               const b = Math.min(255, Math.max(0, parseInt(match[3])));
                               hexValue = rgbToHex(r, g, b);
                            }
                          } else if (colorMode === 'HSL') {
                            const match = val.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*$/);
                            if (match) {
                               const h = Math.min(360, Math.max(0, parseInt(match[1])));
                               const s = Math.min(100, Math.max(0, parseInt(match[2])));
                               const l = Math.min(100, Math.max(0, parseInt(match[3])));
                               const rgb = hslToRgb(h, s, l);
                               hexValue = rgbToHex(rgb.r, rgb.g, rgb.b);
                            }
                          } else if (colorMode === 'LAB') {
                            const match = val.match(/^\s*(\d{1,3})\s*,\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})\s*$/);
                            if (match) {
                               const l = Math.min(100, Math.max(0, parseInt(match[1])));
                               const a = Math.min(127, Math.max(-128, parseInt(match[2])));
                               const b = Math.min(127, Math.max(-128, parseInt(match[3])));
                               const rgb = labToRgb(l, a, b);
                               hexValue = rgbToHex(rgb.r, rgb.g, rgb.b);
                            }
                          }
                        } catch(err) {}

                        if (hexValue) {
                            if (onLiveChange) onLiveChange(hexValue);
                            onChange(hexValue);
                        }
                    }}
                    className="bg-transparent border-none outline-none w-full text-[13px] font-black uppercase tracking-tight text-gray-700" 
                  />
              </div>
          </div>
          <button 
            onClick={onTogglePick}
            className={`h-[52px] w-[52px] flex items-center justify-center transition-colors border rounded-[2px] ${isPickingColor ? 'bg-indigo-50 text-indigo-600 border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-indigo-600'}`}
            title="Pick color from 3D model"
          >
            <Pipette size={20} />
          </button>
          <div className="w-full h-[52px] bg-gray-50 overflow-hidden border border-gray-200 shadow-inner rounded-[2px]" style={{ backgroundColor: color }}></div>
      </div>
    </div>
  );
};
