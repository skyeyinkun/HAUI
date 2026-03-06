import { useState, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { searchMdiIcons, getMdiIconPath, HA_ICON_CATEGORIES } from '@/utils/mdi-helpers';

interface AssetIconPickerProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

const categories = Object.keys(HA_ICON_CATEGORIES);

export function AssetIconPicker({ value, onChange, className }: AssetIconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('常用');

  const displayIcons = useMemo(() => {
    if (search.trim()) {
      return searchMdiIcons(search, 80);
    }
    return HA_ICON_CATEGORIES[activeCategory] || HA_ICON_CATEGORIES['常用'];
  }, [search, activeCategory]);

  const handleSelect = useCallback((iconName: string) => {
    onChange(iconName);
  }, [onChange]);

  return (
    <div className={className || "w-full max-w-[600px] p-4 bg-card border rounded-xl shadow-xl flex flex-col"}>
      {/* 搜索栏 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="搜索图标 (中文/英文/拼音)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-background rounded-lg border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 分类标签栏 */}
      {!search && (
        <div className="px-4 py-2 flex gap-1 overflow-x-auto scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`
                px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all shrink-0
                ${activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 搜索结果提示 */}
      {search && (
        <div className="px-4 py-1">
          <span className="text-[10px] text-muted-foreground">
            找到 {displayIcons.length} 个图标
          </span>
        </div>
      )}

      {/* 图标网格 */}
      <div className="px-4 pb-3 pt-1">
        <div className="grid grid-cols-8 gap-1 max-h-[320px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
          {displayIcons.map(iconName => {
            const path = getMdiIconPath(iconName);
            if (!path) return null;

            const isSelected = value === iconName;

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => handleSelect(iconName)}
                className={`
                  aspect-square rounded-lg flex items-center justify-center transition-all duration-150 group relative
                  ${isSelected
                    ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'
                  }
                `}
                title={iconName}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d={path} />
                </svg>
                {/* hover 显示名称 */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-popover text-popover-foreground border rounded text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-sm">
                  {iconName}
                </span>
              </button>
            );
          })}
        </div>

        {displayIcons.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <div className="text-2xl mb-2">🔍</div>
            未找到匹配的图标
          </div>
        )}
      </div>

      {/* 底部选中提示 */}
      {value && (
        <div className="px-4 pb-3 border-t border-border pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>已选择:</span>
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">
              mdi:{value}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
