/**
 * 统一日志管理工具
 * 根据环境控制日志输出级别
 */

// 日志级别定义
const enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 从环境变量或 localStorage 获取当前日志级别
const getLogLevel = (): LogLevel => {
  if (typeof window === 'undefined') return LogLevel.WARN;
  
  // 检查 localStorage 中的调试开关；部分 WebView/测试环境可能禁用或替换 storage。
  try {
    const debugEnabled = window.localStorage?.getItem?.('haui_debug') === '1';
    if (debugEnabled) return LogLevel.DEBUG;
  } catch {
    // 忽略 storage 访问失败，继续使用环境默认级别。
  }
  
  // 生产环境默认只显示警告和错误
  if (import.meta.env.PROD) return LogLevel.WARN;
  
  // 开发环境显示所有日志
  return LogLevel.DEBUG;
};

const currentLevel = getLogLevel();

/**
 * 日志工具对象
 */
export const logger = {
  /**
   * 调试日志 - 仅在开发环境或开启调试模式时输出
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(`[HAUI] ${message}`, ...args);
    }
  },

  /**
   * 信息日志 - 仅在开发环境或开启调试模式时输出
   */
  info: (message: string, ...args: unknown[]): void => {
    if (currentLevel <= LogLevel.INFO) {
      console.info(`[HAUI] ${message}`, ...args);
    }
  },

  /**
   * 警告日志 - 始终输出
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(`[HAUI] ${message}`, ...args);
    }
  },

  /**
   * 错误日志 - 始终输出
   */
  error: (message: string, ...args: unknown[]): void => {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(`[HAUI] ${message}`, ...args);
    }
  },
};

/**
 * 启用调试模式
 */
export const enableDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('haui_debug', '1');
    console.info('[HAUI] 调试模式已启用，刷新页面后生效');
  }
};

/**
 * 禁用调试模式
 */
export const disableDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('haui_debug');
    console.info('[HAUI] 调试模式已禁用，刷新页面后生效');
  }
};
