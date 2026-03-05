# Changelog

All notable changes to this project will be documented in this file.

## [3.0.1] - 2026-03-05

### 修复与优化
- **架构解耦**：移除 `main.tsx` 中对原生 `localStorage` 方法的全局暴力劫持，改为按需的事件发布与同步，有效防止在多写并发场景下的数据冲突或覆盖问题。
- **状态持久化安全**：解决 Zustand 自动持久化与旧版劫持保存之间的竞态冲突，重写 `dataStore` 的驱动接口以显式对接服务端同步，提升了保存的安全性与响应速度。
- **安全与清理**：移除前端存储 HA Token 时的硬编码 AES 伪加密机制（无实际安全防范意义），改为使用 Base64 进行简单的显示混淆及解码兼容。
- **构建环境修复**：修正 `vite.config.ts` 中的 Vitest 类型声明引入错误，通过重写 `defineConfig` 引入链，解决了 `tsc` 编译报错与 ESLint 规范警告。
- **重构预加载流**：解决了网络或后端不可达时天气定位等服务无限处于 `loading` 的阻塞状态类型缺失报错。

## [3.0.0] - 2026-03-04

### 新特性
- **AI 智能管家 (MCP 集成)**：全新接入基于 MCP (Model Context Protocol) 架构的智能对话功能。
  - 自然语言控制：支持通过自然语言操控 Home Assistant 设备（例如灯光、开关、窗帘、空调等）。
  - 安全白名单机制：内置安全拦截器，仅允许操控基础硬件，隔离高危系统服务调用。
  - 灵活配置：支持通过 Add-on 配置页或前端面板自由切换 AI 供应商（如硅基流动、阿里云百炼，以及本地部署的 Ollama），API Key 仅保存在后端，大幅提升安全性。
  - 流式响应 (SSE)：前端聊天组件采用 Server-Sent Events 流式渲染，带来丝滑打字机体验。
  - 无感状态查询：AI 可直接读取当前家庭设备快照，进行状态播报与自动化方案建议。

## [2.27.4] - 2026-03-01

### 修复
- **重大故障 (Blank Screen)**：修复因项目中 Express 版本升级至 `5.x` 导致原有未命名通配符路由（`app.all('/ha-api/*')`）抛出 `PathError: Missing parameter name` 致命异常的问题。此异常导致 HA Ingress 模式下 Add-on 服务端无法启动，进而表现为面板打开完全空白。目前已将路由改为原生正则表达式匹配（`/^\/ha-api\/.*/`）以实现向下与向上兼容。


## [2.27.3] - 2026-02-27

### 修复
- **连接配置**：修复长期访问令牌状态图标始终显示灰色感叹号的问题。根因为两个 `useEffect` 同时响应 `isOpen` 产生竞态（stale closure），合并为单一 effect 并直接读取 `initialConfig.token` 参数，彻底消除竞态。
- **设备管理**：修复进入设备管理 Tab 后立即弹出「扫描失败」弹窗的问题。为自动扫描增加 1.5s 延迟，等待 WebSocket 建连完成后再执行，避免过早降级走 `/ha-api` REST 代理收到 502 错误。
- **人员管理**：修复头像点击后不弹出文件选择器的兼容性问题。将 `hidden input` 嵌套在 `label` 的方式改为 `useRef` 数组 + 程序触发 `input.click()`，解决部分浏览器/移动端 `display:none` 阻止 label 关联点击的问题。
- **代码质量**：修复 `DeviceDiscoveryPanel` 中 `visibility` 类型不兼容错误，清理多处未使用的 import 和变量声明。


## [1.2.0] - 2026-02-03

### Changed
- **DeviceCard Refactoring**: Split `DeviceCard.tsx` into specialized subcomponents (`LightControl`, `CurtainControl`, `ClimateControl`) for better maintainability.
- **Shared Components**: Created `cards/shared.tsx` for reusable UI elements (icons, toggles, wrappers).
- **Code Quality**: Fixed multiple TypeScript linter errors, unused imports, and undefined value handling.
- **Performance**: Removed unused assets and optimized component rendering.

## [1.1.0] - 2024-02-02

### Added
- **Remote Control Widget**: A new device type (`remote`) with a dedicated card and control panel.
    - **Compact Card**: Matches existing AC/Light card aesthetics.
    - **Control Panel**: Modal with customizable button grid.
    - **Drag & Drop**: Sort buttons visually in edit mode.
    - **Entity Binding**: Search and bind any HA entity to buttons.
    - **Persistence**: Button configurations saved to LocalStorage.
- **Testing**: Added Unit Tests for Remote components (Vitest + Testing Library).
- **Architecture**: Added `DndProvider` to `main.tsx` for global drag-and-drop support.

## [1.0.0] - 2024-02-02

### Added
- **Architecture**: Converted to Home Assistant Custom Component structure (`custom_components/yinkun_ui`).
- **Environment**: Added `docker-compose.yml` for full-stack local development (HA + Mosquitto + Frontend).
- **Testing**: Added Cypress for E2E testing and pytest fixtures for component testing.
- **CI**: GitHub Actions workflow for automated testing and linting.
- **Documentation**: Bilingual README and Architecture Health Reports.

### Changed
- Refactored project structure to support hybrid (Frontend + Component) development.
