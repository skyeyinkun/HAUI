import { Zap } from 'lucide-react';
import { useHomeStatistics } from '@/hooks/useHomeStatistics';

export function EnergyWidget() {
  const { energy } = useHomeStatistics();

  return (
    <div className="bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] p-3 flex flex-row items-center justify-between relative group border-0 h-[100px]">
      <div className="flex flex-col justify-between h-full z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-[8px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)]"
            style={{ backgroundImage: "linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
          >
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="font-['SF_Pro_Display',sans-serif] text-[12px] text-muted-foreground">能源</span>
        </div>
        <div className="flex flex-col mt-1">
          <span className="text-[10px] font-medium text-muted-foreground mb-0.5">今日用电</span>
          <div className="flex items-baseline gap-0.5">
            <span className={`font-['SF_Pro_Display',sans-serif] text-[24px] font-bold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} leading-none tracking-tight drop-shadow-sm`}>
              {energy ? energy.today : "--"}
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">kWh</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between h-full z-10 w-[45%] items-end">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${energy ? 'bg-primary/10 border-primary/20' : 'bg-muted/10 border-border/10'} mb-1`}>
          <div className={`w-1.5 h-1.5 rounded-full ${energy ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
          <span className={`text-[10px] font-medium ${energy ? 'text-foreground' : 'text-muted-foreground'}`}>{energy ? '正常' : '未在线'}</span>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">本月</span>
            <span className={`text-[10px] font-semibold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} tabular-nums`}>
              {energy ? energy.month : "--"}
            </span>
          </div>
          <div className="w-full h-1 bg-accent/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-1000"
              style={{ width: energy ? '65%' : '0%' }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">功率</span>
            <span className={`text-[10px] font-semibold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} tabular-nums`}>
              {energy ? `${energy.power}W` : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
