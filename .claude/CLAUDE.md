---
title: Project Guidelines
description: Development guidelines and conventions for the @metreeca/core package.
---

# NPM Scripts

- **`npm run clean`** - Remove dependencies and build artefacts
- **`npm run prime`** - Install dependencies from the lockfile
- **`npm run build`** - Compile sources and generate docs
- **`npm run check`** - Run the test suite
- **`npm run proof`** - Serve live docs

# Type Aliases

Semantic type aliases are plain aliases rather than branded types to avoid issues with type inference and compatibility
with runtime validation tools like Typia. Values must be validated at runtime using the corresponding `isX` type guards.
