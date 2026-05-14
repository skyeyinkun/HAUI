# 更新日志

所有重要的版本更新都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [5.14.0] - 2026-05-14

### 新增

- **强制授权入口**：HAUI 部署后先显示授权页面，用户复制客户机器码并导入授权码后才进入主界面。
- **默认授权公钥**：前端和 Add-on 后端内置当前授权工具公钥，解决 5.12.0 未配置 `HAUI_LICENSE_PUBLIC_KEY` 时无法激活的问题，同时保留配置项覆盖能力。
- **客户交付包构建**：新增 `npm run package:customer`，只打包 Add-on 运行文件，排除 `src`、`scripts`、测试、`.env`、私钥和授权生成工具。
- **商业交付隔离文档**：新增 `docs/COMMERCIAL_DELIVERY.md`，明确开发仓库、私有授权工具和客户交付包边界。

### 优化

- **授权页简化**：授权页只保留客户机器码、复制机器码、导入授权码和激活授权，移除销售规则、维护期说明、免费版和清除授权等用户无关信息。
- **后端授权门禁**：未授权时 Add-on 后端会拦截 `/api/*` 和 `/ha-api/*` 业务接口，仅开放授权状态、授权激活和系统状态接口。
- **文档同步**：README、用户手册、Add-on 文档、授权流程和隐私边界已同步为“先授权再使用”的交付模型。

### 测试

- **发布验证通过**：TypeScript、ESLint、Vitest、Add-on Node 测试、Node 语法检查和 Add-on 构建均通过。

---

## [5.12.0] - 2026-05-12

### 新增

- **交付状态总览**：设置页新增交付状态入口，集中检查 HA 连接、设备、房间、摄像头、授权、备份和版本缓存状态，降低远程部署后的遗漏风险。
- **摄像头监控入口增强**：新增监控面板懒加载与手机底部监控入口，优化 HA HLS、萤石云和 go2rtc 配置不完整时的错误提示。
- **Add-on 回归测试**：新增 Node 原生测试覆盖系统状态、备份恢复 Pro 门控和备份文件路径安全，避免后端发布回归。

### 优化

- **首屏与包体积优化**：摄像头监控面板改为按需加载，构建拆分 React、Motion、视频、AI、设置和遥控相关 chunk，降低主应用入口体积。
- **仪表盘加载体验**：布局初始化改为先读取本地/默认布局，再后台同步 Add-on 存储，避免首页长时间停留在“正在加载布局”。
- **平板墙屏体验**：墙屏模式增加夜间降亮、轻量防烧屏漂移和手动/自动模式切换，适合固定平板长期显示。
- **备份恢复体验**：备份页自动加载服务器备份列表，导入 JSON 后先进入确认状态再恢复，降低误操作风险。
- **本地存储稳定性**：关键 localStorage 读写迁移到安全封装，提升 WebView、隐私模式和测试环境兼容性。

### 修复

- **Vite 安全更新**：Vite 升级到 `6.4.2`，依赖审计通过 0 个中高危漏洞。
- **窗帘拖拽状态同步**：修复窗帘拖拽确认后无法接收后续 1% 微小真实状态更新的问题。
- **多实例卡片刷新语义**：修复室内环境和家庭状态卡片使用多实例 `cardId` 后刷新按钮标识与错误标题丢失的问题。
- **敏感日志脱敏**：日志输出会脱敏 Bearer Token、API Key、App Secret、Authorization 和机器码。
- **HA 侧版本同步**：Add-on、前端包、Service Worker 和自定义集成版本统一到 `5.12.0`。

### 测试

- **全量验证通过**：Vitest、ESLint、TypeScript、Add-on Node 测试、生产构建、Add-on 构建和 npm audit 均通过。

---

## [5.4.0] - 2026-05-04

### 新增

