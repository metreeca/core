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
 * Execution reporting and error handling.
 *
 * Provides utilities for value assertion, error throwing, execution timing and message formatting, supporting error
 * reporting and performance analysis.
 *
 * **Type Guard Assertion**
 *
 * Validate values against type guards with automatic error messages:
 *
 * ```typescript
 * import { assert } from '@metreeca/core/report';
 * import { isString, isNumber } from '@metreeca/core';
 *
 * const name = assert(input, isString);  // throws TypeError if not a string
 * const count = assert(data, isNumber, "count must be numeric");
 * ```
 *
 * **Error Throwing in Expressions**
 *
 * Throw errors in expression contexts where statements aren't allowed:
 *
 * ```typescript
 * import { error } from '@metreeca/core/report';
 *
 * const value = map.get(key) ?? error("Missing required key");
 *
 * const result = isValid(input)
 *   ? processInput(input)
 *   : error(new ValidationError("Invalid input"));
 * ```
 *
 * **Execution Timing**
 *
 * Monitor timing for synchronous and asynchronous operations:
 *
 * ```typescript
 * import { time } from '@metreeca/core/report';
 *
 * const result = await time(
 *   async () => fetchData(url),
 *   (data, elapsed) => console.log(`Fetched in ${elapsed}ms`)
 * );
 *
 * const computed = time(
 *   () => expensiveCalculation(),
 *   (result, elapsed) => logPerformance('calculation', elapsed)
 * );
 * ```
 *
 * **Message Formatting**
 *
 * Extract readable messages from various value types:
 *
 * ```typescript
 * import { message } from '@metreeca/core/report';
 *
 * console.error(`Failed with: ${message(errorValue)}`);
 *
 * // Numbers -> locale-formatted strings
 * // Strings -> quoted and escaped string literals
 * // Error objects -> message property
 * // Other values -> string representation
 * ```
 *
 * Strings are reported as JSON string literals, so leading and trailing whitespace is delimited by the surrounding
 * quotes and characters with no visible glyph surface as escapes rather than silently corrupting the report:
 *
 * ```typescript
 * message("plain");            // "plain" (quotes included)
 * message("line\nbreak");      // "line\nbreak" (the break is escaped)
 *
 * const separator=String.fromCodePoint(0x00A0);
 *
 * message(`a${separator}b`);   // the invisible separator is reported as an escape
 * ```
 *
 * Zero width joiners are reported as is, so composed emoji stay legible.
 *
 * An optional length clips long string content, counting code points and reserving the last one for an ellipsis:
 *
 * ```typescript
 * message("a very long value", 8);   // "a very …"
 * ```
 *
 * @module
 */

import { type Guard, isError, isNumber, isString } from "../index.js";

/**
 * Matches characters with no visible glyph.
 *
 * Covers control characters (`Cc`), line and paragraph separators (`Zl`, `Zp`), every format character (`Cf`) other
 * than the zero width joiner, which is left as is to keep composed emoji intact, and every space separator (`Zs`)
 * other than the plain space, which is left as is.
 *
 * Built from a string rather than a regular expression literal to keep the zero width joiner exclusion written as an
 * escape: spelling it as a literal character would embed in this source the very kind of invisible content the pattern
 * exists to expose.
 */
const HiddenPattern = new RegExp("[\\p{Cc}\\p{Zl}\\p{Zp}]|[^\\P{Cf}\\u200D]|[^\\P{Zs} ]", "gu");

/**
 * Matches every UTF-16 code unit.
 *
 * Deliberately not unicode-aware, so supplementary characters are split into their surrogate halves and each half is
 * escaped on its own, as required for `\uXXXX` escapes.
 */
const UnitPattern = /[^]/g;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validates a value against a type guard and returns it.
 *
 * Applies the guard to the value: if it passes, returns the value; otherwise, throws a `TypeError`. When no custom
 * message is provided, generates a descriptive message from the guard function name (for example, `isString` produces
 * "expected string").
 *
 * @param value The value to validate
 * @param guard The type guard function to apply
 * @param message Optional custom error message; defaults to a message derived from the guard function name
 *
 * @returns The validated value
 *
 * @throws {TypeError} When the guard returns `false`
 */
