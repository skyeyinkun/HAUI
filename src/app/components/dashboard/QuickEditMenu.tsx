import { useState, useRef, useEffect } from 'react';
import { Edit3, Move, Trash2, X, Check } from 'lucide-react';
import { Device } from '@/types/device';
import { Room } from '@/types/room';

/**
 * 设备快速编辑菜单组件
 * 通过长按设备卡片触发，提供重命名、移动房间、删除等快捷操作
 */

interface QuickEditMenuProps {
  device: Device;
  rooms: Room[];
  position: { x: number; y: number };
  onClose: () => void;
  onRename: (deviceId: number, newName: string) => void;
  onMoveRoom: (deviceId: number, newRoom: string) => void;
  onDelete: (deviceId: number) => void;
}

export function QuickEditMenu({
  device,
  rooms,
  position,
  onClose,
  onRename,
  onMoveRoom,
  onDelete
}: QuickEditMenuProps) {
  const [editMode, setEditMode] = useState<'menu' | 'rename' | 'moveRoom'>('menu');
  const [newName, setNewName] = useState(device.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 重命名模式下自动聚焦输入框
  useEffect(() => {
    if (editMode === 'rename' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editMode]);

  // 处理重命名提交
  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== device.name) {
      onRename(device.id, newName.trim());
    }
    onClose();
  };

  // 处理移动房间
  const handleMoveRoom = (roomName: string) => {
    onMoveRoom(device.id, roomName);
    onClose();
  };

  // 处理删除
  const handleDelete = () => {
    onDelete(device.id);
    onClose();
  };

  // 计算菜单位置，确保不超出屏幕
  const getMenuPosition = () => {
    const menuWidth = 200;
    const menuHeight = 200;
    const padding = 10;

    let x = position.x;
    let y = position.y;

    // 确保不超出右边界
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }
    // 确保不超出下边界
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }
    // 确保不超出左边界
    if (x < padding) x = padding;
    // 确保不超出上边界
    if (y < padding) y = padding;

    return { x, y };
  };

  const menuPosition = getMenuPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        minWidth: 180
      }}
    >
      {/* 主菜单 */}
      {editMode === 'menu' && (
        <>
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground truncate block">
              {device.name}
            </span>
          </div>
          <div className="py-1">
            <button
              onClick={() => setEditMode('rename')}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">重命名</span>
            </button>
            <button
              onClick={() => setEditMode('moveRoom')}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
            >
              <Move className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">移动房间</span>
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-destructive/10 transition-colors text-left text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">删除设备</span>
            </button>
          </div>
        </>
      )}

      {/* 重命名模式 */}
      {editMode === 'rename' && (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setEditMode('menu')}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium">重命名</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setEditMode('menu');
              }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="输入新名称"
            />
            <button
              onClick={handleRenameSubmit}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 移动房间模式 */}
      {editMode === 'moveRoom' && (
        <div>
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <button
              onClick={() => setEditMode('menu')}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium">移动到</span>
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleMoveRoom(room.name)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between
                  ${device.room === room.name ? 'bg-accent/50 text-primary' : ''}`}
              >
                <span>{room.name}</span>
                {device.room === room.name && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
