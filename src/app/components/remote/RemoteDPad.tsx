import React from 'react';
import { RemoteButtonConfig } from '@/types/remote';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface RemoteDPadProps {
  buttons: RemoteButtonConfig[];
  onClick: (btn: RemoteButtonConfig) => void;
  isEditing: boolean;
}

export default function RemoteDPad({ buttons, onClick, isEditing }: RemoteDPadProps) {
  // Find mapped buttons or use defaults
  const getBtn = (id: string) => buttons.find(b => b.id === id);

  const btnUp = getBtn('up');
  const btnDown = getBtn('down');
  const btnLeft = getBtn('left');
  const btnRight = getBtn('right');
  const btnOk = getBtn('ok');

  // Helper to handle click safely
  const handleClick = (btn?: RemoteButtonConfig) => {
    if (btn) onClick(btn);
  };

  // Reduced size by ~25% as requested
  // Original: clamp(176px, 30vmin, 208px)
  // New: clamp(132px, 22vmin, 156px)
  
  return (
    <div
      className="relative mx-auto my-2 shrink-0 select-none touch-none"
      style={{ width: 'clamp(132px, 22vmin, 156px)', height: 'clamp(132px, 22vmin, 156px)' }}
    >
      <div className="absolute inset-0 rounded-full bg-accent/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_24px_-4px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 pointer-events-none" />
      
      {/* Outer Ring (Navigation) */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        
        {/* Up */}
        <button
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 origin-bottom flex justify-center pt-3 transition-all duration-150 ${isEditing ? 'opacity-50' : 'hover:bg-black/5 active:scale-[0.98]'}`}
          style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}
          onClick={() => handleClick(btnUp)}
          title={btnUp?.label || '上'}
        >
           <div className="w-10 h-10 flex items-center justify-center -mt-1">
             <ChevronUp className="w-5 h-5 text-foreground/75" />
           </div>
        </button>

        {/* Right */}
        <button
          className={`absolute top-1/2 right-0 -translate-y-1/2 h-full w-1/2 origin-left flex items-center justify-end pr-3 transition-all duration-150 ${isEditing ? 'opacity-50' : 'hover:bg-black/5 active:scale-[0.98]'}`}
          style={{ clipPath: 'polygon(0 50%, 100% 0, 100% 100%)' }}
          onClick={() => handleClick(btnRight)}
          title={btnRight?.label || '右'}
        >
           <div className="w-10 h-10 flex items-center justify-center -mr-1">
             <ChevronRight className="w-5 h-5 text-foreground/75" />
           </div>
        </button>

        {/* Down */}
        <button
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 origin-top flex justify-center items-end pb-3 transition-all duration-150 ${isEditing ? 'opacity-50' : 'hover:bg-black/5 active:scale-[0.98]'}`}
          style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }}
          onClick={() => handleClick(btnDown)}
          title={btnDown?.label || '下'}
        >
           <div className="w-10 h-10 flex items-center justify-center -mb-1">
             <ChevronDown className="w-5 h-5 text-foreground/75" />
           </div>
        </button>

        {/* Left */}
        <button
          className={`absolute top-1/2 left-0 -translate-y-1/2 h-full w-1/2 origin-right flex items-center justify-start pl-3 transition-all duration-150 ${isEditing ? 'opacity-50' : 'hover:bg-black/5 active:scale-[0.98]'}`}
          style={{ clipPath: 'polygon(100% 50%, 0 100%, 0 0)' }}
          onClick={() => handleClick(btnLeft)}
          title={btnLeft?.label || '左'}
        >
           <div className="w-10 h-10 flex items-center justify-center -ml-1">
             <ChevronLeft className="w-5 h-5 text-foreground/75" />
           </div>
        </button>
      </div>

      {/* Center Button (OK) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button 
            className={`
                w-14 h-14 rounded-full bg-background shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_6px_12px_-2px_rgba(0,0,0,0.06),0_2px_4px_-1px_rgba(0,0,0,0.03)]
                flex items-center justify-center pointer-events-auto
                transition-all duration-150
                border border-border/60
                relative overflow-hidden
                ${isEditing ? 'opacity-50 cursor-default' : 'hover:bg-accent/40 active:scale-[0.97]'}
            `}
            onClick={() => handleClick(btnOk)}
            title={btnOk?.label || '确认'}
          >
              {/* Backlight Glow */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 active:opacity-100 transition-opacity duration-150 blur-md" />
              
              <span className="font-['SF_Pro_Display'] font-semibold text-sm text-foreground/90 tracking-widest z-10">
                  OK
              </span>
          </button>
      </div>
    </div>
  );
}
