// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconPicker } from '@/app/components/dashboard/IconPicker';

describe('IconPicker search filtering', () => {
  it('filters icons by keyword', () => {
    const onChange = vi.fn();
    render(<IconPicker value="Thermometer" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search icons...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'door' } });

    const anyDoor = screen.getAllByTitle(/door/i)[0];
    fireEvent.click(anyDoor);
    expect(onChange).toHaveBeenCalled();
  });
});
