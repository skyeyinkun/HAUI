import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { RemoteButtonConfig } from '@/types/remote';
import * as Icons from 'lucide-react';
import { LucideIcon, X } from 'lucide-react';

interface RemoteButtonProps {
  button: RemoteButtonConfig;
  index: number;
  moveButton: (dragIndex: number, hoverIndex: number) => void;
  onClick: (btn: RemoteButtonConfig) => void;
  onEdit: (btn: RemoteButtonConfig) => void;
  onDelete?: () => void;
  isEditing: boolean;
}

export default function RemoteButton({ button, index, moveButton, onClick, onEdit, onDelete, isEditing }: RemoteButtonProps) {
  const ref = useRef<HTMLDivElement | HTMLButtonElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'REMOTE_BUTTON',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isEditing,
  });

  const [, drop] = useDrop({
    accept: 'REMOTE_BUTTON',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveButton(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  if (isEditing) {
    drag(drop(ref));
  }

  // Dynamic Icon
  const IconComponent = (Icons[button.icon as keyof typeof Icons] as LucideIcon) || Icons.Circle;
  const colorClass = 'text-current';

  const baseClass = [
    'relative flex items-center justify-center gap-1',
    'select-none touch-none',
    'transition-all duration-200 ease-out',
    'h-12 w-12 rounded-[14px]',
    isDragging ? 'opacity-0' : 'opacity-100',
  ].join(' ');

  const normalClass = [
    'bg-accent/50 text-foreground shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06),0_2px_4px_-1px_rgba(0,0,0,0.03)]',
    'hover:bg-accent/70 hover:brightness-[1.1]',
    'active:scale-[0.95] active:ring-2 active:ring-green-500',
    'cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' ');

  const editingClass = [
    'bg-accent/40 border-2 border-dashed border-muted-foreground/20',
    'cursor-move hover:bg-accent/60',
    'ring-1 ring-primary/20',
    'focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background',
  ].join(' ');

  if (isEditing) {
    return (
      <div
        ref={ref}
        onClick={() => onEdit(button)}
        className={[baseClass, editingClass].join(' ')}
      >
        <IconComponent className={`w-6 h-6 ${colorClass}`} />
        <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center px-1 tracking-tight">
          {button.label}
        </span>

        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-destructive/90"
            type="button"
            aria-label="删除按钮"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      ref={ref as unknown as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => onClick(button)}
      aria-label={button.label || '按钮'}
      title={button.label || '按钮'}
      className={[baseClass, normalClass].join(' ')}
    >
      <IconComponent className={`w-6 h-6 ${colorClass}`} />
      <span className="sr-only">
        {button.label}
      </span>
    </button>
  );
}
