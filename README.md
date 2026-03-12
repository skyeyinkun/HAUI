# HAUI Dashboard

[中文](#中文) | [English](#english)

A professional, AI-powered Home Assistant dashboard with **iOS-style sleekness**. Built with **React 18**, **Vite**, and **Tailwind CSS**, featuring full-duplex voice interaction and ultra-responsive layouts.

## 🚀 Features
- **AI Assistant**: Natural language control via advanced LLMs with Function Calling.
- **iOS Aesthetic**: Smooth animations, glassmorphism, and drag-and-drop customization.
- **All-in-One Monitoring**: Multi-window camera streaming (HLS/Ezviz).
- **Cloud Sync**: Cross-device configuration persistence.

## 🛠️ Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Development
1. **Start the Environment**:
   ```bash
   docker compose up -d
   ```
   This launches:
   - **Home Assistant** (http://localhost:8123)
   - **Mosquitto** (Port 1883)
   - **Frontend** (http://localhost:5173 - Hot Reload)

2. **Access Dashboard**:
   Open `http://localhost:5173`. It connects to the local HA instance automatically.

### Testing
- **E2E**: `npm run test:e2e` (Cypress)
- **Unit**: `npm run test:unit` (Vitest)
- **Component**: `pytest tests`

### Performance Tuning (MDI Icon Picker)
- Icon search runs in a Web Worker to keep the main thread responsive.
- The grid uses virtualization to avoid rendering thousands of nodes.
- MDI icons render via CSS mask against `/public/mdi/*.svg` to avoid per-icon SVG text parsing.
- To enable verbose debug logs for icon loading, set `localStorage.debug-icons = "1"` in DevTools.

---

# 中文

HAUI Dashboard 是一个专业的、基于 AI 的 Home Assistant 仪表板。它融合了 **iOS 视觉美学** 与 **React 18** 的高性能架构，提供极速响应的智能家居管控体验。

## 🚀 特性
- **AI 智能管家**: 基于全双工语音交互与 Function Calling 的自然语言控制。
- **iOS 级交互设计**: 丝滑的动画、极致的毛玻璃质感与自由度极高的组件排版。
- **全能监控大屏**: 多路并发视频监控（支持 HLS、萤石等原生协议）。
- **配置云端同步**: 跨设备零感知配置同步。

## 🛠️ 快速开始

### 前置要求
- Docker & Docker Compose
- Node.js 20+

### 开发指南
1. **启动环境**:
   ```bash
   docker compose up -d
   ```
   该命令将启动：
   - **Home Assistant** (http://localhost:8123)
   - **Mosquitto** (Port 1883)
   - **前端开发服务** (http://localhost:5173 - 支持热重载)

2. **访问仪表盘**:
   打开 `http://localhost:5173`。它会自动连接到本地的 HA 实例。

### 测试
- **端到端测试**: `npm run test:e2e`
- **单元测试**: `npm run test:unit`
- **组件测试**: `pytest tests`

### 性能调优（MDI 图标更换）
- 图标搜索在 Web Worker 中执行，避免阻塞主线程导致输入卡顿/卡死。
- 图标网格采用虚拟列表渲染，避免一次性挂载大量 DOM。
- MDI 图标使用 CSS mask 直接加载 `/public/mdi/*.svg`，避免大量 SVG 文本解析带来的抖动。
- 如需打开图标加载的详细调试日志，可在 DevTools 中设置 `localStorage.debug-icons = "1"`。
