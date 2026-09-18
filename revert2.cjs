const fs = require('fs');

let viewerCode = fs.readFileSync('components/ModelViewer.tsx', 'utf-8');
const viewerTarget = `            top-[85px] lg:top-32
        \`}>
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.05)] whitespace-nowrap">
            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] uppercase text-gray-900 leading-none">
              EDITING <span className="text-indigo-600 ml-1">{selectedPart.name.toUpperCase() === 'OBJECT019' ? 'INSOLE' : selectedPart.name.toUpperCase() === 'OBJECT011' ? 'AGLET' : selectedPart.name}</span>
            </span>
          </div>`;

const viewerReplacement = `            top-[85px] lg:top-32
        \`}>
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
          )}`;

viewerCode = viewerCode.replace(viewerTarget, viewerReplacement);
fs.writeFileSync('components/ModelViewer.tsx', viewerCode);