- **Add-on 优先交付版本**：明确当前路线为 Home Assistant Add-on / HA 内嵌面板优先，兼容 PWA 和平板墙屏，暂不包含 Android/iOS 原生 App 商店包。
- **离线 Pro 授权闭环**：加入 Add-on 后端机器码生成、ECDSA P-256 授权码验签、维护期状态、Pro 功能门控和授权页说明，个人开发者无需额外搭建授权服务器即可按单实例交付。
- **备份恢复入口**：新增服务器备份、下载备份、导入恢复和恢复前自动回滚快照，降低远程部署、迁移和版本更新风险。
- **PWA 和墙屏交付能力**：补齐 Web App Manifest、Service Worker、手机底部导航、设置窗口自适应和平板墙屏使用说明。

### 优化

- **AI 后端代理链路增强**：Home Assistant Ingress 环境下，AI 聊天优先走 Add-on 后端代理；AI 设置保存会等待后端确认并显示真实错误。
- **AI 执行安全边界强化**：继续保留设备控制前确认、高风险操作阻断、工具执行审计和 Agent 提案审批机制。
- **摄像头体验完善**：补齐 HA HLS、萤石云代理、go2rtc、连接测试、默认静音、隐私模式和 PTZ 代理错误反馈。
- **Home Assistant 集成同步**：自定义集成版本和状态接口同步到 `5.4.0`，避免 HA 侧状态与 Add-on 发布版本不一致。
- **文档体系重写**：README、用户手册、Add-on 文档和 AI 助手指南按当前功能边界更新，补充安装、部署、授权、隐私、售后和商业交付说明。

### 修复

- **`/ha-api` 代理保留查询参数**：修复 Add-on 代理转发 Home Assistant REST 请求时 query string 丢失的问题。
- **PTZ 控制错误透明化**：摄像头 PTZ 代理会校验方向和实体参数，并返回 Home Assistant 的真实错误，便于排查设备权限和服务能力。
- **AI 设置保存状态修复**：前端不再在后端保存失败时误提示成功，减少部署后配置失效的排查成本。
- **授权验证兜底修复**：授权激活支持 Add-on 后端验证 fallback，降低前端公钥配置缺失导致无法激活的概率。

### 测试

- **AI Ingress 代理回归测试**：新增 AI 聊天代理路径测试，防止 Ingress 环境下 API 路由回退到 HTML。
- **发布验证命令补齐**：更新 README 中的 TypeScript、Vitest、Node 语法检查、Python 编译检查和 Add-on 构建命令。

---

## [5.2.0] - 2026-05-02

### 修复

- **修复 Agent 控制台一直加载**：Agent API 改为通过 `/ha-api/api/yinkun_ui/agent/...` 访问 Home Assistant Core 自定义集成，避免 Add-on Node fallback 返回 HTML 导致控制台卡住。
- **修复模型配置空白页**：模型配置未加载或加载失败时显示明确状态和重新加载按钮，不再渲染空白内容。
- **Agent API 健壮性增强**：新增 10 秒超时、非 JSON 响应识别和错误提示，避免错误响应被当成有效数据。
- **日志初始化兼容性**：加固 `localStorage` 调试开关读取，避免 WebView 或测试环境 storage 异常影响初始化。

### 优化与改进

- **Agent 图标更新**：AI 助手入口和 Agent 控制台头部改用 `BrainCircuit` 图标，更贴近智能体语义。
- **AI 助手窗口恢复窄版**：浮窗宽度恢复为 `380px`，手机端使用 `calc(100vw - 32px)`，确保小于手机屏幕宽度。
- **Agent 控制台空状态优化**：Workspace 无文档时显示空状态提示，减少误判为加载失败。

### 测试

- **新增 Agent API 单元测试**：覆盖 `/ha-api` 路由、HTML fallback 响应识别，防止类似问题回归。

---

## [5.1.8] - 2026-05-01

### 修复与发布

