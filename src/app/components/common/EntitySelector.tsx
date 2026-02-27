import { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { HassEntities } from 'home-assistant-js-websocket';

interface EntitySelectorProps {
  entities: HassEntities;
  value?: string;
  onChange: (entityId: string) => void;
  onClose: () => void;
}

export default function EntitySelector({ entities, value, onChange, onClose }: EntitySelectorProps) {
  const [search, setSearch] = useState('');

  const filteredEntities = useMemo(() => {
    if (!search) return Object.values(entities).slice(0, 50); // Limit initial view
    const lowerSearch = search.toLowerCase();
    return Object.values(entities).filter(e => 
      e.entity_id.toLowerCase().includes(lowerSearch) || 
      e.attributes.friendly_name?.toLowerCase().includes(lowerSearch)
    ).slice(0, 50);
  }, [entities, search]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            className="flex-1 outline-none text-sm"
            placeholder="搜索实体 (如 light.living_room)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredEntities.map(entity => (
            <button
              key={entity.entity_id}
              onClick={() => { onChange(entity.entity_id); onClose(); }}
              className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors ${value === entity.entity_id ? 'bg-blue-50' : ''}`}
            >
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {entity.attributes.friendly_name || entity.entity_id}
                </div>
                <div className="text-xs text-gray-500 font-mono truncate">
                  {entity.entity_id}
                </div>
              </div>
              {value === entity.entity_id && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </button>
          ))}
          {filteredEntities.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              未找到匹配的实体
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
