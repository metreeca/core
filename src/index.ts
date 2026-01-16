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
 * Core utility types and type guards.
 *
 * Provides primitive type guards for runtime type checking with compile-time narrowing.
 *
 * ```typescript
 * isDefined("value"); // true
 * isIdentifier("myVar"); // true (valid ECMAScript identifier)
 * isSymbol(Symbol("key")); // true
 * isFunction(() => {}); // true
 * isError(new Error()); // true
 * isRegExp(/pattern/); // true
 * isDate(new Date()); // true
 * isPromise(Promise.resolve()); // true
 * isIterable([1, 2, 3]); // true
 * isAsyncIterable(asyncGenerator()); // true
 *
 * isValue({ a: [1, 2], b: "test" }); // true (JSON value)
 *
 * isNull(null); // true
 * isBoolean(true); // true
 * isNumber(42); // true
 * isString("hello"); // true
 *
 * isArray([1, 2, 3]); // true
 * isArray([1, 2, 3], isNumber); // with element predicate
 * isArray(["hello", 42], [isString, isNumber]); // with tuple template
 * isArray([], []); // empty array check
 *
 * isObject({ a: 1 }); // true
 * isObject({ a: 1 }, isNumber); // with entry predicate
 * isObject({ a: 1 }, { a: isNumber }); // with closed template
 * isObject({ a: 1 }, { a: isNumber, [key]: isAny}); // with open template
 * isObject({ a: 1 }, { a: isNumber, b: v => isOptional(v, isString) }); // with optional field
 * isObject({ kind: "circle" }, { kind: v => isLiteral(v, ["circle", "square"]) }); // with literal field
 * isObject({}, {}); // empty object check
 *
 * isOptional(undefined, isString); // true
 * isOptional("hello", isString); // true
 *
 * isLiteral("foo", "foo"); // true
 * isLiteral("foo", ["foo", "bar", "baz"]); // true (matches any)
 *
 * isAny("test"); // true (no guards, always succeeds)
 * isAny("test", [isString, isNumber]); // true (matches isString)
 * isAny(42, [isString, isNumber]); // true (matches isNumber)
 * ```
 *
 * @module index
 */


/**
 * Regular expression for validating ECMAScript {@link Identifier} names.
 *
 * Matches strings following ECMAScript IdentifierName syntax with full Unicode support.
 *
 * @see {@link https://tc39.es/ecma262/#prod-IdentifierName ECMAScript IdentifierName}
 * @see {@link https://www.unicode.org/reports/tr31/ UAX #31: Unicode Identifiers and Syntax}
 */
