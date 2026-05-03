import { logger } from './logger';

/**
 * 构建完整的 API URL（支持 Home Assistant Ingress 动态基础路径）
 */
export function getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (typeof window === 'undefined') return cleanEndpoint;

    const { origin, pathname } = window.location;

    if (pathname.includes('hassio_ingress')) {
        const parts = pathname.split('/').filter(Boolean);
        const ingressRoot = '/' + parts.slice(0, 3).join('/');
        return `${origin}${ingressRoot}${cleanEndpoint}`;
    }

    return `${origin}${cleanEndpoint}`;
}

/**
 * 构建 /api/storage 的完整 URL
 */
export function getStorageUrl(): string {
    return getApiUrl('/api/storage');
}

/**
 * 带超时的 fetch
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 4000,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 读取后端 JSON/text 错误，避免把 {"error":"..."} 直接展示给用户。
 */
export async function readApiError(response: Response, fallback = '请求失败'): Promise<string> {
    const statusText = response.status ? `${response.status}` : '';
    const text = await response.text().catch(() => '');

    if (!text) {
        return statusText ? `${fallback}（${statusText}）` : fallback;
    }

    try {
        const parsed = JSON.parse(text);
        const message = parsed?.error || parsed?.message || parsed?.license?.message;
        if (typeof message === 'string' && message.trim()) {
            return message;
        }
    } catch {
        // 非 JSON 响应继续走纯文本提示。
    }

    return text.length > 240 ? `${text.slice(0, 240)}...` : text;
}

// 防抖定时器
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// 同步版本控制常量
const SYNC_TS_KEY = 'haui_last_sync_ts';
const SYNC_BROADCAST_KEY = 'haui_sync_broadcast';

/**
 * 主动触发同步本地配置到服务端
 */
export const syncToServer = () => {
    if (typeof window === 'undefined') return;

    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
        try {
            const now = Date.now();
            const allData: Record<string, string> = {
                [SYNC_TS_KEY]: now.toString()
            };
            
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k !== SYNC_TS_KEY) {
                    const v = localStorage.getItem(k);
                    if (v !== null) allData[k] = v;
                }
            }

            const resp = await fetchWithTimeout(
                getStorageUrl(),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(allData),
                },
                5000,
            );
            
            if (resp.ok) {
                localStorage.setItem(SYNC_TS_KEY, now.toString());
                logger.debug('配置已同步至服务端，版本:', now);
                // 广播同步事件给其他标签页
                broadcastSync(now);
            }
        } catch {
            // 忽略失败
        }
    }, 1000);
};

/**
 * 主动从服务端拉取配置并同步到本地存储（带有增量校验）
 */
export const syncFromServer = async (force = false) => {
    if (typeof window === 'undefined') return false;

    try {
        const resp = await fetchWithTimeout(getStorageUrl(), {
            method: 'GET',
            credentials: 'include',
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data && typeof data === 'object') {
                const remoteTs = parseInt(data[SYNC_TS_KEY] || '0');
                const localTs = parseInt(localStorage.getItem(SYNC_TS_KEY) || '0');

                // 仅在远程版本较新或强制同步时更新
                if (force || remoteTs > localTs) {
                    Object.keys(data).forEach((key) => {
                        localStorage.setItem(key, data[key]);
                    });
                    logger.debug('已发现新版本并对齐，远程:', remoteTs, '本地:', localTs);
                    // 触发自定义事件通知 Store 刷新
                    window.dispatchEvent(new CustomEvent('haui-sync-complete'));
                    return true;
                } else {
                    logger.debug('本地已是最新版本');
                }
            }
        }
    } catch (e) {
        logger.warn('从服务端同步失败:', e);
    }
    return false;
};

/**
 * 广播同步事件给其他标签页/窗口
 */
const broadcastSync = (timestamp: number) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SYNC_BROADCAST_KEY, timestamp.toString());
        // 触发后立即删除，避免影响下次同步判断
        setTimeout(() => localStorage.removeItem(SYNC_BROADCAST_KEY), 100);
    } catch {
        // 忽略存储错误
    }
};

/**
 * 初始化全局自动同步逻辑 (心跳与聚焦对齐)
 */
export const initAutoSync = () => {
    if (typeof window === 'undefined') return;

    // 1. 每 30 秒自动对齐一次
    const timer = setInterval(() => syncFromServer(), 30000);

    // 2. 页面获得焦点时触发对齐 (例如从其他 App 切回来)
    const onFocus = () => syncFromServer();
    window.addEventListener('focus', onFocus);

    // 3. 监听其他标签页的同步广播
    const onStorage = (e: StorageEvent) => {
        if (e.key === SYNC_BROADCAST_KEY && e.newValue) {
            logger.debug('检测到其他端同步，刷新数据...');
            syncFromServer(true);
        }
    };
    window.addEventListener('storage', onStorage);

    return () => {
        clearInterval(timer);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('storage', onStorage);
    };
};

export const saveToLocalStorage = (key: string, value: string) => {
    localStorage.setItem(key, value);
    syncToServer();
};

export const removeFromLocalStorage = (key: string) => {
    localStorage.removeItem(key);
    syncToServer();
};
