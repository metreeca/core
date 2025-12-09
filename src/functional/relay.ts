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
 * The {@link createRelay} function lets you handle each option with a dedicated handler, while TypeScript
 * ensures all options are covered and values are accessed safely. Eliminates verbose conditional
 * logic and prevents bugs from unhandled options.
 *
 * **Basic Pattern Matching**
 *
 * Define options and match with function handlers:
 *
 * ```typescript
 * import { createRelay } from '@metreeca/core/relay';
 *
 * type FieldState = {
 *   unset: void;
 *   value: string;
 *   error: Error;
 * };
 *
 * const r = createRelay<FieldState>({
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
 * **Partial Matching without Fallback**
 *
 * Handle specific options only, returning `undefined` for unhandled options:
 *
 * ```typescript
 * const email = r({
 *   value: (email) => email
 * }); // Returns string | undefined
 * ```
 *
 * **Partial Matching with Fallback**
 *
 * Handle specific options and provide a fallback for others:
 *
 * ```typescript
 * const display = r({
 *   value: (email) => email
 * }, "‹blank›");
 * ```
 *
 * **Delegation to Fallback**
 *
 * When a fallback is provided, handlers receive a delegate function to invoke common logic:
 *
 * ```typescript
 * const format = (v: string | Error | void) =>
 *   v instanceof Error ? `error: ${v.message}` : `value: ${v}`;
 *
 * const display = r({
 *   unset: "Enter email",
 *   value: (email, delegate) => email.length > 0 ? email : delegate(),
 *   error: (_err, delegate) => delegate()
 * }, format);
 * ```
 *
 * @module
 */

import { isDefined, isFunction } from "../index.js";


/**
 * Relay.
 *
 * Accepts handlers for each option and returns the result from the matched handler.
 * Four usage patterns are supported:
 *
 * - Some options without fallback: provide handlers for some options only, returns `R | undefined`
 * - Some options with fallback: provide handlers for some options plus a fallback, returns `R`
 * - All options handled: provide a handler for every option, returns `R`
 * - All options with fallback: provide all handlers plus a fallback for delegation, returns `R`
 *
 * When a fallback is provided, handlers receive a delegate function to invoke it.
 *
 * @typeParam O The options type defining all possible option variants
 */
export interface Relay<O extends Options> {

	/**
	 * Handles some options without a fallback.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of option keys to handlers
	 *
	 * @returns The result from the matched handler, or `undefined` if no handler matched
	 */<R>(handlers: Partial<Handlers<O, R>>): undefined | R;

	/**
	 * Handles some options with a fallback handler for unmatched options.
	 *
	 * Handlers receive a delegate function that can be called to invoke the fallback.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Partial mapping of option keys to delegating handlers
	 * @param fallback Fallback handler receiving union of option values
	 *
	 * @returns The result from the matched handler or fallback
	 */<R>(handlers: Partial<Handlers<O, R, () => R>>, fallback: Handler<O[keyof O], R>): R;

	/**
	 * Handles all options with complete handlers.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Mapping of all option keys to their handlers
	 *
	 * @returns The result from the matched handler
	 */<R>(handlers: Handlers<O, R>): R;

	/**
	 * Handles all options with complete handlers and a fallback for delegation.
	 *
	 * Handlers receive a delegate function that can be called to invoke the fallback,
	 * enabling factored common logic across multiple option handlers.
	 *
	 * @typeParam R The return type of all handlers
	 *
	 * @param handlers Mapping of all option keys to delegating handlers
	 * @param fallback Fallback handler for delegated calls
	 *
	 * @returns The result from the matched handler or fallback
	 */<R>(handlers: Handlers<O, R, () => R>, fallback: Handler<O[keyof O], R>): R;

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
 * @typeParam O The options defining available relay options
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
 * @typeParam O The relay options
 * @typeParam R The return type of all handlers
 * @typeParam D The delegate function type; defaults to `never` (no delegation)
 */
export type Handlers<O extends Options, R, D extends (() => R) | never = never> = {

	readonly [K in keyof O]: Handler<O[K], R, D>

}

/**
 * Option handler.
 *
 * Either a constant value of type `R`, or a function that receives the matched value and optionally
 * a delegate function for invoking the fallback handler.
 *
 * @typeParam V The type of the matched option value
 * @typeParam R The return type of the handler
 * @typeParam D The delegate function type; defaults to `never` (no delegation)
 */
export type Handler<V = unknown, R = unknown, D extends (() => R) | never = never> =
	| R
	| ([D] extends [never]
	? ((value: V) => R)
	: ((value: V, delegate: D) => R))


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
export function createRelay<O extends Options>(option: Option<O>): Relay<O> {

	const entries = Object.entries(option);

	if ( entries.length !== 1 ) {
		throw new TypeError(`relay: option must have exactly one property`);
	}

	const [label, value] = entries[0];

	return <R>(handlers: Partial<Handlers<O, R, () => R>>, fallback?: Handler<O[keyof O], R>): unknown => {

		const handler = handlers[label];

		return isFunction(handler) ? handler(value, delegate)
			: isDefined(handler) ? handler
				: isFunction(fallback) ? fallback(value)
					: fallback;


		function delegate() {
			return isFunction(fallback) ? fallback(value)
				: isDefined(fallback) ? fallback
					: undefined;
		}

	};

}
