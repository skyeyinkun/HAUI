import { Connection, HassEntities } from 'home-assistant-js-websocket';
import { logger } from './logger';

/**
 * 请求协调器
 * 用于防止短时间内对 Home Assistant 的重复请求
 * 
 * 优化说明：
 * - 多个组件可能同时发起相同的实体状态请求
 * - 通过协调器确保相同请求在短时间内只执行一次
 * - 使用 Promise 缓存让多个调用方共享同一个请求
 */

interface RequestOptions {
  /** 最小请求间隔（毫秒）*/
  minInterval?: number;
  /** 请求超时（毫秒）*/
  timeout?: number;
}

export class StateRefreshCoordinator {
  private refreshPromise: Promise<HassEntities> | null = null;
  private lastRefreshTime = 0;
  private readonly MIN_REFRESH_INTERVAL: number;
  private readonly TIMEOUT: number;

  constructor(options: RequestOptions = {}) {
    this.MIN_REFRESH_INTERVAL = options.minInterval ?? 5000; // 默认 5 秒内不重复请求
    this.TIMEOUT = options.timeout ?? 30000; // 默认 30 秒超时
  }

  /**
   * 刷新实体状态
   * 如果 5 秒内已有进行中的请求，直接返回该 Promise
   * @param connection HA WebSocket 连接
   * @returns 实体状态对象
   */
  async refresh(connection: Connection): Promise<HassEntities> {
    const now = Date.now();

    // 如果有进行中的请求且在间隔时间内，返回现有 Promise
    if (this.refreshPromise && now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      logger.debug('Reusing existing request');
      return this.refreshPromise;
    }

    // 创建新请求
    this.lastRefreshTime = now;
    
    this.refreshPromise = this.executeRefresh(connection);

    try {
      return await this.refreshPromise;
    } finally {
      // 请求完成后清除引用，允许下一次请求
      // 注意：如果请求失败，也允许重试
      this.refreshPromise = null;
    }
  }

  private async executeRefresh(connection: Connection): Promise<HassEntities> {
    try {
      const states = await Promise.race([
        connection.sendMessagePromise({ type: 'get_states' }) as Promise<unknown[]>,
        this.createTimeout(this.TIMEOUT)
      ]) as unknown[];

      const entities: HassEntities = {};
      if (Array.isArray(states)) {
        states.forEach((s) => {
          const state = s as { entity_id?: string; [key: string]: unknown };
          if (state?.entity_id) {
            entities[state.entity_id] = state as HassEntities[string];
          }
        });
      }

      logger.debug('States refreshed successfully');
      return entities;
    } catch (error) {
      logger.error('Failed to refresh states:', error);
      throw error;
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * 强制清除当前请求状态
   * 用于连接断开等情况
   */
  reset(): void {
    this.refreshPromise = null;
    this.lastRefreshTime = 0;
  }

  /**
   * 获取距离下次可请求的剩余时间
   */
  getCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastRefreshTime;
    return Math.max(0, this.MIN_REFRESH_INTERVAL - elapsed);
  }
}

/**
 * 创建请求协调器实例的工厂函数
 */
export function createRequestCoordinator(options?: RequestOptions): StateRefreshCoordinator {
  return new StateRefreshCoordinator(options);
}
