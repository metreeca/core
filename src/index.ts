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
 * isObject({ value: 42 }, { value: v => isUnion(v, [isString, isNumber]) }); // with union field
 * isObject({}, {}); // empty object check
 *
 * isSome("hello", isString); // true (single value)
 * isSome(["hello", "world"], isString); // true (array of values)
 *
 * isLazy(() => 42, isNumber); // true (no-arg function)
 * isLazy(42, isNumber); // true (plain value)
 *
 * isAny("test"); // true (wildcard, always succeeds)
 *
 * isOptional(undefined, isString); // true
 * isOptional("hello", isString); // true
 *
 * isLiteral("foo", "foo"); // true
 * isLiteral("foo", ["foo", "bar", "baz"]); // true (matches any)
 *
 * isUnion("test", [isString, isNumber]); // true (matches isString)
 * isUnion(42, [isString, isNumber]); // true (matches isNumber)
 *
 * isIntersection({ a: 1 }, [isObject, v => isObject(v, { a: isNumber })]); // true (satisfies all)
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
 *
 * Defines the signature for functions that perform runtime type checking while providing compile-time type narrowing.
 * When the function returns `true`, TypeScript narrows the value to type `T` in subsequent code.
 *
 * @typeParam T The type that the guard narrows to, defaults to `unknown`
 */
export type Guard<T = unknown> =
	(value: unknown) => value is T;

/**
 * Extracts the guarded type from an array of type guards.
 *
 * Given an array of {@link Guard} functions, infers the union of all types they guard.
 * Useful for deriving the result type of union validation with {@link isUnion}.
 *
 * @typeParam G The array type containing type guards
 *
 * @see {@link isUnion} for validating values against multiple guards
 */
export type Union<G extends readonly Guard[]> =
	G extends readonly Guard<infer T>[] ? T : never;

/**
 * Extracts the intersection of guarded types from an array of type guards.
 *
 * Given an array of {@link Guard} functions, infers the intersection of all types they guard.
 * Useful for deriving the result type of intersection validation with {@link isIntersection}.
 *
 * @typeParam G The array type containing type guards
 *
 * @see {@link isIntersection} for validating values against all guards simultaneously
 */
