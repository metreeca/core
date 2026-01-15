/*
 * Copyright © 2026 Metreeca srl
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
 * Type guards and validating casts for JSON values.
 *
 * Provides predicates to validate and narrow values to JSON-compatible types, and validating casts that return the
 * value or throw on type mismatch.
 *
 * ```typescript
 * import { isValue, isBoolean, isNumber, isString, isArray, isObject, key, union } from '@metreeca/core/json';
 *
 * isValue({ a: [1, 2], b: "test" }); // true
 *
 * isBoolean(true); // true
 * isNumber(42); // true
 * isString("hello"); // true
 *
 * isArray([1, 2, 3]); // true
 * isArray([1, 2, 3], isNumber); // with element predicate
 * isArray(["hello", 42], [isString, isNumber]); // with tuple template
 *
 * isObject({ a: 1 }); // true
 * isObject({ a: 1 }, (v) => isNumber(v)); // with entry predicate
 * isObject({ a: 1 }, { a: isNumber }); // with closed template
 * isObject({ a: 1 }, { a: isNumber, [key]: true }); // with open template
 * isObject({ a: 1 }, { a: isNumber, b: union(undefined, isString) }); // with optional field
 *
 * union(isString, isNumber); // combined type guard
 * intersection(isString, (v) => v.length > 0); // refined type guard
 * ```
 *
 * @see [RFC 8259 - The JavaScript Object Notation (JSON) Data Interchange
 *     Format](https://datatracker.ietf.org/doc/html/rfc8259)
 *
 * @module json
 */


/**
 * Wildcard symbol for open template validation in {@link isObject}.
 *
 * When used as a key in a template object, specifies the predicate for properties not explicitly listed.
 * Templates without this symbol are closed and reject extra properties.
 */
export const key: unique symbol = Symbol("key");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


/**
 * Extracts the union of guarded types from an array of guards.
 *
 * For type guard functions, extracts the guarded type; for literal values, uses the value type.
 *
 * @typeParam G - Array of type guards or literal values
 */
export type Union<G extends unknown[]> =
	G[number] extends (value: unknown) => value is infer T ? T : G[number];

/**
 * Extracts the intersection of guarded types from an array of guards.
 *
 * For type guard functions, extracts the guarded type; for literal values, uses the value type.
 *
 * @typeParam G - Array of type guards or literal values
 */
export type Intersection<G extends unknown[]> =
	(G[number] extends (v: unknown) => v is infer T ? T : G[number]) extends infer U
		? (U extends U ? (k: U) => void : never) extends (k: infer I) => void ? I : never
		: never;


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

	return isNull(value)
		|| isBoolean(value)
		|| isNumber(value)
		|| isString(value)
		|| isArray(value, isValue)
		|| isObject(value, isValue);

}

/**
 * Checks if a value is a scalar.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a boolean, number, or string
 */
