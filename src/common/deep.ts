/*
 * Copyright © 2025-2026 Metreeca srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Deep operations on JSON-like objects and arrays.
 *
 * **Recursive Partial Views**
 *
 * Widen a JSON-like type into a subset view that accepts partial literals at every nesting level:
 *
 * ```typescript
 * import type { DeepPartial } from '@metreeca/core/deep';
 *
 * type Config = { server: { host: string; port: number }; tags: string[] };
 *
 * const overlay: DeepPartial<Config> = { server: { port: 8080 } }; // missing keys allowed
 * ```
 *
 * Tuple arity, element labels, variadic segments, and index signatures are preserved while every record key is
 * relaxed to `readonly` and optional.
 *
 * **Deep Equality**
 *
 * Compare nested structures for structural equality:
 *
 * ```typescript
 * import { equals } from '@metreeca/core/deep';
 *
 * // Objects and arrays
 * equals({ a: [1, 2] }, { a: [1, 2] }); // true
 * equals({ a: 1, b: 2 }, { b: 2, a: 1 }); // true (order-independent)
 * equals([1, [2, 3]], [1, [2, 3]]); // true (nested arrays)
 *
 * // Primitives and functions
 * equals(42, 42); // true
 * equals(-0, +0); // false (distinguishes -0 from +0)
 *
 * const fn = () => {};
 * equals(fn, fn); // true (same reference)
 * ```
 *
 * **Deep Freezing**
 *
 * Create deeply frozen structures that prevent all mutations:
 *
 * ```typescript
 * import { immutable } from '@metreeca/core/deep';
 *
 * // Objects and arrays
 * const original = { a: [1, 2, 3], b: { c: 4 } };
 * const frozen = immutable(original);
 *
 * frozen.a[0] = 999; // throws Error
 * frozen.b.c = 999; // throws Error
 *
 * // Primitives and functions
 * immutable(42); // 42
 * immutable("hello"); // "hello"
 *
 * const fn = () => "hello";
 * fn.config = { port: 3000 };
 * const frozenFn = immutable(fn);
 *
 * frozenFn(); // "hello" (function still works)
 * frozenFn.config.port = 8080; // throws Error
 * ```
 *
 * **Stable Identity**
 *
 * Cloning is idempotent at every depth: each frozen object and array is branded, so re-freezing a clone, or any nested
 * member extracted from it, returns the same reference rather than a fresh copy. A frozen member keeps its identity
 * even when reached through another path or nested into a new structure:
 *
 * ```typescript
 * import { immutable } from '@metreeca/core/deep';
 *
 * const frozen = immutable({ inner: { p: 1 } });
 *
 * immutable(frozen) === frozen;             // true (whole graph)
 * immutable(frozen.inner) === frozen.inner; // true (nested member)
 *
 * immutable({ ref: frozen.inner }).ref === frozen.inner; // true (member nested into a new structure)
 * ```
 *
 * **Type-Safe Freezing**
 *
 * Validate and freeze with optional type guards:
 *
 * ```typescript
 * import { immutable } from '@metreeca/core/deep';
 * import { isObject, isString, isNumber } from '@metreeca/core';
 *
 * // Define a type guard
 * const isUser = (v: unknown): v is { name: string; age: number } =>
 *   isObject(v, { name: isString, age: isNumber });
 *
 * // Validate and freeze in one step
 * const user = immutable(data, isUser);
 *
 * // Memoized: repeated calls with same guard return same reference
 * immutable(user, isUser) === user; // true (no re-validation)
 *
 * // Different guard triggers revalidation
 * const isAdmin = (v: unknown): v is { name: string; age: number } =>
 *   isUser(v) && v.age >= 18;
 *
 * immutable(user, isAdmin); // revalidates
 * ```
 *
 * @module
 */

import { type Guard, isArray, isObject } from "../index.js";
import { assert } from "./report.js";


/**
 * Symbol used to tag objects that have been made immutable.
 *
 * Every cloned object and array in a frozen graph carries this tag, enabling deep idempotency checks and guard reuse:
 * the top-level clone stores the guard function when one was supplied, otherwise the `immutable` function reference;
 * nested clones always store the `immutable` reference (the default brand).
 */
