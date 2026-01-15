# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/core/compare/v0.9.17...HEAD)

### Added

- `"hierarchical"` variant for URI/IRI validation (absolute with authority, usable as resolution base)
- Optional `is` predicate parameter to `isArray` for element validation; receives `(value, index)`
- Tuple template validation for `isArray` with exact length matching
- Optional `is` parameter to `isObject` supporting predicate `(value, key)` or template validation
- `key` symbol for open template validation in `isObject`
- `any` wildcard guard for accepting any value in templates without validation
- `Guard` type for template-based validation rules: literal values, literal arrays, predicates
- `union` function to create combined type guards matching any of provided guards
- `intersection` function to create refined type guards matching all provided guards
- `Union<G>` and `Intersection<G>` type helpers for guard type extraction
- `assert` validation function in `error` module
- `asIdentifier` validating cast function for ECMAScript identifiers
- `asBoolean`, `asNumber`, `asString`, `asArray`, `asObject` validating cast functions
- Optional `is` guard/predicate parameter to `isArray`/`asArray` for element validation
- Optional `is` guard/predicate parameter to `isObject`/`asObject` for `[key, value]` entry validation
- `assert` memoized validation function for plain objects
- `IdentifierPattern` regex constant for ECMAScript identifier validation
- `TagPattern` regex constant for BCP 47 language tag validation
- `TagRangePattern` regex constant for BCP 47 extended language range validation

### Changed

- Rename `report` module to `error`
- Change default `variant` parameter from `"absolute"` to `"relative"` for `isURI`, `isIRI`, `asURI`, `asIRI`
- Change `asTag`, `asTagRange`, `asURI`, `asIRI` to accept `unknown` values (throws `TypeError` for non-strings)

## [0.9.17](https://github.com/metreeca/core/compare/v0.9.16...v0.9.17) - 2025-12-17

### Added

- `Some<T>` utility type for accepting single values or arrays uniformly
- `Lazy<T>` utility type for deferred value evaluation
- `isRegExp` and `isDate` type guards
- Optional `equal` parameter to `equals()` function for custom equality

### Changed

- Make `name` parameter optional in `Namespace` type
- Replace branded types with plain type aliases for better runtime validation compatibility