export function assert<T>(value: unknown, guard: Guard<T>, message?: string): T {

	return guard(value) ? value : error(new TypeError(message ?? defaultMessage(guard)));


	function defaultMessage(guard: Function): string {
		if ( /^is\p{Uppercase}/u.test(guard.name) ) {

			return `expected ${(guard.name.slice(2)
				.replace(/(\p{Uppercase})(\p{Uppercase}\p{Lowercase})/gu, "$1 $2")
				.replace(/(\p{Lowercase})(\p{Uppercase})/gu, "$1 $2")
				.toLowerCase())}`;

		} else {

			return "assertion failed";

		}
	}

}

/**
 * Throws an error in expression contexts.
 *
 * Enables error throwing in functional style code where expressions are required,
 * such as ternary operators, arrow functions, or array methods.
 *
 * @typeParam T The expected return type for type compatibility (never actually returns)
 *
 * @param cause The error message string or Error instance to throw
 *
 * @throws {Error} The provided error, or a new Error wrapping the provided message
 *
 * @example
 *
 * ```typescript
 * // Use in ternary operator
 *
 * const value = isValid(input) ? input : error("Invalid input");
 *
 * // Use in arrow function
 *
 * const getRequired = (key: string) => map.get(key) ?? error(`Missing key: ${key}`);
 *
 * // Use in array method
 *
 * const items = data.map(item => item.value ?? error("Missing value"));
 * ```
 */
export function error<T>(cause: string | Error): T {
	throw isString(cause) ? new Error(cause) : cause;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Executes an asynchronous task and monitors its execution time.
 *
 * Measures elapsed time from invocation until promise resolution.
 *
 * @typeParam T The type of value returned by the task
 *
 * @param task Function returning a promise to be timed
 * @param monitor Callback invoked with the result value and elapsed time in milliseconds
 *
 * @returns A promise resolving to the task's return value
 *
 * @throws Any error thrown by the task (monitor is not called on error)
 */
export function time<T>(task: () => Promise<T>, monitor: (value: T, elapsed: number) => void): Promise<T>;

/**
 * Executes a synchronous task and monitors its execution time.
 *
 * Measures elapsed time from invocation until completion.
 *
 * @typeParam T The type of value returned by the task
 *
 * @param task Function returning a value to be timed
 * @param monitor Callback invoked with the result value and elapsed time in milliseconds
 *
 * @returns The task's return value
 *
 * @throws Any error thrown by the task (monitor is not called on error)
 */
export function time<T>(task: () => T, monitor: (value: T, elapsed: number) => void): T;

/**
 * Executes a task (sync or async) and monitors its execution time.
 *
 * @internal
 */
export function time<T>(task: () => T | Promise<T>, monitor: (value: T, elapsed: number) => void): T | Promise<T> {

	const start = Date.now();

	const value = task();

	if ( value instanceof Promise ) {

		return value.then(resolved => {

			monitor(resolved, Date.now()-start);

			return resolved;

		});

	} else {

		monitor(value, Date.now()-start);

		return value;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts a readable message string from an unknown value.
 *
 * Formats numbers with US locale conventions (`en-US`), reports strings as quoted and escaped string literals,
 * converts `Error` objects to their message property, and falls back to the string representation of other values.
 *
 * Strings are reported as JSON string literals, so their extent is unambiguous; characters with no visible glyph
 * (control characters, line and paragraph separators, format characters, non-plain space separators) are reported as
 * `\uXXXX` escapes, supplementary ones as surrogate pairs, so they can't corrupt the report or hide content. Zero
 * width joiners are reported as is, keeping composed emoji legible.
 *
 * @param value The value to report
 * @param length Optional maximum length in code points of the reported string content; longer strings are clipped,
 * with the last retained code point replaced by an ellipsis; `0` or a negative value disables clipping; ignored for
 * values other than strings
 *
 * @returns The formatted number, quoted and escaped string literal, error message, or string representation of `value`
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8259#section-7 RFC 8259 - JSON Strings}
 */
export function message(value: unknown, length: number = 0): string {

	return isNumber(value) ? value.toLocaleString("en-US")
		: isString(value) ? quote(clip(value, length))
			: isError(value) ? value.message
				: String(value);


	function quote(value: string): string {
		return JSON.stringify(value).replace(HiddenPattern, char => char // escaped as UTF-16 code units
			.replace(UnitPattern, unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`)
		);
	}

	function clip(value: string, length: number): string {

		if ( length > 0 ) {

			const points = [...value];

			return points.length > length ? `${points.slice(0, length-1).join("")}…` : value;

		} else {

			return value;

		}

	}

}