const Immutable = Symbol("immutable");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Recursively widens a JSON-like type into a subset view.
 *
 * Walks the type tree distributing over unions and dispatching on each node:
 *
 * - **Primitives** (`undefined`, `null`, `boolean`, `number`, `string`): returned unchanged
 * - **Tuples and arrays**: each element type is recursively widened; tuple arity, element labels, variadic segments,
 *   and the array-versus-tuple distinction are preserved, with the `readonly` modifier applied
 * - **Plain objects and records** (including string- and number-indexed signatures): every property becomes
 *   `readonly` and optional, with values recursively widened
 *
 * @typeParam T The template type to widen
 */
export type DeepPartial<T> =
	T extends undefined | null | boolean | number | string ? T
		: T extends readonly unknown[] ? { readonly [K in keyof T]: DeepPartial<T[K]> }
			: T extends object ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
				: T;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks deep object equality.
 *
 * Object pairs are deeply equal if they contain:
 *
 * - two {@link isObject plain objects} with deeply equal entry sets
 * - two {@link isArray arrays} with pairwise deeply equal items
 * - two values otherwise equal according to `equal` or `Object.is` by default
 *
 * > [!CAUTION]
 * > **Circular references are not supported**. Do not pass objects with cycles.
 *
 * > [!NOTE]
 * > Reference-identical arguments (`Object.is(x, y)`) short-circuit immediately, skipping deep traversal entirely.
 * > This optimisation is unconditional and independent of the custom `equal` function.
 *
 * @param x The target object to be checked for equality
 * @param y The reference object to be checked for equality
 * @param equal An optional custom equality function for comparing non-object, non-array values; defaults to `Object.is`
 *
 * @returns `true` if `x` and `y` are deeply equal; `false` otherwise
 *
 * @throws {RangeError} Stack overflow when `x` or `y` contains circular references
 */
export function equals(x: unknown, y: unknown, equal: (x: unknown, y: unknown) => boolean = Object.is): boolean {

	return Object.is(x, y) ? true
		: isArray(x) ? isArray(y) && arrayEquals(x, y)
			: isObject(x) ? isObject(y) && objectEquals(x, y)
				: equal(x, y);


	function arrayEquals(x: unknown[], y: typeof x) {
		return x.length === y.length && x.every((value, index) => equals(value, y[index], equal));
	}

	function objectEquals(x: { [s: string | number | symbol]: unknown }, y: typeof x) {

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);

		return xKeys.length !== yKeys.length ? false
			: xKeys.every(key => key in y && equals(x[key], y[key], equal));
	}

}


/**
 * Creates an immutable deep clone.
 *
 * Values are processed according to their type:
 *
 * - **Cloned and frozen**: {@link isObject plain objects} and {@link isArray arrays}; nested structures are cloned
 *   recursively; accessor properties are preserved as read-only (getters only, setters removed)
 * - **Returned as-is**: primitives, functions, and non-plain objects (for example, `Date`, `Map`, `Set`, class
 *   instances, or objects with `null` prototype)
 *
 * This function is idempotent at every depth: every cloned object and array is branded internally, so calling it again
 * on a frozen clone, or on any nested member extracted from one, returns the same reference. Members reached through
 * multiple paths, or extracted and re-nested into another structure, keep a stable identity. This makes it safe and
 * efficient to use defensively.
 *
 * > [!CAUTION]
 * > **Circular references are not supported**. Do not pass objects with cycles.
 *
 * @typeParam T The type of the value to be cloned
 *
 * @param value The value to make immutable
 *
 * @returns A deeply frozen clone of `value`
 *
 * @throws {RangeError} Stack overflow when `value` contains circular references
 */
export function immutable<T>(value: T): T;

