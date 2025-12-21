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
 * Core utility types and type guards.
 *
 * ```typescript
 * import {
 *   isDefined,
 *   isFunction,
 *   isError,
 *   isPromise,
 *   isIterable,
 *   isAsyncIterable
 * } from '@metreeca/core';
 *
 * if (isDefined(value)) {
 *   return value.property; // value is narrowed to exclude undefined and null
 * }
 *
 * if (isFunction(value)) {
 *   value(); // value is narrowed to Function type
 * }
 *
 * if (isError(value)) {
 *   console.error(value.message); // value is narrowed to Error
 * }
 *
 * if (isPromise(value)) {
 *   await value; // value is narrowed to Promise type
 * }
 *
 * if (isIterable(value)) {
 *   for (const item of value) { // value implements iterable protocol
 *     process(item);
 *   }
 * }
 *
 * if (isAsyncIterable(value)) {
 *   for await (const item of value) { // value implements async iterable protocol
 *     await process(item);
 *   }
 * }
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
export const IdentifierPattern = /^[_$\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u;


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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
 * Checks if a value is not `undefined` or `null`.
 *
 * @typeParam T The type when the value is defined
 *
 * @param value The value to check
 *
 * @returns `true` if the value is neither `undefined` nor `null`
 */
export function isDefined<T>(value: undefined | null | T): value is T {
	return value !== undefined && value !== null;
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
