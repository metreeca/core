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
 * Type guards and safe casts.
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
 * @module index
 *
 * @groupDescription JSON Guards
 *
 * Type guards for JSON values and data structures.
 *
 * ```typescript
 * import { isBoolean, isNumber, isString, isObject, isArray, isJSON } from '@metreeca/core';
 *
 * isJSON({ a: [1, 2], b: "test" }); // true
 * isJSON({ a: new Date() }); // false
 *
 * isBoolean(true); // true
 * isNumber(42); // true (excludes NaN, Infinity)
 * isString('hello'); // true
 *
 * isArray([1, 2, 3], isNumber); // true
 * isArray([1, 'two'], isNumber); // false
 *
 * isObject({ a: 1 }); // true
 * isObject(new Date()); // false
 * ```
 *
 * @groupDescription JSON Casts
 *
 * Safe casts for JSON primitive values and data structures, returning `undefined` instead of throwing.
 *
 * ```typescript
 * import { asNumber, asString, asObject, asArray, asJSON } from '@metreeca/core';
 *
 * asJSON({ a: 1 }); // { a: 1 }
 * asJSON({ a: new Date() }); // undefined
 *
 * asNumber(42); // 42
 * asNumber('42'); // undefined
 * ```
 */


/**
 * Immutable JSON value.
 *
 * Represents deeply immutable JSON-compatible structures.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8259
 */
export type JSONValue =
	| null
	| boolean
	| number
	| string
	| readonly JSONValue[]
	| { readonly [name: string]: JSONValue }


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
 * Checks if a value is a valid JSON value.
 *
 * Recursively validates that the value and all nested structures conform to the {@link JSONValue} type,
 * which includes `null`, booleans, finite numbers, strings, arrays of JSON values, and plain objects
 * with string keys and JSON values.
 *
 * @group JSON Guards
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a valid JSON structure
 */
export function isJSON(value: unknown): value is JSONValue {
	return value === null ? true
		: isBoolean(value) || isNumber(value) || isString(value) ? true
			: Array.isArray(value) ? value.every(isJSON)
				: isObject(value) ? Object.values(value).every(isJSON)
					: false;
}

/**
 * Checks if a value is a boolean.
 *
 * @group JSON Guards
 *
 * @returns `true` if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 *
 * @group JSON Guards
 *
 * @returns `true` if the value is a finite number
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @group JSON Guards
 *
 * @returns `true` if the value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is an array.
 *
 * @group JSON Guards
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

/**
 * Checks if a value is a plain object.
 *
 * A plain object is one created by the Object constructor (or object literal syntax),
 * with `Object.prototype` as its direct prototype. This excludes built-in objects like
 * Date, RegExp, Array, Buffer, DOM elements, and objects created with custom constructors.
 *
 * This strict definition ensures safe operations like deep cloning, serialization,
 * and property enumeration that assume simple key-value structure without special
 * behavior or internal state.
 *
 * @group JSON Guards
 *
 * @typeParam K The type of property keys
 * @typeParam V The type of property values
 *
 * @returns `true` if the value is a plain object
 *
 * @see https://stackoverflow.com/a/52694022/739773
 */
export function isObject<K extends PropertyKey = PropertyKey, V = unknown>(value: unknown): value is Record<K, V> {
	if ( value === undefined || value === null || typeof value !== "object" ) {

		return false;

	} else {

		return Object.getPrototypeOf(value) === Object.prototype;

	}
}



//// Value Casts ///////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves a value as a JSON value if it is one, otherwise returns `undefined`.
 *
 * Uses {@link isJSON} to validate the value and all nested structures.
 *
 * @group JSON Casts
 *
 * @param value The value to check
 *
 * @returns The value if it is a valid JSON structure, `undefined` otherwise
 */
export function asJSON(value: unknown): undefined | JSONValue {
	return isJSON(value) ? value : undefined;
}

/**
 * Retrieves a value as a boolean if it is one, otherwise returns `undefined`.
 *
 * @group JSON Casts
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
 * @group JSON Casts
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
 * @group JSON Casts
 *
 * @param value The value to check
 *
 * @returns The value if it is a string, `undefined` otherwise
 */
export function asString(value: unknown): undefined | string {
	return isString(value) ? value : undefined;
}

/**
 * Retrieves a value as an array if it is one, otherwise returns `undefined`.
 *
 * @group JSON Casts
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

/**
 * Retrieves a value as a plain object if it is one, otherwise returns `undefined`.
 *
 * @group JSON Casts
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
