// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from '@/utils/clipboard';

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    const nav = navigator as Navigator & { clipboard?: Clipboard };
    Reflect.deleteProperty(nav, 'clipboard');
    Reflect.deleteProperty(document as Document & { execCommand?: (command: string) => boolean }, 'execCommand');
  });

  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyTextToClipboard(' HAUI-MACHINE ')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('HAUI-MACHINE');
  });

  it('falls back to textarea copy when Clipboard API is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyTextToClipboard('HAUI-MACHINE')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('HAUI-MACHINE');
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('returns false for empty text', async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await expect(copyTextToClipboard('   ')).resolves.toBe(false);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('returns false when no clipboard mechanism is available', async () => {
    await expect(copyTextToClipboard('HAUI-MACHINE')).resolves.toBe(false);
  });
});
