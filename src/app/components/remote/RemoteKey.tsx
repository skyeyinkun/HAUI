import React from 'react';
import { RemoteButtonConfig } from '@/types/remote';
import * as Icons from 'lucide-react';
import { LucideIcon, X } from 'lucide-react';

type RemoteKeySize = 'sm' | 'md' | 'lg' | 'rect';
type RemoteKeyVariant = 'default' | 'power' | 'soft';

interface RemoteKeyProps {
  button: RemoteButtonConfig;
  onClick: (btn: RemoteButtonConfig) => void;
  onDelete?: (id: string) => void;
  isEditing?: boolean;
  size?: RemoteKeySize;
  variant?: RemoteKeyVariant;
  disabled?: boolean;
  ariaLabel?: string;
  isReserved?: boolean;
}

export default function RemoteKey({ button, onClick, onDelete, isEditing, isReserved, size = 'md', variant = 'default', disabled, ariaLabel }: RemoteKeyProps) {
  const IconComponent = (Icons[button.icon as keyof typeof Icons] as LucideIcon) || Icons.Circle;

  const sizing =
    size === 'sm'
      ? 'h-12 w-12 rounded-[14px]' // Fixed width for small buttons
      : size === 'lg'
        ? 'h-16 w-16 rounded-[18px]'
        : size === 'rect'
          ? 'h-[50px] w-[80px] rounded-[12px]' // Rectangular for volume/channel
          : 'h-14 w-full rounded-[16px]'; // Default full width

  const variantClass =
    variant === 'power'
      ? 'bg-accent/50 text-foreground shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06),0_2px_4px_-1px_rgba(0,0,0,0.03)] hover:bg-accent/70' // Standardized power button
      : variant === 'soft'
        ? 'bg-accent/40 text-foreground shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.02)] hover:bg-accent/60'
        : 'bg-accent/50 text-foreground shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06),0_2px_4px_-1px_rgba(0,0,0,0.03)] hover:bg-accent/70';

  // Always use current text color, ignoring button.color if it's set to a specific color like red/green
  const iconColorClass = 'text-current';

  return (
    <div className="relative group">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || button.label || '按钮'}
        title={ariaLabel || button.label || '按钮'}
        onClick={() => onClick(button)}
        className={[
          'flex items-center justify-center select-none touch-none',
          sizing,
          variantClass,
          'transition-all duration-200 ease-out', // 200ms ease
          disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.95] active:ring-2 active:ring-green-500 hover:brightness-[1.1]',
          isEditing ? 'ring-1 ring-primary/20' : '',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'min-h-[44px] min-w-[44px]' // Minimum touch target 44px
        ].join(' ')}
      >
        {button.icon ? <IconComponent className={['w-6 h-6', iconColorClass].join(' ')} /> : null}
        <span className="sr-only">{button.label}</span>
      </button>
      
      {isEditing && !isReserved && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(button.id);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-destructive/90"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

