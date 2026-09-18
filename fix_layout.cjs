const fs = require('fs');

// 1. Update ModelViewer.tsx
let viewerCode = fs.readFileSync('components/ModelViewer.tsx', 'utf-8');

const viewerTarget = `            top-[85px] lg:top-32
        \`}>
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.05)] whitespace-nowrap">
            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] uppercase text-gray-900 leading-none">
              EDITING <span className="text-indigo-600 ml-1">{selectedPart.name.toUpperCase() === 'OBJECT019' ? 'INSOLE' : selectedPart.name.toUpperCase() === 'OBJECT011' ? 'AGLET' : selectedPart.name}</span>
            </span>
          </div>

          {activeTexture && (
            <div className="flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-700 delay-150 w-full">
                <h2 className="text-[15px] lg:text-[18px] font-black tracking-tighter text-gray-900 uppercase">
                    {activeTexture.title || activeTexture.name}
                </h2>
                <div className="flex items-center justify-center text-[11px] lg:text-[13px] text-gray-500 font-medium w-full">
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {activeTexture.description}
                    </span>
                    <a 
                       href={activeTexture.link || "https://www.paiho.com/tw/material-hub/b873383c1623dcffafd786ce755b2786"} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="ml-1 shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors pointer-events-auto inline-flex items-center"
                      title="Read more"
                    >
                        <ArrowUpRight size={14} strokeWidth={3} />
                    </a>
                </div>
            </div>
          )}
        </div>`;

const viewerReplacement = `            top-[85px] md:top-[96px] lg:top-28
        \`}>
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.05)] whitespace-nowrap">
            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] uppercase text-gray-900 leading-none">
              EDITING <span className="text-indigo-600 ml-1">{selectedPart.name.toUpperCase() === 'OBJECT019' ? 'INSOLE' : selectedPart.name.toUpperCase() === 'OBJECT011' ? 'AGLET' : selectedPart.name}</span>
            </span>
          </div>
        </div>`;

viewerCode = viewerCode.replace(viewerTarget, viewerReplacement);
fs.writeFileSync('components/ModelViewer.tsx', viewerCode);
console.log("ModelViewer.tsx updated");

// 2. Update App.tsx
let appCode = fs.readFileSync('App.tsx', 'utf-8');

appCode = appCode.replace(
  "Share2 } from 'lucide-react';",
  "Share2, ArrowUpRight } from 'lucide-react';"
);

const appTarget = `                                  <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-[2px] border border-gray-200 bg-white rounded-[2px] overflow-hidden">
                                      {libraries.materials.map(t => (
                                          <button key={t.id} onClick={(e) => { e.stopPropagation(); applyTexture(t); }} className={\`aspect-square overflow-hidden transition-all relative group bg-white \${currentTextureConfig?.url === t.url ? 'ring-[3px] ring-inset ring-indigo-600 z-10' : 'hover:opacity-90'}\`}>
                                              <img src={t.url} className="w-full h-full object-cover transition-transform duration-700" alt={t.name} />
                                          </button>
                                      ))}
                                  </div>
                              </section>`;

const appReplacement = `                                  <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-[2px] border border-gray-200 bg-white rounded-[2px] overflow-hidden">
                                      {libraries.materials.map(t => (
                                          <button key={t.id} onClick={(e) => { e.stopPropagation(); applyTexture(t); }} className={\`aspect-square overflow-hidden transition-all relative group bg-white \${currentTextureConfig?.url === t.url ? 'ring-[3px] ring-inset ring-indigo-600 z-10' : 'hover:opacity-90'}\`}>
                                              <img src={t.url} className="w-full h-full object-cover transition-transform duration-700" alt={t.name} />
                                          </button>
                                      ))}
                                  </div>
                                  
                                  {activeTexture && (
                                      <div className="mt-5 px-1 animate-in fade-in slide-in-from-top-2 duration-500 delay-100 fill-mode-both">
                                          <h4 className="text-[13px] font-black uppercase tracking-widest text-gray-900 mb-1.5">
                                              {activeTexture.title || activeTexture.name}
                                          </h4>
                                          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                                              {activeTexture.description}
                                          </p>
                                          <a
                                              href={activeTexture.link || "https://www.paiho.com/tw/material-hub/b873383c1623dcffafd786ce755b2786"}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
                                          >
                                              EXPLORE MATERIAL <ArrowUpRight size={13} strokeWidth={2.5} />
                                          </a>
                                      </div>
                                  )}
                              </section>`;

appCode = appCode.replace(appTarget, appReplacement);
fs.writeFileSync('App.tsx', appCode);
console.log("App.tsx updated");

