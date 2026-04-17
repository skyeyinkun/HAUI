import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from "react-dom/client";
import { useState, useEffect } from 'react';

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
import { logger } from './utils/logger';

// 标记是否正在从服务端加载配置，避免循环同步
let isLoadingFromServer = false;

// 异步加载配置（不阻塞渲染）
const loadStorageConfig = async () => {
  // 防止重复执行
  if (isLoadingFromServer) {
    logger.debug('配置加载已在进行中，跳过');
    return false;
  }
  
  isLoadingFromServer = true;
  const STORAGE_URL = getStorageUrl();
  logger.debug('配置同步端点:', STORAGE_URL);

  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 5000; // 缩短超时时间，减少等待

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetchWithTimeout(STORAGE_URL, { credentials: 'include' }, TIMEOUT_MS);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: Record<string, string> = await res.json();
            let count = 0;
            for (const [k, v] of Object.entries(data)) {
              if (typeof v === 'string' && k !== 'haui_last_sync_ts') {
                localStorage.setItem(k, v);
                count++;
              }
            }
            logger.debug(`已从服务器加载 ${count} 条配置（尝试 ${attempt + 1}/${MAX_RETRIES}）`);
            return true; // 加载成功
          } else {
            logger.warn('服务器返回内容不是 JSON，跳过同步（非 Add-on 环境）');
            return false;
          }
        } else if (res.status === 404 || res.status === 502 || res.status === 503) {
          logger.warn(`服务器响应 ${res.status}，${attempt < MAX_RETRIES - 1 ? '1s 后重试...' : '放弃'}`);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 1000)); // 减少重试等待
          }
        } else {
          logger.warn('服务器响应异常:', res.status, res.statusText);
          break;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          logger.warn(`连接超时（${TIMEOUT_MS / 1000}s），${attempt < MAX_RETRIES - 1 ? '重试...' : '跳过配置拉取，继续启动'}`);
          if (attempt >= MAX_RETRIES - 1) {
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        } else {
          logger.debug('非 Add-on 模式或网络不通，跳过同步:', e?.message);
          break;
        }
      }
    }
  } finally {
    isLoadingFromServer = false;
  }
  return false;
};

// 加载骨架屏组件
const AppSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      {/* Logo 动画 */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse opacity-20"></div>
        <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">正在加载 HAUI...</p>
    </div>
  </div>
);

// 主应用包装器 - 先渲染骨架，后台加载配置
function AppLoader() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // 后台异步加载配置和 App 组件
    Promise.all([
      loadStorageConfig(),
      import("./app/App.tsx")
    ]).then(([_, appModule]) => {
      setAppComponent(() => appModule.default);
    }).catch((err) => {
      logger.error('Failed to load app:', err);
      // 即使失败也尝试加载 App
      import("./app/App.tsx").then((appModule) => {
        setAppComponent(() => appModule.default);
      });
    });
  }, []);

  if (!AppComponent) {
    return <AppSkeleton />;
  }

  return <AppComponent />;
}

// 直接渲染，不阻塞
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <DndProvider backend={HTML5Backend}>
      <AppLoader />
    </DndProvider>
  </ErrorBoundary>
);
