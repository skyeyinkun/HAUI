import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}

export function StatCard({ icon, title, value, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-[16px] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] p-3 flex flex-col gap-2 transition-all duration-300 aspect-square">
      <div className="flex items-center justify-between">
        <div 
          className="w-8 h-8 rounded-[12px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)]" 
          style={{ backgroundImage: "var(--gradient-icon-dark)" }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <p className="font-['SF_Pro_Display',sans-serif] text-[10px] text-text-secondary">{title}</p>
      </div>
      <p className="font-['SF_Pro_Display',sans-serif] text-[20px] font-semibold text-foreground mt-auto">{value}</p>
    </div>
  );
}
