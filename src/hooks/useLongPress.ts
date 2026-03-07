import { useCallback, useRef, useState } from 'react';

export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  { delay = 500 } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<any>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // 在移动端，我们不能在这里 preventDefault，否则会阻止滚动
      const eventTarget = event.target;
      target.current = eventTarget;
      timeout.current = setTimeout(() => {
        onLongPress();
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered && onClick) {
        onClick();
      }
      setLongPressTriggered(false);
    },
    [onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseMove: (_e: React.MouseEvent) => {
        // 如果移动距离过大，取消长按
        if (timeout.current) clearTimeout(timeout.current);
    },
    onTouchMove: (_e: React.TouchEvent) => {
        // 移动端滚动时取消长按
        if (timeout.current) clearTimeout(timeout.current);
    },
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
  };
}
