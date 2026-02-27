# Changelog

All notable changes to this project will be documented in this file.

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
