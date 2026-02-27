import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { ErrorBoundary } from "./app/components/ErrorBoundary";

// ============================================================
// HAUI Add-on 跨设备云同步核心逻辑
// 原理：前端页面启动时先从 Node.js 后端拉取存在 /data/ 的配置，
//       注入到本地 localStorage；之后每次 localStorage 被写入
//       时，自动 debounce 上传回后端持久化。
//       这样无论哪台设备打开 HAUI，都能读到同一份配置。
// ============================================================

/**
 * 构建 /api/storage 的完整 URL
 *
 * HA Ingress 工作原理：
 *   浏览器访问 https://ha.local/api/hassio_ingress/<TOKEN>/
 *   HA Supervisor 将所有子路径请求转发到容器 8099 端口，
 *   路径会去掉 /api/hassio_ingress/<TOKEN> 前缀后再转发。
 *
 *   因此：
 *     fetch("https://ha.local/api/hassio_ingress/<TOKEN>/api/storage")
 *     → HA 转发 → 容器 Express GET /api/storage  ✓
 *
 *   不能用 fetch("/api/storage")（绝对路径），因为那会请求
 *   https://ha.local/api/storage，打到 HA 自己的 REST API，而非容器。
 */
function getStorageUrl(): string {
  const { origin, pathname } = window.location;

  // HA Ingress 模式：pathname 形如 /api/hassio_ingress/<TOKEN>/...
  if (pathname.includes('hassio_ingress')) {
    const parts = pathname.split('/').filter(Boolean);
    // parts = ['api', 'hassio_ingress', '<TOKEN>', ...]
    // 取前三段构成 Ingress 根路径
    const ingressRoot = '/' + parts.slice(0, 3).join('/');
    return `${origin}${ingressRoot}/api/storage`;
  }

  // 本地开发 / 直接访问（非 Ingress）—— 相对 origin 即可
  return `${origin}/api/storage`;
}

/**
 * 带超时的 fetch 封装
 *
 * 核心修复：Add-on 刚启动时 Express 可能还未就绪，
 * 原始 fetch 没有超时保护会永久 pending，导致 initStorage().then()
 * 永远不执行 → React 无法挂载 → 空白页！
 */
async function fetchWithTimeout(
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

const initStorage = async () => {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  const STORAGE_URL = getStorageUrl();
  console.debug('[HAUI Sync] 配置同步端点:', STORAGE_URL);

  // ── 启动时：从服务器拉取数据，带重试机制 ──
  // 重试原因：HA Add-on 刚启动时 Express 可能还未完全就绪
  const MAX_RETRIES = 3;  // 最多重试 3 次
  const TIMEOUT_MS = 8000; // 每次超时 8 秒

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(STORAGE_URL, { credentials: 'include' }, TIMEOUT_MS);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data: Record<string, string> = await res.json();
          let count = 0;
          for (const [k, v] of Object.entries(data)) {
            // 跳过非字符串值（服务端可能存了 null 等）
            if (typeof v === 'string') {
              originalSetItem(k, v);
              count++;
            }
          }
          console.debug(`[HAUI Sync] 已从服务器加载 ${count} 条配置（尝试 ${attempt + 1}/${MAX_RETRIES}）`);
          break; // 成功，跳出重试循环
        } else {
          // 返回 HTML 说明路径未匹配（非 Add-on 环境），不需要重试
          console.warn('[HAUI Sync] 服务器返回内容不是 JSON，跳过同步（非 Add-on 环境）');
          break;
        }
      } else if (res.status === 404 || res.status === 502 || res.status === 503) {
        // 服务暂不可用，等待后重试
        console.warn(`[HAUI Sync] 服务器响应 ${res.status}，${attempt < MAX_RETRIES - 1 ? '2s 后重试...' : '放弃'}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } else {
        console.warn('[HAUI Sync] 服务器响应异常:', res.status, res.statusText);
        break;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // 超时：Add-on 刚启动服务未就绪
        console.warn(`[HAUI Sync] 连接超时（${TIMEOUT_MS / 1000}s），${attempt < MAX_RETRIES - 1 ? '重试...' : '跳过配置拉取，继续启动'
          }`);
        // 最后一次失败才退出，否则继续重试
        if (attempt >= MAX_RETRIES - 1) {
          break;
        }
        // 短暂等待后重试
        await new Promise(r => setTimeout(r, 1000));
      } else {
        // 非 Add-on 环境（CORS 等），不重试
        console.debug('[HAUI Sync] 非 Add-on 模式或网络不通，跳过同步:', e?.message);
        break;
      }
    }
  }

  // ── 运行时：拦截 localStorage 写操作，1s debounce 上传回服务器 ──
  let syncTimeout: ReturnType<typeof setTimeout>;

  const triggerSync = () => {
    clearTimeout(syncTimeout);
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
        // 上传允许最多 5s，上传失败静默处理
        await fetchWithTimeout(
          STORAGE_URL,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData),
          },
          5000,
        );
        console.debug('[HAUI Sync] 配置已上传，共', Object.keys(allData).length, '条');
      } catch {
        // 非 Add-on 环境或网络不稳定，静默失败
      }
    }, 1000);
  };

  // 劫持三个 localStorage 方法，保证任何写操作都会触发上传
  localStorage.setItem = function (key: string, value: string) {
    originalSetItem(key, value);
    triggerSync();
  };

  localStorage.removeItem = function (key: string) {
    originalRemoveItem(key);
    triggerSync();
  };

  localStorage.clear = function () {
    originalClear();
    triggerSync();
  };
};

// 先完成配置同步，再渲染 React 应用，确保首屏拿到完整配置。
// ⚠️ initStorage 内部已做超时兜底，Promise 必然在有限时间内 resolve，
//    不会因 fetch 挂起而永远不渲染（空白页根因修复）。
initStorage().then(() => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </ErrorBoundary>
  );
});