export type Intersection<G extends readonly Guard[]> =
	Union<G> extends infer U
		? (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never
		: never;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is not `undefined`.
 *
 * @param value The value to check
 *
 * @returns True if the value is not `undefined`; false otherwise
 */
export function isDefined(value: unknown): boolean {
	return value !== undefined;
}

/**
 * Checks if a value is a valid {@link Identifier}.
 *
 * @param value The value to check
 *
 * @returns True if the value is a valid ECMAScript IdentifierName; false otherwise
 */
export function isIdentifier(value: unknown): value is Identifier {
	return typeof value === "string" && IdentifierPattern.test(value);
}

/**
 * Checks if a value is a symbol.
 *
 * @param value The value to check
 *
 * @returns True if the value is a symbol; false otherwise
 */
export function isSymbol(value: unknown): value is Symbol {
	return typeof value === "symbol";
}

/**
 * Checks if a value is a function.
 *
 * @param value The value to check
 *
 * @returns True if the value is a function; false otherwise
 */
export function isFunction(value: unknown): value is Function {
	return typeof value === "function";
}

/**
 * Checks if a value is an Error instance.
 *
 * @param value The value to check
 *
 * @returns True if the value is an Error instance; false otherwise
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Checks if a value is a RegExp instance.
 *
 * @param value The value to check
 *
 * @returns True if the value is a RegExp instance; false otherwise
 */
export function isRegExp(value: unknown): value is RegExp {
	return value instanceof RegExp;
}

/**
 * Checks if a value is a Date instance.
 *
 * @param value The value to check
 *
 * @returns True if the value is a Date instance; false otherwise
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
 * @returns True if the value is a thenable object (has a `then` method); false otherwise
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
 * @returns True if the value implements the iterable protocol (has a `[Symbol.iterator]` method); false otherwise
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
 * @returns True if the value implements the async iterable protocol (has a `[Symbol.asyncIterator]` method); false
 *     otherwise
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
 * @returns True if the value is a valid JSON structure; false otherwise
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
 * @returns True if the value is `null`; false otherwise
 */
export function isNull(value: unknown): value is null {

	return value === null;

}

/**
 * Checks if a value is a boolean.
 *
 * @param value The value to check
 *
 * @returns True if the value is a boolean; false otherwise
 */
export function isBoolean(value: unknown): value is boolean {

	return typeof value === "boolean";

}

/**
 * Checks if a value is a finite number.
 *
 * @param value The value to check
 *
 * @returns True if the value is a finite number; false otherwise
 */
export function isNumber(value: unknown): value is number {

	return Number.isFinite(value);

}

/**
 * Checks if a value is a string.
 *
 * @param value The value to check
 *
 * @returns True if the value is a string; false otherwise
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
 * @returns True if the value is an array matching the validation criteria; false otherwise
 *
 * Tuple templates require exact length match.
 */
export function isArray<T = unknown>(
	value: unknown,
	is?: ((value: unknown, index: number) => boolean) | readonly ((value: unknown, index: number) => boolean)[]
): value is T[] {

	return Array.isArray(value)
		&& (is === undefined || matches(value));


	function matches(value: readonly unknown[]): boolean {

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
 * are validated by the wildcard predicate (for instance, {@link isAny} to accept any value).
 *
 * ```typescript
 * isObject(value, { x: isNumber, y: isNumber }); // closed
 * isObject(value, { x: isNumber, [key]: isAny }); // open, accept any extra
 * isObject(value, { x: isNumber, [key]: isNumber }); // open, extras must be numbers
 * ```
 *
 * @typeParam T The expected object type, defaults to `Record<PropertyKey, unknown>`
 *
 * @param value The value to check
 * @param is Optional predicate or template to validate entries
 *
 * @returns True if the value is a plain object matching the validation; false otherwise
 *
 * > [!WARNING]
 * > The predicate signature `(value, key)` places value before key to match the {@link isArray} guard pattern
 * > and enable direct use of value guards like `isString` without wrapper lambdas.
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
		&& (is === undefined || matches(value as Record<string, unknown>));


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
 * Checks if a value is a {@link Some} value, that is either a single value or a readonly array of values.
 *
 * @typeParam T The type of the value(s)
 *
 * @param value The value to check
 * @param is A type guard function to validate the value or its array elements
 *
 * @returns True if the value satisfies the type guard or is an array where all elements satisfy it; false otherwise
 */
export function isSome<T>(value: unknown, is: Guard<T>): value is Some<T> {

	return Array.isArray(value) ? value.every(is) : is(value);

}

/**
 * Checks if a value is a {@link Lazy} value, that is either a plain value or a no-arg function returning a value.
 *
 * @typeParam T The type of the value
 *
 * @param value The value to check
 * @param is A type guard function to validate the value if it is not a function
 *
 * @returns True if the value is a no-arg function or satisfies the type guard; false otherwise
 *
 * Functions with a non-zero expected argument length are rejected.
 */
export function isLazy<T>(value: unknown, is: Guard<T>): value is Lazy<T> {

	return typeof value === "function" && value.length === 0 || is(value);

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wildcard type guard that always succeeds.
 *
 * Mainly intended as a wildcard predicate in {@link isObject} open templates to accept any extra properties.
 *
 * ```typescript
 * isObject(value, { required: isString, [key]: isAny }); // accept any extra properties
 * ```
 *
 * @param value The value to check
 *
 * @returns Always `true`
 */
export function isAny(value: unknown): value is unknown {

	return true;

}

/**
 * Checks if a value is either `undefined` or satisfies a type guard.
 *
 * @typeParam T The type validated by the type guard
 *
 * @param value The value to check
 * @param is A type guard function to validate the value if it is not `undefined`
 *
 * @returns True if the value is `undefined` or satisfies the type guard; false otherwise
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
 * @param values A single literal value or a {@link Some} array of literal values to match against
 *
 * @returns True if the value strictly equals one of the specified literals; false otherwise
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
 * @param guards Array of type guards to validate against
 *
 * @returns True if the value satisfies at least one guard; false otherwise
 */
export function isUnion<G extends readonly Guard[]>(value: unknown, guards: G): value is Union<G> {

	return guards.some(guard => guard(value));

}

/**
 * Checks if a value satisfies all the provided type guards.
 *
 * @param value The value to check
 * @param guards Array of type guards to validate against
 *
 * @returns True if the value satisfies all guards; false otherwise
 */
export function isIntersection<G extends readonly Guard[]>(value: unknown, guards: G): value is Intersection<G> {

	return guards.every(guard => guard(value));

}
