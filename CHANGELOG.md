# 更新日志

所有重要的版本更新都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [4.15.1] - 2026-04-17

### ♿ 前端可访问性修复

#### 高优先级修复
- **prefers-reduced-motion 支持**：添加全局 CSS 媒体查询，尊重用户减少动画偏好设置
- **键盘导航支持**：传感器卡片和默认卡片添加 `role="button"`、`tabIndex`、`onKeyDown` 支持
- **滑块无障碍属性**：亮度/色温滑块添加 `aria-label` 属性

#### 中优先级修复
- **语义化颜色令牌**：定义 `--success`、`--surface-dark` 等语义化颜色变量，替换硬编码颜色
- **RemoteCard 无障碍**：配置文件切换按钮添加 `aria-label` 和 `aria-pressed` 属性

#### 修复文件
- `src/styles/tailwind.css` - 减少动画媒体查询
- `src/styles/theme.css` - 语义化颜色令牌
- `src/app/components/dashboard/DeviceCard.tsx` - 键盘导航
- `src/app/components/dashboard/cards/shared.tsx` - 颜色令牌替换
- `src/app/components/dashboard/cards/LightControl.tsx` - 滑块无障碍
- `src/app/components/remote/RemoteCard.tsx` - 按钮无障碍

---

## [4.15.0] - 2026-04-14

### 🔧 代码审计与全面修复

#### 🔴 高优先级修复
- **disconnected 回调 ref 同步**：修复 `useHomeAssistant.ts` 中断开连接回调未同步 ref 导致 `callService` 闭包过期的问题
- **handleDeviceClick 依赖数组**：修复 `App.tsx` 中 `requiresSecurityConfirm` 依赖导致安全确认绕过的问题，改用 `connectionType`
- **ClimateControlModal touch 安全检查**：修复触摸事件中 `touches[0]` 可能为 `undefined` 的崩溃问题，添加 `changedTouches` 兜底
- **AI 请求超时保护**：为 `ai-service.ts` 添加 30 秒 AbortController 超时机制，防止请求无限挂起

#### 🟡 中优先级修复
- **安全关键词中文覆盖**：在 `security-config.ts` 中补充门锁、安防、报警等中文关键词和 `alarm_control_panel` 类型
- **LightControl 容差常量化**：将硬编码的亮度同步容差 `5` 提取为 `SYNC_TOLERANCE` 常量并添加文档
- **语音取消阈值参数化**：将 `AiChatWidget.tsx` 中硬编码的滑动取消阈值提取为 `VOICE_CANCEL_SWIPE_THRESHOLD` 常量
- **fetchStatesRest ref 统一**：新增 `configTokenRef`/`restBaseUrlRef`，使 REST 函数通过 ref 访问状态，避免闭包过期
- **App.tsx 死代码清理**：移除未使用的隐藏占位按钮代码
- **useHASyncManager 竞态条件**：引入 `entitiesRef` 避免 `setInterval` 回调闭包捕获过期 `entities`，间隔调整为 30 秒
- **依赖数组修复**：修复 `App.tsx` 中 `addLog`、`setSettingsOpen` 缺失依赖警告

#### 🛠 TypeScript 编译错误修复（48 项 → 0 项）
- **未使用导入清理**：修复 14 个文件中的 TS6133/TS6192 未使用变量和导入错误
- **测试文件类型修复**：修复 8 个测试文件中的 TS2739/TS2322 类型不匹配错误
- **useWeather 缓存类型修复**：修正 `setWeather(cached)` → `setWeather(cached.data)`，适配 CacheManager 返回结构
- **CameraDashboard v2 API 迁移**：将 `react-grid-layout` v2 的平铺属性迁移至 `gridConfig`/`dragConfig`/`resizeConfig` 分组配置对象

---

## [4.3.2] - 2026-04-02

### 🔧 修复与优化

#### 版本发布流程修复
- **Git 历史清理**：清除所有历史提交，仅保留 v4.3.2 单条干净提交
- **版本号同步**：所有配置文件版本号统一更新至 4.3.2
- **CI/CD 触发**：修复 GitHub Actions 构建触发问题

