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

import { getStorageUrl, fetchWithTimeout } from './utils/sync';

const initStorage = async () => {
  const STORAGE_URL = getStorageUrl();
  console.debug('[HAUI Sync] 配置同步端点:', STORAGE_URL);

  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 8000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(STORAGE_URL, { credentials: 'include' }, TIMEOUT_MS);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data: Record<string, string> = await res.json();
          let count = 0;
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string') {
              localStorage.setItem(k, v);
              count++;
            }
          }
          console.debug(`[HAUI Sync] 已从服务器加载 ${count} 条配置（尝试 ${attempt + 1}/${MAX_RETRIES}）`);
          break;
        } else {
          console.warn('[HAUI Sync] 服务器返回内容不是 JSON，跳过同步（非 Add-on 环境）');
          break;
        }
      } else if (res.status === 404 || res.status === 502 || res.status === 503) {
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
        console.warn(`[HAUI Sync] 连接超时（${TIMEOUT_MS / 1000}s），${attempt < MAX_RETRIES - 1 ? '重试...' : '跳过配置拉取，继续启动'}`);
        if (attempt >= MAX_RETRIES - 1) {
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      } else {
        console.debug('[HAUI Sync] 非 Add-on 模式或网络不通，跳过同步:', e?.message);
        break;
      }
    }
  }
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