- **版本号显示修复**：界面底部版本号降级值从 `4.3.2` 更新为 `5.1.8`，消除未注入 `VITE_APP_VERSION` 时仍显示远古版本号的问题。
- **Agent 控制台完整发布**：重新构建 `dist/` 产物，确保 5.1.7 版本引入的 Agent 控制台、三通道模型配置、提案审批、审计日志等全部功能可在前端正常访问（此前因镜像未重建导致用户端仍停留在 5.1.2）。
- **版本号全链路同步**：`package.json`、`addon/package.json`、`addon/config.yaml` 全部同步升级至 `5.1.8`，触发 CI/CD 重新构建 Docker 镜像并推送到 ghcr.io。

---

## [5.1.7] - 2026-05-01

### 新增功能

- **HAUI 助手内置 Agent 控制台**：在 AI 助手窗口新增 Agent 控制入口，可查看对话、模型、提案、Workspace 文档、记忆、心跳、工具与审计。
- **三通道模型配置可视化**：支持在页面中配置 Primary AI、Backup AI、Summary AI，并保留后端 API Key 脱敏保存逻辑。
- **Agent 工具执行可观测**：Agent 对话结果展示工具调用 trace，便于确认工具执行成功或失败。
- **提案审批与审计闭环**：Workspace、仪表盘等写入类操作走提案审批，操作记录写入审计日志。

### 优化与改进

- **快捷控制识别增强**：优化中文自然语言匹配，支持“书房里的主灯”等带结构助词的表达。
- **设备控制稳定性提升**：修正模型传入错误 domain 但 entity_id 可确定真实域时的安全纠偏逻辑。
- **语音体验优化**：新增 AI 回复自动朗读开关，关闭后不再自动播报并会停止当前朗读。
- **重复提交防抖**：拦截语音识别和按钮连击造成的短时间重复控制请求。
- **浏览器兼容性**：Agent 控制台消息 ID 生成增加 `crypto.randomUUID()` 兜底。
- **HA 调用超时优化**：快捷控制保留超时保护，同时放宽等待时间以兼容慢设备与重连场景。

---

## [5.1.6] - 2026-05-01

### 安全加固（开源前隐私清理）

- **删除个人敏感数据文件**：移除 `addon/.data/haui_config.json`，该文件包含精确 GPS 坐标、家庭设备清单、房间布局与活动日志。
- **Git 历史重写**：使用 `git-filter-repo` 彻底清除 `addon/.data/haui_config.json`、`HAUI-v3.30.1.bundle`、`v3.30.1-changes.patch` 的全部历史痕迹，任何 commit 快照中均不再保留敏感数据。
- **环境变量脱敏**：`.env` 与 `.env.development` 统一使用 `your-ha-host.example.com` 占位符，禁止写入真实域名与令牌。
- **移除源码中硬编码域名**：`vite.config.ts` 代理目标回退值由真实外网地址改为 `http://localhost:8123`。
- **默认坐标脱敏**：`src/utils/regions.ts` 默认地区由开发者个人住址改为北京东城区公共地标坐标 `(39.9042, 116.4074)`。
- **推送脚本加固**：`push-to-github.ps1` 改用 `git -c http.extraheader` 注入 Token，避免凭证被写入 `.git/config`；`finally` 块清零内存。
- **MQTT 强制认证**：`mosquitto.conf` 关闭 `allow_anonymous`，启用 `password_file` 认证。
- **完善 .gitignore**：新增 `addon/.data/`、`*.local`、`.env.*`（白名单 `.env.development`）、`*.bundle`、`*.patch`、`config/{groups,automations,scripts,scenes,secrets}.yaml`、`vite-dev*.log` 等保护规则。

### 工程化

- **版本号同步**：`package.json`、`addon/package.json` 与 `addon/config.yaml` 同步升级至 `5.1.6`。
- **归档清理脚本**：将 `cleanup-ghcr-versions.ps1` 迁移至 `.archived/scripts/`，避免误用导致正在服役版本的 ghcr 镜像被删除（5.1.5 更新失败的直接诱因）。

