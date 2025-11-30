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
 * **Usage**
 *
 * ```typescript
 * import { equals, immutable } from '@metreeca/core/nested';
 *
 * // Deep equality checking
 *
 * equals({ a: [1, 2] }, { a: [1, 2] }); // true
 * equals({ a: 1, b: 2 }, { b: 2, a: 1 }); // true (order-independent)
 * equals([1, [2, 3]], [1, [2, 3]]); // true (nested arrays)
 *
 * // Primitive values and functions
 *
 * equals(42, 42); // true
 * equals(-0, +0); // false (distinguishes -0 from +0)
 *
 * const fn = () => {};
 * equals(fn, fn); // true
 *
 * // Create immutable deep clones
 *
 * const original = { a: [1, 2, 3], b: { c: 4 } };
 * const frozen = immutable(original);
 *
 * frozen.a[0] = 999; // throws Error
 * frozen.b.c = 999; // throws Error
 *
 * // Primitives returned as-is
 *
 * immutable(42); // 42
 * immutable("hello"); // "hello"
 *
 * // Functions with custom properties are frozen
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

import { isArray, isFunction, isObject } from "./index.js";


/**
 * Symbol used to tag objects that have been made immutable.
 *
 * This allows for efficient idempotency checking - if an object has this symbol,
 * we know it was already processed by immutable() and is deeply frozen.
 */
const Immutable = Symbol("immutable");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Deep readonly type.
 *
 * Recursively makes all properties readonly while preserving type structure:
 *
 * - Functions are preserved unchanged
 * - Arrays become {@link !ReadonlyArray} with deep readonly elements
 * - Objects have readonly properties with deep readonly values
 * - Primitives are preserved unchanged
 *
 * @typeParam T The type to make deeply readonly
 */
export type Immutable<T> = T extends Function ? T : {

	readonly [K in keyof T]:

	T[K] extends Function ? T[K] :
		T[K] extends (infer U)[] ? ReadonlyArray<Immutable<U>> :
			T[K] extends object ? Immutable<T[K]> :
				T[K];

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks deep object equality.
 *
 * Object pairs are deeply equal if they contain:
 *
 * - two {@link isObject plain objects} with deeply equal entry sets
 * - two {@link isArray arrays} with pairwise deeply equal items
 * - two values otherwise equal according to {@link !Object.is}
 *
 * @param x The target object to be checked for equality
 * @param y The reference object to be checked for equality
 *
 * @returns `true` if `x` and `y` are deeply equal; `false` otherwise
 *
 * @throws {RangeError} Stack overflow when `x` or `y` contains circular references
 *
 * @remarks
 *
 * **Circular references are not supported**. Do not pass objects with cycles.
 */
export function equals(x: unknown, y: unknown): boolean {

	function arrayEquals(x: unknown[], y: typeof x) {
		return x.length === y.length && x.every((value, index) => equals(value, y[index]));
	}

	function objectEquals(x: { [s: string | number | symbol]: unknown }, y: typeof x) {

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);

		return xKeys.length !== yKeys.length ? false
			: xKeys.every(key => key in y && equals(x[key], y[key]));
	}

	return isArray(x) ? isArray(y) && arrayEquals(x, y)
		: isObject(x) ? isObject(y) && objectEquals(x, y)
			: Object.is(x, y);
}

/**
 * Creates an immutable deep clone.
 *
 * Plain objects, arrays, and functions with custom properties are recursively cloned
 * and frozen. Functions without custom properties are returned as-is. Other object types
 * (`Date`, `RegExp`, `Buffer`, etc.) are returned as-is to preserve their functionality.
 *
 * @typeParam T The type of the value to be cloned
 *
 * @param value The value to make immutable
 *
 * @returns A deeply immutable clone of `value` with type {@link Immutable}
 *
 * @throws {RangeError} Stack overflow when `value` contains circular references
 *
 * @remarks
 *
 * - **Circular references are not supported**. Do not pass objects with cycles.
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
export function immutable<T>(value: T): Immutable<T> {

	return isFunction(value) ? freeze(value, value)
		: isArray(value) ? freeze(value, [])
			: isObject(value) ? freeze(value, {})
				: value as Immutable<T>;


	/**
	 * Recursively freezes a value by copying properties to an accumulator.
	 *
	 * @param value The source value to freeze (object, array, or function)
	 * @param accumulator The target object to receive frozen properties
	 *
	 * @returns The frozen accumulator with type {@link Immutable}
	 *
	 * @remarks
	 *
	 * Property descriptors omit `writable` and `configurable` attributes since
	 * `Object.freeze()` will make all properties non-writable and non-configurable.
	 */
	function freeze(value: T & object, accumulator: {}): Immutable<T> {

		if ( Immutable in value ) {

			return value as Immutable<T>;

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

			return Object.freeze(accumulator) as Immutable<T>;

		}

	}

}
