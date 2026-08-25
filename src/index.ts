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
 * Core types, guards, and utilities.
 *
 * Bridges the gap between TypeScript's static type system and untrusted runtime data. Every guard returns a boolean
 * and narrows its argument on success, so validation and type inference collapse into a single call at API boundaries,
 * deserialisation sites, and other trust-crossing points. Companion utilities work along the same lines, deferring
 * values to first use, lifting total mappers over missing arguments, and reporting failures where a statement isn't
 * allowed.
 *
 * ## Built-in Guards
 *
 * Guards for language-level values and host objects. {@link isDefined} pairs with the {@link Defined} type operator,
 * stripping `undefined` from the type of the checked value while retaining `null`.
 *
 * ```typescript
 * isDefined("value"); // true
 * isDefined(null); // true (only undefined is rejected)
 * values.filter(isDefined); // (string | undefined)[] narrowed to string[]
 * isPrimitive("value"); // true (any non-object value)
 * isIdentifier("myVar"); // true (valid ECMAScript identifier)
 * isSymbol(Symbol("key")); // true
 * isFunction(() => {}); // true
 * isError(new Error()); // true
 * isRegExp(/pattern/); // true
 * isDate(new Date()); // true
 * isPromise(Promise.resolve()); // true
 * isIterable([1, 2, 3]); // true
 * isAsyncIterable(asyncGenerator()); // true
 * ```
 *
 * ## JSON Guards
 *
 * Complete coverage of the JSON data model: the recursive {@link Value} type, its {@link Scalar} leaves,
 * and structural guards for arrays and objects. {@link isArray} and {@link isObject}
 * validate shape in depth through element predicates or tuple/template descriptors;
 * object templates are closed by default, with the {@link key} wildcard turning them open.
 *
 * ```typescript
 * isNull(null); // true
 * isBoolean(true); // true
 * isNumber(42); // true
 * isString("hello"); // true
 * isScalar(42); // true (boolean, number, or string)
 * isValue({ a: [1, 2], b: "test" }); // true (recursive JSON value)
 *
 * isArray([1, 2, 3]); // true
 * isArray([1, 2, 3], isNumber); // with element predicate
 * isArray(["hello", 42], [isString, isNumber]); // with tuple template
 * isArray([], []); // empty array check
 *
 * isObject({ a: 1 }); // true
 * isObject({ a: 1 }, isNumber); // with entry predicate
 * isObject({ a: 1 }, { a: isNumber }); // with closed template
 * isObject({ a: 1 }, { a: isNumber, [key]: isAny }); // with open template
 * isObject({ a: 1 }, { a: isNumber, b: v => isOptional(v, isString) }); // with optional field
 * isObject({ kind: "circle" }, { kind: v => isLiteral(v, ["circle", "square"]) }); // with literal field
 * isObject({ value: 42 }, { value: v => isUnion(v, [isString, isNumber]) }); // with union field
 * isObject({}, {}); // empty object check
 * ```
 *
 * ## Composable Guards
 *
 * Higher-order guards that combine simpler ones into arbitrary type expressions:
 * {@link isLiteral} for literal and enum-like sets, {@link isOptional} for `T | undefined`,
 * {@link isUnion} for `A | B`, and {@link isIntersection} for `A & B`.
 * {@link isAny} acts as a wildcard that always succeeds, typically used as a placeholder
 * inside templates.
 *
 * ```typescript
 * isAny("test"); // true (wildcard, always succeeds)
 * isLiteral("foo", "foo"); // true
 * isLiteral("foo", ["foo", "bar", "baz"]); // true (matches any)
 * isOptional(undefined, isString); // true
 * isOptional("hello", isString); // true
 * isUnion("test", [isString, isNumber]); // true (matches isString)
 * isUnion(42, [isString, isNumber]); // true (matches isNumber)
 * isIntersection({ a: 1 }, [isObject, v => isObject(v, { a: isNumber })]); // true (satisfies all)
 * ```
 *
 * ## Deferred Values
 *
 * {@link isLazy} admits values supplied either eagerly or as no-arg factories;
 * {@link isEager} is its dual, rejecting factories and accepting only plain values.
 * Paired with the {@link Lazy} / {@link Eager} type operators.
 * {@link lazy} defers a reference behind a memoising accessor that computes it at most once on first use;
 * {@link eager} is its converse, resolving a reference to its value on every call.
 *
 * ```typescript
 * isLazy(() => 42, isNumber); // true (no-arg function)
 * isLazy(42, isNumber); // true (plain value)
 * isEager(42, isNumber); // true (plain value)
 * isEager(() => 42, isNumber); // false (no-arg function rejected)
 *
 * lazy(() => 42)(); // 42 (computed once, then memoised)
 * eager(() => 42); // 42 (resolved on every call)
 * ```
 *
 * ## Functional Idioms
 *
 * {@link given} binds a value to a mapper of its own, so a computation reads as a scoped expression rather than as a
 * temporary variable followed by a statement; a missing value short-circuits to `undefined` without calling the
 * mapper, and the result type follows suit, staying defined for a value that can't be `undefined` in the first place.
 *
 * ```typescript
 * given(8080)(port => `localhost:${port}`); // "localhost:8080"
 * given(ports.get(name))(port => `localhost:${port}`); // string or undefined (the mapper is not called)
 * ```
 *
 * ## Error Reporting
 *
 * {@link assert} validates a value against an arbitrary predicate, returning it unchanged on success and throwing a
 * `TypeError` otherwise, with a message derived from the predicate name or computed from the offending value;
 * validation doesn't narrow, so values are returned at their declared type, whatever type the predicate tests for.
 *
 * {@link error} throws where a statement isn't allowed, turning a failure into an expression: `Error` causes are
 * thrown as they are, anything else wrapped in a generic `Error` reporting its string representation.
 *
 * ```typescript
 * assert(input, isString); // returns input, or throws TypeError("expected string")
 * assert(data, isNumber, "count must be numeric"); // with a fixed message
 * assert(value, v => v > 0, v => `expected positive port <${v}>`); // with a computed message
 *
 * const port = ports.get(name) ?? error("missing required port");
 * const result = await task().catch(reason => error(reason)); // rethrow a reason of unknown type
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
 * Defined value.
 *
 * Strips `undefined` from a type, leaving every other constituent in place: `null` is retained, as definedness is
 * about assignment rather than emptiness.
 *
 * > [!WARNING]
 * > `Defined<any>` resolves to `any` and admits `undefined` again.
 *
 * @typeParam V The type to strip `undefined` from, defaults to any value other than `undefined`
 */
export type Defined<V = null | {}> =
	V & (null | {});


/**
 * ECMAScript primitive value.
 *
 * A value that is not an object: `undefined`, `null`, a boolean, a number, a bigint, a string, or a symbol. Functions
 * and wrapper instances such as `new String("value")` are objects and fall outside this type.
 *
 * Primitives are immutable and compared by value rather than by reference, so equality follows content: two
 * independently built strings or numbers address the same `Map` or `Set` entry, where two structurally equal objects
 * would count as distinct ones. Symbols, though primitive, are unique by construction, so only the very same symbol
 * ever compares equal.
 *
 * @see [ECMAScript® 2024 - §6.1 Language Types](https://262.ecma-international.org/15.0/#sec-ecmascript-language-types)
 */
export type Primitive =
	| undefined
	| null
	| boolean
	| number
	| bigint
	| string
	| symbol;

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
	| Scalar
	| Array
	| Object

/**
 * Immutable JSON scalar.
 *
 * Represents a non-null atomic JSON value: a `boolean`, `number`, or `string`. Complements the structured
 * {@link Array} and {@link Object} members of {@link Value}.
 */
export type Scalar =
	| boolean
	| number
	| string

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
 * Extracts the union of guarded types from an array of type guards.
 *
 * Given an array of {@link Guard} functions, infers the union of all types they guard. Useful for deriving the result
 * type of union validation with {@link isUnion}.
 *
 * @typeParam G The array type containing type guards
 *
 * @see {@link isUnion} for validating a value against any of the guards
 */
export type Union<G extends readonly Guard[]> =
	G extends readonly Guard<infer T>[] ? T : never;

/**
 * Extracts the intersection of guarded types from an array of type guards.
 *
 * Given an array of {@link Guard} functions, infers the intersection of all types they guard. Useful for deriving the
 * result type of intersection validation with {@link isIntersection}.
 *
 * @typeParam G The array type containing type guards
 *
 * @see {@link isIntersection} for validating a value against all of the guards
 */
export type Intersection<G extends readonly Guard[]> =
	Union<G> extends infer U
		? (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never
		: never;


/**
 * A value or a function returning a value.
 *
 * Enables deferred evaluation, allowing values to be computed on demand rather than upfront.
 *
 * @typeParam T The type of the value
 *
 * @see {@link lazy} for the constructor deferring such a reference behind a memoising accessor
 */
export type Lazy<T> =
	| T
	| (() => T);

/**
 * The eager counterpart of a {@link Lazy} reference.
 *
 * Unwraps no-arg functions to their return type and passes plain values through unchanged.
 *
 * @typeParam T The lazy reference to unwrap
 *
 * @see {@link eager} for the constructor resolving such a reference to its value
 */
export type Eager<T> =
	T extends () => infer U ? U : T;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is {@link Defined}.
 *
 * Only `undefined` is rejected: `null` and falsy values such as `0`, `""`, and `false` are all defined. On success
 * the value narrows to its declared type without `undefined`, so the guard doubles as a filtering predicate, as in
 * `values.filter(isDefined)`.
 *
 * @typeParam V The declared type of the value to check
 *
 * @param value The value to check
 *
 * @returns True if the value is not `undefined`; false otherwise
 */
export function isDefined<V>(value: V): value is Defined<V> {
	return value !== undefined;
}

/**
 * Checks if a value is a {@link Primitive}.
 *
 * Objects are rejected whatever their shape, including functions and wrapper instances such as `new String("value")`.
 *
 * @param value The value to check
 *
 * @returns True if the value is `undefined`, `null`, a boolean, a number, a bigint, a string, or a symbol; false
 *     otherwise
 */
export function isPrimitive(value: unknown): value is Primitive {

	return value === null || (typeof value !== "object" && typeof value !== "function");

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
		|| isScalar(value)
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
 * Checks if a value is a JSON scalar.
 *
 * @param value The value to check
 *
 * @returns True if the value is a boolean, a finite number, or a string; false otherwise
 *
 * @see {@link Scalar}
 */
export function isScalar(value: unknown): value is Scalar {

	return isBoolean(value)
		|| isNumber(value)
		|| isString(value);

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
 * Checks if a value matches one of the specified literal values.
 *
 * @typeParam T The literal type (boolean, number, or string)
 *
 * @param value The value to check
 * @param values A single literal value or an array of literal values to match against
 *
 * @returns True if the value strictly equals one of the specified literals; false otherwise
 */
export function isLiteral<T extends boolean | number | string>(value: unknown, values: T | readonly T[]): value is T {

	return Array.isArray(values)
		? values.includes(value)
		: value === values;

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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a {@link Lazy} reference.
 *
 * Function values are accepted only when they declare no formal parameters, in which case they are treated as
 * factories for the underlying value and the type guard is not invoked. Non-function values are validated by the type
 * guard when provided, or accepted unconditionally otherwise.
 *
 * @typeParam T The type of the underlying value
 *
 * @param value The value to check
 * @param is Optional type guard for the underlying value
 *
 * @returns True if the value is a no-arg factory, or a non-function that satisfies the type guard; false otherwise
 *
 * @see {@link isEager} for the dual guard accepting only plain values
 * @see {@link lazy} for the constructor deferring a reference behind a memoising accessor
 */
export function isLazy<T = unknown>(value: unknown, is?: Guard<T>): value is Lazy<T> {

	return typeof value === "function" ? value.length === 0 : (is === undefined || is(value));

}

/**
 * Checks if a value is an {@link Eager} reference.
 *
 * Accepts only plain values; when provided, the type guard validates the value. Functions of any arity are always
 * rejected.
 *
 * @typeParam T The type of the underlying value
 *
 * @param value The value to check
 * @param is Optional type guard for the underlying value
 *
 * @returns True if the value is not a function and satisfies the type guard; false otherwise
 *
 * @see {@link isLazy} for the dual guard accepting no-arg factories as well
 * @see {@link eager} for the constructor resolving a reference to its value
 */
export function isEager<T = unknown>(value: unknown, is?: Guard<T>): value is Eager<T> {

	return typeof value === "function" ? false : (is === undefined || is(value));

}


/**
 * Defers a value to first use.
 *
 * Wraps a {@link Lazy} reference in a no-arg accessor that computes a deferred value on the first call and reuses the
 * result thereafter, so work the caller may never need is neither done upfront nor repeated; a plain value has nothing
 * to defer, and the accessor simply hands it back.
 *
 * @typeParam T The type of the deferred value, which may be neither `null` nor `undefined`
 *
 * @param value The value, or the no-arg factory computing it, called at most once
 *
 * @returns An accessor returning the value, computing it on the first call
 *
 * @see {@link eager} for the converse, forcing a {@link Lazy} reference rather than deferring it
 */
export function lazy<T extends {}>(value: Lazy<T>): () => T {

	let memo: undefined | T;

	return () => memo ??= value instanceof Function ? value() : value;

}

/**
 * Resolves a {@link Lazy} reference to its value.
 *
 * Calls a no-arg factory to obtain the value it stands for, or returns a plain value unchanged, so a caller handed a
 * {@link Lazy} reference can work with the value it denotes. The result is not cached: a factory runs on every call.
 *
 * @typeParam T The type of the resolved value
 *
 * @param value The value, or the no-arg factory computing it
 *
 * @returns The value the reference stands for
 *
 * @see {@link lazy} for the converse, deferring a {@link Lazy} reference rather than forcing it
 */
export function eager<T>(value: Lazy<T>): T {

	return value instanceof Function ? value() : value;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Applies a mapper to a defined value.
 *
 * Binds a value to a mapper of its own, so a computation reads as a scoped expression rather than as a temporary
 * variable followed by a statement. The value is known to be defined, so the mapper is always called and its result
 * is reported unchanged.
 *
 * @typeParam V The type of the value to map, known to exclude `undefined`
 *
 * @param value The value to hand on to the mapper
 *
 * @returns A function reporting the value computed from `value` by its `mapper` argument; errors raised by the mapper
 * propagate to the caller unchanged
 *
 * @example
 *
 * ```typescript
 * given(8080)(port => `localhost:${port}`); // "localhost:8080"
 * ```
 */
export function given<V extends Defined>(value: V): (<R>(mapper: (value: V) => R) => R);

/**
 * Applies a mapper to a possibly undefined value.
 *
 * Extends the mapper with a tolerance for undefined values: a defined value is handed on to it stripped of `undefined`,
 * while an undefined one short-circuits to `undefined` without calling it, so an optional value flows through a chain
 * of total functions without a guard at every step. Definedness is about assignment rather than emptiness, so `null`
 * is mapped like any other value.
 *
 * @typeParam V The type of the value to map, possibly including `undefined`
 *
 * @param value The value to hand on to the mapper, if defined
 *
 * @returns A function reporting `undefined` if `value` is undefined, and the value computed by its `mapper` argument
 * otherwise; errors raised by the mapper propagate to the caller unchanged
 *
 * @example
 *
 * ```typescript
 * given(ports.get(name))(port => `localhost:${port}`); // string or undefined (the mapper is not called)
 * ```
 */
export function given<V>(value: V): (<R>(mapper: (value: Defined<V>) => R) => undefined | R);

/**
 * Applies a mapper to a value, short-circuiting an undefined one.
 */
export function given<V>(value: V): (<R>(mapper: (value: Defined<V>) => R) => undefined | R) {

	return mapper => isDefined(value) ? mapper(value) : undefined;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validates a value against a predicate and returns it.
 *
 * Applies the predicate to the value: if it passes, returns the value unchanged; otherwise, throws a `TypeError`. When
 * no custom message is provided, derives a descriptive message from the predicate function name: names in `isXxx` form
 * report the camel case suffix as separate lowercase words (for example, {@link isAsyncIterable} produces "expected
 * async iterable"), while other names produce "assertion failed".
 *
 * The predicate may be declared over the type of the value or over any of its supertypes, so {@link Guard} functions
 * accepting `unknown` are taken as is and the result keeps the declared type of the value, without widening it to the
 * predicate parameter type. Validation doesn't narrow, though: a value declared as `unknown` is returned as `unknown`,
 * whatever type the predicate checks for.
 *
 * @typeParam T The declared type of the value to validate
 *
 * @param value The value to validate
 * @param predicate The predicate to apply to `value`, declared over its type or over any supertype of it
 * @param message Optional custom error message, either a string or a factory computing it from the offending value;
 * factories are evaluated only if `predicate` fails, so building expensive messages costs nothing on success; defaults
 * to a message derived from the predicate function name
 *
 * @returns The `value` argument, unchanged
 *
 * @throws {TypeError} When `predicate` returns `false`
 *
 * @see {@link error} for throwing where a statement isn't allowed
 */
export function assert<T>(value: T, predicate: (value: T) => boolean, message?: string | ((value: T) => string)): T {

	return predicate(value) ? value : error(new TypeError(
		isString(message) ? message
			: message !== undefined ? message(value)
				: /^is\p{Uppercase}/u.test(predicate.name) ? `expected ${label(predicate.name.slice(2))}`
					: "assertion failed"
	));


	function label(name: string): string {
		return name
			.replace(/(\p{Uppercase})(\p{Uppercase}\p{Lowercase})/gu, "$1 $2")
			.replace(/(\p{Lowercase})(\p{Uppercase})/gu, "$1 $2")
			.toLowerCase();
	}

}

/**
 * Throws an error in expression contexts.
 *
 * Reports a failure where a statement isn't allowed, for instance in a ternary branch, a nullish coalescing fallback,
 * or the body of an arrow function; the call never returns and stands in for whatever type its position expects, so it
 * composes with the surrounding expression without casts.
 *
 * `Error` causes are thrown as they are, preserving their type and stack trace; any other cause is wrapped in a
 * generic `Error` reporting its string representation, so rejection reasons and other throwables of unknown type are
 * surfaced as regular errors.
 *
 * @typeParam T The type the call stands in for at its use site; no value is ever returned
 *
 * @param cause The `Error` to throw, or the value to report as the message of a new generic `Error`
 *
 * @throws {Error} The `cause` argument, if it is an `Error`; otherwise a new `Error` reporting its string
 * representation
 *
 * @example
 *
 * ```typescript
 * const port = ports.get(name) ?? error(`missing port <${name}>`);
 * const value = isValid(input) ? input : error(new RangeError("invalid input"));
 * const result = await task().catch(reason => error(reason)); // rethrow a reason of unknown type
 * ```
 *
 * @see {@link assert} for validating a value against a predicate, throwing a `TypeError` if it fails
 */
export function error<T>(cause: unknown): T {

	throw isError(cause) ? cause : new Error(String(cause));

}
