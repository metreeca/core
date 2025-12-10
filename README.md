# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript abstractions.

**@metreeca/core** is a foundational TypeScript toolkit with clean, minimalist APIs for common operations and functional
patterns.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Usage

| Module                                                                           | Description                                   |
|----------------------------------------------------------------------------------|-----------------------------------------------|
| [@metreeca/core](https://metreeca.github.io/core/modules.html)                   | Core utility types and type guards |
| **Basic Operations**                                                             |                                               |
| [@metreeca/core/json](https://metreeca.github.io/core/modules/json.html)         | Type guards for JSON values                   |
| [@metreeca/core/nested](https://metreeca.github.io/core/modules/nested.html)     | Deep operations on nested objects and arrays  |
| [@metreeca/core/report](https://metreeca.github.io/core/modules/report.html)     | Error handling and execution reporting        |
| [@metreeca/core/async](https://metreeca.github.io/core/modules/async.html)       | Primitives for asynchronous operations        |
| **Network Operations**                                                           |                                               |
| [@metreeca/core/resource](https://metreeca.github.io/core/modules/resource.html) | Resource identifiers and HTTP utilities       |
| [@metreeca/core/language](https://metreeca.github.io/core/modules/language.html) | Language tags and ranges                      |
| **Functional Patterns**                                                          |                                               |
| [@metreeca/core/order](https://metreeca.github.io/core/modules/order.html)       | Composable comparison functions for sorting   |
| [@metreeca/core/relay](https://metreeca.github.io/core/modules/relay.html)       | Type-safe relay for discriminated unions      |
| [@metreeca/core/state](https://metreeca.github.io/core/modules/state.html)       | Type-safe immutable state manager             |

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
