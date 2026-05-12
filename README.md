# HAUI Dashboard

专为 Home Assistant 打造的现代化智能家庭控制面板。当前路线是 **Home Assistant Add-on / HA 内嵌面板优先，PWA 与平板墙屏兼容，暂不做原生 App 商店打包**。

![version](https://img.shields.io/badge/version-5.12.0-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4.svg?logo=tailwindcss)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Add--on%20first-41BDF5.svg?logo=homeassistant)

## 当前定位

HAUI 是一个面向 Home Assistant 用户的高性能前端控制台，提供：

- 手机、平板、桌面、墙屏自适应控制界面。
- Home Assistant 实体实时同步、设备控制、场景控制和仪表盘组件。
- AI 助手、Agent 控制台、自然语言查询和低风险设备控制。
- 摄像头管理与监控组件，支持 HA HLS、萤石云代理和 go2rtc。
- 离线 Pro 授权、Add-on 后端验签、机器码绑定、备份恢复。
- PWA 安装到主屏幕能力，但当前不包含 Capacitor/Android/iOS 原生 App 阶段。

本项目不是 Home Assistant 官方项目，也不代表 Home Assistant 官方背书。

## 5.12.0 发布重点

5.12.0 是面向正式交付的 Add-on 优先版本，核心目标是让 HAUI 更适合个人开发者做一次性部署销售，同时保持 Home Assistant 内嵌使用、PWA 安装和平板墙屏体验的一致性。

- **发布形态明确**：以 Home Assistant Add-on / Ingress 面板为主入口，保留 PWA 添加到主屏幕能力，暂不推进 Android/iOS 原生商店包。
- **移动和平板体验完善**：重构手机底部导航、设置窗口自适应、墙屏使用入口和长时间展示体验。
- **离线授权闭环**：支持 Add-on 后端机器码、ECDSA 授权码验签、Pro 功能门控和维护期提示，不要求开发者额外搭建授权服务器。
- **AI 安全链路增强**：AI 聊天优先走 Add-on 后端代理，保存设置时显示真实错误，设备控制前保留确认和高风险操作拦截。
- **摄像头和备份交付增强**：补齐摄像头连接测试、隐私模式、PTZ 代理错误反馈、备份恢复和恢复前回滚快照。
- **文档重新整理**：README、用户手册、Add-on 文档、AI 指南和更新日志同步到当前功能边界。

## 技术架构

| 层级 | 技术 | 当前用途 |
| --- | --- | --- |
| 前端 | React 18, TypeScript, Vite 6 | 控制台、设置、AI、摄像头和仪表盘 |
| 样式 | Tailwind CSS 4, Radix UI, shadcn/ui 风格组件, Motion | 保持当前黑白灰玻璃质感和响应式布局 |
| 状态 | Zustand, localStorage, Add-on storage sync | UI、设备配置、仪表盘布局和跨端配置同步 |
| HA 集成 | `home-assistant-js-websocket`, `/ha-api` Add-on 代理 | 实体状态、服务调用、Ingress 内访问 HA Core |
| 后端 | Node.js Express Add-on 服务 | 配置持久化、授权验签、AI 代理、摄像头代理、备份恢复 |
| AI | OpenAI Compatible Chat Completions / SSE | 百炼 Qwen、DeepSeek、SiliconFlow、自定义兼容模型 |
| 视频 | hls.js, Ezviz 代理, go2rtc | 多协议摄像头播放和监控卡片 |

## 功能概览

### Home Assistant 控制

- 实体状态实时同步。
- 灯光开关、亮度、色温控制。
- 窗帘开合度、空调温度/模式/风速、媒体和遥控类设备控制。
- 场景一键激活和冷却保护。
- 设备发现、房间管理、人员管理、设备映射。
- 基础智能家居控制不依赖 Pro 授权，授权失效也不应影响基础开关灯。

### 手机 / 平板 / 墙屏

- 手机底部导航：首页、房间、AI、监控、设置。
- 设置窗口自动适配小屏和横竖屏。
- 平板墙屏模式优化卡片密度、间距和常亮使用体验。
- 支持 PWA manifest 和 Service Worker，可添加到手机/平板主屏幕。

### AI 与 Agent

- AI 浮窗支持文本、语音输入、语音朗读。
- 支持设备状态查询、全屋摘要、实体搜索、低风险设备控制。
- AI 控制设备前会弹出确认框，用户确认后才提交 Home Assistant 服务。
- 高风险域和服务被阻止，例如门锁解锁、安防解除、重启、全域通配符控制。
- Home Assistant Ingress 环境下，AI 聊天优先走 Add-on 后端代理，减少浏览器直接暴露 API Key 的风险。
- Agent 控制台支持主模型、备用模型、摘要模型、提案、Workspace、记忆、心跳任务、工具状态和审计日志。

### 摄像头

- 摄像头配置支持：
  - HA HLS / HA camera entity_id。
  - 萤石云 Token / URL 代理。
  - RTSP 通过 go2rtc，WebRTC 优先，HLS 回退。
- 支持连接测试、默认静音、隐私模式。
- 隐私模式下默认不显示画面，需要用户点击“显示画面”。
- HAUI 不提供摄像头云转发服务，默认应优先使用 HA 本地代理、go2rtc 或厂商通道。

### 授权与商业交付

- 支持离线 Pro 授权，不强制搭建授权服务器。
- Add-on 后端生成并持久化机器码，避免用户换浏览器或换平板后机器码变化。
- 授权码使用 ECDSA P-256 签名，开发者保管私钥，用户端只配置公钥。
- Add-on 后端再次验签并绑定机器码，Pro 接口由后端拦截。
- 当前 Pro 门控能力包括 AI、Agent、摄像头高级能力、墙屏/商业入口、备份恢复等。
- 建议商业规则：单 Home Assistant 实例授权，一次部署，1 年更新维护；维护期过后已安装版本可继续使用，但不承诺继续免费更新。

授权流程见 [docs/LICENSE_WORKFLOW.md](./docs/LICENSE_WORKFLOW.md)。

### 备份恢复

- 设置页提供备份恢复入口。
- 支持服务器备份、下载备份、导入恢复。
- 备份包含面板布局、设备映射、摄像头配置、AI 配置和授权状态。
- 恢复前自动创建回滚快照，降低更新或迁移失败风险。

## 安装与部署

### 方式一：Home Assistant Add-on 推荐

1. 打开 Home Assistant。
2. 进入 **设置 -> 加载项 -> 加载项商店**。
3. 右上角菜单选择 **仓库**。
4. 添加仓库地址：

```text
https://github.com/skyeyinkun/HAUI
```

5. 安装 **HAUI - 智能家庭中枢**。
6. 在 Add-on 配置中按需填写：
   - `HAUI_LICENSE_PUBLIC_KEY`：Pro 授权公钥。
   - `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL`：后端 AI 代理兜底配置。
   - `EZVIZ_APP_KEY` / `EZVIZ_APP_SECRET`：萤石云代理配置。
7. 启动 Add-on，通过 Home Assistant 左侧栏或 **打开 Web UI** 进入。

### 方式二：本地开发

```bash
npm install
npm run dev
```

默认 Vite 端口为 `5173`。开发代理会把 `/ha-api` 转发到 `VITE_HA_URL`，把 `/api` 转发到本地 Add-on 服务 `8099`。

### 方式三：构建 Add-on 静态包

```bash
npm run build:addon
```

该命令会执行 Vite 构建，并把 `dist` 复制到 `addon/dist`。然后可用 Home Assistant 本地加载项或 Docker 镜像方式交付。

## 首次配置

1. 打开 HAUI。
2. 进入 **系统设置 -> 连接**，配置 Home Assistant 地址和长期访问令牌。
3. 进入 **设备 / 房间 / 摄像头**，完成实体映射和界面配置。
4. 如需商业功能，进入 **系统设置 -> 授权**，复制机器码，使用开发者私钥生成授权码并导入。
5. 如需 AI，进入 AI 设置或 Add-on 配置填写模型服务商与 API Key。
6. 建议完成配置后进入 **系统设置 -> 备份恢复** 创建第一份备份。

## 授权码生成

首次生成密钥：

```bash
node scripts/generate-license.mjs --initKeys=1
```

为客户机器码生成授权码：

```bash
node scripts/generate-license.mjs --machine=HAUI-MACHINE-XXXX-XXXX-XXXX --buyer="客户名" --updatesUntil=2027-05-04
```

私钥 `license-private.pem` 只能保存在开发者本机，不要提交到仓库，不要放进前端，不要发给客户。

## 验证命令

```bash
npx tsc --noEmit
npx vitest run
node --check addon/server.js
python -m py_compile custom_components/yinkun_ui/__init__.py custom_components/yinkun_ui/card_config.py
npm run build:addon
```

当前构建可能出现 Vite 大 chunk 警告，这是体积优化项，不代表构建失败。

## 文档

- [用户手册](./docs/USER_MANUAL.md)
- [AI 助手指南](./docs/AI_ASSISTANT_GUIDE.md)
- [App / 平板 / HA 内嵌计划](./docs/APP_TABLET_HA_PLAN.md)
- [离线授权流程](./docs/LICENSE_WORKFLOW.md)
- [隐私和售后边界](./docs/PRIVACY_SUPPORT_BOUNDARY.md)
- [更新日志](./CHANGELOG.md)

## 隐私与安全边界

- HAUI 默认不提供云服务，不应收集用户摄像头画面、HA Token、AI Key 或家庭设备数据。
- AI 成本建议由用户填写自己的 API Key，避免个人开发者承担不可控成本。
- 摄像头默认不走开发者云端。
- 授权机制能提高转卖和白嫖成本，但离线授权无法做到 100% 防破解。
- 售后边界应明确：HAUI 负责面板和 Add-on 自身问题，不应承诺解决所有 Home Assistant、网络、设备或第三方云平台问题。

## 许可证与商用说明

当前仓库未附带独立 `LICENSE` 文件。若要公开开源或商业分发，请先补齐明确的许可证、隐私说明、售后条款和第三方依赖声明。
