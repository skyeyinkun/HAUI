import React from 'react';
import { CardEntityConfig } from '@/types/card-config';
import { CustomIcon } from './CustomIcon';
import { Settings } from 'lucide-react';

interface EntityGridCardProps {
    title: string;
    icon: string;
    entities: CardEntityConfig[];
    data: Record<string, any>; // Map entity_id to data
    onSettingsClick: () => void;
    className?: string;
}

export function EntityGridCard({ title, icon, entities, data, onSettingsClick, className }: EntityGridCardProps) {
    return (
        <div className={`flex flex-col h-full bg-card rounded-xl border p-4 ${className}`}>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <CustomIcon name={icon} className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg">{title}</h2>
                </div>
                <button onClick={onSettingsClick} className="p-2 hover:bg-accent rounded-full transition-colors">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 content-start">
                {entities.filter(e => e.visible !== false).slice(0, 6).map(entity => {
                    const value = data[entity.entity_id];
                    const state = value?.state ?? '--';
                    const unit = value?.attributes?.unit_of_measurement ?? '';
                    const name = entity.display_name || entity.ha_name || value?.attributes?.friendly_name || entity.entity_id;
                    // Use configured icon, or entity attribute icon, or fallback
                    const iconName = entity.icon || (value?.attributes?.icon ? value.attributes.icon.replace('mdi:', '') : 'Activity'); 
                    
                    return (
                        <div key={entity.entity_id} className="flex flex-col p-3 bg-accent/50 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                             <div className="flex items-center justify-between mb-2">
                                <CustomIcon name={iconName} className="w-5 h-5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{unit}</span>
                             </div>
                             <div className="text-xl font-bold truncate">
                                {state}
                             </div>
                             <div className="text-xs text-muted-foreground truncate mt-1">
                                {name}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
