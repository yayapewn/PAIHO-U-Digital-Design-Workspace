const fs = require('fs');
const file = 'App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add color conversion utils
const utilsToAdd = `
// --- Additional Color Spaces ---
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
/**
`;

content = content.replace("/**", utilsToAdd);

// 2. Add state and logic to ProColorPicker
const componentStart = `const [inputText, setInputText] = useState(color);`;
const stateToAdd = `
  type ColorMode = 'HEX' | 'RGB' | 'HSL' | 'LAB';
  const [colorMode, setColorMode] = useState<ColorMode>('HEX');
  const [inputText, setInputText] = useState(color);

  const formatColorString = (hexString: string, mode: ColorMode) => {
    const rgb = hexToRgb(hexString);
    if (mode === 'HEX') return hexString.toUpperCase();
    if (mode === 'RGB') return \`\${rgb.r}, \${rgb.g}, \${rgb.b}\`;
    if (mode === 'HSL') {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return \`\${hsl.h}, \${hsl.s}%, \${hsl.l}%\`;
    }
    if (mode === 'LAB') {
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
      return \`\${lab.l}, \${lab.a}, \${lab.b}\`;
    }
    return hexString;
  };
`;
content = content.replace(componentStart, stateToAdd);

const setInputTextLines = `       setInputText(color);`;
const newSetInputTextLines = `       setInputText(formatColorString(color, colorMode));`;
content = content.replace(setInputTextLines, newSetInputTextLines);

// Also need to update the input text when colorMode changes
const useEffectCode = `  useEffect(() => {
    if (colorRef.current !== color) {`;
const colorModeEffect = `  useEffect(() => {
    setInputText(formatColorString(colorRef.current, colorMode));
  }, [colorMode]);

  useEffect(() => {
    if (colorRef.current !== color) {`;
content = content.replace(useEffectCode, colorModeEffect);

// And update the setInputText calls inside updateHsv
const updateHsvStart = `    const newRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    
    if (!isCommit) {
        if (onLiveChange) onLiveChange(hex);
        setInputText(hex);
    } else {
        onChange(hex);
        setInputText(hex);
    }`;
const updateHsvReplacement = `    const newRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    
    if (!isCommit) {
        if (onLiveChange) onLiveChange(hex);
        setInputText(formatColorString(hex, colorMode));
    } else {
        onChange(hex);
        setInputText(formatColorString(hex, colorMode));
    }`;
content = content.replace(updateHsvStart, updateHsvReplacement);

// Update the UI
const uiStart = `<span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">HEX CODE</span>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-indigo-100 transition-all flex items-center h-[52px]">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setInputText(val);
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                            if (onLiveChange) onLiveChange(val);
                            onChange(val);
                        }
                    }}
                    className="bg-transparent border-none outline-none w-full text-[13px] font-black uppercase tracking-tight text-gray-700" 
                  />`;

const uiReplacement = `<div className="flex items-center justify-between ml-1 mb-1.5">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">COLOR CODE</span>
                  <select 
                      value={colorMode} 
                      onChange={(e) => setColorMode(e.target.value as ColorMode)}
                      className="text-[9px] font-bold text-gray-500 bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                      <option value="HEX">HEX</option>
                      <option value="RGB">RGB</option>
                      <option value="HSL">HSL</option>
                      <option value="LAB">LAB</option>
                  </select>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-indigo-100 transition-all flex items-center h-[52px]">
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
                            const match = val.match(/^\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*$/);
                            if (match) {
                               const r = Math.min(255, Math.max(0, parseInt(match[1])));
                               const g = Math.min(255, Math.max(0, parseInt(match[2])));
                               const b = Math.min(255, Math.max(0, parseInt(match[3])));
                               hexValue = rgbToHex(r, g, b);
                            }
                          } else if (colorMode === 'HSL') {
                            const match = val.match(/^\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})%?\\s*,\\s*(\\d{1,3})%?\\s*$/);
                            if (match) {
                               const h = Math.min(360, Math.max(0, parseInt(match[1])));
                               const s = Math.min(100, Math.max(0, parseInt(match[2])));
                               const l = Math.min(100, Math.max(0, parseInt(match[3])));
                               const rgb = hslToRgb(h, s, l);
                               hexValue = rgbToHex(rgb.r, rgb.g, rgb.b);
                            }
                          } else if (colorMode === 'LAB') {
                            const match = val.match(/^\\s*(\\d{1,3})\\s*,\\s*(-?\\d{1,3})\\s*,\\s*(-?\\d{1,3})\\s*$/);
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
                  />`;
content = content.replace(uiStart, uiReplacement);

fs.writeFileSync(file, content);
console.log('Done updating App.tsx with LAB/HSL/RGB support');
