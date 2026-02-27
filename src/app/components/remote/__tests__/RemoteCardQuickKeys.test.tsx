// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import RemoteCard from '../RemoteCard';

expect.extend(matchers);

describe('RemoteCard quick keys', () => {
  it('renders no on/off state text and triggers sendIR on press', () => {
    const sendIR = vi.fn();
    render(
      <RemoteCard
        device={{
          id: 1001,
          name: '客厅电视遥控',
          icon: 'wifi',
          count: '0',
          power: '0',
          isOn: false,
          room: '客厅',
          type: 'remote',
        } as any}
        onClick={vi.fn()}
        sendIR={sendIR}
      />
    );

    expect(screen.queryByText('开启')).not.toBeInTheDocument();
    expect(screen.queryByText('关闭')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ir-power'));
    expect(sendIR).toHaveBeenCalledWith('tv_power');

    fireEvent.click(screen.getByLabelText('上'));
    expect(sendIR).toHaveBeenCalledWith('tv_up');
  });

  it('does not change UI based on device.isOn', () => {
    const sendIR = vi.fn();
    const { rerender } = render(
      <RemoteCard
        device={{
          id: 1001,
          name: '客厅电视遥控',
          icon: 'wifi',
          count: '0',
          power: '0',
          isOn: false,
          room: '客厅',
          type: 'remote',
        } as any}
        onClick={vi.fn()}
        sendIR={sendIR}
      />
    );

    rerender(
      <RemoteCard
        device={{
          id: 1001,
          name: '客厅电视遥控',
          icon: 'wifi',
          count: '0',
          power: '0',
          isOn: true,
          room: '客厅',
          type: 'remote',
        } as any}
        onClick={vi.fn()}
        sendIR={sendIR}
      />
    );

    expect(screen.queryByText('开启')).not.toBeInTheDocument();
    expect(screen.queryByText('关闭')).not.toBeInTheDocument();
  });
});
