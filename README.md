# @metreeca/core

[![npm](https://img.shields.io/npm/v/@metreeca/core)](https://www.npmjs.com/package/@metreeca/core)

A lightweight library of core TypeScript utilities.

**@metreeca/core** is a zero-dependency foundation for type-safe operations, data validation, and functional
programming, providing utilities for type guards, safe casts, comparisons, immutability, data manipulation, and error
handling.

# Installation

```shell
npm install @metreeca/core
```

> [!WARNING]
> TypeScript consumers must use `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`) in `tsconfig.json`. The
> legacy `"node"` resolver is not supported.

# Usage

## Runtime Guards

[Type guards](https://metreeca.github.io/core/modules.html#Runtime_Guards) for runtime JavaScript types and protocols.

```typescript
import { isDefined, isEmpty, isFunction, isPromise, isIterable } from '@metreeca/core';

if ( isDefined(value) ) { /* value is T */ }

isEmpty({}); // true
isEmpty([]); // true

isFunction(() => {}); // true
isPromise(Promise.resolve(42)); // true
isIterable([1, 2, 3]); // true
```

## Value Guards

[Type guards](https://metreeca.github.io/core/modules.html#Value_Guards) for JSON-like values and data structures.

```typescript
import { isBoolean, isNumber, isString, isObject, isArray } from '@metreeca/core';

isBoolean(true); // true
isNumber(42); // true (excludes NaN, Infinity)
isString('hello'); // true

isObject({ a: 1 }); // true
isObject(new Date()); // false

isArray([1, 2, 3], isNumber); // true
isArray([1, 'two'], isNumber); // false
```

## Value Casts

[Safe type casts](https://metreeca.github.io/core/modules.html#Value_Casts) returning `undefined` instead of throwing.

```typescript
import { asNumber, asString, asObject, asArray } from '@metreeca/core';

asNumber(42); // 42
asNumber('42'); // undefined
```

## Structural Utilities

[Deep operations](https://metreeca.github.io/core/modules.html#Structural_Utilities) on complex types.

```typescript
import { equals, immutable } from '@metreeca/core';

equals({ a: [1, 2] }, { a: [1, 2] }); // true
immutable({ a: [1, 2, 3] }); // deep frozen
```

## Error Utilities

[Throw errors](https://metreeca.github.io/core/modules.html#Error_Utilities) in expression contexts.

```typescript
import { error } from '@metreeca/core';

isValid(input) ? input : error('Invalid input');
findUser(id) ?? error(`User ${id} not found`);
```

# Support

- open an [issue](https://github.com/metreeca/core/issues) to report a problem or to suggest a new feature
- start a [discussion](https://github.com/metreeca/core/discussions) to ask a how-to question or to share an idea

# License

This project is licensed under the Apache 2.0 License –
see [LICENSE](https://github.com/metreeca/core?tab=Apache-2.0-1-ov-file) file for details.
