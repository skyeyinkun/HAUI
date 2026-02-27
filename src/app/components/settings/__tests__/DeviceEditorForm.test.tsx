import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeviceEditorForm } from '../DeviceEditorForm';
import { Device } from '@/types/device';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockDevice: Device = {
  id: 1,
  entity_id: 'light.test',
  name: 'Test Device',
  icon: 'lightbulb',
  count: '1',
  power: '0',
  isOn: false,
  room: 'Living Room',
  type: 'light',
  category: 'lighting'
};

const mockRooms = ['Living Room', 'Bedroom', 'Kitchen'];
const mockExistingNames = ['Existing Device'];
const mockEntityOptions = [
  { entity_id: 'light.test', name: 'Test Light', domain: 'light' },
  { entity_id: 'climate.ac', name: 'Living AC', domain: 'climate' },
];

describe('DeviceEditorForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Pointer Capture methods for Radix UI
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    (globalThis as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn();
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all form fields correctly', () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
        existingNames={mockExistingNames}
        rooms={mockRooms}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    expect(screen.getByDisplayValue('Test Device')).toBeTruthy();
    expect(screen.getByText('Living Room')).toBeTruthy();
    expect(screen.getByText('实体 ID')).toBeTruthy();
  });

  it('validates name length <= 32', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={[]}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    const nameInput = screen.getByLabelText('设备名称 *');
    const longName = 'a'.repeat(33);
    
    fireEvent.change(nameInput, { target: { value: longName } });
    fireEvent.blur(nameInput);

    expect(screen.getByText(/字符长度不能超过32/i)).toBeTruthy();
  });

  it('validates required fields', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={[]}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    const nameInput = screen.getByLabelText('设备名称 *');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText(/设备名称不能为空/i)).toBeTruthy();
  });

  it('validates duplicate names', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={mockExistingNames}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    const nameInput = screen.getByLabelText('设备名称 *');
    fireEvent.change(nameInput, { target: { value: 'Existing Device' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText(/设备名称已存在/i)).toBeTruthy();
  });

  it('calls onSave with correct data when valid', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={[]}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    const nameInput = screen.getByLabelText('设备名称 *');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const saveButton = screen.getByText('保存更改');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Name'
    }));
  });

  it('renders device type correctly', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={[]}
        entityOptions={mockEntityOptions}
        usedEntityIds={[]}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    // It should render '照明' for type='light'
    const typeCombobox = comboboxes.find((el) => el.textContent?.includes('照明'));
    expect(typeCombobox).toBeTruthy();
  });

  it('blocks saving when entity is already bound', async () => {
    render(
      <DeviceEditorForm
        device={mockDevice}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        rooms={mockRooms}
        existingNames={[]}
        entityOptions={mockEntityOptions}
        usedEntityIds={['climate.ac']}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    const entityCombobox = comboboxes.find((el) => el.textContent?.includes('light.test'));
    expect(entityCombobox).toBeTruthy();
    fireEvent.click(entityCombobox as Element);

    fireEvent.click(screen.getByText('climate.ac'));

    fireEvent.click(screen.getByText('保存更改'));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('该实体已绑定到其他设备')).toBeTruthy();
  });
});
