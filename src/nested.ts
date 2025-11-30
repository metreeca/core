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
 * @remarks
 *
 * This function does not handle circular references and will cause
 * infinite recursion leading to a stack overflow if the inputs contain cycles.
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
 * (Date, RegExp, Buffer, etc.) are returned as-is to preserve their functionality.
 *
 * @typeParam T The type of the value to be cloned
 *
 * @param value The value to make immutable
 *
 * @returns A deeply immutable clone of `value`
 *
 * @remarks
 *
 * This function does not handle circular references and will cause
 * infinite recursion leading to a stack overflow if the input contains cycles.
 *
 * For functions with custom properties, built-in read-only properties (`length`, `name`, `prototype`)
 * are preserved unchanged while custom writable properties are frozen recursively.
 */
export function immutable<T>(value: T): T extends Function ? T : Readonly<T> {

	return isFunction(value) ? freeze(value, value)
		: isArray(value) ? freeze(value, [])
			: isObject(value) ? freeze(value, {})
				: value as T extends Function ? T : Readonly<T>;


	function freeze(value: T, accumulator: {}) {
		return Object.freeze(Reflect.ownKeys(value as object).reduce((object: any, key) => {

			const descriptor = Object.getOwnPropertyDescriptor(value, key);

			if ( descriptor && descriptor.writable !== false && descriptor.configurable !== false ) {

				object[key] = immutable((value as Record<PropertyKey, unknown>)[key]);

			}

			return object;

		}, accumulator));
	}

}
