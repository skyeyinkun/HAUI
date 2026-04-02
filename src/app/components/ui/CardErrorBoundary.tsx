import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 卡片级错误边界组件
 * 用于包裹 DeviceCard 等小组件，防止单个组件错误导致整个 Dashboard 崩溃
 */
export class CardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Card error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="relative aspect-square rounded-[16px] p-3 flex flex-col items-center justify-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-xs text-red-600 dark:text-red-400 text-center font-medium">
            组件加载失败
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 简化的错误边界高阶组件
 * 用于快速包裹组件
 */
export function withCardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <CardErrorBoundary>
      <Component {...props} />
    </CardErrorBoundary>
  );
  
  WrappedComponent.displayName = displayName || `withCardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
