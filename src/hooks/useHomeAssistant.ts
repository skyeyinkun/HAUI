import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  connectToHA, 
  subscribeToEntities, 
  callService as haCallService, 
  determineBestConnection,
  disconnectHA,
  fetchAreaRegistry,
  fetchDeviceRegistry,
  fetchEntityRegistry,
  HAArea,
  HADevice,
  HAEntityRegistryEntry
} from '@/utils/ha-connection';
import { Connection, HassEntities } from 'home-assistant-js-websocket';

interface HAConfig {
  localUrl?: string;
  publicUrl?: string;
  token?: string;
}

export function useHomeAssistant(config?: HAConfig) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [areas, setAreas] = useState<HAArea[]>([]);
  const [devicesRegistry, setDevicesRegistry] = useState<HADevice[]>([]);
  const [entitiesRegistry, setEntitiesRegistry] = useState<HAEntityRegistryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'Public' | 'Local' | null>(null);
  const [restBaseUrl, setRestBaseUrl] = useState<string>('/ha-api');
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  // Heartbeat / Latency check
  useEffect(() => {
    if (!connection || !isConnected) {
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
        console.warn('Heartbeat failed:', e);
        setLatency(null);
      }
    };

    checkLatency();
    const interval = setInterval(checkLatency, 10000);
    return () => clearInterval(interval);
  }, [connection, isConnected]);

  // Effect to establish connection
  useEffect(() => {
    let unsubscribeEntities: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    let isMounted = true;

    const initConnection = async () => {
      try {
        const token = config?.token;
        let url = '';
        let type: 'Public' | 'Local' | null = null;

        if (config?.localUrl || config?.publicUrl) {
            console.log('Determining best connection...');
            const best = await determineBestConnection({ 
                localUrl: config.localUrl, 
                publicUrl: config.publicUrl, 
                token 
            });

            if (best) {
                console.log(`Best connection found: ${best.type} (${best.url})`);
                url = best.url;
                type = best.type;
            } else {
                console.warn('All configured connections failed availability check.');
                throw new Error('无法连接到 Home Assistant：配置的地址均不可达');
            }
        }

        if (!isMounted) return;
        
        const connectionConfig = (url && token) ? { url, token } : undefined;

        let conn;
        try {
            console.log(`Attempting connection to ${url || 'default env URL'} (${type || 'Default'})`);
            conn = await connectToHA(connectionConfig);
        } catch (initialErr) {
            console.error('Connection failed:', initialErr);
            const isUsingDefaultEnv = !config?.localUrl && !config?.publicUrl;
            
            if (isUsingDefaultEnv) {
                 console.warn('Initial default connection failed, trying proxy fallback...', initialErr);
                try {
                    url = '/ha-api';
                    type = 'Local';
                    conn = await connectToHA({
                        url,
                        token: token || import.meta.env.VITE_HA_TOKEN
                    });
                    console.log('Connected via Proxy');
                } catch (proxyErr) {
                    console.error('Proxy connection also failed', proxyErr);
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

        setConnection(conn);
        setIsConnected(true);
        setConnectionType(type);
        setError(null);
        if (url) {
          const normalized = url
            .replace(/\/api\/websocket\/?$/, '')
            .replace(/^wss:\/\//, 'https://')
            .replace(/^ws:\/\//, 'http://')
            .replace(/\/$/, '');
          setRestBaseUrl(normalized);
        }

        conn.addEventListener('disconnected', () => {
            console.log('Connection lost. Re-evaluating network...');
            setIsConnected(false);
            if (isMounted) {
                setTimeout(() => {
                    if (isMounted) initConnection();
                }, 5000);
            }
        });

        // Subscribe to entities
        unsubscribeEntities = subscribeToEntities(conn, (newEntities) => {
          if (isMounted) setEntities(newEntities);
        });

        // Subscribe to state_changed events
        unsubscribeEvents = await conn.subscribeEvents((event) => {
            if (isMounted) {
                setEvents(prev => [{
                    time: new Date().toLocaleTimeString(),
                    type: event.event_type,
                    data: event.data
                }, ...prev].slice(0, 100));
            }
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
            console.warn('Failed to fetch registries:', registryErr);
        }

      } catch (err: any) {
        console.error('HA Connection Error:', err);
        if (isMounted) {
            setError(err.message);
            setIsConnected(false);
        }
      }
    };

    const effectiveToken = config?.token?.trim() || '';
    const envToken = import.meta.env.VITE_HA_TOKEN;
    const isEnvTokenValid = envToken && envToken !== 'your_long_lived_access_token_here';

    if ((effectiveToken && effectiveToken.length > 20) || isEnvTokenValid) {
      initConnection();
    } else {
        if (effectiveToken && effectiveToken.length <= 20) {
            console.warn('Token too short, skipping connection.');
        } else {
            console.log('Home Assistant not configured, skipping connection.');
        }
    }

    return () => {
      isMounted = false;
      if (unsubscribeEntities) unsubscribeEntities();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [config?.localUrl, config?.publicUrl, config?.token]);

  const callService = useCallback(async (domain: string, service: string, serviceData?: object) => {
    if (!connection) {
      console.warn('Cannot call service: No connection');
      return;
    }
    try {
      await haCallService(connection, domain, service, serviceData);
    } catch (err) {
      console.error('Failed to call service:', err);
      throw err;
    }
  }, [connection]);

  const refreshEntities = useCallback(async () => {
    if (!connection) {
      throw new Error('未连接到 Home Assistant');
    }
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const p = (async () => {
      const states = await connection.sendMessagePromise({ type: 'get_states' });
      const next: HassEntities = {};
      if (Array.isArray(states)) {
        for (const st of states as any[]) {
          if (st && typeof st.entity_id === 'string') {
            next[st.entity_id] = st;
          }
        }
      }
      setEntities(next);
    })().finally(() => {
      refreshInFlightRef.current = null;
    });
    refreshInFlightRef.current = p;
    return p;
  }, [connection]);

  const fetchEntityStateRest = useCallback(async (entityId: string) => {
    const token = config?.token || import.meta.env.VITE_HA_TOKEN;
    if (!token) {
      throw new Error('缺少 Home Assistant Token');
    }
    const base = restBaseUrl || '/ha-api';
    const res = await fetch(`${base}/api/states/${encodeURIComponent(entityId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`states API 请求失败: ${res.status}`);
    }
    return res.json();
  }, [config?.token, restBaseUrl]);

  const fetchStatesRest = useCallback(async () => {
    if (connection) {
      try {
        const states = await connection.sendMessagePromise({ type: 'get_states' });
        if (Array.isArray(states)) {
          return states;
        }
      } catch (wsErr) {
        console.warn('WebSocket get_states failed, falling back to REST:', wsErr);
      }
    }

    const token = config?.token || import.meta.env.VITE_HA_TOKEN;
    if (!token) {
      throw new Error('缺少 Home Assistant Token');
    }
    const base = restBaseUrl || '/ha-api';
    const res = await fetch(`${base}/api/states`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`states API 请求失败: ${res.status}`);
    }
    return res.json();
  }, [config?.token, restBaseUrl, connection]);

  return {
    entities,
    areas,
    devicesRegistry,
    entitiesRegistry,
    isConnected,
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