---

## [5.1.5] - 2026-04-17

### 新增功能

- **HA 端 AI Agent 核心框架**：在 `custom_components/yinkun_ui/agent/` 下落地完整的 Agent 运行时，包含 `turn_kernel` 会话内核、`loop_controller` 循环控制、`runtime` 运行上下文。
- **模型路由与 LLM 客户端**：新增 `model_router` 与 `llm_client`，统一多模型接入与切换逻辑。
- **工具注册与执行层**：`tool_registry` / `tool_executor` 提供工具声明、参数校验与安全执行通道，配套 `dashboard_tools`、`automation_script_tools` 等业务工具集。
- **多类存储层**：`config_store`、`memory_store`、`proposal_store`、`workspace_store`、`audit_store` 分别负责配置、记忆、提议、工作区与审计日志。
- **HTTP 接入**：`views.py` 暂存/装载 Agent 相关 REST 视图，`__init__.py` 在集成启动时自动 `async_setup_agent(hass)`。

### 工程化

- **.gitignore 补全 Python 排除**：新增 `__pycache__/` 与 `*.py[cod]` 规则，避免缓存文件污染仓库。

---

## [5.1.3] - 2026-04-17

### 新增功能

- **AI 快捷控制**：新增 `ai-quick-control` 服务，支持常用设备指令的快速解析与执行，配套完整单元测试覆盖。
- **上下文工具测试**：新增 `ai-context` 工具函数测试用例，保障上下文组装逻辑稳定性。

### 优化与改进

- **AiChatWidget 体验升级**：聊天组件重构，强化流式渲染与交互反馈。
- **语音合成增强**：`useSpeechSynthesis` 扩展播放控制、音色参数与中断处理。
- **AI 上下文组装精简**：`ai-context` 输出更紧凑，降低 prompt 冗余。
- **AI 工具执行收紧**：`ai-tools-executor` 补充边界校验与测试用例。

---

## [5.1.2] - 2026-04-17

### 修复与优化

- **AI 服务稳定性提升**：完善 `ai-service` / `ai-chat` 错误处理与消息规范化链路，进一步兼容 DashScope 等 OpenAI 兼容后端。
- **AI 设置界面调整**：优化 `AiSettingsModal` 选项与提示文案。
- **对话上下文增强**：改进 `useAiChat` Hook 的上下文组装与状态处理逻辑。
- **AI 工具执行加固**：强化 `ai-tools-executor` 实体校验与安全控制边界。
- **测试覆盖扩展**：新增 `ai-chat`、`ai-service` 单元测试，补齐 `ai-tools-executor` 断言。
- **文档同步**：README、DOCS、USER_MANUAL 同步更新最新 AI 配置说明。

---

## [5.1.1] - 2026-04-30

### 修复

- **DashScope API 消息格式兼容**：修复阿里云百炼 API 报错 `content field is required` 的问题，将所有发送给 LLM 的消息 content 从 null 改为空字符串
- **后端消息规范化**：新增 `sanitizeMessages()` 防御层，确保 content 字段始终为字符串类型

---

## [5.1.0] - 2026-04-30

### 新增功能

- **AI 助手升级**：内置设备查询、实体检索、全屋状态统计和低风险设备控制工具。
- **设备数据统计能力**：支持汇总开启中的设备、关键传感器读数和不可用设备数量。

### 优化与改进

- **统一命名为 AI 助手**：替换旧的 AI 管家/智能管家文案，统一产品表达。
- **复用主控制链路**：AI 设备控制复用主应用 Home Assistant `callService`，避免绕过用户配置、连接就绪等待和重试逻辑。
- **首屏性能优化**：AI 助手改为懒加载，拆出独立构建 chunk，降低首屏主包体积。

### 安全