---

## [4.3.1] - 2026-04-02

### 🎨 UI 布局优化

#### 空调控制小卡片（ClimateControl）
- **中间信息区紧凑化**：去掉 `flex-1` 撑开行为，改为 `py-1 gap-1` 固定间距，消除多余空白
- **底部控制区对齐**：改用 `flex-1 justify-end` 使模式/风速按钮自然上移，紧贴温度调节行

#### 空调控制弹窗（ClimateControlModal）
- **旋钮上方间距缩减**：状态胶囊 `mb-1→mb-0`，旋钮负边距 `-mt-2→-mt-4`，消除旋钮与标题之间空白
- **旋钮下方间距缩减**：旋钮 `-mb-8→-mb-10`，控制面板 `pt-2→pt-0`，`gap-3→gap-2`，消除红框区域空白

#### 调光灯控制（LightControl）
- **中间弹性区重构**：时间戳与亮度信息合并为 `flex-1 justify-center` 居中区域，层次清晰
- **底部滑块区独立**：`shrink-0` 固定底部，消除与中间信息区的结构嵌套冗余

---

## [4.3.0] - 2026-04-02

### 🚀 重大更新

#### 版本发布流程优化

- **版本号统一更新**：所有配置文件版本号同步至 4.3.0
- **构建流程优化**：确保 GitHub Actions 正确触发 Docker 镜像构建
- **Add-on 更新修复**：修复因缺少 git tag 导致的更新失败问题

### 🔧 修复与优化

- **空调组件布局优化**：温度显示单行布局，按钮和图标尺寸优化
- **窗帘图案对齐修复**：左右面板宽度计算修正，消除关闭状态中间缝隙
- **版本号显示修复**：z-index 提升到 60，确保在 Home Assistant iOS App 中正常显示

---

## [4.2.3] - 2026-04-02

### 🔧 修复与优化

#### v4.2.2 修复验证与发布

- **空调组件布局优化**：温度显示单行布局，按钮和图标尺寸优化，解决溢出问题
- **窗帘图案对齐修复**：左右面板宽度计算修正，消除关闭状态中间缝隙
- **版本号显示修复**：z-index 提升到 60，确保在 Home Assistant iOS App 中正常显示

---

## [4.2.2] - 2026-04-02

### 🔧 修复与优化

#### 空调组件布局优化

- **修复布局溢出问题**：ClimateControl.tsx 底部控制区域溢出卡片边界
- **温度显示优化**：从双行改为单行布局，温度数字从 26px 缩小到 22px
- **按钮尺寸调整**：加减按钮从 w-7 h-7 缩小到 w-6 h-6
- **控制条高度**：HVAC 模式和风速选择条从 h-[24px] 缩小到 h-[22px]
- **图标尺寸**：模式图标 12px→11px，风速图标 11px→10px
- **添加 mt-auto**：确保底部控制区域正确对齐

#### 窗帘组件视觉修复

- **修复图案对齐问题**：LargeCurtainVisual 左右面板宽度计算偏差
- **消除中间缝隙**：关闭状态下左右面板现在完全贴合，无缝隙
- **布局简化**：左面板从 `left: 1.5px, width: calc(50% - 6px)` 改为 `left: 0, width: panelWidth%`

#### 版本号显示修复

- **提高 z-index**：从 40 提升到 60，确保在 Home Assistant iOS App 中正常显示
- **添加交互优化**：`pointer-events-none` 和 `select-none` 防止交互干扰
- **透明度调整**：从 0.4 提升到 0.5，更清晰可见

### ✨ 新增功能

#### 版本号显示

- **底部版本号**：在界面底部中间区域添加版本号显示，便于确认当前运行版本
- **构建时注入**：通过 Vite 配置在构建时自动注入版本号

---

## [4.2.1] - 2026-04-02

### 🔧 修复与优化

#### 空调组件布局修复