const IdentifierPattern = /^[_$\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wildcard symbol for open template validation in {@link isObject}.
 *
 * When used as a key in a template object, specifies the predicate for properties not explicitly listed.
 * Templates without this symbol are closed and reject extra properties.
 */
export const key: unique symbol = Symbol("*");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * ECMAScript Identifier.
 *
 * A string matching ECMAScript IdentifierName syntax:
 *
 * ```js
 * /^[_$\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u
 * ```
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isIdentifier}.
 *
 * @see [ECMAScript® 2024 - §12.7 Names and Keywords](https://262.ecma-international.org/15.0/#sec-names-and-keywords)
 */
export type Identifier =
	string


/**
 * Immutable JSON value.
 *
 * Represents deeply immutable JSON-compatible structures.
 *
 * @see [RFC 8259 - The JavaScript Object Notation (JSON) Data Interchange
 *     Format](https://datatracker.ietf.org/doc/html/rfc8259)
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
 * A value or a readonly array of values.
 *
 * Enables APIs to accept either a single value or multiple values uniformly.
 *
 * @typeParam T The type of the value(s)
 */
export type Some<T> =
	| T
	| readonly T[]

/**
 * A value or a function returning a value.
 *
 * Enables deferred evaluation, allowing values to be computed on demand rather than upfront.
 *
 * @typeParam T The type of the value
 */
export type Lazy<T> =
	| T
	| (() => T);


/**
 * A type guard function.
 */
export type Guard<T = unknown> =
	(value: unknown) => value is T;

/**
 * Extracts the guarded type from an array of type guards.
 */
export type Guarded<G> =
	G extends readonly Guard<infer T>[] ? T : never;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is not `undefined`.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is not `undefined`
 */
export function isDefined(value: unknown): boolean {
	return value !== undefined;
}

/**
 * Checks if a value is a valid {@link Identifier}.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a valid ECMAScript IdentifierName
 */
export function isIdentifier(value: unknown): value is Identifier {
	return typeof value === "string" && IdentifierPattern.test(value);
}

/**
 * Checks if a value is a symbol.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a symbol
 */
export function isSymbol(value: unknown): value is Symbol {
	return typeof value === "symbol";
}

/**
 * Checks if a value is a function.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a function
 */
export function isFunction(value: unknown): value is Function {
	return typeof value === "function";
}

/**
 * Checks if a value is an Error instance.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is an Error instance
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Checks if a value is a RegExp instance.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a RegExp instance
 */
export function isRegExp(value: unknown): value is RegExp {
	return value instanceof RegExp;
}

/**
 * Checks if a value is a Date instance.
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a Date instance
 */
export function isDate(value: unknown): value is Date {
	return value instanceof Date;
}

/**
 * Checks if a value is a promise.
 *
 * @typeParam T The type of the promised value
 *
 * @param value The value to check
 *
 * @returns `true` if the value is a thenable object (has a `then` method)
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
	return value != null && typeof value === "object" && "then" in value && isFunction(value.then);
}

/**
 * Checks if a value is iterable.
 *
 * @typeParam T The type of iterated values
 *
 * @param value The value to check
 *
 * @returns `true` if the value implements the iterable protocol (has a `[Symbol.iterator]` method)
 */
export function isIterable<T = unknown>(value: unknown): value is Iterable<T> {
	return value != null && isFunction((value as { [Symbol.iterator]?: unknown })[Symbol.iterator]);
}

/**
 * Checks if a value is async iterable.
 *
 * @typeParam T The type of iterated values
 *
 * @param value The value to check
 *
 * @returns `true` if the value implements the async iterable protocol (has a `[Symbol.asyncIterator]` method)
 */
export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T> {
	return value != null && isFunction((value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator]);
}


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
 * - **Tuple template**: validates each element against a corresponding predicate function
 *
 * @typeParam T The type of array elements
 *
 * @param value The value to check
 * @param is Optional element predicate or tuple template:
 *   - As function: validates all elements; receives the element value and its index
 *   - As array: validates as tuple; each element must match the corresponding predicate
 *
 * @returns `true` if the value is an array matching the validation criteria
 *
 * @remarks
 *
 * The type parameter `T` is intentionally not restricted to JSON values, allowing this function to serve as a
 * general-purpose array guard beyond JSON validation.
 *
 * The predicate signature `(value, index)` places value before index to match the object guard pattern and
 * enable direct use of value guards like `isString` without wrapper lambdas.
 *
 * Tuple templates require exact length match.
 */
export function isArray<T = unknown>(
	value: unknown,
	is?: ((value: unknown, index: number) => boolean) | readonly ((value: unknown, index: number) => boolean)[]
): value is T[] {

	return Array.isArray(value)
		&& matches(value);


	function matches(value: unknown[]): boolean {

		if ( typeof is === "function" ) {

			return value.every((v, i) => is(v, i));

		} else if ( is !== undefined ) {

			return value.length === is.length && is.every((t, i) => t(value[i], i));

		} else {

			return true;

		}

	}

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
 * - **Template**: validates each property against a corresponding predicate function
 *
 * Templates are closed by default: extra properties not in the template are rejected.
 * Use the {@link key} symbol as wildcard to create open templates where extra properties
 * are validated by the wildcard predicate.
 *
 * ```typescript
 * isObject(value, { x: isNumber, y: isNumber }); // closed
 * isObject(value, { x: isNumber, [key]: () => true }); // open, accept any extra
 * isObject(value, { x: isNumber, [key]: isNumber }); // open, extras must be numbers
 * ```
 *
 * @typeParam T The expected object type, defaults to `Record<PropertyKey, unknown>`
 *
 * @param value The value to check
 * @param is Optional predicate or template to validate entries
 *
 * @returns `true` if the value is a plain object matching the validation.
 *
 * @remarks
 *
 * The type parameter `T` is intentionally not restricted to JSON-compatible types, allowing this
 * function to serve as a general-purpose plain object guard beyond JSON validation.
 *
 * The predicate signature `(value, key)` places value before key to match the array guard pattern and
 * enable direct use of value guards like `isString` without wrapper lambdas.
 */
export function isObject<T extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>>(
	value: unknown,
	is?: ((value: unknown, key: string) => boolean) | {
		[key: string]: (value: unknown, key: string) => boolean;
		[key]?: (value: unknown, key: string) => boolean
	}
): value is T {

	return value !== null
		&& typeof value === "object"
		&& Object.getPrototypeOf(value) === Object.prototype
		&& matches(value as Record<string, unknown>);


	function matches(value: Record<string, unknown>): boolean {

		if ( typeof is === "function" ) {

			return Object.entries(value).every(([k, v]) => is(v, k));

		} else if ( is !== undefined ) {

			const keys = Object.keys(is);
			const wild = is[key];

			if ( !wild && keys.length === 0 ) { // closed empty template: value must be empty

				return Object.keys(value).length === 0;

			} else {

				return keys.every(k => is[k](value[k], k)) // template → value
					&& Object.keys(value).every(k => k in is || wild?.(value[k], k)); // value → template

			}

		} else {

			return true;

		}

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is either `undefined` or satisfies a type guard.
 *
 * @typeParam T The type validated by the type guard
 *
 * @param value The value to check
 * @param is A type guard function to validate the value if it is not `undefined`
 *
 * @returns `true` if the value is `undefined` or satisfies the type guard
 */
export function isOptional<T>(value: unknown, is: Guard<T>): value is undefined | T {

	return value === undefined || is(value);

}

/**
 * Checks if a value matches one of the specified literal values.
 *
 * @typeParam T The literal type (boolean, number, or string)
 *
 * @param value The value to check
 * @param values A single literal value or an array of literal values to match against
 *
 * @returns `true` if the value strictly equals one of the specified literals
 */
export function isLiteral<T extends boolean | number | string>(value: unknown, values: Some<T>): value is T {

	return Array.isArray(values)
		? values.includes(value)
		: value === values;

}

/**
 * Checks if a value satisfies any of the provided type guards.
 *
 * @param value The value to check
 * @param guards Optional array of type guards to validate against
 *
 * @returns `true` if no guards are provided, or if the value satisfies at least one guard
 *
 * @remarks
 *
 * When no guards are provided, always succeeds and narrows to `unknown`.
 * When guards are provided, the value is narrowed to the union of guarded types.
 *
 * Without guards, can be used as a wildcard in {@link isObject} open templates:
 *
 * ```typescript
 * isObject(value, { required: isString, [key]: isAny }); // accept any extra properties
 * ```
 */
export function isAny(value: unknown): value is unknown;
export function isAny<G extends readonly Guard[]>(value: unknown, guards: G): value is Guarded<G>;
export function isAny(value: unknown, guards?: readonly ((value: unknown) => boolean)[]): boolean {

	return guards === undefined ? true
		: guards.some(guard => guard(value));

}
