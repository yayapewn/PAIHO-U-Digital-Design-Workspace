const fs = require('fs');
let code = fs.readFileSync('components/ModelViewer.tsx', 'utf-8');

const target = `          {activeTexture && (
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
          )}`;

code = code.replace(target, "");
fs.writeFileSync('components/ModelViewer.tsx', code);
console.log("Removed old text from ModelViewer.tsx");
