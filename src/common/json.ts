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
 * Type guards for JSON values.
 *
 * Provides predicates to validate and narrow values to JSON-compatible types,
 * supporting safe operations on serializable data.
 *
 * ```typescript
 * import { isBoolean, isNumber, isString, isScalar, isObject, isArray, isEmpty, isJSON } from '@metreeca/core';
 *
 * isValue({ a: [1, 2], b: "test" }); // true
 * isValue({ a: new Date() }); // false
 *
 * isScalar(42); // true
 * isScalar([1, 2]); // false
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
 *
 * isEmpty([]); // true
 * isEmpty({ a: 1 }); // false
 * ```
 *
 * @see [RFC 8259 - The JavaScript Object Notation (JSON) Data Interchange
 *     Format](https://datatracker.ietf.org/doc/html/rfc8259)
 *
 * @module json
 */


/**
 * Immutable JSON value.
 *
 * Represents deeply immutable JSON-compatible structures.
 */
export type Value =
	| null
	| boolean
	| number
	| string
	| Array
	| Object

/**
 * Immutable JSON array.
 *
 * Represents an immutable sequence of JSON values.
 */
export type Array =
	readonly Value[];

/**
 * Immutable JSON object.
 *
 * Represents an immutable key-value mapping with string keys and JSON values.
 */
export type Object =
	{ readonly [name: string]: Value };


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid JSON value.
 *
 * Recursively validates that the value and all nested structures conform to the {@link Value} type,
 * which includes `null`, booleans, finite numbers, strings, arrays of JSON values, and plain objects
 * with string keys and JSON values.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a valid JSON structure
 */
export function isValue(value: unknown): value is Value {
	return value === null ? true
		: isBoolean(value) || isNumber(value) || isString(value) ? true
			: Array.isArray(value) ? value.every(isValue)
				: isObject(value) ? Object.values(value).every(isValue)
					: false;
}

/**
 * Checks if a value is a scalar.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a boolean, number, or string
 */
export function isScalar(value: unknown): value is boolean | number | string {
	return isBoolean(value) || isNumber(value) || isString(value);
}


/**
 * Checks if a value is `null`.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is `null`
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Checks if a value is a boolean.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a finite number
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is an array.
 *
 * @typeParam T The type of array elements
 *
 * @param value The value to check
 * @param is Optional type guard to validate array elements
 *
 * @returns `true` if the value is an array. Empty arrays return `true` even when an element type guard is provided.
 *
 * @remarks
 *
 * The type parameter `T` is intentionally not restricted to JSON values, allowing this function to serve as a
 * general-purpose array guard beyond JSON validation.
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
 * @typeParam K The type of property keys
 * @typeParam V The type of property values
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a plain object
 *
 * @remarks
 *
 * The type parameters `K` and `V` are intentionally not restricted to JSON-compatible types, allowing this
 * function to serve as a general-purpose plain object guard beyond JSON validation.
 */
export function isObject<K extends PropertyKey = PropertyKey, V = unknown>(value: unknown): value is Record<K, V> {
	if ( value === undefined || value === null || typeof value !== "object" ) {

		return false;

	} else {

		return Object.getPrototypeOf(value) === Object.prototype;

	}
}


/**
 * Checks if a value is an empty plain object or an empty array.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is an empty array or an empty plain object
 */
export function isEmpty(value: unknown): value is Record<PropertyKey, never> | [] {
	return isArray(value) ? value.length === 0
		: isObject(value) ? Object.keys(value).length === 0
			: false;
}
