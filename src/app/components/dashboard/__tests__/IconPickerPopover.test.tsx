import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('../cards/shared/CustomIcon', () => ({
  CustomIcon: ({ name }: any) => <div data-testid="preview">{name}</div>,
}));

vi.mock('../AssetIconPicker', () => ({
  AssetIconPicker: ({ value, onChange }: any) => (
    <div>
      <div data-testid="picker-value">{value}</div>
      <button type="button" onClick={() => onChange('Home')}>
        choose-home
      </button>
      <button type="button" onClick={() => onChange('BadIcon')}>
        choose-bad
      </button>
    </div>
  ),
}));

import { IconPickerPopover } from '../IconPickerPopover';
import { toast } from 'sonner';

describe('IconPickerPopover', () => {
  beforeEach(() => {
    (toast as any).error.mockClear();
  });

  it('confirms selection before calling onChange', async () => {
    const onChange = vi.fn();
    render(
      <IconPickerPopover value="User" onChange={onChange}>
        <button type="button">open</button>
      </IconPickerPopover>,
    );

    fireEvent.click(screen.getByText('open'));
    fireEvent.click(screen.getByText('choose-home'));

    await waitFor(() => expect(screen.getByText('确认')).not.toBeDisabled());

    fireEvent.click(screen.getByText('确认'));
    expect(onChange).toHaveBeenCalledWith('Home');
  });

  it('cancel does not call onChange', async () => {
    const onChange = vi.fn();
    render(
      <IconPickerPopover value="User" onChange={onChange}>
        <button type="button">open</button>
      </IconPickerPopover>,
    );

    fireEvent.click(screen.getByText('open'));
    fireEvent.click(screen.getByText('choose-home'));
    fireEvent.click(screen.getByText('取消'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
