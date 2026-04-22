# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/core/compare/v0.9.18...HEAD)

### Added

- `nests` function for checking parent/child relationships between hierarchical URI/IRI identifiers
- `seal` function for attaching typed content to objects under symbol keys, producing deep immutable clones
- `Eager<T>` utility type unwrapping a `Lazy<T>` reference to its eager counterpart
- `isEager` type guard for validating eager (non-function) `Lazy<T>` values
- `DeepPartial<T>` utility type recursively widening JSON-like types into a subset view, preserving tuple arity,
  element labels, variadic segments, and index signatures
- `encodeBase64` / `decodeBase64` functions for URL-safe base64 encoding of UTF-8 text (RFC 4648 § 5), exported
  from the new `@metreeca/core/base64` module

### Fixed

- `equals` now correctly distinguishes `-0` from `+0` using `Object.is` semantics in the short-circuit path

### Changed

- `equals` now short-circuits on reference-identical arguments, skipping deep traversal entirely
- `immutable` no longer brands nested children; idempotency applies only at top level
- `manageState` now throws `TypeError` instead of `Error` for invalid instances
- `Namespace` is now an object type accessed via property lookup (`ns.term`, `ns["term"]`) instead of a callable;
  the namespace IRI is retrieved via `ns[""]` instead of `ns()`
- `Terms<T>` type merged into `Namespace<T>`
- `createRelay` now returns immutable values, deep-freezing structured results (objects, arrays)
- `createState`, `createNamespace`, `createMutex`, `createThrottle`, and `manageState` now return immutable objects
- `Manager.capture()` now returns an immutable version snapshot
- Rename `error` module to `report` (import from `@metreeca/core/report`)
- Rename `nested` module to `deep` (import from `@metreeca/core/deep`)
- Split `Problem` and `createFetch` from `resource` into new `problem` module (import from `@metreeca/core/problem`)
- Reorganize source layout: `basic/` → `common/`, `network/` → `standard/`, `async/` → `common/async/`
- `isLazy` now accepts the type guard parameter as optional and rejects functions with non-zero arity regardless

### Removed

- `URI` type alias (use `IRI` instead — every valid URI is a valid IRI)
- `isURI` type guard (use `isIRI` instead)
- `asURI` validating cast (use `asIRI` instead)
- `Some<T>` utility type (inlined as `T | readonly T[]` where used)
- `isSome` type guard

### Fixed

- `createNamespace` now validates that the namespace IRI is absolute (rejects relative and root-relative references)
- `Namespace<T>` closed type now rejects unknown terms at compile time (previously allowed any string key)
- `createNamespace` crashing with `TypeError` when terms collide with `Function.prototype` properties (`name`,
  `length`, `caller`)
- `Relay` overload resolution picking partial over complete handlers

## [0.9.18](https://github.com/metreeca/core/compare/v0.9.17...v0.9.18) - 2026-02-09

### Added

- `Guard<T>` type alias for type guard functions
- `Guarded<G>` type alias for extracting guarded types from guard arrays
- `isAny` wildcard type guard (always succeeds)
- `isUnion` type guard for validating values against multiple guards (union types)
- `isOptional` type guard for validating optional values (`undefined | T`)
- `isLiteral` type guard for validating literal values (single or array of literals)
- `isSome` type guard for validating `Some<T>` values (single value or array of values)
- `isLazy` type guard for validating `Lazy<T>` values (plain value or no-arg function)
- `"hierarchical"` variant for URI/IRI validation (absolute with `/`-rooted path, usable as resolution base)
- Optional `is` parameter to `isArray`/`asArray` for element validation; receives `(value, index)`
- Tuple template validation for `isArray` with exact length matching
- Optional `is` parameter to `isObject`/`asObject` supporting predicate `(value, key)` or template validation
- `key` symbol for open template validation in `isObject`
- `assert` validation function in `report` module
- `asIdentifier`, `asBoolean`, `asNumber`, `asString`, `asArray`, `asObject` validating cast functions
- `immutable(value, guard)` overload for type guard validation with memoization
- `IdentifierPattern` regex constant for ECMAScript identifier validation
- `TagPattern` regex constant for BCP 47 language tag validation
- `TagRangePattern` regex constant for BCP 47 extended language range validation

### Changed

- Change `isDefined` to only check for `undefined` (no longer excludes `null`)
- Rename `report` module to `error`, then back to `report`
- Consolidate `json` module into main index module; import from `@metreeca/core` instead of `@metreeca/core/json`
- Change default `variant` parameter from `"absolute"` to `"relative"` for `isURI`, `isIRI`, `asURI`, `asIRI`
- Change `isObject` type parameter from `<K, V>` to `<T extends Record<PropertyKey, unknown>>`
- Change `asTag`, `asTagRange`, `asURI`, `asIRI` to accept `unknown` values (throws `TypeError` for non-strings)
- Change `immutable` to remove setters from accessor properties for true immutability

### Removed

- `isScalar` type guard (use `isBoolean(v) || isNumber(v) || isString(v)` instead)

## [0.9.17](https://github.com/metreeca/core/compare/v0.9.16...v0.9.17) - 2025-12-17

### Added

- `Some<T>` utility type for accepting single values or arrays uniformly
- `Lazy<T>` utility type for deferred value evaluation
- `isRegExp` and `isDate` type guards
- Optional `equal` parameter to `equals()` function for custom equality

### Changed

- Make `name` parameter optional in `Namespace` type
- Replace branded types with plain type aliases for better runtime validation compatibility
