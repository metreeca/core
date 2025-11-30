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
 * Type-safe pattern matcher for discriminated unions.
 *
 * Use when working with data where exactly one variant is active at a time - like operation results
 * that are either successful or failed, UI states that are loading, ready, or error, or any domain
 * model where alternatives are mutually exclusive.
 *
 * The {@link Switch} function lets you handle each case with a dedicated handler, while TypeScript
 * ensures all cases are covered and values are accessed safely. Eliminates verbose conditional
 * logic and prevents bugs from unhandled cases.
 *
 * **Usage**
 *
 * ```typescript
 * import { Switch, Case } from '@metreeca/core/switch';
 *
 * // Define case patterns for form field state
 *
 * type FieldState = {
 *   unset: void;
 *   value: string;
 *   error: Error;
 * };
 *
 * // Create pattern matcher (for example, for value case)
 *
 * const matcher = Switch<FieldState>({
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

import { isDefined, isFunction } from "./index.js";


/**
 * Pattern matcher.
 *
 * Accepts handlers for each case and returns the result from the matched handler.
 * Three usage patterns are supported:
 *
 * - All cases handled: provide a handler for every case, returns `R`
 * - Some cases with fallback: provide handlers for some cases plus a fallback, returns `R`
 * - Some cases without fallback: provide handlers for some cases only, returns `R | undefined`
 *
 * @typeParam C The cases type defining all possible case variants
 */
export interface Switch<C extends Cases> {

	/**
	 * Handles all cases with complete handlers.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Mapping of all case keys to their handlers
	 *
	 * @returns The result from the matched handler
	 */<R>(handlers: Handlers<C, R>): R;

	/**
	 * Handles some cases without a fallback.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of case keys to handlers
	 *
	 * @returns The result from the matched handler, or `undefined` if no handler matched
	 */<R>(handlers: Partial<Handlers<C, R>>): undefined | R;

	/**
	 * Handles some cases with a fallback handler for unmatched cases.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of case keys to handlers
	 * @param fallback Fallback handler receiving union of case values
	 *
	 * @returns The result from the matched handler or fallback
	 */<R>(handlers: Partial<Handlers<C, R>>, fallback: Handler<C[keyof C], R>): R;

}


/**
 * Case patterns.
 *
 * Defines matchable cases as an object type where each property key names a distinct known case
 * and its type specifies the associated value.
 */
export type Cases = {

	readonly [key: string]: unknown

}

/**
 * Case value.
 *
 * Represents a specific case with exactly one active property from the case patterns.
 * TypeScript enforces mutual exclusivity, preventing invalid multi-variant values at compile time.
 *
 * @typeParam C The case patterns defining available cases
 */
export type Case<C extends Cases> = {

	readonly [K in keyof C]: { [P in K]: C[P] } & { [P in Exclude<keyof C, K>]?: never }

}[keyof C]


/**
 * Case handlers.
 *
 * Maps each case name to a {@link Handler} that processes the matched value and produces
 * a result of type `R`.
 *
 * @typeParam C The case patterns
 * @typeParam R The return type of all handlers
 */
export type Handlers<C extends Cases, R> = {

	readonly [K in keyof C]: Handler<C[K], R>

}

/**
 * Case handler.
 *
 * Either a constant value of type `R`, or a function `(value: V) => R` that computes the result.
 *
 * @typeParam V The type of the matched case value
 * @typeParam R The return type of the handler
 */
export type Handler<V = unknown, R = unknown> =
	| R
	| ((value: V) => R)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a type-safe pattern matching function for a case.
 *
 * @typeParam C The cases type defining all possible case variants
 *
 * @param variant A case variant
 *
 * @returns A {@link Switch} function that accepts handlers for each case and an optional fallback
 */
export function Switch<C extends Cases>(variant: Case<C>): Switch<C> {

	const [label, value] = Object.entries(variant)[0] ?? []; // find the active case

	return <R>(handlers: Partial<Handlers<C, R>>, fallback?: Handler<C[keyof C], R>): unknown => {

		return isFunction(handlers[label]) ? handlers[label](value)
			: isDefined(handlers[label]) ? handlers[label]
				: isFunction(fallback) ? fallback(value)
					: fallback;

	};

}
