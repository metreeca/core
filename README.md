# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

Essential TypeScript abstractions.

**@metreeca/core** is a foundational TypeScript toolkit with clean, minimalist APIs for common operations, web
standards and functional patterns.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
>
> TypeScript consumers must use `"moduleResolution": "nodenext"/"node16"/"bundler"` in `tsconfig.json`.
> The legacy `"node"` resolver is not supported.

# Usage

| Module                              | Description                              |
|-------------------------------------|------------------------------------------|
| [@metreeca/core][core]              | Utility types and type guards            |
| **Common Operations**               |                                          |
| [@metreeca/core/deep][deep]         | Deep operations on objects and arrays    |
| [@metreeca/core/report][report]     | Execution reporting and error handling   |
| [@metreeca/core/scope][scope]       | Identity-keyed variable allocation       |
| [@metreeca/core/async][async]       | Asynchronous coordination primitives     |
| **Web Standards**                   |                                          |
| [@metreeca/core/resource][resource] | RFC 3987 resource identifiers            |
| [@metreeca/core/language][language] | BCP 47 language tags and ranges          |
| [@metreeca/core/problem][problem]   | RFC 9457 problem details for HTTP APIs   |
| [@metreeca/core/base64][base64]     | RFC 4648 URL-safe base64 codec           |
| **Functional Patterns**             |                                          |
| [@metreeca/core/order][order]       | Composable comparison functions          |
| [@metreeca/core/relay][relay]       | Type-safe relay for discriminated unions |
| [@metreeca/core/state][state]       | Type-safe immutable state management     |

[core]: https://metreeca.github.io/core/modules.html

[deep]: https://metreeca.github.io/core/modules/deep.html

[report]: https://metreeca.github.io/core/modules/report.html

[scope]: https://metreeca.github.io/core/modules/scope.html

[async]: https://metreeca.github.io/core/modules/async.html

[resource]: https://metreeca.github.io/core/modules/resource.html

[language]: https://metreeca.github.io/core/modules/language.html

[problem]: https://metreeca.github.io/core/modules/problem.html

[base64]: https://metreeca.github.io/core/modules/base64.html

[order]: https://metreeca.github.io/core/modules/order.html

[relay]: https://metreeca.github.io/core/modules/relay.html

[state]: https://metreeca.github.io/core/modules/state.html


# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
