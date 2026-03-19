# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript abstractions.

**@metreeca/core** is a foundational TypeScript toolkit with clean, minimalist APIs for common operations, standard
datatypes and functional patterns.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Usage

| Module                                                                           | Description                              |
|----------------------------------------------------------------------------------|------------------------------------------|
| [@metreeca/core](https://metreeca.github.io/core/modules.html)                   | Utility types and type guards            |
| **Common Operations**                                                            |                                          |
| [@metreeca/core/deep](https://metreeca.github.io/core/modules/deep.html)         | Deep operations on objects and arrays    |
| [@metreeca/core/report](https://metreeca.github.io/core/modules/report.html)     | Execution reporting and error handling   |
| [@metreeca/core/async](https://metreeca.github.io/core/modules/async.html)       | Asynchronous coordination primitives     |
| **Standard Datatypes**                                                           |                                          |
| [@metreeca/core/resource](https://metreeca.github.io/core/modules/resource.html) | RFC 3987 resource identifiers            |
| [@metreeca/core/language](https://metreeca.github.io/core/modules/language.html) | BCP 47 language tags and ranges          |
| [@metreeca/core/problem](https://metreeca.github.io/core/modules/problem.html)   | RFC 7807 problem details for HTTP APIs   |
| **Functional Patterns**                                                          |                                          |
| [@metreeca/core/order](https://metreeca.github.io/core/modules/order.html)       | Composable comparison functions          |
| [@metreeca/core/relay](https://metreeca.github.io/core/modules/relay.html)       | Type-safe relay for discriminated unions |
| [@metreeca/core/state](https://metreeca.github.io/core/modules/state.html)       | Type-safe immutable state management     |

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
