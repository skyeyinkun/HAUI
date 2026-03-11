
// @vitest-environment jsdom
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { DeviceCard } from '../DeviceCard';
import { Device } from '@/types/device';

expect.extend(matchers);

// Mock dependencies
vi.mock('@/app/components/dashboard/SensorTimestamp', () => ({
  SensorTimestamp: () => <div data-testid="sensor-timestamp" />
}));

vi.mock('../remote/RemoteCard', () => ({
  default: () => <div data-testid="remote-card" />
}));

vi.mock('@/imports/svg-vz3fosb0v5', () => ({
  default: {}
}));

vi.mock('@/assets/toggle_switch.png', () => ({
  default: 'mock-image.png'
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Element.prototype.setPointerCapture and releasePointerCapture
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  left: 0,
  top: 0,
  width: 200,
  height: 200,
  right: 200,
  bottom: 200,
  x: 0,
  y: 0,
  toJSON: () => {}
}));

describe('DeviceCard Curtain Control', () => {
  const mockOnToggle = vi.fn();
  const mockOnClick = vi.fn();
  const mockOnPositionChange = vi.fn();
  const mockOnUpdate = vi.fn();

  const curtainDevice: Device = {
    id: 1,
    entity_id: 'cover.living_room',
    name: 'Living Room Curtain',
    type: 'curtain',
    icon: 'curtain',
    isOn: true,
    position: 50,
    haState: 'open',
    haAvailable: true,
    lastChanged: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders correctly with initial position', () => {
    render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );
    const elements = screen.getAllByText('50%');
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();
  });

  it('updates position optimistically when dragged', () => {
    render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    const elements = screen.getAllByText('50%');
    const curtainArea = elements[0].parentElement?.parentElement;
    expect(curtainArea).toBeInTheDocument();

    // Simulate Drag
    fireEvent.pointerDown(curtainArea!, { clientX: 100, pointerId: 1 }); // 50%
    fireEvent.pointerMove(curtainArea!, { clientX: 150, pointerId: 1 }); // 75%
    
    expect(screen.getAllByText('75%')[0]).toBeInTheDocument();
    
    fireEvent.pointerUp(curtainArea!, { pointerId: 1 });
    
    expect(mockOnPositionChange).toHaveBeenCalledWith(1, 75);
  });

  it('ignores stale backend updates while waiting for commit (Anti-Jumping)', () => {
    const { rerender } = render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    const elements = screen.getAllByText('50%');
    const curtainArea = elements[0].parentElement?.parentElement;

    // Drag to 80%
    fireEvent.pointerDown(curtainArea!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(curtainArea!, { clientX: 160, pointerId: 1 }); // 80%
    fireEvent.pointerUp(curtainArea!, { pointerId: 1 });

    expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
    expect(mockOnPositionChange).toHaveBeenCalledWith(1, 80);

    // Simulate stale backend update (e.g. 50% -> 55%)
    rerender(
      <DeviceCard
        device={{ ...curtainDevice, position: 55 }}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    // Should still show 80% (Optimistic), NOT 55%
    expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
  });

  it('accepts backend update when it matches committed value', () => {
    const { rerender } = render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    const elements = screen.getAllByText('50%');
    const curtainArea = elements[0].parentElement?.parentElement;

    // Drag to 80%
    fireEvent.pointerDown(curtainArea!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(curtainArea!, { clientX: 160, pointerId: 1 }); // 80%
    fireEvent.pointerUp(curtainArea!, { pointerId: 1 });

    // Simulate correct backend update (80%)
    rerender(
      <DeviceCard
        device={{ ...curtainDevice, position: 80 }}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
    
    // Simulate another update (81%) - should be accepted now as lock is released
    rerender(
      <DeviceCard
        device={{ ...curtainDevice, position: 81 }}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );
    expect(screen.getAllByText('81%')[0]).toBeInTheDocument();
  });

  it('reverts to backend state after timeout if no confirmation', () => {
    const { rerender } = render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    const elements = screen.getAllByText('50%');
    const curtainArea = elements[0].parentElement?.parentElement;

    // Drag to 80%
    fireEvent.pointerDown(curtainArea!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(curtainArea!, { clientX: 160, pointerId: 1 }); // 80%
    fireEvent.pointerUp(curtainArea!, { pointerId: 1 });

    expect(screen.getAllByText('80%')[0]).toBeInTheDocument();

    // Fast forward past timeout (5000ms) and possible retries (2 * 300ms)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Should revert to prop value (50)
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  // NEW REQUIREMENT TEST: Toggle Click Optimistic Update
  it('optimistically updates position on toggle click', () => {
    render(
      <DeviceCard
        device={{ ...curtainDevice, isOn: false, position: 0 }}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    expect(screen.getAllByText('0%')[0]).toBeInTheDocument();

    const toggleBtn = screen.getAllByAltText('Toggle')[0]?.closest('button');
    expect(toggleBtn).toBeTruthy();
    
    // Click toggle (Open)
    act(() => {
      fireEvent.click(toggleBtn!);
    });

    // Expect immediate UI update to 100% (Optimistic)
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Should verify mockOnToggle called
    expect(mockOnToggle).toHaveBeenCalled();
  });
  
  // NEW REQUIREMENT TEST: Command Retry
  it('retries command if not executed within 300ms', async () => {
     render(
      <DeviceCard
        device={curtainDevice}
        onToggle={mockOnToggle}
        onClick={mockOnClick}
        onPositionChange={mockOnPositionChange}
      />
    );

    const elements = screen.getAllByText('50%');
    const curtainArea = elements[0].parentElement?.parentElement;
    
    // Drag to 80%
    fireEvent.pointerDown(curtainArea!, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(curtainArea!, { clientX: 160, pointerId: 1 }); // 80%
    fireEvent.pointerUp(curtainArea!, { pointerId: 1 });
    
    expect(mockOnPositionChange).toHaveBeenCalledTimes(1);
    
    // Advance 300ms
    act(() => {
        vi.advanceTimersByTime(300);
    });
    
    // Should call again?
    // The retry logic checks if isWaitingForUpdate is true. It is true because we didn't update props.
    expect(mockOnPositionChange).toHaveBeenCalledTimes(2);
  });

});
