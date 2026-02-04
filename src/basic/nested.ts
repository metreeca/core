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
 * Deep operations on nested objects and arrays.
 *
 * **Deep Equality**
 *
 * Compare nested structures for structural equality:
 *
 * ```typescript
 * import { equals } from '@metreeca/core/nested';
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
 * import { immutable } from '@metreeca/core/nested';
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
 * **Type-Safe Freezing**
 *
 * Validate and freeze with optional type guards:
 *
 * ```typescript
 * import { immutable } from '@metreeca/core/nested';
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
import { assert } from "./error.js";


/**
 * Symbol used to tag objects that have been made immutable.
 *
 * Stores `immutable` function reference if no guard was provided, or the guard function itself.
 * This allows for efficient idempotency checking and guard memoization.
 */
const Immutable = Symbol("immutable");


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
 * @param x The target object to be checked for equality
 * @param y The reference object to be checked for equality
 * @param equal An optional custom equality function for comparing non-object, non-array values; defaults to `Object.is`
 *
 * @returns `true` if `x` and `y` are deeply equal; `false` otherwise
 *
 * @throws {RangeError} Stack overflow when `x` or `y` contains circular references
 */
export function equals(x: unknown, y: unknown, equal: (x: unknown, y: unknown) => boolean = Object.is): boolean {

	function arrayEquals(x: unknown[], y: typeof x) {
		return x.length === y.length && x.every((value, index) => equals(value, y[index], equal));
	}

	function objectEquals(x: { [s: string | number | symbol]: unknown }, y: typeof x) {

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);

		return xKeys.length !== yKeys.length ? false
			: xKeys.every(key => key in y && equals(x[key], y[key], equal));
	}

	return isArray(x) ? isArray(y) && arrayEquals(x, y)
		: isObject(x) ? isObject(y) && objectEquals(x, y)
			: equal(x, y);
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
 * This function is idempotent: calling it multiple times on the same value returns the same reference after the first
 * call, making it safe and efficient to use defensively.
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

	const actual = value !== null && typeof value === "object" ? Reflect.get(value, Immutable) : undefined;
	const target = guard ?? actual ?? immutable;

	if ( actual === target ) {  // already frozen with target brand: idempotent

		return value;

	} else if ( actual !== undefined ) { // already frozen: rebrand and shallow-refreeze if array or object

		const validated = guard ? assert(value, guard, message) : value;

		return isArray(validated) ? brand([...validated])
			: isObject(validated) ? brand({ ...validated })
				: validated;

	} else { // brand and deep-freeze if array or object

		const validated = guard ? assert(value, guard, message) : value;

		return isArray(validated) ? freeze(validated, [])
			: isObject(validated) ? freeze(validated, {})
				: value;

	}


	/**
	 * Brands and freezes a value with the target brand.
	 *
	 * @param value The object or array to brand
	 *
	 * @returns The frozen and branded value
	 */
	function brand(value: object): unknown {

		Object.defineProperty(value, Immutable, {
			value: target,
			enumerable: false
		});

		return Object.freeze(value);

	}

	/**
	 * Recursively freezes a value by copying properties to an accumulator.
	 *
	 * @param value The value to freeze (object, array, or function)
	 * @param accumulator The target object to receive frozen properties
	 *
	 * @returns The frozen accumulator
	 *
	 * @remarks
	 *
	 * Property descriptors omit `writable` and `configurable` attributes since
	 * `Object.freeze()` will make all properties non-writable and non-configurable.
	 */
	function freeze(value: object, accumulator: {}): unknown {

		Reflect.ownKeys(value).forEach(key => {

			if ( key !== Immutable ) {

				const descriptor = Object.getOwnPropertyDescriptor(value, key)!;

				if ( "value" in descriptor ) { // data property: freeze the value recursively

					Object.defineProperty(accumulator, key, {
						value: immutable(descriptor.value),
						enumerable: descriptor.enumerable
					});

				} else { // accessor property: preserve getter only (setters would allow mutation)

					Object.defineProperty(accumulator, key, {
						get: descriptor.get,
						enumerable: descriptor.enumerable
					});

				}

			}

		});

		return brand(accumulator);

	}

}
