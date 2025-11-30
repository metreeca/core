---
title: Project Guidelines
description: Development guidelines and conventions for the @metreeca/core package.
---

> [!CAUTION]
>
> - **ONLY** modify code when explicitly requested or clearly required.
> - **NEVER** make unsolicited changes or revert **unrelated** user edits.

# NPM Scripts

- **`npm run clean`** - Remove build artifacts and dependencies (dist, docs, node_modules)
- **`npm run setup`** - Install dependencies and apply security fixes
- **`npm run build`** - Build TypeScript and generate TypeDoc documentation
- **`npm run check`** - Run Vitest test suite
- **`npm run watch`** - Start TypeDoc watch mode and documentation server
