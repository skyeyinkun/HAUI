export interface Room {
  id: string;
  name: string;
  type: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'balcony' | 'corridor' | 'study' | 'other';
  icon?: string;
  capacity?: number;
  order?: number;
}

export const ROOM_TYPES: Record<string, string> = {
  living_room: '客厅',
  bedroom: '卧室',
  kitchen: '厨房',
  bathroom: '卫生间',
  balcony: '阳台',
  corridor: '过道',
  study: '书房',
  other: '其他'
};

export const DEFAULT_ROOMS: Room[] = [
  { id: 'living_room', name: '客厅', type: 'living_room', order: 1 },
  { id: 'dining_room', name: '餐厅', type: 'other', order: 2 },
  { id: 'kitchen', name: '厨房', type: 'kitchen', order: 3 },
  { id: 'balcony', name: '阳台', type: 'balcony', order: 4 },
  { id: 'corridor', name: '过道', type: 'corridor', order: 5 },
  { id: 'bedroom_second', name: '次卧', type: 'bedroom', order: 6 },
  { id: 'bedroom_kids', name: '儿童房', type: 'bedroom', order: 7 },
  { id: 'study', name: '书房', type: 'study', order: 8 },
  { id: 'bathroom', name: '卫生间', type: 'bathroom', order: 9 },
  { id: 'bedroom_master', name: '主卧', type: 'bedroom', order: 10 },
];
