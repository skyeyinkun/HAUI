import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripHorizontal } from 'lucide-react';
import { DashboardWidget } from '@/hooks/useDashboardLayout';

interface SortableWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  isOverlay?: boolean;
}

export function SortableWidget({ widget, isEditing, onRemove, children, className = '', isOverlay = false }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditing || isOverlay });

  const style = {
    // 使用 Translate 替代 Transform，忽略 scale 分量，防止跨列拖拽时尺寸变形
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 0 : 'auto', // 原始节点降低层级，镜像层级设在 Overlay
    opacity: isDragging ? 0 : 1,     // 拖拽时完全隐藏原始节点，消除虚影效果
    visibility: isDragging ? 'hidden' as const : 'visible' as const, // 确保完全不可见
  };

  const overlayClasses = isOverlay ? 'shadow-2xl z-[9999] cursor-grabbing !scale-100' : '';
  const draggingClasses = isDragging ? 'pointer-events-none' : '';

  return (
    <div
      ref={setNodeRef}
      id={`widget-${widget.id}`}
      style={{
        ...style,
        animationDelay: (isEditing && !isDragging && !isOverlay) ? `${(parseInt(widget.id.slice(-3), 16) % 10) * 0.02}s` : '0s'
      }}
      className={`relative group ${className} ${overlayClasses} ${draggingClasses} 
      ${isEditing && !isDragging && !isOverlay ? 'animate-wiggle' : ''}`}
    >
      {isEditing && !isOverlay && (
        <div 
           className="absolute -top-2 -right-2 z-[60] bg-destructive text-destructive-foreground rounded-full p-1 cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-transform"
           onClick={() => onRemove(widget.id)}
           onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="w-4 h-4" />
        </div>
      )}

      {isEditing && (
        <div 
          {...(!isOverlay ? attributes : {})} 
          {...(!isOverlay ? listeners : {})}
          className={`absolute inset-0 z-40 rounded-[16px] border-2 border-primary/30 flex flex-col items-center justify-center transition-colors
            ${isOverlay ? 'cursor-grabbing border-primary/60 bg-primary/5' : 'cursor-grab hover:border-primary/60'}`}
        >
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/20 backdrop-blur-sm p-1.5 rounded-full text-primary shadow-sm transition-opacity
              ${isOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <GripHorizontal className="w-5 h-5 pointer-events-none" />
           </div>
        </div>
      )}

      <div className={`h-full w-full pointer-events-auto ${isOverlay ? 'select-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}
