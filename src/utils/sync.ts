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

// 防抖定时器
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

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
            const allData: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) {
                    const v = localStorage.getItem(k);
                    if (v !== null) allData[k] = v;
                }
            }

            await fetchWithTimeout(
                getStorageUrl(),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(allData),
                },
                5000,
            );
            console.debug('[HAUI Sync] 配置已显式上传，共', Object.keys(allData).length, '条');
        } catch {
            // 忽略失败
        }
    }, 1000);
};

export const saveToLocalStorage = (key: string, value: string) => {
    localStorage.setItem(key, value);
    syncToServer();
};

export const removeFromLocalStorage = (key: string) => {
    localStorage.removeItem(key);
    syncToServer();
};
