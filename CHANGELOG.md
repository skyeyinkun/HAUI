# Changelog

## [3.0.17] - 2026-03-07

### 新特性
- **Dashboard 灵活自定排版引擎 (iOS 风格重构)**:
  - **全量组件多实例支持**: 重构了 `StatisticsPanel` 的渲染逻辑，现在支持用户添加多个同类型的面板（如多个“传感器面板”或多个“室内环境面板”）。每个面板实例拥有唯一的 `widget.id`，实现完全独立的标题、图标及实体列表配置。
  - **全局长按触发 (Universal Long Press)**: 将编辑模式的触发逻辑从特定面板提升至页面全局。通过长按主页面任意空白区域或背景，即可使全屏组件（包括小部件和下方的设备卡片）集体进入“抖动”状态，操作逻辑与 iOS 系统高度一致。
  - **多端适配优化**: 优化了 `useLongPress` 钩子，支持移动端在长按监听过程中的正常滚动而不触发误操作，显著提升了在 iOS 和 Android 浏览器上的交互流畅度。
  - **iOS 风格视觉反馈**: 为所有处于管理状态下的 `DeviceCard` 和 `SortableWidget` 添加了平滑的 `wiggle`（果冻抖动）动画，并优化了边缘 X 按钮和添加逻辑，提供沉浸式的布局管理体验。

## [3.0.16] - 2026-03-07

### 重构与优化
- **项目品牌变更与全量清理**:
  - 全面清除了项目中遗留的所有 `Trae` 关键字，彻底将其替换为正式名称 `HAUI Dashboard`。
  - 为 Add-on 插件商店重新撰写了高质量的功能介绍（涉及 `addon/config.yaml` 及根目录 `README.md`），重点凸显了“AI 智能管家对话”、“全平台自适应界面”与“iOS 风格小部件排版”的极致家居控制体验。
  - 更新了项目内部多处组件级说明（包含 `docker-compose.yml` 容器名、`manifest.json`）与 E2E 测例描述。

### 修复与优化
- **移除摄像头功能**: 
  - 彻底删除了所有摄像头相关的组件（`CameraView`, `CameraConfigPanel`, `CameraConfigModal`, `StreamPlayer`）。
  - 删除了摄像头相关的实用工具和类型定义（`camera-storage.ts`, `camera.ts`, `ezviz-api.ts`）。
  - 从 `StatisticsPanel` 和 `SettingsModal` 中移除了摄像头的 UI 入口和管理板块。
  - 清理了设备发现（`device-discovery.ts`）、实体清洗（`entity-cleaner.ts`）及 AI 上下文（`ai-context.ts`）中对摄像头域名的所有引用。
  - 移除了未使用的摄像头流媒体依赖：`ezuikit-js`, `hls.js`, `mpegts.js`。

## [3.0.10] - 2026-03-06

### 修复与优化
- **项目精简与架构优化**: 
  - 彻底清理了项目中冗余的日志文件 (`*.log`)、构建产物 (`dist`) 及临时目录 (`.tmp`)。
  - 优化依赖树：移除了未使用的依赖项 `province-city-china` 和 `@thelord/enhanced-homeassistant-mcp`，显著减小了项目体积并提升了构建速度。
  - 同步更新了 `package-lock.json` 和相关 Add-on 配置文件，确保生产环境与开发环境的高度一致性。

## [3.0.9] - 2026-03-06

### 修复与优化
- **统一摄像头播放组件 (CameraViewer 集成)**: 
  - **增强 StreamPlayer 功能**: 将原本的分散播放逻辑整合，现已实现统一支持萤石云 (ezuikit-js)、原生 RTSP (mpegts.js) 以及 ONVIF 协议。
  - **PTZ 云台控制**: 为 ONVIF 类型摄像头新增了悬浮式云台控制面板，支持「上、下、左、右、放大、缩小」六向控制，通过 `axios` 对接后端代理实现远程控制指令下发。
  - **后端控制逻辑**: 在 `addon/server.js` 中新增 `/api/camera/ptz` 路由，支持将前端指令安全地转发至 Home Assistant 的 `onvif.ptz` 服务。
  - **UI 细节优化**: 控制面板采用磨砂玻璃质感设计，并配合播放状态自动切换显示，提升监控交互体验。

## [3.0.8] - 2026-03-06

### 修复与优化
- **摄像头功能重构与修复**: 
  - **接入主流萤石云 SDK**: 彻底放弃了旧有的「前端直连 API 获取 HLS 地址」方案（该方案常因 CORS/CSP 跨域限制导致播放失败）。通过集成萤石官方 `ezuikit-js` SDK，实现了基于 WebSocket 的稳定流媒体播放，避开了所有浏览器跨域瓶颈。
  - **后端 Token 鉴权代理**: 在 HA Add-on 后端 (`server.js`) 新增了 `/api/ezviz/token` 代理接口。前端不再直接持有敏感的 AppSecret，而是通过后端中转获取 AccessToken，大幅提升了系统的安全性。
  - **全面密钥隐藏与加密**: 将配置面板中所有的敏感字段（AppKey、AppSecret、验证码等）统一更换为密码输入框 (`PwdInput`)，支持明文/密文切换。同时，在本地浏览器存储 (`localStorage`) 环节，将 `ezviz.appKey` 纳入 AES 加密范畴，确保用户配置在本地物理层面的安全性。
  - **类型系统增强**: 为 `ezuikit-js` 补充了缺失的 TypeScript 模块声明文件，并更新了 `CameraConfig` 类型定义，支持 AccessToken 的透明化管理。


