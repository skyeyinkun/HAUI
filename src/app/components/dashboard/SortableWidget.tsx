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

      {/* When editing, show a drag handle overlay or make the whole card draggable */}
      {isEditing && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute inset-0 z-40 bg-background/10 backdrop-blur-[2px] rounded-[16px] border-2 border-primary/50 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
           <div className="bg-primary/80 backdrop-blur-md p-2 rounded-xl text-primary-foreground shadow-lg flex items-center justify-center pointer-events-none">
              <GripHorizontal className="w-8 h-8 opacity-80" />
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
