import { useState } from 'react';
import { Plus, Trash2, X, Layout } from 'lucide-react';
import { Room } from '@/types/room';
import { IconPickerPopover } from '@/app/components/dashboard/IconPickerPopover';
import { CustomIcon } from '@/app/components/dashboard/cards/shared/CustomIcon';

interface RoomManagementTabProps {
  rooms: Room[];
  onUpdateRooms: (rooms: Room[]) => void;
}

export function RoomManagementTab({ rooms, onUpdateRooms }: RoomManagementTabProps) {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [roomDeleteId, setRoomDeleteId] = useState<string | null>(null);

  const handleAddRoom = () => {
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: `新房间${rooms.length > 0 ? ` ${rooms.length + 1}` : ''}`,
      type: 'other',
      icon: 'Layout',
      capacity: 1,
      order: rooms.length + 1
    };
    onUpdateRooms([...rooms, newRoom]);
    setEditingNameId(newRoom.id);
    setEditingNameValue(newRoom.name);
  };

  const handleNameSave = (id: string) => {
    if (!editingNameValue.trim()) {
      setEditingNameId(null);
      return;
    }

    let finalName = editingNameValue.trim();
    let counter = 1;
    // 重名防碰撞处理
    while (rooms.some(r => r.id !== id && r.name === finalName)) {
      finalName = `${editingNameValue.trim()} ${counter}`;
      counter++;
    }

    const updatedRooms = rooms.map(r =>
      r.id === id ? { ...r, name: finalName } : r
    );

    onUpdateRooms(updatedRooms);
    setEditingNameId(null);
  };

  const handleIconChange = (id: string, newIcon: string) => {
    const updatedRooms = rooms.map(r =>
      r.id === id ? { ...r, icon: newIcon } : r
    );
    onUpdateRooms(updatedRooms);
  };

  const handleDelete = (id: string) => {
    onUpdateRooms(rooms.filter(r => r.id !== id));
    setRoomDeleteId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header Actions - Refined */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div>
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">房间管理</h3>
            <p className="text-[12px] text-muted-foreground mt-1">点击名称可直接修改，点击图标可快速更换</p>
          </div>
          <button
            onClick={handleAddRoom}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background dark:bg-white dark:text-black rounded-[14px] text-[13px] font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
            style={{ backgroundImage: 'linear-gradient(135deg, #3c3c41 0%, #2d2d30 100%)' }}
          >
            <Plus className="w-4 h-4" />
            新增房间区域
          </button>
        </div>

        {/* classic horizontal card grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 pb-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`
                group relative flex items-center p-3 rounded-[16px] transition-all duration-200 border
                ${editingNameId === room.id
                  ? 'bg-primary/5 ring-1 ring-primary border-primary/50 shadow-sm'
                  : 'bg-white dark:bg-card border-border/40 hover:border-border hover:shadow-sm dark:hover:bg-accent/40'}
              `}
            >
              {/* Icon Picker Wrapping the Button */}
              <IconPickerPopover
                value={room.icon || ''}
                onChange={(icon) => handleIconChange(room.id, icon)}
                align="start"
                side="bottom"
              >
                <button
                  className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-primary/10
                    ${editingNameId === room.id ? 'bg-primary text-primary-foreground' : 'bg-accent/60 text-muted-foreground group-hover:text-primary'}
                  `}
                  title="点击更换图标"
                >
                  <CustomIcon name={room.icon || 'Layout'} className="w-5 h-5" />
                </button>
              </IconPickerPopover>

              <div className="flex-1 min-w-0 px-3 flex items-center">
                {editingNameId === room.id ? (
                  <input
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onBlur={() => handleNameSave(room.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave(room.id);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-primary/50 text-[14px] font-semibold text-foreground focus:outline-none focus:border-primary py-0.5"
                  />
                ) : (
                  <h4
                    className="font-semibold text-[14px] text-foreground truncate cursor-text hover:text-primary transition-colors py-0.5 w-full"
                    onClick={() => {
                      setEditingNameId(room.id);
                      setEditingNameValue(room.name);
                    }}
                    title="点击修改名称"
                  >
                    {room.name}
                  </h4>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {roomDeleteId === room.id ? (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="px-2.5 py-1.5 bg-red-500 text-white text-[11px] font-bold rounded-[10px] hover:bg-red-600 transition-colors shadow-sm"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setRoomDeleteId(null)}
                      className="p-1.5 text-muted-foreground hover:bg-accent rounded-[10px] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRoomDeleteId(room.id)}
                    className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="删除此房间"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={handleAddRoom}
            className="group flex items-center p-3 rounded-[16px] border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
          >
            <div className="w-11 h-11 rounded-[12px] bg-accent/40 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
              <Plus className="w-5 h-5 group-hover:text-primary" />
            </div>
            <div className="flex-1 min-w-0 px-3 text-left">
              <span className="font-medium text-[13px]">快速添加区域</span>
            </div>
          </button>
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-card/30 rounded-xl border-2 border-dashed border-border">
            <Layout className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground">暂无房间</h3>
            <p className="text-xs text-muted-foreground mt-1">点击右上角或此处的“新增”开始添加</p>
          </div>
        )}
      </div>
    </div>
  );
}
