# HAUI App / 平板 / HA 内嵌改进落地计划

## 定位

采用 `HA 内嵌面板优先，App 化兼容，平板墙屏重点优化` 路线。默认销售交付建议仍是 Home Assistant Add-on，因为它能直接出现在 HA 左侧边栏，部署成本最低，也能复用 HA 的登录态和局域网环境。

当前 5.15.16 状态：第一阶段和第二阶段已按 Add-on 优先路线落地，原生 Android/iOS 第三阶段暂不做。正式销售建议交付 Add-on + PWA + 平板墙屏方案。

## 已落地阶段

### 阶段 1：运行形态识别

- 新增运行时识别：`ha-panel`、`app-shell`、`standalone`。
- 新增视口识别：手机、平板、桌面、墙屏。
- 支持 URL 参数：
  - `?haui_host=ha`：HA 内嵌环境。
  - `?haui_host=app`：PWA/App Shell 环境。
  - `?haui_mode=wall`：墙屏模式。

### 阶段 2：移动端和平板交互

- 手机端增加底部导航：首页、房间、AI、监控、设置。
- 平板端调整设备网格密度，保留当前黑白灰玻璃风格。
- 设置弹窗在手机端自动收敛到视口内，避免固定宽高溢出。
- 墙屏模式提升设备卡片尺寸和网格间距，适合横屏常亮设备。

### 阶段 3：HA 内嵌优先

- Add-on 已提供 `ingress: true`、`panel_title: HAUI`、`panel_icon`，推荐作为正式交付入口。
- 前端在 HA Ingress 中支持 `/ha-api` 代理访问 HA Core。
- 当用户未配置长期令牌时，前端会尝试通过 Add-on 后端的 Supervisor Token 做 REST 状态降级，用于 HA 侧边栏内的低门槛启动。
- 自定义集成增加可选 wrapper panel：

```yaml
yinkun_ui:
  panel_url: "http://homeassistant.local:8099"
  panel_title: "HAUI"
  panel_icon: "mdi:view-dashboard"
  panel_path: "yinkun-ui"
```

此方式适合已有独立 HAUI 服务时挂入 HA 侧边栏。正式销售仍建议用 Add-on Ingress。

### 阶段 4：授权码

- 采用离线授权，不依赖授权服务器。
- 授权绑定机器码，机器码显示在 `系统设置 -> 授权`。
- 授权码使用 ECDSA P-256 私钥签名，前端只内置公钥。
- 已加入 Pro 功能判定：
  - `ai`
  - `agent`
  - `camera_grid`
  - `wall_panel`
  - `app_shell`
- 未激活授权时，AI/Agent/墙屏等商业功能会引导到授权页。

### 阶段 5：PWA / App 化兼容

- 新增 `manifest.webmanifest`。
- 新增 Service Worker，缓存应用壳层和静态资源。
- 支持手机和平板“添加到主屏幕”。
- 后续如要上架商店，可用同一个 Web 前端接 Capacitor/Tauri 壳。

### 阶段 6：第二阶段商业交付增强

- Add-on 后端已增加授权验签、授权状态持久化和 Pro 接口校验。
- 机器码改为 Add-on 后端持久化生成，前端授权页优先读取后端机器码，避免换浏览器或平板访问导致授权码失配。
- 设置页已按基础、空间、体验、商业分组，并加入备份恢复入口。
- 备份恢复支持服务器备份、下载备份、导入恢复，恢复前自动保存回滚快照。
- 摄像头管理增加 HA 实体 ID、连接测试、默认静音和隐私模式；HA 摄像头可只填实体 ID，优先走 HA 本地代理。
- 目标明确且白名单内的 AI 控制直接调用 Home Assistant 服务；高风险或目标不明确时阻断或要求澄清。
- HA Ingress 环境下 AI 聊天优先走 Add-on 后端代理，减少前端直接暴露第三方 API Key 的风险。
- 隐私、售后、授权和 HA 第三方关系边界见 `docs/PRIVACY_SUPPORT_BOUNDARY.md`。

## 推荐商业交付

### 99 元一次性部署包

建议包装为：

- 单个 Home Assistant 实例授权。
- 含一次远程部署。
- 含 1 年更新维护。
- 授权到期后当前版本继续使用，不能再享受新版本安装服务。

### 授权和更新

1. 用户付款。
2. 你远程部署 Add-on。
3. 用户打开 `系统设置 -> 授权`，复制机器码。
4. 你本地生成授权码。
5. 用户粘贴激活。
6. 后续更新时，检查 `updatesUntil`，维护期内免费更新，过期后收费续维护。

生成授权码：

```bash
node generate-license.mjs --machine=HAUI-MACHINE-XXXX-XXXX-XXXX --buyer="客户名" --updatesUntil=2027-05-04 --licenseId=HAUI-20260513-0001
```

授权码生成工具应保存在开发者本机私有目录，例如 `HAUI-License-Tools`，不要随 HAUI 项目或客户交付包发布。客户只拿到 Add-on 运行包、公钥配置和绑定机器码的授权码。

## 风险和边界

- 离线授权不能 100% 防破解，只能提高转卖和白嫖成本。
- 私钥必须只保存在开发者本机，不能提交到仓库，不能放进前端。
- 前端公钥验证可以被高手绕过，所以真正的商业防护应依赖“你提供部署和更新服务”，而不是纯代码防盗版。
- HA Ingress 里的免 token 降级主要用于低门槛启动和状态展示；WebSocket 实时同步、注册表读取等高级能力仍建议用户配置长期访问令牌。

## 下一步建议

- 用真实 Home Assistant Add-on 环境验证 `/ha-api` 无 token 降级。
- 给 Pro 功能增加更细的 UI 标识，例如摄像头多宫格、Agent 心跳、墙屏入口。
- 每次 5.x 发布前固定执行 `npx tsc --noEmit`、关键 Vitest、`node --check addon/server.js` 和 `npm run build:addon`。
- 后续 App 商店路线再单独评估 Capacitor，当前先不把精力放在商店审核上。