/**
 * Creates an immutable deep clone, validating against a type guard.
 *
 * Values are processed according to their type:
 *
 * - **Cloned and frozen**: {@link isObject plain objects} and {@link isArray arrays}; nested structures are cloned
 *   recursively; accessor properties are preserved as read-only (getters only, setters removed)
 * - **Returned as-is**: primitives, functions, and non-plain objects (for example, `Date`, `Map`, `Set`, class
 *   instances, or objects with `null` prototype)
 *
 * Validates `value` against the guard before freezing:
 *
 * - **Plain objects and arrays**: memoizes validation; subsequent calls with the same guard skip re-validation and
 *   return the same reference; calls with a different guard trigger revalidation and rebranding
 * - **Other values**: validated on every call
 *
 * The guard brands only the top-level clone; nested members carry the default brand, so they remain stable under
 * guard-less {@link immutable} calls while a guarded call on a nested member revalidates it.
 *
 * > [!CAUTION]
 * > **Circular references are not supported**. Do not pass objects with cycles.
 *
 * > [!IMPORTANT]
 * > **Guards must have stable identity**. Use module-level named functions or `const` lambdas.
 *
 * @typeParam T The validated type of the returned clone
 *
 * @param value The value to make immutable
 * @param guard Type guard function to validate `value`
 * @param message Optional error message when validation fails
 *
 * @returns A deeply frozen clone of `value`, branded with the guard
 *
 * @throws {TypeError} When the guard returns `false`
 * @throws {RangeError} Stack overflow when `value` contains circular references
 */
export function immutable<T>(value: unknown, guard: Guard<T>, message?: string): T;

/**
 * Creates an immutable deep clone, optionally validating against a type guard.
 */
export function immutable(value: unknown, guard?: Guard, message?: string): unknown {

	// actual: existing brand stored on value
	// target: expected brand (explicit guard, existing, or default)

	const actual = seal(value, Immutable);
	const target = guard ?? actual ?? immutable;

	return actual === target ? value // already branded with target
		: seal(guard ? assert(value, guard, message) : value, Immutable, target);

}


/**
 * Retrieves the content sealed on `value` under the given `seal`.
 *
 * @typeParam T The expected type of the sealed content
 *
 * @param value The value to inspect
 * @param seal The symbol identifying the seal
 *
 * @returns The sealed content if `value` is sealed under `seal`; `undefined` otherwise
 */
export function seal<T>(value: unknown, seal: symbol): undefined | T;

/**
 * Seals `content` on `value` under the given `seal`.
 *
 * Both the sealed clone and any object or array `content` are deep-frozen and branded at every depth, so
 * {@link immutable} returns them unchanged: the result, its members, the `content`, and the `content` members all
 * keep a stable identity across calls.
 *
 * @typeParam V The type of the value being sealed
 *
 * @param value The value to seal
 * @param seal The symbol identifying the seal
 * @param content The content to seal on `value`
 *
 * @returns The sealed `value`
 */
export function seal<V>(value: V, seal: symbol, content: unknown): V;

/**
 * Inspects or attaches sealed content on a value.
 */
export function seal(value: unknown, seal: symbol, content?: unknown): unknown {

	if ( arguments.length < 3 ) { // retrieve

		return value !== null && typeof value === "object" ? Reflect.get(value, seal) : undefined;

	} else if ( !isArray(value) && !isObject(value) ) { // primitive or non-plain object: return as-is

		return value;

	} else { // clone, seal, and deep-freeze

		const accumulator: object = isArray(value) ? [] : {};

		const sealed = Object.defineProperty(seal === Immutable ? accumulator : branded(accumulator), seal, {

			value: isArray(content) ? freeze(branded([]), content)
				: isObject(content) ? freeze(branded({}), content)
					: content,

			enumerable: false

		});

		return freeze(sealed, value);

	}


	// recursively clone properties to accumulator, stripping setters and deep-freezing values

	function freeze(target: object, source: object): object {

		Reflect.ownKeys(source).forEach(key => {

			if ( key !== Immutable && key !== seal ) {

				const descriptor = Object.getOwnPropertyDescriptor(source, key)!;

				if ( "value" in descriptor ) { // data property: recurse

					const child = descriptor.value;

					Object.defineProperty(target, key, {

						value: isArray(child) ? (Immutable in child ? child : freeze(branded([]), child))
							: isObject(child) ? (Immutable in child ? child : freeze(branded({}), child))
								: child,

						enumerable: descriptor.enumerable

					});

				} else { // accessor property: preserve getter only

					Object.defineProperty(target, key, {

						get: descriptor.get,

						enumerable: descriptor.enumerable

					});

				}

			}

		});

		return Object.freeze(target);

	}


	function branded(object: object): object {
		return Object.defineProperty(object, Immutable, {

			value: immutable,

			enumerable: false

		});
	}

}
