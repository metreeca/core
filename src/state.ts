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
 * Type-safe immutable state manager.
 *
 * Use when managing objects that change over time through named actions - like a counter
 * with increment and decrement operations, a shopping cart adding and removing items, or
 * a toggle managing on/off state with enable and disable actions.
 *
 * The {@link State} function creates state objects from a {@link Spec} where action
 * methods are defined as {@link Transition} functions that return partial updates. These
 * updates are merged into a new immutable state object, and the action methods return the
 * new state. Eliminates manual state spreading and ensures type-safe updates.
 *
 * **Usage**
 *
 * ```typescript
 * import { State } from '@metreeca/core/state';
 *
 * // Define state interface with data fields and action methods
 *
 * interface Counter {
 *
 *   readonly count: number;
 *   readonly step: number;
 *
 *   increment(): this;
 *
 *   reset(): this;
 *
 * }
 *
 * // Create state from specification
 *
 * const counter = State<Counter>({
 *
 *   count: 0,
 *   step: 1,
 *
 *   increment({ count, step }) {
 *     return { count: count + step };
 *   },
 *
 *   reset() {
 *     return { count: 0 };
 *   }
 *
 * });
 *
 * // Actions return new immutable state objects
 *
 * counter
 *   .increment()  // count is 1
 *   .increment()  // count is 2
 *   .reset();     // count is 0
 * ```
 *
 * @module
 */

import { Immutable } from "./nested.js";

/**
 * State action.
 *
 * Actions are methods defined in state interfaces that generate a new immutble state object
 * by applying a {@link Transition} to the current state.
 *
 * @typeParam T The state type
 */
export type Action<T> = () => T;

/**
 * State transition.
 *
 * Transitions receive the current state and return a partial state object
 * containing only the properties to update.
 *
 * @typeParam T The state type
 */
export type Transition<T> = (state: T) => Partial<T>;


/**
 * State specification.
 *
 * Maps a state interface to the specification format required by {@link State}:
 *
 * - {@link Action} methods become {@link Transition} functions
 * - Other function types are excluded
 * - Data properties are preserved unchanged
 *
 * @typeParam T The state interface type
 */
export type Spec<T> = {

	[K in keyof T]: T[K] extends Function
		? T[K] extends Action<T> ? Transition<T> : never
		: T[K];

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a state object from a specification.
 *
 * Takes a state specification where action methods are provided as
 * {@link Transition} functions, and returns a state object
 * conforming to the original state interface. Action methods in the
 * returned object apply transitions and return a new immutable state.
 *
 * @typeParam T The state interface type
 *
 * @param spec The state specification with data properties and transition functions
 *
 * @returns An immutable state object
 *
 * @remarks
 *
 * State objects are immutable. All state changes must be managed through action
 * methods, which apply transitions and return new state objects.
 *
 * The implementation optimizes updates by returning the same state object reference when
 * a transition returns an empty partial update, avoiding unnecessary state changes.
 */
export function State<T>(spec: Spec<T>): Immutable<T> {

	const buildState = (data: Record<string, unknown>): Immutable<T> => {

		const specKeys = Object.keys(spec) as Array<keyof T>;
		const stateObject: Record<string, unknown> = {};

		for (const key of specKeys) {
			const specValue = spec[key];
			const isTransition = typeof specValue === "function";

			stateObject[key as string] = isTransition
				? createAction(specValue as Transition<T>)
				: data[key as string];
		}

		return immutable(stateObject) as Immutable<T>;

	};

	const createAction = (transition: Transition<T>) => {

		return function (this: Immutable<T>): Immutable<T> {

			const partial = transition(this);
			const partialKeys = Object.keys(partial);
			const isEmpty = partialKeys.length === 0;

			if ( isEmpty ) {
				return this;
			} else {

				const hasChanges = partialKeys.some(key =>
					!Object.is(
						partial[key as keyof Partial<T>],
						this[key as keyof Immutable<T>]
					)
				);

				if ( hasChanges ) {
					const currentData = extractData(this);
					const mergedData = { ...currentData, ...partial };

					return buildState(mergedData);
				} else {
					return this;
				}

			}

		};

	};

	const extractData = (state: Immutable<T> | Spec<T>): Record<string, unknown> => {

		const specKeys = Object.keys(spec) as Array<keyof T>;
		const dataRecord: Record<string, unknown> = {};

		for (const key of specKeys) {
			const value = state[key];
			const isFunction = typeof value === "function";

			if ( !isFunction ) {
				dataRecord[key as string] = value;
			}
		}

		return dataRecord;

	};

	const initialData = extractData(spec);

	return buildState(initialData);

}
