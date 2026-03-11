
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DeviceCard } from '../DeviceCard';
import { Device } from '@/types/device';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('DeviceCard Visual Regression Prevention', () => {
  const mockDevice: Device = {
    id: 1,
    name: 'Test Light',
    icon: 'lamp',
    isOn: true,
    type: 'light',
    room: 'Living Room',
    count: '1',
    power: '10W',
    isCommon: true
  };

  it('DeviceIcon should have shrink-0 and aspect-square to prevent shape distortion', () => {
    const { container } = render(
      <DeviceCard 
        device={mockDevice} 
        onToggle={() => {}} 
        onClick={() => {}} 
      />
    );

    // Find the icon container by its distinctive inline style or class structure
    // Since we don't have a test-id, we look for the element with the gradient background style
    const iconContainer = container.querySelector('div[style*="linear-gradient(140.848deg"]');
    
    expect(iconContainer).toBeTruthy();
    
    // Check for critical layout stability classes
    expect(iconContainer?.className).toContain('shrink-0');
    expect(iconContainer?.className).toContain('aspect-square');
    expect(iconContainer?.className).toContain('w-[32px]');
    expect(iconContainer?.className).toContain('h-[32px]');
  });
});