export function isScalar(value: unknown): value is boolean | number | string {

	return isBoolean(value)
		|| isNumber(value)
		|| isString(value);

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
 * Supports two validation modes:
 *
 * - **Element predicate**: validates all elements with a single predicate function
 * - **Tuple template**: validates each element against a corresponding guard or literal value
 *
 * @typeParam T The type of array elements
 *
 * @param value The value to check
 * @param is Optional element predicate or tuple template:
 *   - As function: validates all elements; receives the element value and its index
 *   - As array: validates as tuple; each element must match the corresponding guard or literal
 *
 * @returns `true` if the value is an array matching the validation criteria
 *
 * @remarks
 *
 * The type parameter `T` is intentionally not restricted to JSON values, allowing this function to serve as a
 * general-purpose array guard beyond JSON validation.
 *
 * Tuple templates require exact length match. Use `union(undefined, predicate)` for optional elements.
 */
export function isArray<T = unknown>(
	value: unknown,
	is?: ((value: T, index: number) => boolean) | readonly (unknown | ((value: unknown) => boolean))[]
): value is T[] {

	return Array.isArray(value) && (

		is === undefined ? true

			: typeof is === "function" ? value.every(is)

				: value.length === is.length && is.every((t, i) =>
				typeof t === "function" ? t(value[i]) : value[i] === t
			)

	);

}

/**
 * Checks if a value is a plain object.
 *
 * A plain object is one created by the Object constructor (or object literal syntax),
 * with `Object.prototype` as its direct prototype. This excludes built-in objects like
 * Date, RegExp, Array, Buffer, DOM elements, and objects created with custom constructors.
 *
 * Supports two validation modes:
 *
 * - **Predicate**: A `(value, key) => boolean` function called for each entry
 * - **Template**: An object specifying validation rules per property:
 *   - Literal values matched with `===`
 *   - Functions called as predicates
 *
 * Templates are closed by default: extra properties not in the template are rejected.
 * Use the {@link key} symbol as wildcard to create open templates where extra properties
 * are validated by the wildcard value (`true` to accept, `false` to reject, or a predicate).
 *
 * ```typescript
 * isObject(value, { kind: "circle", x: isNumber, y: isNumber }); // closed
 * isObject(value, { kind: "circle", [key]: true }); // open, accept any extra
 * isObject(value, { kind: "circle", [key]: isNumber }); // open, extras must be numbers
 * ```
 *
 * @typeParam T The expected object type, defaults to `Record<PropertyKey, unknown>`
 *
 * @param value The value to check
 * @param is Optional predicate or template to validate entries
 *
 * @returns `true` if the value is a plain object matching the validation. Empty objects return `true`.
 *
 * @remarks
 *
 * The type parameter `T` is intentionally not restricted to JSON-compatible types, allowing this
 * function to serve as a general-purpose plain object guard beyond JSON validation.
 */
export function isObject<T extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>>(
	value: unknown,
	is?: ((value: T[string], key: string) => boolean) | {
		[key: string]: unknown | ((value: unknown) => boolean);
		[key]?: boolean | ((value: unknown) => boolean)
	}
): value is T {

	return value !== undefined
		&& value !== null
		&& typeof value === "object"
		&& Object.getPrototypeOf(value) === Object.prototype
		&& matches(value as Record<string, unknown>);


	function matches(value: Record<string, unknown>): boolean {

		if ( typeof is === "function" ) {

			return Object.entries(value).every(([k, v]) => is(v as T[string], k));

		} else if ( is !== undefined ) {

			const wildcard = is[key] ?? false;

			return Object.entries(is).every(([k, t]) => { // template → value

				return typeof t === "function" ? t(value[k]) : value[k] === t;

			}) && Object.entries(value).every(([k, v]) => { // value → template

				return k in is || (typeof wildcard === "function" ? wildcard(v) : wildcard);

			});

		} else {

			return true;

		}

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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a type guard that matches any of the provided guards.
 *
 * Guards can be type guard functions or literal values for equality checking.
 *
 * @example
 * ```typescript
 * const isStringOrNumber = union(isString, isNumber);
 * const isStatus = union("pending", "done");
 * const isOptionalNumber = union(undefined, isNumber);
 * ```
 *
 * @param guards - Type guards or literal values to match
 *
 * @returns A type guard matching the union of all guard types
 */
export function union<const G extends unknown[]>(...guards: G): (value: unknown) => value is Union<G> {

	return (value: unknown): value is Union<G> => guards.some(guard =>
		typeof guard === "function" ? guard(value) : value === guard
	);

}

/**
 * Creates a type guard that matches all the provided guards.
 *
 * Guards can be type guard functions or literal values for equality checking.
 *
 * @example
 * ```typescript
 * const isNonEmptyString = intersection(isString, (v) => v.length > 0);
 * ```
 *
 * @param guards - Type guards or literal values to match
 *
 * @returns A type guard matching the intersection of all guard types
 */
export function intersection<const G extends unknown[]>(...guards: G): (value: unknown) => value is Intersection<G> {

	return (value: unknown): value is Intersection<G> => guards.every(guard =>
		typeof guard === "function" ? guard(value) : value === guard
	);

}