- **修复按钮溢出问题**：ClimateControl.tsx 底部控制区域按钮溢出到卡片外框
- **优化布局结构**：简化时间戳区域，移除多余嵌套 div，减少高度占用
- **精简按钮样式**：按钮行高度从 26px 减少到 24px，内边距从 p-0.5 改为 p-[2px]
- **缩小图标尺寸**：HVAC 模式图标 13px→12px，风速图标 12px→11px，风速阶梯图标添加 scale-90
- **调整间距**：控制区间距从 gap-1.5 缩小到 gap-1，按钮容器圆角优化

---

## [4.2.0] - 2026-04-02

### 🚀 重大更新

#### Token 加密体系重构（彻底解决系统更新后乱码问题）

- **持久化加密密钥**：新增 `getOrCreateEncryptionKey()` 函数，使用 `crypto.getRandomValues` 生成随机密钥并存储在 localStorage 中（key: `haui_ek_v2`），不再依赖浏览器环境因素，系统更新/浏览器升级均不影响
- **加密函数切换**：`encryptToken()` 改用持久化密钥进行 XOR 加密，替代原有的 `getStableIdentifier()` 方案
- **解密多版本兼容**：`decryptToken()` 按优先级依次尝试：持久化密钥 → 旧版稳定标识符 → 旧版浏览器指纹 → 简单 Base64
- **严格乱码检测**：`isValidDecodedToken()` 改为零容忍策略，任何非可打印 ASCII 字符即判定为乱码（原为10%阈值）
- **Token 格式校验增强**：`isValidTokenFormat()` 正则改为 `[^\x20-\x7E]`，拒绝所有非可打印 ASCII 字符
- **自动迁移机制**：App.tsx 加载配置时，解密成功后自动用新密钥重新加密存储，一次性完成迁移

#### 设备控制首次操作失效问题根治

- **引入连接状态 ref**：新增 `connectionRef`、`isConnectedRef`、`isConnectionReadyRef` 三个 ref，在连接建立/断开/就绪事件中同步更新，不依赖 React 渲染周期
- **callService 重构**：改为从 ref 读取连接状态，依赖数组清空为 `[]`，彻底消除闭包过期问题；每次重试前重新读取最新连接
- **refreshEntities / fetchStatesRest 同步优化**：统一改用 `connectionRef.current` 获取最新连接对象

#### 前端与 HA 数据交互实时性优化

- **断连同步**：disconnect 事件中同步重置所有 ref + 请求协调器，重连后立即可用
- **ready 事件即时响应**：`isConnectionReadyRef` 在 ready 事件中同步更新，WebSocket 重连后首次操作即生效
- **连接错误即时感知**：callService 中连接级错误同步标记 ref 断开，避免后续调用使用过期连接

---

## [3.30.9] - 2026-04-01

### 🔧 修复与优化

#### Token 加密机制彻底修复

**问题根因**：原 Token 加密基于浏览器指纹（包含 `navigator.userAgent`、`screen.width` 等）生成 XOR 密钥，当系统更新后浏览器版本号变化，导致指纹变化，解密密钥不匹配产生乱码。

**修复内容**：
- **移除不稳定指纹**：`getStableIdentifier()` 不再使用 `userAgent`、屏幕分辨率等易变因素，只使用语言设置、时区和固定盐值
- **添加乱码检测**：`isValidDecodedToken()` 检测解密后 Token 是否为有效 ASCII 字符
- **多版本兼容**：`decryptToken()` 支持旧版浏览器指纹解密、简单 Base64 解密、明文 JWT 检测
- **自动恢复机制**：解密失败时返回空字符串，触发重新配置流程
- **用户提示**：Token 损坏时自动弹出提示并打开设置面板

---

## [3.30.8] - 2026-04-01

### 🔧 修复与优化

#### Home Assistant 连接与设备控制全面修复

**1. 长期访问令牌 (Token) 编码问题修复**
- 新增 `sanitizeToken()` 函数：清理 BOM、空白字符、不可见控制字符、引号包裹
- 新增 `isValidTokenFormat()` 函数：验证 Token 格式有效性
- 在所有使用 Token 的地方应用清理逻辑，防止编码问题导致认证失败

