import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService as haCallService,
  Connection,
  HassEntities,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH
} from 'home-assistant-js-websocket';

// Read from env vars
const ENV_HA_URL = import.meta.env.VITE_HA_URL;
const ENV_HA_TOKEN = import.meta.env.VITE_HA_TOKEN;

export interface HAConnectionConfig {
  url: string;
  token: string;
}

let connection: Connection | null = null;
let connectionKey: string | null = null;

function normalizeHaBaseUrl(raw: string) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/$/, '');
  }

  let url = trimmed
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://');

  url = url
    .replace(/\/api\/websocket\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

  return url;
}

function buildConnectionKey(url: string, token: string) {
  return `${url}::${token}`;
}

export async function connectToHA(config?: HAConnectionConfig): Promise<Connection> {
  const rawUrl = config?.url || ENV_HA_URL;
  const token = config?.token || ENV_HA_TOKEN;

  if (!rawUrl || !token) {
    throw new Error('Home Assistant URL and Token are required. Please set VITE_HA_URL and VITE_HA_TOKEN or provide config.');
  }

  const url = normalizeHaBaseUrl(rawUrl);
  const nextKey = buildConnectionKey(url, token);
  
  if (token === 'your_long_lived_access_token_here') {
      throw new Error('Default token detected. Please configure a valid Home Assistant token.');
  }

  if (connection && connectionKey === nextKey) {
    return connection;
  }

  console.log(`Connecting to Home Assistant at ${url}...`);

  try {
    const auth = createLongLivedTokenAuth(url, token);
    
    if (connection) {
      connection.close();
      connection = null;
      connectionKey = null;
    }

    connection = await createConnection({ auth });
    connectionKey = nextKey;
    
    connection.addEventListener('ready', () => {
      console.log('HA Connection ready');
    });

    connection.addEventListener('disconnected', () => {
      console.log('HA Connection disconnected');
    });

    connection.addEventListener('reconnect-error', () => {
      console.log('HA Connection reconnect error');
    });

    return connection;
  } catch (err) {
    // Use warn instead of error for connection failures as they are expected runtime states
    console.warn('Failed to connect to Home Assistant:', err);
    connection = null;
    connectionKey = null;
    if (err === ERR_CANNOT_CONNECT) {
      throw new Error('Cannot connect to Home Assistant. Check your URL and network.');
    } else if (err === ERR_INVALID_AUTH) {
      throw new Error('Invalid Home Assistant Token.');
    }
    throw err;
  }
}

export async function createOneOffConnection(config?: HAConnectionConfig): Promise<Connection> {
  const rawUrl = config?.url || ENV_HA_URL;
  const token = config?.token || ENV_HA_TOKEN;

  if (!rawUrl || !token) {
    throw new Error('Home Assistant URL and Token are required. Please set VITE_HA_URL and VITE_HA_TOKEN or provide config.');
  }

  const url = normalizeHaBaseUrl(rawUrl);

  if (token === 'your_long_lived_access_token_here') {
    throw new Error('Default token detected. Please configure a valid Home Assistant token.');
  }

  const auth = createLongLivedTokenAuth(url, token);
  return createConnection({ auth });
}

export function subscribeToEntities(
  conn: Connection,
  callback: (entities: HassEntities) => void
): () => void {
  return subscribeEntities(conn, callback);
}

export async function callService(
  conn: Connection,
  domain: string,
  service: string,
  serviceData?: object
) {
  return haCallService(conn, domain, service, serviceData);
}

export function disconnectHA() {
  if (connection) {
    connection.close();
    connection = null;
    connectionKey = null;
  }
}

// Registry Interfaces
export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
}

export interface HADevice {
  id: string;
  area_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
  manufacturer?: string;
  model?: string;
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  area_id?: string | null;
  name?: string | null;
  original_name?: string;
  platform?: string;
  disabled_by?: string | null;
  hidden_by?: string | null;
}

