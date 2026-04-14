import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  connectToHA, 
  subscribeToEntities, 
  callService as haCallService, 
  determineBestConnection,
  fetchAreaRegistry,
  fetchDeviceRegistry,
  fetchEntityRegistry,
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  sanitizeToken,
  isValidTokenFormat
} from '@/utils/ha-connection';
import { Connection, HassEntities } from 'home-assistant-js-websocket';
import { StateRefreshCoordinator } from '@/utils/request-coordinator';
import { logger } from '@/utils/logger';

interface HAConfig {
  localUrl?: string;
  publicUrl?: string;
  token?: string;
}

// 创建全局请求协调器实例（模块级单例）
const globalCoordinator = new StateRefreshCoordinator({
  minInterval: 5000, // 5 秒内不重复请求
  timeout: 30000
});

export function useHomeAssistant(config?: HAConfig) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [areas, setAreas] = useState<HAArea[]>([]);
  const [devicesRegistry, setDevicesRegistry] = useState<HADevice[]>([]);
  const [entitiesRegistry, setEntitiesRegistry] = useState<HAEntityRegistryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  // 新增：connectionReady 状态，确保 WebSocket 完全就绪后才允许调用服务
  const [isConnectionReady, setIsConnectionReady] = useState(false);
  const [connectionType, setConnectionType] = useState<'Public' | 'Local' | null>(null);
  const [restBaseUrl, setRestBaseUrl] = useState<string>('/ha-api');
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [latency, setLatency] = useState<number | null>(null);

  // 使用 ref 保持重连状态跨渲染周期
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  // 新增：用于等待连接就绪的 Promise resolver
  const connectionReadyResolversRef = useRef<Array<() => void>>([]);
  // 使用 ref 追踪连接状态，确保 callService 始终获取最新值（避免闭包过期）
  const connectionRef = useRef<Connection | null>(null);
  const isConnectedRef = useRef(false);
  const isConnectionReadyRef = useRef(false);
  // 使用 ref 追踪 token 和 REST base URL，确保 fetchStatesRest 等通过 ref 访问最新值
  const configTokenRef = useRef(config?.token || '');
  const restBaseUrlRef = useRef('/ha-api');

  // Heartbeat / Latency check
  useEffect(() => {
    if (!connection || !isConnectionReady) {
      setLatency(null);
      return;
    }

    const checkLatency = async () => {
      const start = performance.now();
      try {
        await connection.sendMessagePromise({ type: 'ping' });
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch (e) {
        logger.warn('Heartbeat failed:', e);
        setLatency(null);
      }
    };

    checkLatency();
    const interval = setInterval(checkLatency, 10000);
    return () => clearInterval(interval);
  }, [connection, isConnectionReady]);

  // 使用 ref 保存上一次的配置值，用于比较
  const prevConfigRef = useRef({ localUrl: '', publicUrl: '', token: '' });

  // 同步 token ref，供 fetchStatesRest/fetchEntityStateRest 通过 ref 访问
  useEffect(() => {
    configTokenRef.current = config?.token || '';
  }, [config?.token]);

  // Effect to establish connection
  useEffect(() => {
    let unsubscribeEntities: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    let isMounted = true;

    // 检查配置是否真正发生变化（使用清理后的 token）
    const sanitizedToken = sanitizeToken(config?.token);
    const currentConfig = {
      localUrl: config?.localUrl || '',
      publicUrl: config?.publicUrl || '',
      token: sanitizedToken
    };
    
    const configChanged = 
      prevConfigRef.current.localUrl !== currentConfig.localUrl ||
      prevConfigRef.current.publicUrl !== currentConfig.publicUrl ||
      prevConfigRef.current.token !== currentConfig.token;
    
    // 如果配置没有变化且已经连接，跳过重新连接
    if (!configChanged && isConnected && isConnectionReady) {
      return;
    }
    
    // 更新 ref 中的配置值
    prevConfigRef.current = currentConfig;

    const initConnection = async () => {
      try {
        // 优先使用配置中的 token，否则使用环境变量
        const envToken = import.meta.env.VITE_HA_TOKEN;
        const isEnvTokenValid = isValidTokenFormat(sanitizeToken(envToken));
        // 使用 sanitizeToken 清理 token
        const token = sanitizeToken(config?.token) || (isEnvTokenValid ? sanitizeToken(envToken) : '');
        
        let url = '';
        let type: 'Public' | 'Local' | null = null;

        if (config?.localUrl || config?.publicUrl) {
            logger.info('Determining best connection...');
            const best = await determineBestConnection({ 
                localUrl: config.localUrl, 
                publicUrl: config.publicUrl, 
                token 
            });

            if (best) {
                logger.info(`Best connection found: ${best.type} (${best.url})`);
                url = best.url;
                type = best.type;
            } else {
                logger.warn('All configured connections failed availability check.');
                throw new Error('无法连接到 Home Assistant：配置的地址均不可达');
            }
        }

        if (!isMounted) return;
        
        const connectionConfig = (url && token) ? { url, token } : undefined;

        let conn;
        try {
            logger.info(`Attempting connection to ${url || 'default env URL'} (${type || 'Default'})`);
            conn = await connectToHA(connectionConfig);
        } catch (initialErr) {
            logger.error('Connection failed:', initialErr);
            const isUsingDefaultEnv = !config?.localUrl && !config?.publicUrl;
            
            if (isUsingDefaultEnv) {
                 logger.warn('Initial default connection failed, trying proxy fallback...', initialErr);
                try {
                    url = '/ha-api';
                    type = 'Local';
                    conn = await connectToHA({
                        url,
                        token  // token 已经包含 config.token 或 env token
                    });
                    logger.info('Connected via Proxy');
                } catch (proxyErr) {
                    logger.error('Proxy connection also failed', proxyErr);
                    throw initialErr;
                }
            } else {
                throw initialErr;
            }
        }
        
        if (!isMounted) {
            conn.close();
            return;
        }

        // 同步更新 ref（立即生效，不依赖 React 渲染周期）
        connectionRef.current = conn;
        isConnectedRef.current = true;
        isConnectionReadyRef.current = true;
        setConnection(conn);
        setIsConnected(true);
        // 连接建立后立即设置 ready 状态，因为 createConnection 成功即表示可用
        setIsConnectionReady(true);
        // 解析所有等待连接就绪的 Promise
        connectionReadyResolversRef.current.forEach(resolve => resolve());
        connectionReadyResolversRef.current = [];
        setConnectionType(type);
        setError(null);
        if (url) {
          // 处理代理路径（如 /ha-api）和完整 URL
          const normalized = url.startsWith('/')
            ? url  // 代理路径保持不变
            : url
                .replace(/\/api\/websocket\/?$/, '')
                .replace(/^wss:\/\//, 'https://')
                .replace(/^ws:\/\//, 'http://')
                .replace(/\/$/, '');
          setRestBaseUrl(normalized);
          // 同步 ref，供 REST 降级函数使用
          restBaseUrlRef.current = normalized;
        }

        // 指数退避重连机制
        const maxReconnectDelay = 30000; // 最大延迟 30 秒
        const baseReconnectDelay = 1000; // 基础延迟 1 秒
        
        const scheduleReconnect = () => {
            if (!isMounted) return;
            
            // 清除之前的重连定时器
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            
            // 计算指数退避延迟: 1s, 2s, 4s, 8s... 最大 30s
            const delay = Math.min(
                baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
                maxReconnectDelay
            );
            
            logger.info(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
            
            reconnectTimerRef.current = setTimeout(() => {
                if (isMounted) {
                    reconnectAttemptsRef.current++;
                    initConnection();
                }
            }, delay);
        };

        conn.addEventListener('disconnected', () => {
            logger.info('Connection lost. Re-evaluating network...');
            // 同步更新 ref（立即生效，确保 callService 不会使用过期连接）
            connectionRef.current = null;
            isConnectedRef.current = false;
            isConnectionReadyRef.current = false;
            // 更新 React state（触发 UI 重渲染）
            setIsConnected(false);
            setIsConnectionReady(false);
            setConnection(null);
            // 重置请求协调器状态
            globalCoordinator.reset();
            scheduleReconnect();
        });
        
        // 连接成功后重置重连计数
        conn.addEventListener('ready', () => {
            reconnectAttemptsRef.current = 0;
            // 同步更新 ref（确保 callService 立即可用）
            isConnectionReadyRef.current = true;
            setIsConnectionReady(true);
            // 解析所有等待连接就绪的 Promise
            connectionReadyResolversRef.current.forEach(resolve => resolve());
            connectionReadyResolversRef.current = [];
        });

        // Subscribe to entities
        unsubscribeEntities = subscribeToEntities(conn, (newEntities) => {
          if (isMounted) setEntities(newEntities);
        });

        // Subscribe to state_changed events
        // 事件日志去重：同一实体 1 秒内只记录一次（仅影响日志显示，不影响实体状态同步）
        const eventThrottleMap = new Map<string, number>();
        const EVENT_THROTTLE_MS = 1000; // 1 秒节流 - 仅用于日志去重，不影响事件处理
        
        unsubscribeEvents = await conn.subscribeEvents((event: { event_type: string; data: Record<string, unknown> }) => {
            if (!isMounted) return;
            
            // 获取实体 ID 进行日志节流检查
            const entityId = event.data?.entity_id as string | undefined;
            const now = Date.now();
            
            // 检查是否需要记录日志（节流控制，避免日志过多）
            let shouldLog = true;
            if (entityId && event.event_type === 'state_changed') {
                const lastEventTime = eventThrottleMap.get(entityId) ?? 0;
                if (now - lastEventTime < EVENT_THROTTLE_MS) {
                    shouldLog = false; // 跳过频繁日志记录，但不跳过事件处理
                } else {
                    eventThrottleMap.set(entityId, now);
                }
            }
            
            // 注意：无论是否记录日志，都要处理事件并添加到事件列表
            // 日志节流只影响 UI 显示，不影响事件数据的处理
            setEvents(prev => [{
                time: new Date().toLocaleTimeString(),
                type: event.event_type,
                data: event.data,
                isThrottled: !shouldLog  // 标记是否被节流，供 UI 决定是否显示
            }, ...prev].slice(0, 100));
        }, 'state_changed');

        // Fetch registries
        try {
            const [fetchedAreas, fetchedDevices, fetchedEntities] = await Promise.all([
                fetchAreaRegistry(conn),
                fetchDeviceRegistry(conn),
                fetchEntityRegistry(conn)
            ]);
            if (isMounted) {
                setAreas(fetchedAreas);
                setDevicesRegistry(fetchedDevices);
                setEntitiesRegistry(fetchedEntities);
            }
        } catch (registryErr) {
            logger.warn('Failed to fetch registries:', registryErr);
        }

      } catch (err: unknown) {
        logger.error('HA Connection Error:', err);
        if (isMounted) {
            // 同步重置 ref
            connectionRef.current = null;
            isConnectedRef.current = false;
            isConnectionReadyRef.current = false;
            const errorMessage = err instanceof Error ? err.message : '未知连接错误';
            setError(errorMessage);
            setIsConnected(false);
        }
      }
    };

    const effectiveToken = sanitizeToken(config?.token);
    const envToken = import.meta.env.VITE_HA_TOKEN;
    const isEnvTokenValid = isValidTokenFormat(sanitizeToken(envToken));
    
    // 确定实际使用的 token（优先使用配置中的 token）
    const tokenToUse = effectiveToken || (isEnvTokenValid ? sanitizeToken(envToken) : '');

    // 防止重复连接：如果正在连接中，跳过
    if (isConnectingRef.current) {
      logger.info('Connection already in progress, skipping...');
      return;
    }
    
    // 重置连接状态锁的超时保护（30秒）
    setTimeout(() => {
      if (isConnectingRef.current) {
        logger.warn('Connection lock timeout, resetting...');
        isConnectingRef.current = false;
      }
    }, 30000);

    if (isValidTokenFormat(tokenToUse)) {
      isConnectingRef.current = true;
      initConnection().finally(() => {
        isConnectingRef.current = false;
      });
    } else {
        if (tokenToUse && tokenToUse.length <= 20) {
            logger.warn('Token too short, skipping connection.');
        } else {
            logger.info('Home Assistant not configured, skipping connection.');
        }
    }

    return () => {
      isMounted = false;
      // 清理重连定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (unsubscribeEntities) unsubscribeEntities();
      if (unsubscribeEvents) unsubscribeEvents();
    };
    // 使用稳定的依赖项，避免不必要的重连
  // 注意：config 对象引用变化不应触发重连，只有实际配置值变化才应该
  }, [config?.localUrl, config?.publicUrl, config?.token]);

  const callService = useCallback(async (domain: string, service: string, serviceData?: object) => {
    // 通过 ref 获取最新状态（核心修复：避免 React 渲染延迟导致的闭包过期）
    let currentConn = connectionRef.current;
    let currentReady = isConnectionReadyRef.current;
    let currentConnected = isConnectedRef.current;

    // 连接正在建立中（已连接但未就绪），等待就绪
    if (!currentReady && currentConnected) {
      logger.info('等待连接就绪...');
      const waitForReady = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection ready timeout'));
        }, 5000);

        connectionReadyResolversRef.current.push(() => {
          clearTimeout(timeout);
          resolve();
        });
      });

      try {
        await waitForReady;
      } catch {
        logger.warn('等待连接就绪超时，尝试继续调用');
      }

      // 等待后重新读取最新状态
      currentConn = connectionRef.current;
      currentReady = isConnectionReadyRef.current;
      currentConnected = isConnectedRef.current;
    }

    // 最终连接有效性校验
    if (!currentConn || !currentConnected) {
      logger.warn('无法调用服务：无活跃连接', { domain, service, hasConnection: !!currentConn, isConnected: currentConnected });
      throw new Error('Home Assistant 未连接，请稍后重试');
    }

    // 自动重试机制，最多重试 2 次
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // 每次重试前重新获取连接（可能在重试期间完成重连）
      const conn = connectionRef.current;
      if (!conn) {
        lastError = new Error('连接在重试期间丢失');
        break;
      }

      try {
        // 超时保护，防止调用挂起
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Service call timeout')), 10000);
        });

        await Promise.race([
          haCallService(conn, domain, service, serviceData),
          timeoutPromise
        ]);

        logger.debug(`服务调用成功: ${domain}.${service}`, serviceData);
        return; // 成功直接返回
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // 可重试的错误类型
        const isRetryableError = lastError.message.includes('timeout') ||
                                  lastError.message.includes('not connected') ||
                                  lastError.message.includes('connection');

        if (attempt < maxRetries && isRetryableError) {
          logger.info(`重试服务调用 (${attempt + 1}/${maxRetries}): ${domain}.${service}`);
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }

        logger.error(`服务调用失败 ${domain}.${service}，共 ${attempt + 1} 次尝试:`, lastError);

        // 连接级错误：同步标记断开
        if (lastError.message.includes('connection') ||
            lastError.message.includes('closed') ||
            lastError.message.includes('timeout')) {
          connectionRef.current = null;
          isConnectedRef.current = false;
          isConnectionReadyRef.current = false;
          setIsConnected(false);
          setIsConnectionReady(false);
          setConnection(null);
        }

        throw lastError;
      }
    }

    throw lastError;
  }, []); // 空依赖：所有状态通过 ref 访问，setter 和模块级函数引用稳定

  const refreshEntities = useCallback(async () => {
    // 通过 ref 获取最新连接（与 callService 保持一致）
    const conn = connectionRef.current;
    if (!conn) {
      throw new Error('未连接到 Home Assistant');
    }
    
    // 使用全局请求协调器，防止短时间内重复请求
    try {
      const entities = await globalCoordinator.refresh(conn);
      setEntities(entities);
      return entities;
    } catch (error) {
      console.error('Failed to refresh entities:', error);
      throw error;
    }
  }, []); // 空依赖：通过 ref 访问连接

  const fetchEntityStateRest = useCallback(async (entityId: string) => {
    // 通过 ref 获取最新 token 和 base URL（与 callService 保持一致的 ref 模式）
    const envToken = import.meta.env.VITE_HA_TOKEN;
    const isEnvTokenValid = envToken && envToken !== 'your_long_lived_access_token_here';
    const token = configTokenRef.current || (isEnvTokenValid ? envToken : '');
    if (!token) {
      throw new Error('缺少 Home Assistant Token');
    }
    const base = restBaseUrlRef.current || '/ha-api';
    const res = await fetch(`${base}/api/states/${encodeURIComponent(entityId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`states API 请求失败: ${res.status}`);
    }
    return res.json();
  }, []); // 空依赖：通过 ref 访问 token 和 baseUrl

  const fetchStatesRest = useCallback(async () => {
    // 优先使用 WebSocket（通过 ref 获取最新连接，避免闭包过期）
    const conn = connectionRef.current;
    if (conn) {
      try {
        const states = await conn.sendMessagePromise({ type: 'get_states' });
        if (Array.isArray(states)) {
          return states;
        }
      } catch (wsErr) {
        console.warn('WebSocket get_states failed, falling back to REST:', wsErr);
      }
    }

    // REST 降级：通过 ref 获取最新 token 和 base URL
    const envToken = import.meta.env.VITE_HA_TOKEN;
    const isEnvTokenValid = envToken && envToken !== 'your_long_lived_access_token_here';
    const token = configTokenRef.current || (isEnvTokenValid ? envToken : '');
    if (!token) {
      throw new Error('缺少 Home Assistant Token');
    }
    const base = restBaseUrlRef.current || '/ha-api';
    const res = await fetch(`${base}/api/states`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`states API 请求失败: ${res.status}`);
    }
    return res.json();
  }, []); // 空依赖：通过 ref 访问 token、baseUrl 和连接

  return {
    entities,
    areas,
    devicesRegistry,
    entitiesRegistry,
    isConnected,
    isConnectionReady,  // 新增：返回连接就绪状态
    connectionType,
    error,
    callService,
    connection,
    events,
    refreshEntities,
    fetchEntityStateRest,
    fetchStatesRest,
    restBaseUrl,
    latency
  };
}
