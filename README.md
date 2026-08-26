# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript abstractions.

**@metreeca/core** is a foundational TypeScript toolkit with clean, minimalist APIs for value operations, runtime
services, functional patterns and web standards.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Usage

| Module                                  | Description                             |
|-----------------------------------------|-----------------------------------------|
| [@metreeca/core][core]                  | Core types, guards, and utilities       |
| **Value Operations**                    |                                         |
| [@metreeca/core/strings][strings]       | General-purpose string operations       |
| [@metreeca/core/numbers][numbers]       | General-purpose number operations       |
| [@metreeca/core/arrays][arrays]         | General-purpose array operations        |
| [@metreeca/core/structures][structures] | General-purpose structural operations   |
| **Runtime Services**                    |                                         |
| [@metreeca/core/async][async]           | Asynchronous execution utilities        |
| [@metreeca/core/scope][scope]           | Identity-keyed value allocation         |
| **Functional Patterns**                 |                                         |
| [@metreeca/core/order][order]           | Composable comparison functions         |
| [@metreeca/core/trace][trace]           | Composable value validators             |
| [@metreeca/core/relay][relay]           | Type-safe discriminated union switching |
| [@metreeca/core/state][state]           | Type-safe immutable state management    |
| **Web Standards**                       |                                         |
| [@metreeca/core/resource][resource]     | RFC 3987 resource identifiers           |
| [@metreeca/core/language][language]     | BCP 47 tags and RFC 4647 basic ranges   |
| [@metreeca/core/datatype][datatype]     | XSD 1.1 datatype identifiers            |
| [@metreeca/core/base64][base64]         | RFC 4648 base64 encoders and decoders   |

[core]: https://metreeca.github.io/core/modules.html

[strings]: https://metreeca.github.io/core/modules/strings.html

[numbers]: https://metreeca.github.io/core/modules/numbers.html

[arrays]: https://metreeca.github.io/core/modules/arrays.html

[structures]: https://metreeca.github.io/core/modules/structures.html

[async]: https://metreeca.github.io/core/modules/async.html

[scope]: https://metreeca.github.io/core/modules/scope.html

[order]: https://metreeca.github.io/core/modules/order.html

[trace]: https://metreeca.github.io/core/modules/trace.html

[relay]: https://metreeca.github.io/core/modules/relay.html

[state]: https://metreeca.github.io/core/modules/state.html

[resource]: https://metreeca.github.io/core/modules/resource.html

[language]: https://metreeca.github.io/core/modules/language.html

[datatype]: https://metreeca.github.io/core/modules/datatype.html

[base64]: https://metreeca.github.io/core/modules/base64.html


# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
