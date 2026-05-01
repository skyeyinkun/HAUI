/**
 * 统一错误处理工具
 * 提供标准化的错误处理和用户提示
 */

import { toast } from 'sonner';
import { logger } from './logger';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  SERVICE = 'service',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * 获取错误类型
 */
function getErrorType(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return ErrorType.AUTH;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('service') || message.includes('api')) {
      return ErrorType.SERVICE;
    }
  }
  return ErrorType.UNKNOWN;
}

/**
 * 获取用户友好的错误消息
 */
function getUserMessage(error: unknown, context: string): string {
  const errorType = getErrorType(error);
  
  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: `${context}失败：网络连接异常`,
    [ErrorType.AUTH]: `${context}失败：认证错误，请检查配置`,
    [ErrorType.SERVICE]: `${context}失败：服务不可用`,
    [ErrorType.VALIDATION]: `${context}失败：数据验证错误`,
    [ErrorType.UNKNOWN]: `${context}失败：发生未知错误`,
  };
  
  return messages[errorType];
}

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param context 错误上下文（如"设备控制"、"场景激活"）
 * @param showToast 是否显示 toast 提示（默认 true）
 * @param logError 是否记录错误日志（默认 true）
 */
export function handleError(
  error: unknown,
  context: string,
  showToast = true,
  logError = true
): void {
  const errorMessage = error instanceof Error ? error.message : '未知错误';
  const userMessage = getUserMessage(error, context);
  
  if (logError) {
    logger.error(`[${context}]`, error);
  }
  
  if (showToast) {
    toast.error(userMessage, {
      description: errorMessage,
    });
  }
}

/**
 * 包装异步函数，自动处理错误
 * @param fn 异步函数
 * @param context 错误上下文
 * @returns 包装后的函数
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: string
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      handleError(error, context);
      return undefined;
    }
  };
}

/**
 * 服务调用错误处理（专门用于 Home Assistant 服务调用）
 * @param error 错误对象
 * @param serviceName 服务名称
 * @param entityId 实体 ID
 */
export function handleServiceError(
  error: unknown,
  serviceName: string,
  entityId?: string
): void {
  const context = entityId ? `${serviceName} (${entityId})` : serviceName;
  handleError(error, context);
}
