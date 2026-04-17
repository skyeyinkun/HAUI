import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Log } from '@/types/dashboard';

interface LogsWidgetProps {
  logs: Log[];
  setLogModalOpen: (open: boolean) => void;
  clearLogs: () => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
}

export function LogsWidget({ logs, setLogModalOpen, clearLogs, logContainerRef }: LogsWidgetProps) {
  return (
    <div className="bg-card rounded-[16px] shadow-[0px_0px_16px_0px_rgba(0,0,0,0.06)] p-3 flex flex-col gap-2 transition-colors duration-300 relative group aspect-auto h-full overflow-hidden box-border">
      {/* 头部：标题 */}
      <div className="flex items-center justify-between shrink-0 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-accent/40 rounded-[10px] p-0.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-white"
              style={{ backgroundImage: 'linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)' }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">实时日志</span>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLogModalOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground"
            title="查看全部日志"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearLogs}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-full"
            title="清空日志"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50"
      >
        <div className="flex flex-col gap-1.5 mt-1">
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-muted-foreground/60 whitespace-nowrap font-mono">{log.time}</span>
              <span className="text-[12px] text-foreground truncate" title={log.message}>{log.message}</span>
            </div>
          )) : (
            <span className="text-[12px] text-muted-foreground/40 text-center mt-2 block">暂无日志</span>
          )}
        </div>
      </div>
    </div>
  );
}
