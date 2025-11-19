# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

A lightweight library of core TypeScript utilities.

**@metreeca/core** is a foundational toolkit for building type-safe, observable TypeScript applications, bridging
compile-time type checking with runtime validation, structured logging, and functional programming patterns.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
> TypeScript consumers must use `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`) in `tsconfig.json`. The
> legacy `"node"` resolver is not supported.

# Usage

| Module                                                                                 | Description                                                                                  |
|----------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| [@metreeca/core](https://metreeca.github.io/core/modules.html)                         | Runtime type guards, safe casts, deep equality and immutability, error utilities             |
| [@metreeca/core/logger](https://metreeca.github.io/core/modules/logger.html)           | Simplified [LogTape](https://logtape.org) facade with auto-configuration and logging helpers |
| [@metreeca/core/async](https://metreeca.github.io/core/modules/async.html)             | Composable primitives for asynchronous operations                                            |
| [@metreeca/core/comparators](https://metreeca.github.io/core/modules/comparators.html) | Composable comparison functions and combinators for sorting operations                       |
| [@metreeca/core/predicates](https://metreeca.github.io/core/modules/predicates.html)   | Composable predicate functions and combinators for filtering operations                      |
| [@metreeca/core/status](https://metreeca.github.io/core/modules/status.html)           | Pattern matching for values that can be in one of several exclusive states                   |

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
