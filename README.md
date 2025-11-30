# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript abstractions.

**@metreeca/core** is a foundational TypeScript toolkit providing clean and composable abstractions for common patterns.

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
| [@metreeca/core](https://metreeca.github.io/core/modules.html)               | Type guards and safe casts                         |
| [@metreeca/core/nested](https://metreeca.github.io/core/modules/nested.html) | Deep operations on nested objects and arrays       |
| [@metreeca/core/report](https://metreeca.github.io/core/modules/report.html) | Error handling and execution reporting             |
| [@metreeca/core/async](https://metreeca.github.io/core/modules/async.html)   | Primitives for asynchronous operations             |
| [@metreeca/core/order](https://metreeca.github.io/core/modules/order.html)   | Composable comparison functions for sorting        |
| [@metreeca/core/switch](https://metreeca.github.io/core/modules/switch.html) | Type-safe pattern matcher for discriminated unions |
| [@metreeca/core/state](https://metreeca.github.io/core/modules/state.html)   | Type-safe immutable state manager                  |

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
