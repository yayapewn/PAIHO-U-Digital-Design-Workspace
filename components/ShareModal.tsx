import React from 'react';
import { X, Download } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGeneratingScreenshot: boolean;
  screenshotUrl: string | null;
  onDownload: (e: React.MouseEvent) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  isGeneratingScreenshot,
  screenshotUrl,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-md p-4 animate-in fade-in duration-500" onClick={(e) => e.stopPropagation()}>
      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">The Masterpiece</h2>
            <p className="text-[10px] text-indigo-500 font-black tracking-[0.5em] uppercase mt-2">Captured in Ultra High Definition</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-gray-100 rounded-full transition-all text-gray-400 active:scale-90"><X size={28}/></button>
        </div>
        <div className="space-y-10">
          {isGeneratingScreenshot ? (
            <div className="aspect-video bg-gray-50 rounded-[40px] flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-[12px] font-black tracking-[0.4em] uppercase text-gray-400">Synthesizing Pixels...</p>
            </div>
          ) : (
            <>
              {screenshotUrl && (
                <div className="rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] border-[12px] border-white bg-white">
                  <img src={screenshotUrl} className="w-full h-auto" alt="Final Design" />
                </div>
              )}
              <div className="flex justify-center">
                <button onClick={onDownload} className="flex items-center gap-4 bg-transparent text-black border border-black px-12 py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-black hover:text-white active:scale-95 shadow-xl">
                  <Download size={20} /> Download UHD Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
