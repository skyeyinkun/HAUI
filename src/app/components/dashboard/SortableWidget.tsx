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
  className?: string; // e.g. h-[400px] or h-[200px]
}

export function SortableWidget({ widget, isEditing, onRemove, children, className = '' }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-70 scale-105 shadow-2xl' : ''} ${className} 
      ${isEditing && !isDragging ? 'animate-wiggle' : ''}`}
    >
      {isEditing && (
        <div 
           className="absolute -top-2 -left-2 z-[60] bg-destructive text-destructive-foreground rounded-full p-1 cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-transform"
           onClick={() => onRemove(widget.id)}
           onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking remove
        >
          <X className="w-4 h-4" />
        </div>
      )}

      {/* When editing, the whole card is the drag handle */}
      {isEditing && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute inset-0 z-40 rounded-[16px] border-2 border-primary/30 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-primary/60 transition-colors"
        >
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/20 backdrop-blur-sm p-1.5 rounded-full text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <GripHorizontal className="w-5 h-5 pointer-events-none" />
           </div>
        </div>
      )}

      {/* The Actual Widget Component */}
      <div className="h-full w-full pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