**2. 设备控制首次操作失效问题修复**
- 新增 `isConnectionReady` 状态：区分“已连接”和“连接就绪”
- `callService` 增加连接就绪等待机制：如果连接正在建立中，最多等待 5 秒
- `callService` 增加自动重试机制：最多重试 2 次，每次延迟递增
- 监听 `ready` 事件：确保 WebSocket 完全就绪后才标记为 ready

**3. 前端与 HA 数据交互实时性优化**
- 事件节流从 2s → 1s，且不再跳过事件处理，只影响日志显示
- 强制刷新间隔从 30s → 15s，提升状态同步实时性
- 连接成功后立即执行设备状态同步，不再延迟
- 自动扫描延迟从 3s → 2s，配置同步从 5s → 4s

---

## [3.30.7] - 2026-04-01

### 🔧 修复与优化

#### Home Assistant 控制稳定性修复
- **修复首次操作失效问题**：
  - 连接断开时正确清空 connection state，避免使用已断开的连接
  - 增强 `callService` 函数，添加连接状态验证和 10 秒超时保护
  - 修复 `useDebouncedCallback` Hook，使用 ref 保持 callback 稳定性
  - 修复 `handleLightUpdate` 缺少 `callService` 依赖导致的闭包问题

#### 设备状态刷新频率统一
- **统一设备刷新策略**：
  - 修复 `EVENT_THROTTLE_MS` 节流逻辑，明确仅用于日志去重
  - 统一 `DeviceCard` 刷新逻辑，所有设备使用相同的 10 秒时间窗口
  - 添加 30 秒定期强制刷新机制，确保状态同步一致性
  - 优化 `syncDevicesWithEntities`，处理实体不存在的情况

#### 连接可靠性增强
- **修复连接缓存状态检查**：添加 `isConnectionAlive` 函数验证 WebSocket 实际状态
- **清理无效连接**：创建新连接前关闭并清理无效的旧连接

---

## [3.30.6] - 2026-04-01

### 🔧 修复与优化

#### Home Assistant 连接稳定性改进
- **修复 Token 获取逻辑**：统一 `initConnection` 中的 token 获取，优先使用配置 token，否则使用环境变量 `VITE_HA_TOKEN`
- **修复代理路径规范化**：`restBaseUrl` 现在正确处理代理路径（如 `/ha-api`），避免 REST API 调用失败
- **修复连接状态锁死问题**：添加 30 秒超时保护，防止 `isConnectingRef` 长期挂起导致无法重连
- **修复 REST API Token 验证**：`fetchEntityStateRest` 和 `fetchStatesRest` 现在正确排除无效占位符 token

#### 窗帘组件视觉优化
- **修复窗帘两侧宽度对齐**：帘布面板与窗帘杆左右边距保持一致（`left-1.5 right-1.5`），视觉更协调

---

## [3.30.5] - 2026-03-31

### ✨ 新增功能

#### 窗帘控制组件视觉与交互优化
- **窗帘图标样式升级**：`DynamicCurtainIcon` 采用纯直角矩形设计（rx=0），降低填充透明度至 0.12，视觉更轻盈
- **窗帘可视化重设计**：`LargeCurtainVisual` 三段式渐变（from-slate-300/65 via-slate-200/55 to-slate-100/45），11px 周期褶皱纹理，底部淡出层增强飘逸感
- **交互逻辑优化**：支持从中间向两侧拖拽，左侧向左拖=打开，右侧向右拖=打开，符合直觉操作
- **光标样式统一**：使用 `cursor-col-resize` 双向箭头光标

#### 设备绑定弹窗层级修复
- **修复 Popover/Drawer z-index 问题**：为 `DeviceEditorForm` 中的实体选择、房间选择、类型选择弹窗添加 `z-[200]`，确保显示在 SettingsModal 之上