// Registry Fetching Functions
export async function fetchAreaRegistry(conn: Connection): Promise<HAArea[]> {
  return conn.sendMessagePromise({ type: 'config/area_registry/list' });
}

export async function fetchDeviceRegistry(conn: Connection): Promise<HADevice[]> {
  return conn.sendMessagePromise({ type: 'config/device_registry/list' });
}

export async function fetchEntityRegistry(conn: Connection): Promise<HAEntityRegistryEntry[]> {
  return conn.sendMessagePromise({ type: 'config/entity_registry/list' });
}

/**
 * Determines the best connection URL by checking both Local and Public URLs in parallel.
 * Returns the first reachable URL.
 */
export async function determineBestConnection(config: { localUrl?: string, publicUrl?: string, token?: string }): Promise<{ url: string, type: 'Local' | 'Public' } | null> {
  const { localUrl, publicUrl, token } = config;
  
  const checks: Promise<{ url: string, type: 'Local' | 'Public' } | null>[] = [];

  if (localUrl) {
    checks.push(
      checkConnectionAvailability(localUrl, token)
        .then(available => available ? { url: localUrl, type: 'Local' as const } : null)
    );
  }

  if (publicUrl) {
    checks.push(
      checkConnectionAvailability(publicUrl, token)
        .then(available => available ? { url: publicUrl, type: 'Public' as const } : null)
    );
  }

  if (checks.length === 0) return null;

  try {
    // We want the FIRST successful check, but we need to handle failures gracefully.
    // Promise.any would be ideal but might not be available in target env (ES2021).
    // Let's use a custom race that ignores failures until all fail.
    
    // Simple Promise.any polyfill logic for this specific case
    return new Promise((resolve) => {
        let failedCount = 0;
        checks.forEach(p => {
            p.then(result => {
                if (result) resolve(result);
                else {
                    failedCount++;
                    if (failedCount === checks.length) resolve(null);
                }
            }).catch(() => {
                failedCount++;
                if (failedCount === checks.length) resolve(null);
            });
        });
    });
  } catch (e) {
    return null;
  }
}

/**
 * Checks if a Home Assistant instance is reachable at the given URL.
 * Returns true if the server responds (even with 401/403), false if network error/timeout.
 */
export async function checkConnectionAvailability(url: string, token?: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const controller = new AbortController();
    // Short timeout for local network check (increased to 4 seconds)
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const cleanUrl = normalizeHaBaseUrl(url);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${cleanUrl}/api/`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // If we get a response, the server is reachable.
    // We consider 401/403 as reachable because it means we hit the server.
    // 404 might indicate wrong path, but server is there.
    // 5xx means server error, but reachable.
    return true;
  } catch (err) {
    // Network error, timeout, DNS failure, etc.
    // We suppress the console warning for common network errors to avoid spamming the console
    // console.warn('HTTP availability check failed, trying WebSocket fallback:', err);
    
    // Fallback: Try WebSocket verification as CORS might block HTTP fetch
    // This allows local connections (192.168.x.x) to work from browsers that block CORS but allow WebSocket
    
    // Avoid recursion if we want, but verifyConnectionConfig uses WebSocket
    try {
        const wsResult = await verifyConnectionConfig({ url, token: token || '' });
        if (wsResult) {
            // console.log('WebSocket availability check passed');
            return true;
        }
    } catch (wsErr) {
        // ignore
    }
    
    return false;
  }
}

/**
 * Verifies connection configuration using WebSocket.
 * This avoids CORS issues that might block fetch but allow WebSocket.
 * Does not affect global connection state.
 */
export async function verifyConnectionConfig(config: HAConnectionConfig): Promise<boolean> {
  const url = normalizeHaBaseUrl(config.url);
  const token = config.token;
  
  try {
    const auth = createLongLivedTokenAuth(url, token);
    const conn = await createConnection({ auth });
    conn.close();
    return true;
  } catch (err) {
    console.warn('Verification via WebSocket failed:', err);
    return false;
  }
}
