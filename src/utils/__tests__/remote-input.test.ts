// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRemoteInputController } from '@/utils/remote-input';

describe('createRemoteInputController', () => {
  it('fires immediately and throttles within minIntervalMs without delay', () => {
    const send = vi.fn();
    let t = 0;
    const now = () => t;
    const ctrl = createRemoteInputController({ send, minIntervalMs: 15, now });

    const h = ctrl.handlersFor('power');

    h.onKeyDown({ key: 'Enter', preventDefault: vi.fn() });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('power');

    t = 10;
    h.onKeyDown({ key: 'Enter', preventDefault: vi.fn() });
    expect(send).toHaveBeenCalledTimes(1);

    t = 16;
    h.onKeyDown({ key: 'Enter', preventDefault: vi.fn() });
    expect(send).toHaveBeenCalledTimes(2);
  });
});

