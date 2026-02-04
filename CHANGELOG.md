# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/core/compare/v0.9.17...HEAD)

### Added

- `Guard<T>` type alias for type guard functions
- `Guarded<G>` type alias for extracting guarded types from guard arrays
- `isAny` wildcard type guard (always succeeds)
- `isUnion` type guard for validating values against multiple guards (union types)
- `isOptional` type guard for validating optional values (`undefined | T`)
- `isLiteral` type guard for validating literal values (single or array of literals)
- `"hierarchical"` variant for URI/IRI validation (absolute with authority, usable as resolution base)
- Optional `is` parameter to `isArray`/`asArray` for element validation; receives `(value, index)`
- Tuple template validation for `isArray` with exact length matching
- Optional `is` parameter to `isObject`/`asObject` supporting predicate `(value, key)` or template validation
- `key` symbol for open template validation in `isObject`
- `assert` validation function in `error` module
- `asIdentifier`, `asBoolean`, `asNumber`, `asString`, `asArray`, `asObject` validating cast functions
- `immutable(value, guard)` overload for type guard validation with memoization
- `IdentifierPattern` regex constant for ECMAScript identifier validation
- `TagPattern` regex constant for BCP 47 language tag validation
- `TagRangePattern` regex constant for BCP 47 extended language range validation

### Changed

- Change `isDefined` to only check for `undefined` (no longer excludes `null`)
- Rename `report` module to `error`
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
