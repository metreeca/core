# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript utilities for type-safe application development.

**@metreeca/core** is a foundational toolkit for building type-safe, observable TypeScript applications, bridging
compile-time type checking with runtime validation, structured logging, and functional programming patterns.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.
# Usage

| Module                                                                       | Description                                        |
|------------------------------------------------------------------------------|----------------------------------------------------|
| [@metreeca/core](https://metreeca.github.io/core/modules.html)               | Type guards, safe casts, equality and immutability |
| [@metreeca/core/report](https://metreeca.github.io/core/modules/report.html) | Error handling and execution reporting             |
| [@metreeca/core/order](https://metreeca.github.io/core/modules/order.html)   | Composable comparison functions for sorting        |
| [@metreeca/core/async](https://metreeca.github.io/core/modules/async.html)   | Composable primitives for asynchronous operations  |
| [@metreeca/core/status](https://metreeca.github.io/core/modules/status.html) | Pattern matching for exclusive state values        |

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
