import { WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export type SensorTimestampVariant = 'full' | 'compact';

export function SensorTimestamp({
  lastChanged,
  available,
  nowMs,
  variant = 'full',
  className
}: {
  lastChanged?: string;
  available?: boolean;
  nowMs: number;
  variant?: SensorTimestampVariant;
  className?: string;
}) {
  const lastMs = lastChanged ? new Date(lastChanged).getTime() : null;
  const diffSeconds = lastMs ? (nowMs - lastMs) / 1000 : Number.POSITIVE_INFINITY;
  const isFresh = diffSeconds < 30;
  const isOffline = available === false;
  const isStale = !isOffline && diffSeconds >= 300;

  const dotColorClass = isOffline || isStale ? 'bg-gray-400' : 'bg-green-500';
  const textColorClass = isOffline || isStale ? 'text-gray-400' : 'text-muted-foreground';

  const formattedFull = lastChanged ? format(new Date(lastChanged), 'yyyy-MM-dd HH:mm:ss') : '';
  const formattedTimeOnly = lastChanged ? format(new Date(lastChanged), 'HH:mm:ss') : '';

  const label = (() => {
    if (variant === 'full') {
      return lastChanged ? `最后更新：${formattedFull}` : '最后更新：--';
    }
    if (isOffline) return '离线';
    return lastChanged ? `更新于 ${formattedTimeOnly}` : '--';
  })();

  return (
    <div className={className ? className : ''}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2 items-center justify-center">
          {isFresh && !isOffline && (
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"
              animate={{ scale: [1, 2], opacity: [0.75, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColorClass}`} />
        </div>

        {isOffline && (
          <WifiOff size={10} className="text-gray-400" />
        )}

        <span className={`text-[10px] font-medium tabular-nums tracking-tight ${textColorClass}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
