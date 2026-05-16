# HAUI Dashboard Add-on

## 版本信息

- 当前版本：5.15.16
- 更新日期：2026-05-16
- 推荐入口：Home Assistant Add-on Ingress / HA 左侧边栏

## 简介

HAUI 是面向 Home Assistant 的现代化控制面板，当前以 Add-on 交付为主。它提供设备控制、实时状态同步、AI 助手、Agent 控制台、摄像头监控、平板墙屏模式、离线授权和备份恢复。

5.15.16 是 UI 修复与版本同步更新：推荐通过 Home Assistant 左侧栏使用，手机和平板可用 PWA 添加到主屏幕，暂不包含 Android/iOS 原生 App 包。

## 5.15.16 更新重点

- Add-on、根前端包、HA 自定义集成版本统一为 `5.15.16`。
- 修复夜间墙屏全屏发灰、设备图标黑边、房间按钮阴影和 AI 入口视觉过重。
- 前端授权验证兼容 Node/OpenSSL DER 格式 ECDSA 签名，修复有效授权码提示“授权签名验证失败”的问题。
- 授权页优先走 Add-on 后端验签并持久化，后端不可用时才回退到浏览器本地验签。
- AI 聊天在 Ingress 中优先走 Add-on 后端代理，减少浏览器端 API Key 暴露。
- 授权激活支持 Add-on 后端机器码和验签，换浏览器或平板访问不会改变机器码。
- 系统启动后必须先完成授权，授权通过后开放完整功能。
- 摄像头体验补齐连接测试、默认静音、隐私模式和 PTZ 错误反馈。
- 备份恢复支持服务器备份、下载备份、导入恢复和恢复前自动回滚快照。
- README、用户手册、Add-on 文档、AI 指南和更新日志已按当前功能边界重写。

## Add-on 配置项

| 配置项 | 说明 |
| --- | --- |
| `HAUI_LICENSE_PUBLIC_KEY` | 离线授权公钥。默认已内置公钥，可按需覆盖。私钥只保存在开发者本机。 |
| `AI_PROVIDER` | 后端 AI 代理默认服务商，例如 `alibaba`。 |
| `AI_API_KEY` | 后端 AI 代理兜底 API Key。用户也可在前端 AI 设置中填写。 |
| `AI_MODEL` | 默认模型，例如 `qwen-plus`。 |
| `AI_BASE_URL` | OpenAI Compatible Base URL。 |
| `EZVIZ_APP_KEY` | 萤石云 AppKey。 |
| `EZVIZ_APP_SECRET` | 萤石云 AppSecret。 |

## 安装方式

### GitHub 仓库安装

1. 打开 Home Assistant。
2. 进入 **设置 -> 加载项 -> 加载项商店**。
3. 右上角菜单选择 **仓库**。
4. 添加仓库地址：`https://github.com/skyeyinkun/HAUI`。
5. 安装 **HAUI - 智能家庭中枢**。
6. 按需填写 Add-on 配置项。
7. 启动后通过左侧栏或 **打开 Web UI** 使用。

### 本地开发安装

```bash
npm install
npm run build:addon
```

然后将 `addon` 目录复制到 Home Assistant 宿主机的 `/addons/local/haui_dashboard`，在加载项商店中刷新本地加载项。

### 更新到 5.15.16

1. 在 HAUI 的 **系统设置 -> 备份恢复** 中创建服务器备份，并下载一份本地备份。
2. 在 Home Assistant 加载项商店中刷新仓库。
3. 更新 **HAUI - 智能家庭中枢** 到 `5.15.16`。
4. 启动 Add-on 后进入 HAUI，确认底部版本号显示 `HAUI v5.15.16`。
5. 检查授权页、AI 设置、摄像头测试和备份恢复是否正常。

## 功能说明

### 授权后控制

- 设备状态实时同步。
- 灯光、窗帘、空调、媒体、遥控和场景控制。
- 设备发现、设备映射、房间和人员管理。
- 系统必须授权后才能进入控制界面。

### AI 和 Agent

- 支持百炼 Qwen、DeepSeek、SiliconFlow、自定义 OpenAI 兼容接口。
- Ingress 环境下 AI 聊天优先走 Add-on 后端代理，减少 API Key 暴露到浏览器的风险。
- 目标明确且白名单内的 AI 控制会直接执行，无需二次确认。
- 高风险操作会被阻止，例如解锁、解除安防、重启、全域通配符控制。
- Agent 控制台提供模型配置、提案、Workspace、记忆、心跳任务、工具状态和审计。

### 摄像头

- 支持 HA HLS / HA camera entity_id。
- 支持萤石云 Token 和直播地址代理。
- 支持 RTSP 通过 go2rtc 播放。
- 支持连接测试、默认静音和隐私模式。
- HAUI 不提供摄像头云转发服务。

### 授权和备份

- Add-on 后端生成机器码并持久化。
- 授权码使用 ECDSA P-256 签名并绑定机器码。
- 进入系统前需要先完成授权。
- 备份恢复支持服务器备份、下载备份、导入恢复和恢复前回滚快照。

## 网络细节

- Ingress 端口：`8099`。
- `/api/storage`：面板配置持久化。
- `/ha-api/*`：代理到 Home Assistant Core API，并保留 query string。
- `/api/license/*`：授权状态、激活、清除。
- `/api/backup/*`：备份导出、创建、列表、恢复。
- `/api/ai/*`：AI 配置和聊天代理。
- `/api/ezviz/*`：萤石云代理。
- `/api/camera/ptz`：ONVIF PTZ 服务代理。

## 故障排除

### 授权码无法激活

1. 确认授权码机器码与授权页显示机器码一致。
2. 确认授权码来自当前私钥签名。
3. 如你更换过私钥，请同时更新 Add-on 配置中的 `HAUI_LICENSE_PUBLIC_KEY`。

### AI 无法使用

1. 检查系统是否已完成授权。
2. 检查 AI API Key、Base URL、模型名。
3. Ingress 内建议优先使用 Add-on 后端配置或前端 AI 设置。

### 摄像头无法播放

1. HA 摄像头优先填写 `camera.xxx` 实体 ID。
2. 萤石云需配置 AppKey/AppSecret 或有效 Token。
3. RTSP 推荐先在 go2rtc 中确认流可用。

### 备份恢复失败

1. 确认系统已完成授权。
2. 确认导入文件是 HAUI 备份 JSON。
3. 恢复前系统会自动生成回滚快照，可从服务器备份列表排查。

## 支持边界

HAUI Add-on 只负责 HAUI 面板、Add-on 后端、授权、备份和自身集成问题。Home Assistant Core、第三方设备、网络、摄像头厂商云、AI 服务商额度和模型质量不属于 HAUI 直接售后范围。
