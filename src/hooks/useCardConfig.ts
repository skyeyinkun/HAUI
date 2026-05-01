import { useState, useEffect } from 'react';

interface CardConfig {
    title: string;
    icon: string;
    visibleItems?: string[]; // IDs or keys of visible items
}

export function useCardConfig(cardId: string, defaultConfig: CardConfig) {
    const [config, setConfig] = useState<CardConfig>(defaultConfig);

    useEffect(() => {
        const saved = localStorage.getItem(`card_config_${cardId}`);
        if (saved) {
            try {
                setConfig({ ...defaultConfig, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Failed to parse card config', e);
            }
        }
    }, [cardId]);

    const updateConfig = (newConfig: Partial<CardConfig>) => {
        setConfig(prev => {
            const next = { ...prev, ...newConfig };
            localStorage.setItem(`card_config_${cardId}`, JSON.stringify(next));
            return next;
        });
    };

    return { config, updateConfig };
}
