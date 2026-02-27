// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import * as matchers from '@testing-library/jest-dom/matchers';
import RemoteControlModal from '../RemoteControlModal';

expect.extend(matchers);

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Check: () => <div data-testid="icon-check" />,
    LayoutGrid: () => <div data-testid="icon-layout-grid" />,
    Plus: () => <div data-testid="icon-plus" />,
    Search: () => <div data-testid="icon-search" />,
    Settings2: () => <div data-testid="icon-settings" />,
    Snowflake: () => <div data-testid="icon-snowflake" />,
    Tv: () => <div data-testid="icon-tv" />,
    X: () => <div data-testid="icon-x" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ChevronLeft: () => <div data-testid="icon-chevron-left" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    Power: () => <div data-testid="icon-power" />,
    Volume2: () => <div data-testid="icon-volume" />,
    VolumeX: () => <div data-testid="icon-mute" />,
    Menu: () => <div data-testid="icon-menu" />,
    Home: () => <div data-testid="icon-home" />,
    ArrowLeft: () => <div data-testid="icon-back" />,
    Play: () => <div data-testid="icon-play" />,
    Circle: () => <div data-testid="icon-circle" />,
    PowerOff: () => <div data-testid="icon-power-off" />,
    Volume1: () => <div data-testid="icon-volume-1" />,
  };
});

// Mock hooks
vi.mock('@/hooks/useSoundEffect', () => ({
  useSoundEffect: () => ({ playClick: vi.fn() }),
}));

describe('RemoteControlModal', () => {
  const mockOnClose = vi.fn();
  const mockCallService = vi.fn();
  const mockDevice = {
    id: 'remote.living_room',
    name: 'Living Room Remote',
    type: 'remote',
    area: 'Living Room',
    state: 'on',
    attributes: {},
    last_updated: '',
    last_changed: ''
  };
  
  const mockEntities = {
    'switch.light': {
      entity_id: 'switch.light',
      state: 'on',
      attributes: { friendly_name: 'Living Room Light' },
      last_changed: '',
      last_updated: '',
      context: { id: '', parent_id: null, user_id: null }
    },
    'script.movie_mode': {
      entity_id: 'script.movie_mode',
      state: 'off',
      attributes: { friendly_name: 'Movie Mode' },
      last_changed: '',
      last_updated: '',
      context: { id: '', parent_id: null, user_id: null }
    }
  };

  const renderModal = () => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <RemoteControlModal
          isOpen={true}
          onClose={mockOnClose}
          device={mockDevice}
          callService={mockCallService}
          entities={mockEntities}
        />
      </DndProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly when open', () => {
    renderModal();
    expect(screen.getByText('Living Room Remote')).toBeInTheDocument();
  });

  it('enters config mode when settings button is clicked', () => {
    renderModal();

    const settingsBtn = screen.getByLabelText('进入配置模式');
    fireEvent.click(settingsBtn);

    expect(screen.getByLabelText('退出配置模式')).toBeInTheDocument();
  });

  it('opens editor when a button is clicked in config mode', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('进入配置模式'));

    const powerBtn = screen.getAllByRole('button').find(b => b.querySelector('[data-testid="icon-power"]'));
    if (powerBtn) fireEvent.click(powerBtn);
    else throw new Error('Power button not found');

    // Check for editor fields
    expect(screen.getByText('配置')).toBeInTheDocument();
    expect(screen.getByText('名称')).toBeInTheDocument();
  });

  it('allows renaming a button', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('进入配置模式'));

    const menuBtn = screen.getAllByRole('button').find(b => b.querySelector('[data-testid="icon-menu"]'));
    if (menuBtn) fireEvent.click(menuBtn);

    const input = screen.getByPlaceholderText('1-20 字符');
    fireEvent.change(input, { target: { value: 'New Menu' } });

    fireEvent.click(screen.getByText('保存'));

    expect(screen.queryByText('配置')).not.toBeInTheDocument();
  });

  it('allows changing profile name inline', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('进入配置模式'));

    const input = screen.getByDisplayValue('TV');
    fireEvent.change(input, { target: { value: 'My TV' } });

    expect(screen.getByDisplayValue('My TV')).toBeInTheDocument();
  });



  it('allows changing profile icon via editor', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('进入配置模式'));

    // Find the icon button for TV profile (first one)
    // The icon is mocked as <div data-testid="icon-tv" /> inside a button
    const iconBtn = screen.getAllByRole('button').find(b => b.querySelector('[data-testid="icon-tv"]'));
    if (!iconBtn) throw new Error('Profile icon button not found');
    
    fireEvent.click(iconBtn);

    expect(screen.getByText('配置')).toBeInTheDocument();
    // Profile editor shouldn't show Entity ID search
    expect(screen.queryByText('实体 ID')).not.toBeInTheDocument();
  });

  it('shows confirmation when exiting config mode with unsaved changes', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('进入配置模式'));

    const menuBtn = screen.getAllByRole('button').find(b => b.querySelector('[data-testid="icon-menu"]'));
    if (menuBtn) fireEvent.click(menuBtn);

    const input = screen.getByPlaceholderText('1-20 字符');
    fireEvent.change(input, { target: { value: 'Changed' } });

    fireEvent.click(screen.getByLabelText('关闭'));

    expect(global.confirm).toHaveBeenCalledWith('你有未保存的更改，确定要退出配置模式吗？');
  });
});