#### 遥控器组件优化
- **RemoteCard 视觉一致性**：统一图标尺寸和间距
- **RemoteControlModal 布局优化**：改善控制面板响应式表现

### 🔧 技术改进

- **防抖 Hook 优化**：`useDebouncedCallback` 性能提升
- **类型定义完善**：`remote.ts` 类型安全加固
- **Vite 配置更新**：`vite.config.ts` 优化构建配置

---

## [3.30.4] - 2026-03-30

### 🐛 修复

#### TypeScript 未使用变量清理
- **ErrorBoundary.tsx**：移除未使用的 `React` 导入
- **useDashboardManager.ts**：移除未使用的 `discoverDevicesFromStates`、`cleanLogMessage` 导入
- **useDashboardManager.ts**：移除未使用的 `users`、`selectedClimateDevice` 变量解构

---

## [3.30.3] - 2026-03-30

### 🔧 技术优化

#### 代码质量与架构改进
- **统一日志管理**：创建 `src/utils/logger.ts`，替换所有 `console.log/warn/error/debug` 调用，支持环境控制
- **统一错误处理**：创建 `src/utils/error-handler.ts`，提供标准化的错误处理和用户提示
- **安全确认配置化**：创建 `src/config/security-config.ts`，将硬编码的高危操作检查提取到配置文件中

#### TypeScript 类型安全加固
- 修复 `useHASyncManager.ts`、`useHomeAssistant.ts`、`App.tsx` 等文件中的 `any` 类型
- 添加 `Device` 类型导入，修复函数参数类型定义
- 创建 `src/types/ezuikit-js.d.ts` 扩展类型声明，添加 `SpeechRecognition` 和 `webkitAudioContext` 类型
- 修复 `entity-cleaner.ts` 和 `ha-discovery.ts` 中 `attributes` 类型问题

#### 性能优化
- 为 `Header` 组件添加 `React.memo`，精确控制重新渲染条件
- 为 `StatisticsPanel` 组件添加 `React.memo`，优化仪表板渲染性能
- `DeviceCard` 已存在 `React.memo` 优化

#### 安全增强
- **Token 加密增强**：升级 `src/utils/security.ts`，实现 4 层加密机制：
  - XOR 加密（基于浏览器指纹生成密钥）
  - Base64URL 编码
  - 随机前缀混淆
  - 外层包装编码
  - 保持向后兼容，支持旧版 Base64 格式解密

#### 代码清理
- 归档临时脚本到 `.archived/scripts/`：`generate-mdi-meta.js`、`generate-region-coords.mjs`、`generate-sensors.mjs`
- 删除重复的 `useMediaQuery.ts` Hook，统一使用 `use-media-query.ts`

---

## [3.30.2] - 2026-03-30

### 🐛 修复

#### 代码质量与 Lint 错误修复
- **修复 useLongPress Hook 调用方式**：移除 IIFE 包裹，改为在组件顶层直接调用，符合 React Hooks 规则
- **修复 useLongPress 中的表达式语句**：将 `timeout.current && clearTimeout(timeout.current)` 改为 `if` 语句
- **修复 useAiChat 中的变量声明**：将 `let currentChatMessages` 改为 `const`，避免不必要的可变声明
- **修复 ai-chat.ts 中的空 catch 块**：添加注释说明忽略解析错误的意图
- **修复 CameraPlayer.tsx 全屏方法类型问题**：重构全屏 API 调用逻辑，使用更安全的多浏览器兼容方式

### 🔧 技术改进
- 提升代码规范性和可维护性
- 消除 ESLint 警告和错误
- 优化 TypeScript 类型安全性

---

## [3.30.1] - 2026-03-30

### 🐛 修复

#### 连接稳定性问题根因修复
- **修复 useEffect 依赖项导致的无限重连**：移除 `JSON.stringify` 依赖项，改为原始值依赖并添加配置变化检测逻辑
- **修复同步事件导致的页面无限刷新**：移除 `haui-sync-complete` 事件中的 `location.reload()` 调用
- **修复 useHASyncManager 依赖循环**：使用 `useRef` 保存 `deviceMappings` 和 `personMappings`，避免对象引用变化导致的重复执行
- **修复强制同步触发问题**：将 `syncFromServer(true)` 改为 `syncFromServer(false)`，避免不必要的更新
- **修复配置加载重复执行**：添加 `isLoadingFromServer` 标记防止重复加载

