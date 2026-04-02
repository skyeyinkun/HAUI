import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react'; // Keep Lucide for UI controls
import { searchMdiIcons, getMdiIconPath } from '@/utils/mdi-helpers';

// List of common MDI icons to show by default
const COMMON_ICONS = [
    'thermometer', 'water-percent', 'weather-windy', 'weather-sunny', 'cloud', 'weather-rainy', 'snowflake',
    'flash', 'pulse', 'heart', 'home', 'account', 'account-group', 'cog',
    'bell', 'lock', 'lock-open', 'shield', 'wifi', 'battery', 'bluetooth',
    'lightbulb', 'power', 'television', 'speaker', 'cellphone', 'laptop',
    'door-open', 'door-closed', 'waves', 'atom', 'weather-fog', 'gauge'
];

interface IconPickerProps {
    value: string;
    onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [search, setSearch] = useState('');

    // Filter icons based on search
    const filteredIcons = useMemo(() => {
        if (!search) return COMMON_ICONS;
        return searchMdiIcons(search, 50);
    }, [search]);

    return (
        <div className="w-[300px] p-2 bg-card border rounded-lg shadow-lg flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search icons (English/Chinese)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-sm bg-accent/50 rounded-md border border-transparent focus:border-primary focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground/50"
                    autoFocus
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded-full text-muted-foreground"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-6 gap-1 max-h-[240px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {filteredIcons.map((iconName) => {
                    const path = getMdiIconPath(iconName);
                    if (!path) return null;

                    const isSelected = value === iconName;

                    return (
                        <button
                            key={iconName}
                            onClick={() => onChange(iconName)}
                            className={`
                                aspect-square rounded-md flex items-center justify-center transition-all duration-200
                                ${isSelected
                                    ? 'bg-primary text-primary-foreground shadow-sm scale-100'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105'
                                }
                            `}
                            title={iconName}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="w-[18px] h-[18px]"
                                fill="currentColor"
                                style={{ display: 'block' }}
                            >
                                <path d={path} />
                            </svg>
                        </button>
                    );
                })}
                {filteredIcons.length === 0 && (
                    <div className="col-span-6 py-8 text-center text-xs text-muted-foreground">
                        No icons found
                    </div>
                )}
            </div>
        </div>
    );
}
