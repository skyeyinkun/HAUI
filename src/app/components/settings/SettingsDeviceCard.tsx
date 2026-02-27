import React from 'react';
import { Device } from '@/types/device';
import { CustomIcon } from '@/app/components/dashboard/cards/shared/CustomIcon';
import { Badge } from '@/app/components/ui/badge';
import { WifiOff, Edit2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface SettingsDeviceCardProps {
  device: Device;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  selected?: boolean;
  selectionMode?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  light: '调光',
  switch: '开关',
  ac: '空调',
  curtain: '窗帘',
};

export const SettingsDeviceCard: React.FC<SettingsDeviceCardProps> = ({
  device,
  onClick,
  onEdit,
  selected,
  selectionMode
}) => {
  const isUnavailable = !device.haAvailable;
  const statusColor = isUnavailable 
    ? 'text-destructive' 
    : device.isOn 
      ? 'text-primary' 
      : 'text-muted-foreground';

  return (
    <div 
      data-testid="settings-device-card"
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl border bg-card text-card-foreground transition-all duration-200",
        "hover:shadow-md hover:border-primary/50",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
        isUnavailable && "opacity-70 grayscale"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/50",
        isUnavailable && "bg-destructive/10"
      )}>
        <CustomIcon 
          name={device.icon} 
          className={cn("h-8 w-8", statusColor)} 
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <h3 className="font-medium truncate text-base leading-none cursor-default max-w-[120px] sm:max-w-[160px]">{device.name}</h3>
               </TooltipTrigger>
               <TooltipContent>
                 <p>{device.name}</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-2">
            {device.room && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal text-muted-foreground">
                {device.room}
              </Badge>
            )}
            {device.type && TYPE_LABELS[device.type] && (
               <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
                  {TYPE_LABELS[device.type]}
               </Badge>
            )}
        </div>

        <p className="text-[10px] text-muted-foreground font-mono opacity-80 truncate">
          {device.entity_id}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 self-start mt-1">
         <div className="flex items-center gap-1 text-xs">
            {isUnavailable ? (
                <>
                    <WifiOff className="h-3 w-3 text-destructive" />
                    <span className="text-destructive hidden sm:inline">离线</span>
                </>
            ) : (
                <>
                    <span className={cn("h-2 w-2 rounded-full", device.isOn ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600")} />
                    <span className="text-muted-foreground hidden sm:inline">{device.isOn ? '开启' : '关闭'}</span>
                </>
            )}
         </div>
      </div>

      {!selectionMode && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border"
            onClick={onEdit}
            aria-label="编辑设备"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
      )}
      
      {selectionMode && (
        <div className={cn(
            "absolute top-2 right-2 h-5 w-5 rounded-full border border-primary flex items-center justify-center transition-colors",
            selected ? "bg-primary" : "bg-transparent"
        )}>
            {selected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
        </div>
      )}
    </div>
  );
};
