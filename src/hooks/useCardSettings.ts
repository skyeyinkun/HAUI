import { useEffect, useState } from 'react';
import type { CardConfig } from '@/types/card-config';

const KEY = (id: string) => `card_settings_${id}`;

export function useCardSettings(cardId: string, defaultConfig: CardConfig) {
  const [config, setConfig] = useState<CardConfig>(defaultConfig);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(cardId));
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig({ ...defaultConfig, ...parsed });
      } else {
        localStorage.setItem(KEY(cardId), JSON.stringify(defaultConfig));
        setConfig(defaultConfig);
      }
    } catch {
      setConfig(defaultConfig);
    }
  }, [cardId]);

  const updateConfig = (patch: Partial<CardConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY(cardId), JSON.stringify(next));
      return next;
    });
  };

  const saveConfig = async (next: CardConfig) => {
    localStorage.setItem(KEY(cardId), JSON.stringify(next));
    setConfig(next);
  };

  const resetToDefault = () => {
    localStorage.setItem(KEY(cardId), JSON.stringify(defaultConfig));
    setConfig(defaultConfig);
  };

  return { config, updateConfig, saveConfig, resetToDefault };
}
