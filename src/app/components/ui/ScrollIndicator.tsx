import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 滚动指示器组件
 * 为横向滚动容器添加渐变遮罩和滚动箭头提示
 */
interface ScrollIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollIndicator({ children, className = '' }: ScrollIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  // 检查滚动位置，更新指示器状态
  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    
    // 左侧指示器：滚动位置 > 20px 时显示
    setShowLeftIndicator(scrollLeft > 20);
    // 右侧指示器：还有内容可滚动时显示（留 20px 缓冲）
    setShowRightIndicator(scrollLeft < maxScroll - 20);
  }, []);

  // 初始化和窗口大小变化时检查
  useEffect(() => {
    checkScroll();
    
    const container = containerRef.current;
    if (!container) return;

    // 监听滚动事件
    container.addEventListener('scroll', checkScroll);
    
    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  // 滚动到指定方向
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const scrollAmount = 150;
    const targetScroll = containerRef.current.scrollLeft + 
      (direction === 'left' ? -scrollAmount : scrollAmount);
    
    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* 左侧渐变遮罩和箭头 */}
      {showLeftIndicator && (
        <>
          {/* 渐变遮罩 */}
          <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          {/* 左箭头按钮 */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border border-border/20 flex items-center justify-center hover:bg-accent transition-colors"
            title="向左滚动"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </>
      )}

      {/* 滚动容器 */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-hide"
      >
        {children}
      </div>

      {/* 右侧渐变遮罩和箭头 */}
      {showRightIndicator && (
        <>
          {/* 渐变遮罩 */}
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          {/* 右箭头按钮 */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border border-border/20 flex items-center justify-center hover:bg-accent transition-colors"
            title="向右滚动"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
