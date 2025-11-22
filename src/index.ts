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
 * Runtime/value type guards, safe casts, deep equality and immutability, error utilities.
 *
 * @groupDescription Runtime Guards
 *
 * Type guards for runtime JavaScript types and protocols.
 *
 * ```typescript
 * import { isDefined, isEmpty, isFunction, isPromise, isIterable } from '@metreeca/core';
 *
 * if (isDefined<T>(value)) {
 *   // value is T
 * }
 * and define T
 *
 * isEmpty({}); // true
 * isEmpty([]); // true
 *
 * isFunction(() => {}); // true
 * isPromise(Promise.resolve(42)); // true
 * isIterable([1, 2, 3]); // true
 * ```
 *
 * @groupDescription Value Guards
 *
 * Type guards for JSON-like values and data structures.
 *
 * ```typescript
 * import { isBoolean, isNumber, isString, isObject, isArray } from '@metreeca/core';
 *
 * isBoolean(true); // true
 * isNumber(42); // true (excludes NaN, Infinity)
 * isString('hello'); // true
 *
 * isObject({ a: 1 }); // true
 * isObject(new Date()); // false
 *
 * isArray([1, 2, 3], isNumber); // true
 * isArray([1, 'two'], isNumber); // false
 * ```
 *
 * @groupDescription Value Casts
 *
 * Safe casts for JSON-like primitive values and data structures, returning `undefined` instead of throwing.
 *
 * ```typescript
 * import { asNumber, asString, asObject, asArray } from '@metreeca/core';
 *
 * asNumber(42); // 42
 * asNumber('42'); // undefined
 * ```
 *
 * @groupDescription Structural Utilities
 *
 * Deep operations on complex types.
 *
 * ```typescript
 * import { equals, immutable } from '@metreeca/core';
 *
 * equals({ a: [1, 2] }, { a: [1, 2] }); // true
 * immutable({ a: [1, 2, 3] }); // deep frozen
 * ```
 *
 * @module index
 */


//// Runtime Guards ////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is not `undefined` or `null`.
 *
 * @group Runtime Guards
 *
 * @typeParam T The type when the value is defined
 *
 * @returns `true` if the value is neither `undefined` nor `null`
 */
export function isDefined<T>(value: undefined | null | T): value is T {
	return value !== undefined && value !== null;
}

/**
 * Checks if a value is an empty plain object or an empty array.
 *
 * @group Runtime Guards
 *
 * @returns `true` if the value is an empty array or an empty plain object
 */
export function isEmpty(value: unknown): value is Record<PropertyKey, never> | [] {
	return isArray(value) ? value.length === 0
		: isObject(value) ? Object.keys(value).length === 0
			: false;
}

/**
 * Checks if a value is a symbol.
 *
 * @group Runtime Guards
 *
 * @returns `true` if the value is a symbol
 */
export function isSymbol(value: unknown): value is Symbol {
	return typeof value === "symbol";
}

/**
 * Checks if a value is a function.
 *
 * @group Runtime Guards
 *
 * @returns `true` if the value is a function
 */
export function isFunction(value: unknown): value is Function {
	return typeof value === "function";
}

/**
 * Checks if a value is an Error instance.
 *
 * @group Runtime Guards
 *
 * @returns `true` if the value is an Error instance
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Checks if a value is a promise.
 *
 * @group Runtime Guards
 *
 * @typeParam T The type of the promised value
 *
 * @returns `true` if the value is a thenable object (has a `then` method)
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
	return value != null && typeof value === "object" && "then" in value && isFunction(value.then);
}

/**
 * Checks if a value is iterable.
 *
 * @group Runtime Guards
 *
 * @typeParam T The type of iterated values
 *
 * @returns `true` if the value implements the iterable protocol (has a `[Symbol.iterator]` method)
 */
export function isIterable<T = unknown>(value: unknown): value is Iterable<T> {
	return value != null && isFunction((value as { [Symbol.iterator]?: unknown })[Symbol.iterator]);
}

/**
 * Checks if a value is async iterable.
 *
 * @group Runtime Guards
 *
 * @typeParam T The type of iterated values
 *
 * @returns `true` if the value implements the async iterable protocol (has a `[Symbol.asyncIterator]` method)
 */
export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T> {
	return value != null && isFunction((value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator]);
}


