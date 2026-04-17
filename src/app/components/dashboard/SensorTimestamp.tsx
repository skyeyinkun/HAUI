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

  // 统一使用绿色 #65cf58 作为活动状态指示色
  const dotColorClass = isOffline || isStale ? 'bg-gray-400' : 'bg-[#65cf58]';
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
        {/* 状态指示点容器 - 增大尺寸避免动画被截断 */}
        <div className="relative flex h-3 w-3 items-center justify-center">
          {/* 呼吸动画光环 - 使用统一的绿色 */}
          {isFresh && !isOffline && (
            <motion.span
              className="absolute inline-flex h-2 w-2 rounded-full bg-status-online"
              animate={{
                scale: [1, 2.5],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 0.5,
              }}
            />
          )}
          {/* 主状态点 - 使用标准绿色，确保完全显示 */}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColorClass}`} />
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
