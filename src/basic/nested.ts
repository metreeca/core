/*
 * Copyright © 2025 Metreeca srl
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
 * @module
 */

import { isFunction } from "../index.js";
import { isArray, isObject } from "./json.js";


/**
 * Symbol used to tag objects that have been made immutable.
 *
 * This allows for efficient idempotency checking - if an object has this symbol,
 * we know it was already processed by immutable() and is deeply frozen.
 */
const Immutable = Symbol("immutable");

/**
 * Brand symbol linking objects to their validating function.
 *
 * Used by {@link assert} to skip redundant validation when the object
 * was already validated by the same validator.
 */
const Asserted = Symbol("Asserted");


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
export function equals(x: unknown, y: unknown, equal: (x: unknown, y: unknown) => boolean=Object.is): boolean {

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
 * Plain objects, arrays, and functions with custom properties are recursively cloned and frozen. Functions without
 * custom properties are returned as-is. Other object types (`Date`, `RegExp`, `Buffer`, etc.) are returned as-is to
 * preserve their functionality.
 *
 * > [!CAUTION]
 * > **Circular references are not supported**. Do not pass objects with cycles.
 *
 * @typeParam T The type of the value to be cloned
 *
 * @param value The value to make immutable
 *
 * @returns A deeply immutable clone of `value`
 *
 * @throws {RangeError} Stack overflow when `value` contains circular references
 *
 * @remarks
 *
 * - Only plain objects (those with `Object.prototype`) and arrays are cloned and frozen.
 *   All other objects (`Date`, `RegExp`, `Map`, `Set`, class instances, objects with `null`
 *   prototype, etc.) are returned as-is to preserve their functionality.
 * - This function is idempotent: calling it multiple times on the same value returns the same
 *   reference after the first call, making it safe and efficient to use defensively.
 * - For functions with custom properties, built-in read-only properties (`length`, `name`, `prototype`)
 *   are preserved unchanged while custom writable properties are frozen recursively. Non-configurable
 *   custom properties are skipped and remain in their original state.
 * - Accessor properties (getters/setters) are preserved as-is without freezing the accessor
 *   functions themselves. Getters may still return mutable values.
 */
export function immutable<T>(value: T): T {

	return isFunction(value) ? freeze(value, value)
		: isArray(value) ? freeze(value, [])
			: isObject(value) ? freeze(value, {})
				: value;


	/**
	 * Recursively freezes a value by copying properties to an accumulator.
	 *
	 * @param value The source value to freeze (object, array, or function)
	 * @param accumulator The target object to receive frozen properties
	 *
	 * @returns The frozen accumulator
	 *
	 * @remarks
	 *
	 * Property descriptors omit `writable` and `configurable` attributes since
	 * `Object.freeze()` will make all properties non-writable and non-configurable.
	 */
	function freeze(value: T & object, accumulator: {}): T {

		if ( Immutable in value ) {

			return value as T;

		} else {

			const source = value as Record<PropertyKey, unknown>;

			Reflect.ownKeys(source).forEach(key => {

				const builtin = isFunction(value) && (
					key === "length" || key === "name" || key === "prototype"
				);

				if ( !builtin ) {

					const descriptor = Object.getOwnPropertyDescriptor(source, key)!;

					// leave non-configurable properties as-is when modifying in-place (functions only);
					// for objects/arrays, accumulator is a fresh object so we can copy them

					if ( accumulator !== value || descriptor.configurable ) {

						if ( "value" in descriptor ) { // data property: freeze the value recursively

							Object.defineProperty(accumulator, key, {
								value: immutable(descriptor.value),
								enumerable: descriptor.enumerable
							});

						} else { // accessor property: preserve getter/setter as-is

							Object.defineProperty(accumulator, key, {
								get: descriptor.get,
								set: descriptor.set,
								enumerable: descriptor.enumerable
							});

						}

					}
				}

			});

			Object.defineProperty(accumulator, Immutable, {
				value: true,
				enumerable: false
			});

			return Object.freeze(accumulator) as T;

		}

	}

}

/**
 * Asserts that a value conforms to a validated type.
 *
 * Applies a validator function to ensure `value` matches the expected type, throwing on invalid input. Validators may
 * recursively call `assert` to deep-validate complex nested objects. For plain objects, memoizes validation results by
 * branding the object with the validator function, so subsequent calls with the same validator return immediately
 * without re-validation. Non-object values are validated on every call.
 *
 * > [!CAUTION]
 * > **Circular references are not supported**. Do not pass objects with cycles.
 *
 * > [!IMPORTANT]
 * > **Validators must have stable identity**. Use module-level named functions or `const` lambdas.
 *
 * @typeParam V The input value type accepted by the validator
 * @typeParam T The type being asserted
 *
 * @param validator A function that validates `value` and throws on invalid input
 * @param value The value to validate
 *
 * @returns The validated value (branded and immutable if a plain object)
 *
 * @throws {RangeError} Stack overflow when `value` contains circular references
 * @throws Propagates any exception thrown by `validator`
 *
 * @remarks
 *
 * - This function is idempotent: calling it multiple times on the same value with the same validator returns the same
 *   reference after the first call, making it safe and efficient to use defensively.
 */
export function assert<V, T>(validator: (value: V) => T, value: unknown): T {

	if ( isObject(value) ) {

		return value[Asserted] === validator
			? value as T
			: brand(validator(value as V));

	} else {

		return validator(value as V);

	}


	function brand(validated: T): T {

		const target = Object.isExtensible(validated)
			? validated
			: copy(validated as object);

		return immutable(Object.defineProperty(target, Asserted, {
			value: validator,
			enumerable: false,
			configurable: true
		})) as T;

	}

	function copy(source: object): object {

		return Object.defineProperties({}, Object.fromEntries(
			Reflect.ownKeys(source)
				.filter(key => key !== Asserted)
				.map(key => [key, Object.getOwnPropertyDescriptor(source, key)!])
		));

	}

}
