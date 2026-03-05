/**
 * 萤石云开放平台 API 服务
 *
 * 架构说明：
 *   浏览器直连萤石 API 时，在 HA Ingress 环境下可能触发 CSP 限制（策略禁止
 *   外部异步请求），或因内网 DNS 无法解析 open.ys7.com 而失败。
 *   因此改为通过插件自带的 Node.js 后端代理转发（/api/ezviz/url），
 *   后端完成 Token 换取 + 流地址获取后，只将最终播放 URL 返回前端。
 *
 *   非 Add-on 环境（本地开发）会自动降级回前端直连萤石 API。
 */

/** 萤石云 API 基础地址（仅降级时使用） */
const EZVIZ_BASE_URL = 'https://open.ys7.com';

/** 前端内存 Token 缓存（用于降级模式） */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 构建后端代理地址
 * HA Ingress 模式下 pathname 形如 /api/hassio_ingress/<TOKEN>/...
 * 需提取 Ingress 根路径，才能正确路由到容器内的 Express 服务
 */
function getProxyUrl(): string {
    const { origin, pathname } = window.location;
    if (pathname.includes('hassio_ingress')) {
        // 提取前三段：/api/hassio_ingress/<TOKEN>
        const parts = pathname.split('/').filter(Boolean);
        const ingressRoot = '/' + parts.slice(0, 3).join('/');
        return `${origin}${ingressRoot}/api/ezviz/url`;
    }
    // 本地开发 / 直接访问
    return `${origin}/api/ezviz/url`;
}

/** 带超时的 fetch 封装 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 10000,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ─── 降级：前端直连萤石 API ─────────────────────────────────────────────────

/** 获取 accessToken（降级用，直接调用萤石开放 API） */
async function getAccessTokenDirect(appKey: string, appSecret: string): Promise<string> {
    // 检查缓存是否有效（提前 5 分钟刷新）
    const cached = tokenCache.get(appKey);
    if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
        return cached.token;
    }

    const res = await fetch(`${EZVIZ_BASE_URL}/api/lapp/token/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ appKey, appSecret }),
    });

    if (!res.ok) throw new Error(`萤石接口请求失败: HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== '200') {
        throw new Error(`萤石 Token 获取失败: ${data.msg} (code: ${data.code})`);
    }

    const token: string = data.data.accessToken;
    const expiresAt: number = data.data.expireTime;
    tokenCache.set(appKey, { token, expiresAt });
    return token;
}

/** 降级：前端直连萤石获取流地址 */
async function getStreamUrlDirect(
    appKey: string,
    appSecret: string,
    deviceSerial: string,
    channelNo: number,
    protocol: 1 | 2 | 3,
    validateCode?: string,
): Promise<string> {
    const accessToken = await getAccessTokenDirect(appKey, appSecret);

    const params: Record<string, string> = {
        accessToken,
        deviceSerial,
        channelNo: channelNo.toString(),
        protocol: protocol.toString(),
        quality: '1',    // 1=均衡（高清与流畅的平衡）
        type: '1',       // 1=直播地址
        expireTime: '86400', // 1天有效期
    };
    if (validateCode) params.validateCode = validateCode;

    const res = await fetch(`${EZVIZ_BASE_URL}/api/lapp/v2/live/address/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });

    if (!res.ok) throw new Error(`萤石直播地址请求失败: HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== '200') {
        if (data.code === '10002') {
            // Token 失效，清缓存
            tokenCache.delete(appKey);
            throw new Error('萤石 Token 已失效，请刷新重试');
        }
        throw new Error(`萤石直播地址获取失败: ${data.msg} (code: ${data.code})`);
    }

    const url: string = data.data?.url;
    if (!url) throw new Error('萤石云返回了空地址');
    return url;
}

// ─── 主接口（优先走代理，降级走直连）────────────────────────────────────────

/**
 * 获取萤石摄像头直播流地址
 *
 * 执行流程：
 *   1. 尝试通过 Node.js 后端代理 /api/ezviz/url 获取（解决 CSP/CORS/内网 DNS 问题）
 *   2. 代理不通时（本地开发、非 Add-on 部署）自动降级为前端直连萤石 API
 *
 * @param appKey 萤石开放平台 AppKey
 * @param appSecret 萤石开放平台 AppSecret
 * @param deviceSerial 设备序列号
 * @param channelNo 通道号，默认 1
 * @param protocol 协议：1=ezopen, 2=HLS（推荐）, 3=FLV
 * @param validateCode 设备验证码（加密摄像头需要）
 */
export async function getEzvizStreamUrl(
    appKey: string,
    appSecret: string,
    deviceSerial: string,
    channelNo = 1,
    protocol: 1 | 2 | 3 = 2,
    validateCode?: string,
): Promise<string> {
    const proxyUrl = getProxyUrl();

    // 优先通过后端代理获取（绕过 CSP 和 CORS 限制）
    try {
        const res = await fetchWithTimeout(
            proxyUrl,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appKey, appSecret, deviceSerial, channelNo, protocol, validateCode }),
                credentials: 'include',
            },
            10000,
        );

        if (res.ok) {
            const data = await res.json();
            if (data.ok && data.url) {
                console.debug('[HAUI Ezviz] 通过后端代理获取流地址成功');
                return data.url;
            }
            // 后端返回了萤石 API 的真实错误（AppKey 错误 / 序列号错误等）
            // 这类错误不应降级，直接抛给用户
            throw new Error(data.error || '代理返回了未知错误');
        }

        // HTTP 4xx/5xx：
        // - 500 = 代理本身报错（萤石 API 调用失败），直接抛出
        // - 404 = 代理端点不存在（本地开发模式），降级
        if (res.status === 500) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `萤石云代理异常: HTTP ${res.status}`);
        }
        // 其他（404/502/503）：代理不可用，走降级
        console.debug('[HAUI Ezviz] 代理不可用 (HTTP', res.status, ')，降级到前端直连');
    } catch (e: any) {
        // 已经是真实业务错误（Token 失败、AppKey 无效等），直接抛出
        if (e?.message && !e.message.includes('Failed to fetch') && !e.message.includes('NetworkError') && !e.message.includes('net::ERR') && e?.name !== 'AbortError') {
            throw e;
        }
        // 网络级错误（超时/CORS/服务未启动）→ 降级到直连
        console.debug('[HAUI Ezviz] 后端代理网络不通，降级到前端直连:', e?.message);
    }

    // 降级：前端直连萤石 API（本地开发 / 非 Add-on 部署）
    console.debug('[HAUI Ezviz] 使用前端直连模式');
    return getStreamUrlDirect(appKey, appSecret, deviceSerial, channelNo, protocol, validateCode);
}

/**
 * 清除特定 appKey 的 Token 缓存（Token 失效时强制刷新用）
 */
export function clearEzvizTokenCache(appKey: string) {
    tokenCache.delete(appKey);
}
