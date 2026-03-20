# Release Notes - Aura Browser

## [1.3.1] - 2026-03-21
*Alternative label: V1.3.0.1*

### Added
- **Bookmark Star Button**: Added to the Omnibox (address bar) to toggle bookmarking of the current page. Uses Lucide `Star` icon with filled/outline state.
- **Improved Omnibox Layout**: Star button placed next to the AI button on the right edge.
- **uBlock Origin**: Integrated as a default core extension that loads automatically on startup for robust ad-blocking.

### Packaging
- **Windows Installer**: Packaged into `release/Aura Browser Setup 1.3.1.exe`.
- **Version adjustment**: Version set to `1.3.1` in config to satisfy toolchain constraints (Vite/Electron-Builder require 3-digit SemVer).
