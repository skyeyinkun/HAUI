/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManagementTab } from '../RoomManagementTab';
import { DEFAULT_ROOMS } from '@/types/room';

describe('RoomManagementTab', () => {
  const mockOnUpdateRooms = vi.fn();

  beforeEach(() => {
    mockOnUpdateRooms.mockClear();
  });

  it('renders room list correctly', () => {
    render(
      <RoomManagementTab 
        rooms={DEFAULT_ROOMS} 
        onUpdateRooms={mockOnUpdateRooms} 
      />
    );

    // Should find at least one element with text '客厅' (title and/or badge)
    expect(screen.getAllByText('客厅').length).toBeGreaterThan(0);
  });

  it('allows adding a new room', async () => {
    render(
      <RoomManagementTab 
        rooms={[]} 
        onUpdateRooms={mockOnUpdateRooms} 
      />
    );

    // Open form
    const addBtn = screen.getAllByText('新增房间').find(el => el.tagName === 'BUTTON');
    fireEvent.click(addBtn!);
    
    // Fill form
    const input = await screen.findByPlaceholderText('例如：主卧');
    fireEvent.change(input, { target: { value: '游戏室' } });
    
    // Submit
    fireEvent.click(screen.getByText('确认添加'));

    expect(mockOnUpdateRooms).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: '游戏室', type: 'other' })
    ]));
  });
});
