import { HassEntities } from 'home-assistant-js-websocket';
import { HAConfig } from '@/types/home-assistant';

/**
 * 僵尸实体检测结果
 */
export interface OrphanedEntityResult {
  /** 设备 ID */
  deviceId: string;
  /** 映射的 entity_id */
  entityId: string;
  /** 失效原因 */
  reason: 'entity_not_found' | 'entity_unavailable' | 'domain_mismatch';
}

/**
 * 检测失效的设备映射
 * 扫描 haConfig.deviceMappings 中不存在或不可用的 entity_id
 * 
 * @param entities 当前 HA 实体列表
 * @param deviceMappings 设备映射配置
 * @returns 失效映射列表
 */
export function detectOrphanedEntities(
  entities: HassEntities,
  deviceMappings: HAConfig['deviceMappings']
): OrphanedEntityResult[] {
  const orphaned: OrphanedEntityResult[] = [];

  Object.entries(deviceMappings).forEach(([deviceId, entityId]) => {
    if (!entityId) return;

    const entity = entities[entityId];

    if (!entity) {
      // 实体完全不存在
      orphaned.push({
        deviceId,
        entityId,
        reason: 'entity_not_found',
      });
    } else if (entity.state === 'unavailable') {
      // 实体存在但不可用
      orphaned.push({
        deviceId,
        entityId,
        reason: 'entity_unavailable',
      });
    }
  });

  return orphaned;
}

/**
 * 清理失效的设备映射
 * 
 * @param deviceMappings 原始设备映射
 * @param orphanedEntities 失效实体列表
 * @returns 清理后的设备映射
 */
export function cleanOrphanedMappings(
  deviceMappings: HAConfig['deviceMappings'],
  orphanedEntities: OrphanedEntityResult[]
): HAConfig['deviceMappings'] {
  const orphanedIds = new Set(orphanedEntities.map(o => o.deviceId));
  
  const cleaned: HAConfig['deviceMappings'] = {};
  
  Object.entries(deviceMappings).forEach(([deviceId, entityId]) => {
    if (!orphanedIds.has(deviceId)) {
      (cleaned as Record<string, string>)[deviceId] = entityId;
    }
  });

  return cleaned;
}

/**
 * 获取失效实体的友好描述
 */
export function getOrphanedReasonText(reason: OrphanedEntityResult['reason']): string {
  switch (reason) {
    case 'entity_not_found':
      return '实体不存在（可能已在 HA 中删除）';
    case 'entity_unavailable':
      return '实体不可用（设备离线或集成异常）';
    case 'domain_mismatch':
      return '实体类型不匹配';
    default:
      return '未知原因';
  }
}

/**
 * 统计僵尸实体信息
 */
export function getOrphanedStats(orphanedEntities: OrphanedEntityResult[]): {
  total: number;
  byReason: Record<OrphanedEntityResult['reason'], number>;
} {
  const byReason: Record<OrphanedEntityResult['reason'], number> = {
    entity_not_found: 0,
    entity_unavailable: 0,
    domain_mismatch: 0,
  };

  orphanedEntities.forEach(o => {
    byReason[o.reason]++;
  });

  return {
    total: orphanedEntities.length,
    byReason,
  };
}
