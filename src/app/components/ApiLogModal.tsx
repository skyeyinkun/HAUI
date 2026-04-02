import { X, Terminal, Activity } from 'lucide-react';

interface ApiLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
}

export default function ApiLogModal({ isOpen, onClose, logs }: ApiLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] rounded-[24px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252526]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200 font-mono">Home Assistant API Stream</h2>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">Live</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar bg-[#1e1e1e]">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 min-h-[300px]">
              <Activity className="w-8 h-8 opacity-20" />
              <p>Waiting for events...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors border-l-2 border-transparent hover:border-blue-500/50">
                <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
                <span className="text-blue-400 shrink-0 font-bold">{log.type}</span>
                <span className="text-gray-300 break-all whitespace-pre-wrap">
                  {JSON.stringify(log.data, null, 2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
