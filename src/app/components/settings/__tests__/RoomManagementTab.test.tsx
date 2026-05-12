/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManagementTab } from '../RoomManagementTab';
import { DEFAULT_ROOMS } from '@/types/room';
import type { Room } from '@/types/room';

describe('RoomManagementTab', () => {
  const mockOnUpdateRooms = vi.fn();

  function ControlledRooms({ initialRooms = [] }: { initialRooms?: Room[] }) {
    const [rooms, setRooms] = useState(initialRooms);

    return (
      <RoomManagementTab
        rooms={rooms}
        onUpdateRooms={(nextRooms) => {
          mockOnUpdateRooms(nextRooms);
          setRooms(nextRooms);
        }}
      />
    );
  }

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
    render(<ControlledRooms />);

    // Open form
    const addBtn = screen.getAllByText('新增房间').find(el => el.tagName === 'BUTTON');
    fireEvent.click(addBtn!);
    
    // Rename the inline-created room
    const input = await screen.findByDisplayValue('新房间');
    fireEvent.change(input, { target: { value: '游戏室' } });
    
    // Save
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnUpdateRooms).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: '游戏室', type: 'other' })
    ]));
  });
});
