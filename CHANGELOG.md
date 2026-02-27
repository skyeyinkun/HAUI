# Changelog

All notable changes to this project will be documented in this file.

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
