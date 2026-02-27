import React from 'react';

interface MenuButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
}

export function MenuButton({ icon, onClick }: MenuButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-[0px_2px_16px_0px_rgba(0,0,0,0.15)] hover:scale-105 transition-all"
    >
      <div className="text-foreground">{icon}</div>
    </button>
  );
}
