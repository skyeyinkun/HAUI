import React from 'react';

interface MenuButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
}

export function MenuButton({ icon, onClick }: MenuButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-[var(--shadow-elevated)] hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <div className="text-foreground">{icon}</div>
    </button>
  );
}
