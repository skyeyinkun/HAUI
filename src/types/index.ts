/**
 * 类型导出入口
 * 集中导出所有类型定义，便于在其他模块中导入
 */

export * from './device';
export * from './home-assistant';
export * from './dashboard';
export * from './user';
export * from './room';
export * from './remote';
export * from './card-config';

/**
 * 通用异步状态类型
 * 用于统一管理异步加载状态
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 操作结果类型
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 通用日志类型
 */
export interface LogEntry {
  time: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}
