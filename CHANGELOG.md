# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unpublished](https://github.com/metreeca/core/compare/v0.9.17...HEAD)

### Added

- `"hierarchical"` variant for URI/IRI validation (absolute with authority, usable as resolution base)
- `asBoolean`, `asNumber`, `asString`, `asArray`, `asObject` validating cast functions
- Optional `is` guard/predicate parameter to `isArray`/`asArray` for element validation
- Optional `is` guard/predicate parameter to `isObject`/`asObject` for `[key, value]` entry validation
- `assert` memoized validation function for plain objects

### Changed

- Rename `report` module to `error`

## [0.9.17](https://github.com/metreeca/core/compare/v0.9.16...v0.9.17) - 2025-12-17

### Added

- `Some<T>` utility type for accepting single values or arrays uniformly
- `Lazy<T>` utility type for deferred value evaluation
- `isRegExp` and `isDate` type guards
- Optional `equal` parameter to `equals()` function for custom equality

### Changed

- Make `name` parameter optional in `Namespace` type
- Replace branded types with plain type aliases for better runtime validation compatibility
