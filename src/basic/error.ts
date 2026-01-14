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
 * Error handling and execution reporting utilities.
 *
 * Provides utilities for error handling, message formatting, and execution timing
 * to support error reporting and performance analysis.
 *
 * **Error Throwing in Expressions**
 *
 * Throw errors in expression contexts where statements aren't allowed:
 *
 * ```typescript
 * import { error } from '@metreeca/core/error';
 *
 * const value = map.get(key) ?? error("Missing required key");
 *
 * const result = isValid(input)
 *   ? processInput(input)
 *   : error(new ValidationError("Invalid input"));
 * ```
 *
 * **Message Formatting**
 *
 * Extract readable messages from various value types:
 *
 * ```typescript
 * import { message } from '@metreeca/core/error';
 *
 * console.error(`Failed with: ${message(errorValue)}`);
 *
 * // Error objects -> message property
 * // Numbers -> locale-formatted strings
 * // Other values -> string representation
 * ```
 *
 * **Execution Timing**
 *
 * Monitor timing for synchronous and asynchronous operations:
 *
 * ```typescript
 * import { time } from '@metreeca/core/error';
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
 * @module
 */

import { isError } from "../index.js";
import { isNumber, isString } from "./json.js";


/**
 * Validates a value against a type guard and returns it.
 *
 * Applies the guard to the value: if it passes, returns the value; otherwise, throws a `TypeError`. When no custom
 * message is provided, generates a descriptive message from the guard function name (e.g., `isNonEmptyString` produces
 * "expected non empty string").
 *
 * @param value The value to validate
 * @param guard The type guard function to apply
 * @param message Optional custom error message; defaults to a message derived from the guard function name
 *
 * @returns The validated value
 *
 * @throws {TypeError} When the guard returns `false`
 */
export function assert<T>(value: unknown, guard: (v: unknown) => v is T, message?: string): T {

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


/**
 * Extracts a readable message string from an unknown value.
 *
 * Converts `Error` objects to their message property, formats numbers with
 * US locale conventions (`en-US`), or converts other values to string representation.
 *
 * @param value Unknown value to extract message from
 *
 * @returns Error message, formatted number, or string representation of the value
 */
export function message(value: unknown) {
	return isNumber(value) ? value.toLocaleString("en-US")
		: isError(value) ? value.message
			: String(value);
}


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
