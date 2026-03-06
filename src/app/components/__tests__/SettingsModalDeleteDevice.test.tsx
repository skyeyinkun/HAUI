
// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsModal from '../SettingsModal';
import { Device } from '@/types/device';
import { HAConfig } from '@/types/home-assistant';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

vi.mock('@/hooks/useKioskMode', () => ({
  useKioskMode: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() })
}));

vi.mock('@/utils/ha-connection', () => ({
  createOneOffConnection: vi.fn(),
  fetchAreaRegistry: vi.fn(),
  fetchDeviceRegistry: vi.fn(),
  fetchEntityRegistry: vi.fn(),
  verifyConnectionConfig: vi.fn()
}));

// Mock useHomeAssistant used by DeviceDiscoveryPanel
vi.mock('@/hooks/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    fetchStatesRest: vi.fn().mockResolvedValue([]),
    isConnected: true
  })
}));

describe('SettingsModal delete device', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletes device via drawer and updates mappings on save', async () => {
    const devices: Device[] = [
      {
        id: 1001,
        name: '水浸',
        icon: 'water',
        count: '',
        power: '',
        isOn: false,
        room: '卫生间',
        type: 'binary_sensor',
        isCommon: true
      }
    ];

    const initialConfig: HAConfig = {
      localUrl: '',
      publicUrl: '',
      token: '',
      deviceMappings: { 1001: 'binary_sensor.shui_jin_lou_shui' },
      personMappings: {},
      sceneMappings: {}
    };

    const onSave = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        devices={devices}
        users={[]}
        scenes={[]}
        rooms={['卫生间']}
        onUpdateUsers={vi.fn()}
        onUpdateDevices={vi.fn()}
        onUpdateScenes={vi.fn()}
        onSave={onSave}
        initialConfig={initialConfig}
        entities={{}}
      />
    );

    // 1. Go to Devices tab
    fireEvent.click(screen.getByText('设备管理'));
    expect(screen.getByText('水浸')).toBeInTheDocument();

    // 2. Open Editor
    fireEvent.click(screen.getByText('编辑'));
    
    // 3. Click Delete
    const deleteBtn = screen.getByText('删除设备');
    fireEvent.click(deleteBtn);

    // 4. Confirm Delete
    const confirmBtn = screen.getByText('确认删除');
    fireEvent.click(confirmBtn);

    // 5. Verify removed from list
    // Note: It might still be in the DOM if transition is happening, so use waitFor
    await waitFor(() => {
        expect(screen.queryByText('水浸')).not.toBeInTheDocument();
    });

    // 6. Save Config
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('保存配置'));
    await vi.advanceTimersByTimeAsync(700);
    
    expect(onSave).toHaveBeenCalled();
    const savedConfig = onSave.mock.calls[0][0] as HAConfig;
    expect(savedConfig.deviceMappings[1001]).toBeUndefined();
  });
});
