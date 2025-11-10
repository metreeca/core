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
 * Pattern matching for values that can be in one of several exclusive states.
 *
 * Use when working with data where exactly one variant is active at a time - like operation results
 * that are either successful or failed, UI states that are loading, ready, or error, or any domain
 * model where alternatives are mutually exclusive.
 *
 * The {@link status} function lets you handle each state with a dedicated handler, while TypeScript
 * ensures all states are covered and values are accessed safely. Eliminates verbose conditional
 * logic and prevents bugs from unhandled cases.
 *
 * ## Usage
 *
 * ```typescript
 * import { status, Condition } from '@metreeca/core/status';
 *
 * // Define condition patterns for form field state
 *
 * type FieldState = {
 *   unset: void;
 *   value: string;
 *   error: Error;
 * };
 *
 * // Create status matcher (for example, for value condition)
 *
 * const matcher = status<FieldState>({
 *   value: "user@example.com"
 * });
 *
 * // Pattern match with function handlers
 *
 * const message = matcher({
 *   unset: () => "Enter email",
 *   value: (email) => `Email: ${email}`,
 *   error: (err) => `Error: ${err.message}`
 * });
 *
 * // Use constant handlers
 *
 * const isValid = matcher({
 *   unset: false,
 *   value: true,
 *   error: false
 * });
 *
 * // Use fallback for partial matching
 *
 * const display = matcher({
 *   value: (email) => email
 * }, "‹blank›");
 * ```
 *
 * @module
 */

import { isDefined, isFunction } from ".";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Pattern matcher.
 *
 * Accepts handlers for each condition and returns the result from the matched handler.
 * Three usage patterns are supported:
 *
 * - All conditions handled: provide a handler for every condition, returns `R`
 * - Some conditions with fallback: provide handlers for some conditions plus a fallback, returns `R`
 * - Some conditions without fallback: provide handlers for some conditions only, returns `R | undefined`
 *
 * @typeParam C The conditions type defining all possible condition variants
 */
export type Status<C extends Conditions> = {

	/**
	 * Handles all conditions with complete handlers.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Mapping of all condition keys to their handlers
	 *
	 * @returns The result from the matched handler
	 */<R>(handlers: Handlers<C, R>): R

	/**
	 * Handles some conditions without a fallback.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of condition keys to handlers
	 *
	 * @returns The result from the matched handler, or `undefined` if no handler matched
	 */<R>(handlers: Partial<Handlers<C, R>>): undefined | R

	/**
	 * Handles some conditions with a fallback handler for unmatched conditions.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of condition keys to handlers
	 * @param fallback Fallback handler receiving union of condition values
	 *
	 * @returns The result from the matched handler or fallback
	 */<R>(handlers: Partial<Handlers<C, R>>, fallback: Handler<C[keyof C], R>): R

}


/**
 * Condition patterns.
 *
 * Defines matchable conditions as an object type where each property key names a distinct known condition
 * and its type specifies the associated value.
 */
export type Conditions = {

	readonly [key: string]: unknown

}

/**
 * Condition value.
 *
 * Represents a specific state with exactly one active property from the condition patterns.
 * TypeScript enforces mutual exclusivity, preventing invalid multi-variant values at compile time.
 *
 * @typeParam C The condition patterns defining available states
 */
export type Condition<C extends Conditions> = {

	readonly [K in keyof C]: { [P in K]: C[P] } & { [P in Exclude<keyof C, K>]?: never }

}[keyof C]


/**
 * Condition handlers.
 *
 * Maps each condition name to a {@link Handler} that processes the matched value and produces
 * a result of type `R`.
 *
 * @typeParam C The condition patterns
 * @typeParam R The return type of all handlers
 */
export type Handlers<C extends Conditions, R> = {

	readonly [K in keyof C]: Handler<C[K], R>

}

/**
 * Condition handler.
 *
 * Either a constant value of type `R`, or a function `(value: V) => R` that computes the result.
 *
 * @typeParam V The type of the matched condition value
 * @typeParam R The return type of the handler
 */
export type Handler<V, R> =
	| R
	| ((value: V) => R)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a type-safe pattern matching function for a condition.
 *
 * @typeParam C The conditions type defining all possible condition variants
 *
 * @param condition A condition
 *
 * @returns A {@link Status} function that accepts handlers for each condition and an optional fallback
 */
export function status<C extends Conditions>(condition: Condition<C>): Status<C> {

	const [label, value] = Object.entries(condition)[0] ?? []; // find the active condition

	return <R>(handlers: Partial<Handlers<C, R>>, fallback?: Handler<C[keyof C], R>): unknown => {

		return isFunction(handlers[label]) ? handlers[label](value)
			: isDefined(handlers[label]) ? handlers[label]
				: isFunction(fallback) ? fallback(value)
					: fallback;

	};

}
