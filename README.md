# HAUI Dashboard

<p align="center">
  <img src="./addon/icon.png" alt="HAUI Logo" width="120">
</p>

<p align="center">
  <strong>专为 Home Assistant 打造的高性能现代化前端控制面板</strong>
</p>

<p align="center">
  <a href="#中文">中文</a> | <a href="#english">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.29.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4.svg?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Home%20Assistant-2025+-41BDF5.svg?logo=homeassistant" alt="Home Assistant">
</p>

---

## 项目目标

HAUI Dashboard 致力于成为 **Home Assistant 生态中最优雅、最智能的前端控制面板**：

- 🎨 **极致视觉体验**: 融合 iOS 设计美学，打造丝滑的交互体验
- 🤖 **AI 原生集成**: 内置大语言模型支持，实现自然语言设备控制
- 📱 **全平台适配**: 从手机到平板，从桌面到电视，完美适配各种屏幕
- 🔒 **企业级安全**: 公网访问安全策略，PIN 码二次确认机制
- ⚡ **高性能架构**: WebSocket 实时同步，按需加载，防抖节流优化

---

## 架构说明

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | React 18 + TypeScript | 函数式组件 + Hooks 架构 |
| **构建工具** | Vite 6.3.5 | 极速冷启动，按需编译 |
| **样式方案** | Tailwind CSS 4 + Framer Motion | 原子化 CSS + 流畅动画 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **UI 组件** | Radix UI + shadcn/ui | 无障碍组件库 |
| **图标系统** | MDI + Lucide | 矢量图标方案 |
| **AI 集成** | Google Generative AI | Gemini/DeepSeek 支持 |
| **视频流** | hls.js + Ezviz SDK | 多协议视频监控 |

### 核心架构特性

```
┌─────────────────────────────────────────────────────────────┐
│                        应用层 (App Layer)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  AI Chat     │  │  Settings    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                        业务逻辑层 (Business Layer)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  useHASync   │  │  useDebounce │  │  Security    │      │
│  │  Manager     │  │  Callback    │  │  Confirm     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                        数据层 (Data Layer)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  uiStore     │  │  deviceStore │  │  dataStore   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                        服务层 (Service Layer)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HA WebSocket│  │  AI Service  │  │  Weather API │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 性能优化策略

- **代码分割**: React.lazy + Suspense 实现按需加载
- **防抖节流**: 窗帘、灯光控制使用防抖优化
- **乐观更新**: UI 先更新，失败自动回滚
- **减少动画**: 支持 `prefers-reduced-motion` 媒体查询
- **Web Worker**: MDI 图标搜索在 Worker 中执行

---

## 功能特性

### 1. 智能设备控制

| 功能 | 描述 | 状态 |
|------|------|------|
| 开关控制 | 一键开关，实时状态同步 | ✅ |
| 亮度调节 | 0-100% 滑动调节，防抖优化 | ✅ |
| 色温调节 | 2700K-6500K 冷暖调节 | ✅ |
| 窗帘控制 | 开合度百分比精确控制 | ✅ |
| 场景模式 | 一键激活多设备联动 | ✅ |
| 批量控制 | 多设备同时控制，减少请求 | ✅ |

### 2. AI 智能管家

| 功能 | 描述 | 状态 |
|------|------|------|
| 语音交互 | 全双工语音对话 | ✅ |
| 自然语言控制 | "打开客厅灯"等口语化指令 | ✅ |
| 设备状态查询 | "卧室温度多少" | ✅ |
| 智能推荐 | 基于使用习惯的推荐 | 🚧 |
| 异常提醒 | 设备异常状态主动提醒 | 🚧 |

### 3. 环境监控

| 功能 | 描述 | 状态 |
|------|------|------|
| 传感器数据 | 温湿度、光照实时显示 | ✅ |
| 能耗统计 | 用电量统计与趋势 | ✅ |
| 天气信息 | 实时天气与预报 | ✅ |
| 视频监控 | 多路并发视频流 | ✅ |

### 4. 安全功能

| 功能 | 描述 | 状态 |
|------|------|------|
| PIN 码保护 | 公网高危操作二次确认 | ✅ |
| 本地加密 | Token 和 PIN 码本地加密存储 | ✅ |
| CSP 策略 | 内容安全策略防 XSS | ✅ |
| 断线重连 | 指数退避自动重连 | ✅ |

---

## 快速开始

### 前置要求

- Docker & Docker Compose（推荐）
- Node.js 20+（独立部署）
- Home Assistant 2025.1+

### 安装方式

#### 方式一：Home Assistant Add-on（推荐）

1. 在 Home Assistant 中，进入 **设置** → **加载项** → **加载项商店**
2. 添加仓库地址：`https://github.com/skyeyinkun/HAUI`
3. 搜索并安装 **"HAUI - 智能家庭中枢"**
4. 启动加载项，点击 **打开 Web UI**

#### 方式二：独立部署

```bash
# 克隆仓库
git clone https://github.com/skyeyinkun/HAUI.git
cd HAUI

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

### 首次配置

1. 打开 HAUI Dashboard 界面
2. 点击右下角 **设置** 按钮
3. 配置 Home Assistant 连接信息
4. 完成！

---

## 文档

- [使用说明书](./docs/USER_MANUAL.md) - 详细的功能使用指南
- [更新日志](./CHANGELOG.md) - 版本更新记录
- [API 文档](./docs/API.md) - 开发者 API 参考

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件

---

## 致谢

- [Home Assistant](https://www.home-assistant.io/) - 开源智能家居平台
- [React](https://react.dev/) - 前端框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

<p align="center">
  <strong>Made with ❤️ for Smart Home Enthusiasts</strong>
</p>

---

# English

## Overview

HAUI Dashboard is a professional, AI-powered Home Assistant frontend built with **React 18**, **Vite**, and **Tailwind CSS**. It combines **iOS-style aesthetics** with enterprise-grade performance.

## Features

- **AI Assistant**: Natural language control via LLMs with Function Calling
- **iOS Design**: Smooth animations, glassmorphism effects
- **All-Platform**: Responsive design for mobile, tablet, desktop
- **Security**: PIN confirmation for high-risk operations over public network
- **Performance**: WebSocket sync, code splitting, debounced controls

## Quick Start

### Home Assistant Add-on

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Add repository: `https://github.com/skyeyinkun/HAUI`
3. Install **"HAUI - Smart Home Hub"**
4. Start the add-on and click **Open Web UI**

### Standalone Deployment

```bash
git clone https://github.com/skyeyinkun/HAUI.git
cd HAUI
npm install
npm run dev
```

## Documentation

- [User Manual](./docs/USER_MANUAL.md)
- [Changelog](./CHANGELOG.md)

## License

MIT License - see [LICENSE](./LICENSE) file