#### 测试文件 TypeScript 警告修复
- **DeviceDiscoveryPanel.test.tsx**：修复 `toBeInTheDocument` 类型问题，改用 `@testing-library/jest-dom/vitest` 导入方式
- **DeviceDiscoveryPanelStability.test.tsx**：移除未使用的 `fireEvent`、`waitFor` 和 `rerender` 变量

### 🔧 技术改进
- 优化 useHomeAssistant Hook 连接管理逻辑
- 优化 useHASyncManager Hook 依赖项稳定性
- 完善数据同步机制，消除循环更新风险

---

## [3.30.0] - 2026-03-29

### 🚀 重大改进

#### HA 系统连接稳定性全面优化
- **修复重复连接问题**：DeviceDiscoveryPanel 组件改为从父组件接收连接状态，避免在设置弹窗中创建第二个 WebSocket 连接
- **修复重连计数器重置问题**：使用 useRef 保持 reconnectAttempts 跨渲染周期，实现真正的指数退避重连策略（1s, 2s, 4s, 8s... 最大30s）
- **优化依赖数组稳定性**：使用 JSON.stringify 处理 config 依赖，避免对象引用变化导致的不必要重连
- **添加连接状态防抖动**：新增 isConnectingRef 防止重复连接请求

#### 前端渲染性能优化
- **断开提示防抖**：新增 ConnectionStatusBanner 组件，延迟 2 秒显示断开提示，避免短暂断开导致的闪屏现象
- **初始化拥塞缓解**：自动扫描延迟 3 秒、配置同步延迟 5 秒执行，优先保证设备状态同步
- **定时器清理优化**：组件卸载时清理重连定时器，避免内存泄漏

### 🔧 技术改进
- 重构连接状态传递机制，Props 传递替代独立 Hook 调用
- 优化 useHomeAssistant Hook 内部状态管理
- 完善组件清理逻辑，提升应用稳定性

---

## [3.29.6] - 2026-03-29

### 🔧 优化与修复

#### AI 智能管家功能质量提升
- 修复 ChatInput 语音录制与 useSpeechRecognition Hook 的集成问题，语音输入现在能正确触发语音识别
- 优化语音状态管理，语音识别状态与 UI 状态指示器实时同步
- 添加 ai-tools-executor.ts 服务域白名单校验，增强设备控制安全性
- 优化 useSpeechSynthesis 错误处理，区分用户取消和真实错误
- 优化 ai-context.ts Token 消耗，实体上限从 100 降至 50，按优先级排序发送常用设备

---

## [3.29.5] - 2026-03-29

### 🐛 修复

- 修复设备状态同步逻辑，优化灯光亮度处理

---

## [3.29.2] - 2026-03-29

### 🐛 修复

- 修复自定义布局编辑界面遮挡状态图标问题，优化UI层级和间距
- 修复人员在线状态显示错误，改进HA实体状态有效性判断逻辑
- 统一网页端与APP端家庭状态组件UI表现，确保跨端一致性
- 修复灯光设备开关响应问题，优化亮度同步和乐观更新逻辑
- 统一灯光设备控制图标样式，支持light/Lightbulb/lightbulb图标类型

---

## [3.29.1] - 2026-03-29

### 🐛 修复

- 修复设备卡片状态指示器与呼吸动画
- 统一绿色主题色为 #65cf58
- 优化 CSS 动画结构，将 keyframes 移至 @theme 外部

---

## [3.29.0] - 2026-03-28

### 🎉 重大更新

本次版本是 HAUI Dashboard 的一次重大架构优化版本，重点提升了**性能**、**稳定性**和**安全性**。

---

### ✨ 新增功能

