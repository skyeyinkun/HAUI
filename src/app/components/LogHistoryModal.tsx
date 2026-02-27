import { X, Trash2, Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import LogCardAddon from './LogCardAddon';
import { Log } from '@/types/dashboard';

interface LogHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: Log[];
  onClear: () => void;
}

export default function LogHistoryModal({ isOpen, onClose, logs, onClear }: LogHistoryModalProps) {
  if (!isOpen) return null;

  const handleExport = () => {
    // Export disabled
  };

  // Original Header Content (Title + basic actions) - passed to Addon to preserve layout
  const headerContent = (
    <div className="flex items-center gap-4">
      <h2 className="text-xl font-semibold font-['SF_Pro_Display',sans-serif]">实时日志历史</h2>
      <div className="flex items-center gap-1">
        {/* Export removed */}
        <button 
          onClick={onClear}
          className="p-2 hover:bg-red-500/10 rounded-full transition-colors text-muted-foreground hover:text-red-500"
          title="清空日志"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-card w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <LogCardAddon 
           logs={logs}
           onExport={handleExport}
           onClose={onClose}
           originalHeader={headerContent}
        />
      </div>
    </div>
  );
}
