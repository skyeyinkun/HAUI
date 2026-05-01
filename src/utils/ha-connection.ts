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
import { logger } from './logger';

/**
 * 清理和验证 Token
 * 移除 BOM、空白字符、不可见字符等可能导致认证失败的编码问题
 */
export function sanitizeToken(token: string | undefined | null): string {
  if (!token) return '';
  
  // 移除 BOM (Byte Order Mark) - UTF-8/UTF-16/UTF-32
  let cleaned = token
    .replace(/^\uFEFF/, '')  // UTF-8 BOM
    .replace(/^\uFFFE/, '')  // UTF-16 LE BOM
    .replace(/^\uFEFF/, ''); // UTF-16 BE BOM
  
  // 移除首尾空白字符（包括换行、制表符等）
  cleaned = cleaned.trim();
  
  // 移除不可见的控制字符（除了基本可打印ASCII外）
  // Token 通常只包含字母、数字、下划线、点和连字符
  cleaned = Array.from(cleaned)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  
  // 移除可能的引号包裹
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  
  return cleaned;
}

/**
 * 验证 Token 是否有效格式
 * HA 长期访问令牌格式: eyJ... (JWT 格式) 或其他长字符串
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || token.length < 20) return false;
  if (token === 'your_long_lived_access_token_here') return false;
  // HA 令牌只包含可打印 ASCII 字符，排除乱码和编码异常字符
  if (/[^\x20-\x7E]/.test(token)) return false;
  return true;
}

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

// 连接状态检查辅助函数
function isConnectionAlive(conn: Connection | null): boolean {
  if (!conn) return false;
  // 检查连接是否仍然有效（通过检查内部状态）
  try {
    const socket = (conn as unknown as { socket?: WebSocket }).socket;
    return !!(socket && socket.readyState === WebSocket.OPEN);
  } catch {
    return false;
  }
}

export async function connectToHA(config?: HAConnectionConfig): Promise<Connection> {
  const rawUrl = config?.url || ENV_HA_URL;
  // 使用 sanitizeToken 清理 token，防止编码问题导致的连接失败
  const rawToken = config?.token || ENV_HA_TOKEN;
  const token = sanitizeToken(rawToken);

  if (!rawUrl || !token) {
    throw new Error('Home Assistant URL and Token are required. Please set VITE_HA_URL and VITE_HA_TOKEN or provide config.');
  }

  // 验证 token 格式
  if (!isValidTokenFormat(token)) {
    if (token === 'your_long_lived_access_token_here' || rawToken === 'your_long_lived_access_token_here') {
      throw new Error('检测到默认 Token。请在设置中配置有效的 Home Assistant 长期访问令牌 (Long-Lived Access Token)。');
    }
    throw new Error('Token 格式无效。请检查 Token 是否包含特殊字符或编码问题。');
  }

  const url = normalizeHaBaseUrl(rawUrl);
  const nextKey = buildConnectionKey(url, token);

  // 检查现有连接是否仍然有效
  if (connection && connectionKey === nextKey && isConnectionAlive(connection)) {
    logger.debug('Reusing existing HA connection');
    return connection;
  }
  
  // 如果连接无效但存在，清理它
  if (connection) {
    logger.info('Existing connection is dead, closing it...');
    try {
      connection.close();
    } catch (e) {
      // ignore close errors
    }
    connection = null;
    connectionKey = null;
  }

  logger.info(`Connecting to Home Assistant at ${url}...`);

  try {
    const auth = createLongLivedTokenAuth(url, token);
    
    // 关闭旧连接（如果存在）
    if (connection) {
      try {
        (connection as Connection).close();
      } catch (e) {
        // ignore close errors
      }
      connection = null;
      connectionKey = null;
    }

    connection = await createConnection({ auth });
    connectionKey = nextKey;
    
    connection.addEventListener('ready', () => {
      logger.info('HA Connection ready');
    });

    connection.addEventListener('disconnected', () => {
      logger.info('HA Connection disconnected');
    });

    connection.addEventListener('reconnect-error', () => {
      logger.info('HA Connection reconnect error');
    });

    return connection;
  } catch (err) {
    // Use warn instead of error for connection failures as they are expected runtime states
    logger.warn('Failed to connect to Home Assistant:', err);
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
  // 使用 sanitizeToken 清理 token
  const token = sanitizeToken(config?.token || ENV_HA_TOKEN);

  if (!rawUrl || !token) {
    throw new Error('Home Assistant URL and Token are required. Please set VITE_HA_URL and VITE_HA_TOKEN or provide config.');
  }

  const url = normalizeHaBaseUrl(rawUrl);

  if (!isValidTokenFormat(token)) {
    throw new Error('Token 格式无效。请配置有效的 Home Assistant 长期访问令牌。');
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

    await fetch(`${cleanUrl}/api/`, {
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
  // 使用 sanitizeToken 清理 token
  const token = sanitizeToken(config.token);
  
  if (!isValidTokenFormat(token)) {
    logger.warn('Invalid token format during verification');
    return false;
  }
  
  try {
    const auth = createLongLivedTokenAuth(url, token);
    const conn = await createConnection({ auth });
    conn.close();
    return true;
  } catch (err) {
    logger.warn('Verification via WebSocket failed:', err);
    return false;
  }
}