All notable changes to this project will be documented in this file.

## [3.0.7] - 2026-03-06

### 修复与优化
- **AI 智能管家功能重构**: 
  - **Tool Call 多轮回传支持**: 重构了后端的 AI 工具调用逻辑（支持最多5轮多轮回传），改变了之前通过硬编码直接回复控制结果的简单方式。现在，AI 模型在执行后端的 Home Assistant 设备控制指令或查询实体状态指令后，能接收到执行结果（通过 `tool` 消息体），进而通过自然语言更加智能化地总结和反馈真实情况（例如：“已为您打开客厅灯，当前状态为 on”）。
  - **组件架构优化与性能提升**: 将过度膨胀的 `AiChatWidget.tsx` (681 行) 彻底重构。抽象出底层状态钩子 `useAiChat`；在视图层按照关注点分离原则拆分出 `VoiceStatusIndicator` (语音状态指示器)、`ChatMessageList` (聊天消息列表)、`ChatInput` (输入区域) 等独立子组件，大幅度提升代码可维护性与渲染效能，并将代码体积精简近一半。
  - **全平台语音输入与播放兼容性增强**: 对于 `useSpeechRecognition` 语音识别模块，在保持非 iOS 系统连续录音（`continuous=true`）的基础上，增设了由 `silenceTimeout` (静音超时检测) + `autoRestart` 驱动的自动重启机制，增强了识别稳定性；加入了特定网络错误导致掉线情况下的重试保障；对于 `useSpeechSynthesis` 文本转语音播报模块，针对 Chrome 浏览器默认 15 秒语音断流的顽疾，自主实现了长文本分段并发朗读队列。补充了适用于 iOS Safari 的环境重置唤醒（Workaround）。
  - **设备上下文语义增强**: 在前端向 AI 大模型传递家庭实体现状信息（`getSmartHomeContext`）时，为纯英文及简写标识提供了中文对应解析字典（例如：将 `light` 映射给 AI 为 `灯光`）。同时加入了总体实体数目概要提示头，配合 `MAX_ENTITIES=100` 等容量截断策略，保证 LLM 的指令理解效果且降低 Token 超出限额风险。

## [3.0.6] - 2026-03-05

### 修复与优化
- **AI 智能管家功能增强**: 重构了 Add-on 后端 (`server.js`) 对于大模型（如 DeepSeek-v3） `tool_calls` 流式调用的解析逻辑。解决了当模型同时输出多个并行工具指令（例如“打开灯并关闭窗帘”）时发生的参数截断问题，现在 AI 已经能够稳定、准确地进行多设备复合操作和 HA 设备控制。
- **全平台配置云同步 (解决覆盖问题)**: 修复了新设备首次打开网页、APP 时默认状态导致云端真实系统配置被覆盖（清空）的致命 Bug。通过在 React 根渲染生命周期引入严格的前置阻塞 `await import('./app/App.tsx')` 判断，彻底确保初始化之前先从 HA 服务器拉回所有配置并写入本地后再进行界面渲染，保证不同客户端（如手机、网页、平板）完全共享和同步功能。

## [3.0.5] - 2026-03-05

### 修复与优化
- **AI 语音彻底重构**: 全面重做了语音交互机制，修复前版在交互逻辑上的致命缺陷：
  - 解锁了「打字」与「语音」之间的强互斥冲突，支持全通道互通输入，输入时自动切断不需要的识别或播报进程，保障操作自由度。
  - 增强了过程可视化：不论是从底麦克风还是顶开关触发，语音识别中间态结果都会立刻实时同步显示到底部输入框，彻底消灭“系统未响应”的盲区。
  - 解除了语音状态闭环中多余的发送按钮：重置 `continuous=false` 判定条件，用户开启单次录音后只需讲话，检测到短暂停顿即自动停止并发送，符合真实语音产品直觉体验。

## [3.0.4] - 2026-03-05

### 修复与优化
- **AI 语音交互改进**: 在移动端增加开启语音对话的红色红点（New Badge）强引导，优化触摸点击区域大小。修复某些移动端浏览器拦截自动发声的问题，增加基于用户手势点击的静音解锁逻辑。
- **本地头像持久化**: 修复了人员从本地上传照片后，在页面刷新被 HA 默认人员实体（person）覆盖导致丢失的 Bug。通过引入局部保护字段，实现了与 HA 头像双向解耦与保留。

## [3.0.3] - 2026-03-05

### 新特性
- **完整语音对话模式**: AI 管家支持全双工语音对话闭环。点击 Header 的语音按钮开启后：① 麦克风自动激活识别语音 ② 用户说完后自动发送给 AI ③ AI 回复流式返回后通过 TTS 朗读出来 ④ 朗读结束自动重新麦克风激活，支持多轮连续语音对话控制设备。四态状态浮层（聆听中 / 思考中 / 说话中 / 已暂停）实时提示当前对话阶段。不支持 Web Speech API 的环境下按钮自动隐藏。

## [3.0.2] - 2026-03-05

### 新特性
- **AI 语音交互**: 智能管家全面支持前端语音输入控制设备！现在用户可点击输入框旁边的「麦克风」按钮调用浏览器原生或服务端内置（由设备支持度决定）的 Web Speech 接口录入指令并自动发送执行。实现了更无感的懒人智能家居操作体验。

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
