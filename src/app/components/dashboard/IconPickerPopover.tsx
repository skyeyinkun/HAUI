import React, { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { AssetIconPicker } from './AssetIconPicker';
import { CustomIcon } from './cards/shared/CustomIcon';

interface IconPickerPopoverProps {
  value: string;
  onChange: (icon: string) => void;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function IconPickerPopover({ value, onChange, children, align = 'center', side = 'bottom' }: IconPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingIcon(null);
      return;
    }
    setPendingIcon(value);
  }, [open, value]);

  const handleConfirm = () => {
    const icon = pendingIcon ?? value;
    if (!icon || icon === value) {
      setOpen(false);
      return;
    }
    onChange(icon);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="z-[100] outline-none max-w-[min(var(--radix-popover-content-available-width),calc(100vw-24px))] max-h-[min(var(--radix-popover-content-available-height),calc(100vh-24px))]" 
          align={align} 
          side={side}
          sideOffset={8}
          collisionPadding={12}
        >
          <div className="bg-card border rounded-lg shadow-xl overflow-hidden max-w-[min(600px,calc(100vw-24px))] max-h-[min(700px,calc(100vh-24px))] flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                  <CustomIcon name={(pendingIcon ?? value) || value} className="w-5 h-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground leading-none">预览</div>
                  <div className="text-xs font-mono truncate max-w-[240px]">{pendingIcon ?? value}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border bg-background hover:bg-accent transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!pendingIcon || pendingIcon === value}
                  className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  确认
                </button>
              </div>
            </div>

            <AssetIconPicker
              value={pendingIcon ?? value}
              onChange={setPendingIcon}
              className="w-[min(600px,calc(100vw-24px))] p-0 border-0 shadow-none h-auto"
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