- **AI 控制安全边界**：阻断门锁、安防解除、重启、全域和通配符控制；控制前必须明确 `entity_id`。
- **工具调用测试覆盖**：新增 AI 工具执行测试，覆盖实体检索、状态查询、安全控制和高风险操作阻断。

---

## [4.30.0] - 2026-04-30

### ✨ 新增功能

- **集成阿里云百炼平台 DashScope API**：支持通义千问系列模型（qwen-plus、qwen-max、qwen-turbo、qwen-long）

### 🔧 优化与改进

- **完善百炼模型列表**：标注各模型工具调用支持情况
- **增强 AI 服务错误处理**：针对百炼 API 提供中文错误提示（API Key 无效、请求限流、模型不可用等）
- **AI 设置界面适配百炼平台**：API Key 申请链接和提示文案优化
- **后端代理增强百炼错误码识别**：中文错误信息返回

---

## [4.18.9] - 2026-04-17

### 🚀 版本升级

本次版本从 4.15.1 升级至 4.18.9，整合了多项优化与改进。

#### ♿ 可访问性增强
- **prefers-reduced-motion 支持**：全局 CSS 媒体查询，尊重用户减少动画偏好
- **键盘导航支持**：设备卡片支持 Tab 聚焦 + Enter/Space 激活
- **滑块无障碍属性**：亮度/色温滑块添加 `aria-label`
- **RemoteCard 无障碍**：配置文件切换按钮添加 `aria-label` 和 `aria-pressed`

#### 🎨 设计系统优化
- **语义化颜色令牌**：定义 `--success`、`--surface-dark` 等颜色变量
- **硬编码颜色替换**：统一使用设计令牌，提升主题一致性

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
- AI 助手语音交互
- iOS 风格 UI 设计
- Home Assistant WebSocket 集成
- 多路视频监控支持
- 场景控制功能
- 设备映射配置

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| 5.14.0 | 2026-05-14 | 强制授权入口、默认授权公钥、客户交付包、授权工具隔离、后端业务接口授权门禁 |
| 5.12.0 | 2026-05-12 | 交付状态总览、Add-on 回归测试、首屏加载优化、摄像头懒加载、墙屏增强、安全与稳定性修复 |
| 5.4.0 | 2026-05-04 | Add-on 优先交付、PWA/墙屏兼容、离线授权、AI/摄像头/备份增强、文档重写 |
| 5.2.0 | 2026-05-02 | 修复 Agent 控制台加载卡住、模型配置空白、API 路由与移动端窗口宽度 |
| 5.1.8 | 2026-05-01 | 版本号降级值修复、重新构建发布 5.1.7 Agent 控制台完整产物 |
| 5.1.7 | 2026-05-01 | HAUI 助手内置 Agent 控制台、三通道模型配置、提案/记忆/心跳/审计页面 |
| 5.1.6 | 2026-05-01 | 开源前隐私清理、版本同步与发布流程加固 |
| 5.1.5 | 2026-04-17 | HA 端 AI Agent 框架落地（工具/存储/路由/视图） |
| 5.1.3 | 2026-04-17 | AI 快捷控制、语音合成增强、上下文测试覆盖 |
| 5.1.2 | 2026-04-17 | AI 服务稳定性提升、测试与文档补齐 |
| 5.1.1 | 2026-04-30 | 修复 DashScope API 消息格式兼容性 |
| 5.1.0 | 2026-04-30 | AI 助手升级、设备统计、安全控制边界、首屏懒加载 |
| 4.30.0 | 2026-04-30 | 集成阿里云百炼平台 DashScope API |
| 3.29.1 | 2026-03-29 | 修复设备卡片状态指示器与动画 |
| 3.29.0 | 2026-03-28 | 架构优化、性能提升、安全增强 |
| 3.28.0 | 2026-03-20 | 初始版本发布 |

---

**注意**: 版本号遵循语义化版本规范（MAJOR.MINOR.PATCH）
- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复
