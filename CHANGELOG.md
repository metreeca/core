# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/core/compare/v0.9.19...HEAD)

### Added

- `map` function for threading a value through a transformation as a single inline expression, exported from the new
  `@metreeca/core/combo` module
- `fold` function for mapping an optional value with an optional fallback for the undefined case, preserving `undefined`
  when the fallback is omitted, exported from `@metreeca/core/combo`
- `some` function for normalising an optional or single-or-many value into an array, exported from the new
  `@metreeca/core/arrays` module
- `unique` function for retaining the unique values of an array, deduplicating by `Set` identity by default or by an
  optional custom equality, exported from `@metreeca/core/arrays`
- `union` and `intersection` functions for combining arrays into their set union or narrowing them to their shared
  intersection, deduplicating by `Set` identity by default or by an optional custom equality, exported from
  `@metreeca/core/arrays`
- `Some<T>` type modelling a value that may be absent, singular, or plural, exported from `@metreeca/core/arrays`
- `lazy` function for deferring a `Lazy` reference behind a memoising accessor that computes it at most once on first
  use, exported from `@metreeca/core`
- `eager` function for resolving a `Lazy` reference to its value on every call, exported from `@metreeca/core`
- `@metreeca/core/trace` module of composable value validators reporting every violation at once as a structured
  `Trace`, exposing the `Validator`, `Trace`, `Modal`, and `Keyed` types, the `TraceError` error, the `pass` constant,
  and the `integer`, `length`, `format`, `normalised`, `gt`, `gte`, `lt`, `lte`, `domain`, `array`, `object`, `entry`,
  `size`, `keys`, `values`, `test`, `fail`, `required`, `optional`, `nullable`, `all`, `any`, `one`, and `type`
  validators
- `app` predefined open namespace rooted at the synthetic `app:/` origin, minting IRIs for application-local resources
  with no deployment origin of their own, exported from `@metreeca/core/resource`
- `xsd` predefined closed namespace exposing well-known XML Schema 1.1 datatype IRIs, exported from the new
  `@metreeca/core/datatype` module
- `isNumeric`, `isTemporal`, and `isBinary` predicates for classifying XSD datatype IRIs, exported from
  `@metreeca/core/datatype`
- `getNamespaceIRI` and `getNamespaceBase` accessors for retrieving the IRI of a namespace and the base identifier
  references minted within it resolve against, exported from `@metreeca/core/resource`

### Changed

- `Scope.resolve` now accepts several keys forming a composite, sharing a value only when every component matches by
  reference identity in the same order; single-key and anonymous allocation are unchanged
  (`@metreeca/core/scope`)
- `nests` renamed to `isNestedIRI` and `base` renamed to `getIRIBase` (`@metreeca/core/resource`)

## [0.9.19](https://github.com/metreeca/core/compare/v0.9.18...v0.9.19) - 2026-06-20

### Added

- `nests` function for checking parent/child relationships between hierarchical URI/IRI identifiers
- `base` function for extracting the base identifier (scheme + authority + `/`) from a hierarchical URI/IRI, usable for
  reference resolution; returns `undefined` for non-hierarchical inputs
- `seal` function for attaching typed content to objects under symbol keys, producing deep immutable clones
- `Eager<T>` utility type unwrapping a `Lazy<T>` reference to its eager counterpart
- `isEager` type guard for validating eager (non-function) `Lazy<T>` values
- `DeepPartial<T>` utility type recursively widening JSON-like types into a subset view, preserving tuple arity, element
  labels, variadic segments, and index signatures
- `encodeBase64` / `decodeBase64` functions for URL-safe base64 encoding of UTF-8 text (RFC 4648 § 5), exported from the
  new `@metreeca/core/base64` module
- `createScope` factory and `Scope` type for identity-keyed numeric value allocation, exported from the new
  `@metreeca/core/scope` module
- `Scalar` type for non-null atomic JSON values (`boolean | number | string`), the scalar member of `Value`
- `isScalar` type guard for validating JSON scalar values

### Changed

- `equals` now short-circuits on reference-identical arguments, skipping deep traversal entirely
- `manageState` now throws `TypeError` instead of `Error` for invalid instances
- `Namespace` is now an object type accessed via property lookup (`ns.term`, `ns["term"]`) instead of a callable; the
  namespace IRI is retrieved via `ns[""]` instead of `ns()`
- `Terms<T>` type merged into `Namespace<T>`
- `createFetch` is now idempotent: wrapping a fetch function already produced by `createFetch` returns it unchanged
  instead of stacking guards, so composition collapses to a single guard
- `createRelay` now returns immutable values, deep-freezing structured results (objects, arrays)
- `createState`, `createNamespace`, `createMutex`, `createThrottle`, and `manageState` now return immutable objects
- `Manager.capture()` now returns an immutable version snapshot
- Rename `error` module to `report` (import from `@metreeca/core/report`)
- Rename `nested` module to `deep` (import from `@metreeca/core/deep`)
- Split `Problem` and `createFetch` from `resource` into new `problem` module (import from `@metreeca/core/problem`)
- `Problem` now cites RFC 9457 (which obsoletes RFC 7807) as its reference standard; the wire format is unchanged
- Reorganize source layout: `basic/` → `common/`, `network/` → `standard/`, `async/` → `common/async/`
- `isLazy` now accepts the type guard parameter as optional and rejects functions with non-zero arity regardless
- `matchTag`, `isTagRange`, `TagRange`, and `TagRangePattern` now implement RFC 4647 basic language ranges and basic
  filtering (§ 2.1 / § 3.3.1) instead of extended ranges and extended filtering; a range is a subtag sequence or the
  standalone `*` wildcard, matching a tag when equal or a subtag prefix of it, and ranges with `*` in subtag positions
  (for example `de-*`, `*-CH`) are no longer valid

### Removed

- `URI` type alias (use `IRI` instead — every valid URI is a valid IRI)
- `isURI` type guard (use `isIRI` instead)
- `asURI` validating cast (use `asIRI` instead)
- `asTag` validating cast (use `isTag` instead)
- `asTagRange` validating cast (use `isTagRange` instead)
- `Some<T>` utility type (inlined as `T | readonly T[]` where used)
- `isSome` type guard

### Fixed

- `equals` now correctly distinguishes `-0` from `+0` using `Object.is` semantics in the short-circuit path
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