//// Value Guards //////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a boolean.
 *
 * @group Value Guards
 *
 * @returns `true` if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 *
 * @group Value Guards
 *
 * @returns `true` if the value is a finite number
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @group Value Guards
 *
 * @returns `true` if the value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is a plain object.
 *
 * A plain object is one created by the Object constructor (or object literal syntax),
 * with Object.prototype as its direct prototype. This excludes built-in objects like
 * Date, RegExp, Array, Buffer, DOM elements, and objects created with custom constructors.
 *
 * This strict definition ensures safe operations like deep cloning, serialization,
 * and property enumeration that assume simple key-value structure without special
 * behavior or internal state.
 *
 * @group Value Guards
 *
 * @typeParam K The type of property keys
 * @typeParam V The type of property values
 *
 * @returns `true` if the value is a plain object
 *
 * @see https://stackoverflow.com/a/52694022/739773
 */
export function isObject<K extends PropertyKey = PropertyKey, V = unknown>(value: unknown): value is Record<K, V> {
	if ( value === null || value === undefined || typeof value !== "object" ) {

		return false;

	} else {

		const proto = Object.getPrototypeOf(value);

		return proto === Object.prototype || proto === null;

	}
}

/**
 * Checks if a value is an array.
 *
 * @group Value Guards
 *
 * @typeParam T The type of array elements
 *
 * @param value The value to check
 * @param is Optional type guard to validate array elements
 *
 * @returns `true` if the value is an array. Empty arrays return `true` even when an element type guard is provided.
 */
export function isArray<T = unknown>(value: unknown, is?: (value: unknown) => value is T): value is T[] {
	return Array.isArray(value) && (is === undefined || value.every(is));
}


//// Value Casts ///////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves a value as a boolean if it is one, otherwise returns `undefined`.
 *
 * @group Value Casts
 *
 * @param value The value to check
 *
 * @returns The value if it is a boolean, `undefined` otherwise
 */
export function asBoolean(value: unknown): undefined | boolean {
	return isBoolean(value) ? value : undefined;
}

/**
 * Retrieves a value as a number if it is one, otherwise returns `undefined`.
 *
 * @group Value Casts
 *
 * @param value The value to check
 *
 * @returns The value if it is a finite number, `undefined` otherwise
 */
export function asNumber(value: unknown): undefined | number {
	return isNumber(value) ? value : undefined;
}

/**
 * Retrieves a value as a string if it is one, otherwise returns `undefined`.
 *
 * @group Value Casts
 *
 * @param value The value to check
 *
 * @returns The value if it is a string, `undefined` otherwise
 */
export function asString(value: unknown): undefined | string {
	return isString(value) ? value : undefined;
}

/**
 * Retrieves a value as a plain object if it is one, otherwise returns `undefined`.
 *
 * @group Value Casts
 *
 * @typeParam K The type of property keys
 * @typeParam V The type of property values
 *
 * @param value The value to check
 *
 * @returns The value if it is a plain object, `undefined` otherwise
 */
export function asObject<K extends PropertyKey = PropertyKey, V = unknown>(value: unknown): undefined | Record<K, V> {
	return isObject<K, V>(value) ? value : undefined;
}

/**
 * Retrieves a value as an array if it is one, otherwise returns `undefined`.
 *
 * @group Value Casts
 *
 * @typeParam T The type of array elements
 *
 * @param value The value to check
 * @param is Optional type guard to validate array elements
 *
 * @returns The value if it is an array (with validated elements if `is` provided), `undefined` otherwise
 */
export function asArray<T = unknown>(value: unknown, is?: (value: unknown) => value is T): undefined | T[] {
	return isArray<T>(value, is) ? value : undefined;
}


//// Structural Utilities //////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks deep object equality.
 *
 * Object pairs are deeply equal if they contain:
 *
 * - two equal primitive values or two equal functions
 * - two {@link isObject plain objects} with deeply equal entry sets
 * - two {@link isArray arrays} with pairwise deeply equal items
 *
 * @group Structural Utilities
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

	function objectEquals(x: { [s: string | number | symbol]: unknown }, y: typeof x) {

		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);

		return xKeys.length !== yKeys.length ? false
			: xKeys.every(key => key in y && equals(x[key], y[key]));
	}

	function arrayEquals(x: unknown[], y: typeof x) {
		return x.length === y.length && x.every((value, index) => equals(value, y[index]));
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
 * @group Structural Utilities
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


//// Error Utilities ///////////////////////////////////////////////////////////////////////////////////////////////////
