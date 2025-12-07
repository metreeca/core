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
 * Type-safe relay for discriminated unions.
 *
 * Use when working with data where exactly one option is active at a time - like operation results
 * that are either successful or failed, UI states that are loading, ready, or error, or any domain
 * model where alternatives are mutually exclusive.
 *
 * The {@link relay} function lets you handle each option with a dedicated handler, while TypeScript
 * ensures all options are covered and values are accessed safely. Eliminates verbose conditional
 * logic and prevents bugs from unhandled options.
 *
 * **Basic Pattern Matching**
 *
 * Define options and match with function handlers:
 *
 * ```typescript
 * import { relay } from '@metreeca/core/relay';
 *
 * type FieldState = {
 *   unset: void;
 *   value: string;
 *   error: Error;
 * };
 *
 * const r = relay<FieldState>({
 *   value: "user@example.com"
 * });
 *
 * const message = r({
 *   unset: () => "Enter email",
 *   value: (email) => `Email: ${email}`,
 *   error: (err) => `Error: ${err.message}`
 * });
 * ```
 *
 * **Constant Handlers**
 *
 * Use constant values instead of functions when handlers don't need option data:
 *
 * ```typescript
 * const isValid = r({
 *   unset: false,
 *   value: true,
 *   error: false
 * });
 * ```
 *
 * **Partial Matching with Fallback**
 *
 * Handle specific options and provide a fallback for others:
 *
 * ```typescript
 * const display = r({
 *   value: (email) => email
 * }, (
 *   "‹blank›"
 * ));
 * ```
 *
 * @module
 */

import { isDefined, isFunction } from "../index.js";


/**
 * Relay.
 *
 * Accepts handlers for each option and returns the result from the matched handler.
 * Three usage patterns are supported:
 *
 * - All options handled: provide a handler for every option, returns `R`
 * - Some options with fallback: provide handlers for some options plus a fallback, returns `R`
 * - Some options without fallback: provide handlers for some options only, returns `R | undefined`
 *
 * @typeParam C The options type defining all possible option variants
 */
export interface Relay<C extends Options> {

	/**
	 * Handles all options with complete handlers.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Mapping of all option keys to their handlers
	 *
	 * @returns The result from the matched handler
	 */<R>(handlers: Handlers<C, R>): R;

	/**
	 * Handles some options without a fallback.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of option keys to handlers
	 *
	 * @returns The result from the matched handler, or `undefined` if no handler matched
	 */<R>(handlers: Partial<Handlers<C, R>>): undefined | R;

	/**
	 * Handles some options with a fallback handler for unmatched options.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of option keys to handlers
	 * @param fallback Fallback handler receiving union of option values
	 *
	 * @returns The result from the matched handler or fallback
	 */<R>(handlers: Partial<Handlers<C, R>>, fallback: Handler<C[keyof C], R>): R;

}


/**
 * Relay options.
 *
 * Defines available options as an object type where each property key names a distinct option
 * and its type specifies the associated value.
 */
export type Options = {

	readonly [key: string]: unknown

}

/**
 * Relay option.
 *
 * Represents a specific option with exactly one active property from the options.
 * TypeScript enforces mutual exclusivity, preventing invalid multi-option values at compile time.
 *
 * @typeParam C The options defining available relay options
 */
export type Option<O extends Options> = {

	readonly [K in keyof O]: { [P in K]: O[P] } & { [P in Exclude<keyof O, K>]?: never }

}[keyof O]


/**
 * Option handlers.
 *
 * Maps each option name to a {@link Handler} that processes the matched value and produces
 * a result of type `R`.
 *
 * @typeParam C The relay options
 * @typeParam R The return type of all handlers
 */
export type Handlers<O extends Options, R> = {

	readonly [K in keyof O]: Handler<O[K], R>

}

/**
 * Option handler.
 *
 * Either a constant value of type `R`, or a function `(value: V) => R` that computes the result.
 *
 * @typeParam V The type of the matched option value
 * @typeParam R The return type of the handler
 */
export type Handler<V = unknown, R = unknown> =
	| R
	| ((value: V) => R)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a type-safe relay function for an option.
 *
 * @typeParam O The options type defining all possible option variants
 *
 * @param option An option variant
 *
 * @returns A {@link Relay} function that accepts handlers for each option and an optional fallback
 */
export function relay<O extends Options>(option: Option<O>): Relay<O> {

	const [label, value] = Object.entries(option)[0] ?? []; // find the active option

	return <R>(handlers: Partial<Handlers<O, R>>, fallback?: Handler<O[keyof O], R>): unknown => {

		return isFunction(handlers[label]) ? handlers[label](value)
			: isDefined(handlers[label]) ? handlers[label]
				: isFunction(fallback) ? fallback(value)
					: fallback;

	};

}