#### 1. 响应式布局重构
- **HomeScreen.tsx 全面重构**
  - 将 Figma 导出的 1408 行绝对定位代码重构为 330 行响应式布局
  - 使用 Flexbox 和 Grid 替代绝对定位
  - 支持手机、平板、桌面端自适应
  - 优化组件结构，提升可维护性

#### 2. 批量控制优化
- **场景控制优化**
  - 使用原生 `scene.turn_on` 服务
  - 添加错误处理和 Toast 反馈
  
- **新增批量控制函数**
  - 使用 `homeassistant.turn_on/off` 服务进行批量设备控制
  - 支持分批处理（每批最多 50 个实体）
  - 实现乐观更新和失败回滚机制

#### 3. 公网访问安全策略
- **PIN 码二次确认**
  - 公网访问时，高危操作（开锁、解除安防等）需要 PIN 码确认
  - 支持设置和验证 4-6 位数字 PIN 码
  - PIN 码本地加密存储
  
- **高危操作检测**
  - 自动识别门锁、安防、车库门等高危设备
  - 仅在公网环境下触发确认机制

#### 4. 性能优化
- **动画性能降级**
  - 新增 `useReducedMotion` Hook 检测系统减少动画偏好
  - 设置按钮支持简单 CSS 和完整动画两种模式
  
- **防抖节流机制**
  - 新增 `useDebouncedCallback` Hook
  - 窗帘位置控制使用 300ms 防抖
  - 灯光亮度调节防抖优化

#### 5. 架构优化
- **解耦 App.tsx**
  - 将 HA 同步逻辑迁移到 `useHASyncManager` Hook
  - 减少 App.tsx 约 170 行代码
  
- **按需加载**
  - 使用 React.lazy + Suspense 实现代码分割
  - SettingsModal、ClimateControlModal 等组件懒加载
  
- **组件级错误边界**
  - 新增 `CardErrorBoundary` 组件
  - 单个设备卡片错误不影响整个仪表盘

#### 6. HA 集成优化
- **指数退避重连**
  - WebSocket 断线后自动重连
  - 使用指数退避算法，最大延迟 30 秒
  
- **全局断线提示**
  - 连接断开时显示提示信息
  - 重连成功后自动恢复
  
- **僵尸实体清理**
  - 新增 `orphaned-entities.ts` 工具
  - 自动检测并清理无效设备映射

#### 7. 安全增强
- **CSP 配置**
  - 添加 Content Security Policy meta 标签
  - 防御 XSS 攻击
  - 限制外部资源加载

---

### 🔧 改进

- **UI 优化**: 设备卡片视觉紧凑化
- **交互优化**: 新增 Touchable 触控反馈组件
- **错误处理**: 统一错误提示和日志记录
- **状态管理**: 乐观更新失败自动回滚

---

### 🐛 修复

- 修复 `useReducedMotion` 引用不存在状态的问题
- 修复 `Touchable.tsx` 类型错误
- 修复 `orphaned-entities.ts` 索引类型错误
- 修复 `App.tsx` 缺少导入的问题

---

### 📚 文档

- 新增完整的使用说明书 (`docs/USER_MANUAL.md`)
- 重写项目介绍文档 (`README.md`)
- 新增架构说明和技术栈介绍

---

### 🏗️ 技术债务

- 移除 Figma 导出的冗余绝对定位样式
- 优化组件 Props 类型定义
- 统一错误处理模式

---

## [3.28.0] - 2026-03-20

### ✨ 新增功能

- 初始版本发布
- AI 智能管家语音交互
- iOS 风格 UI 设计
- Home Assistant WebSocket 集成
- 多路视频监控支持
- 场景控制功能
- 设备映射配置

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| 3.29.1 | 2026-03-29 | 修复设备卡片状态指示器与动画 |
| 3.29.0 | 2026-03-28 | 架构优化、性能提升、安全增强 |
| 3.28.0 | 2026-03-20 | 初始版本发布 |

---

**注意**: 版本号遵循语义化版本规范（MAJOR.MINOR.PATCH）
- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复
