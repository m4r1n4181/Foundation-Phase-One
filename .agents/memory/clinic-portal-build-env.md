---
name: Clinic portal build environment
description: The required environment values for standalone clinic-portal production builds
---

The clinic portal's Vite config intentionally fails fast unless `PORT` and `BASE_PATH` are set. The managed artifact workflow supplies them automatically; standalone verification must provide the artifact's configured port and root base path.

**Why:** A plain package build command can fail before compiling even when the workflow and TypeScript checks are healthy.

**How to apply:** For local production-build verification, use the configured clinic-portal port and `BASE_PATH=/`; do not remove the fail-fast guard just to make an ad-hoc command pass.