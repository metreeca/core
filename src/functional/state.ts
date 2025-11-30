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
 * **Basic Usage**
 *
 * Define a state interface with data properties and action methods, then create a state
 * object by providing initial values and transition functions:
 *
 * ```typescript
 * import { State } from '@metreeca/core/state';
 *
 * interface Counter {
 *
 *   readonly count: number;
 *
 *   increment(): this;
 *   reset(): this;
 *
 * }
 *
 * const counter = State<Counter>({
 *
 *   count: 0,
 *
 *   increment({ count }) {
 *     return { count: count + 1 };
 *   },
 *
 *   reset() {
 *     return { count: 0 };
 *   }
 *
 * });
 * ```
 *
 * **Chaining Actions**
 *
 * Actions return new immutable state objects, enabling fluent chaining:
 *
 * ```typescript
 * counter
 *   .increment()  // count is 1
 *   .increment()  // count is 2
 *   .reset();     // count is 0
 * ```
 *
 * **Parameterized Actions**
 *
 * Actions can accept parameters, which are passed as a tuple to the transition function:
 *
 * ```typescript
 * interface Toggle {
 *
 *   readonly items: readonly string[];
 *
 *   toggle(item: string): this;
 *
 * }
 *
 * const toggle = State<Toggle>({
 *
 *   items: [],
 *
 *   toggle({ items }, [item]) {
 *     return {
 *       items: items.includes(item)
 *         ? items.filter(i => i !== item)
 *         : [...items, item]
 *     };
 *   }
 *
 * });
 *
 * toggle
 *   .toggle("apple")    // items is ["apple"]
 *   .toggle("banana")   // items is ["apple", "banana"]
 *   .toggle("apple");   // items is ["banana"]
 * ```
 *
 * @module
 */

import { immutable, Immutable } from "../basic/nested.js";


/**
 * State specification.
 *
 * Maps a state interface to the specification format required by {@link State}:
 *
 * - {@link Action} methods become {@link Transition} functions with inferred parameter types
 * - Other function types are excluded
 * - Data properties are preserved unchanged
 *
 * @typeParam T The state interface type
 *
 * @remarks
 *
 * The type automatically infers input parameter types from action signatures, ensuring
 * type safety between action method parameters and their corresponding transition implementations.
 */
export type Spec<T> = {

	[K in keyof T]:

	T[K] extends Action<T, infer I> ? Transition<T, I>
		: T[K] extends Function ? never
			: T[K];

};


/**
 * State action.
 *
 * Actions are methods defined in state interfaces that generate a new immutable state object
 * by applying a {@link Transition} to the current state.
 *
 * @typeParam T The state type
 * @typeParam I The action input parameters as a readonly tuple
 */
export type Action<T, I extends readonly unknown[]> = (...args: I) => T;

/**
 * State transition.
 *
 * Transitions receive the current state data properties and action inputs, returning a partial
 * state object containing only the properties to update.
 *
 * @typeParam T The state type
 * @typeParam I The action input parameters as a readonly tuple
 */
export type Transition<T, I extends readonly unknown[]> = (state: Data<T>, inputs: I) => Partial<T>;


/**
 * State data.
 *
 * Represents the immutable data subset of a state interface, extracting properties and
 * excluding all action methods.
 *
 * @typeParam T The state interface type
 */
export type Data<T> = {

	readonly [K in keyof T as T[K] extends Function ? never : K]: Immutable<T[K]>

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a state object from a specification.
 *
 * Takes a state specification object that must provide:
 *
 * - For each data field in the interface: a data field providing the initial value
 * - For each action in the interface: a {@link Transition} function taking the same inputs
 *
 * Returns a state object conforming to the expected state interface. Action methods
 * in the returned object apply transitions and return a new immutable state.
 *
 * Supports both parameterless actions and parameterized actions with type-safe parameter inference.
 *
 * @typeParam T The state interface type defining data properties and action methods
 *
 * @param spec The state specification with initial values and transition functions
 *
 * @returns An immutable state object of type T
 *
 * @remarks
 *
 * - State objects are immutable; all changes must go through action methods
 * - Action methods apply transitions and return new state objects
 * - Action methods can be destructured and called independently (e.g., `const { increment } = state; increment();`)
 * - Parameterized actions receive inputs as a tuple in the transition function
 * - Returns same state reference when transition returns empty partial update
 * - Returns same state reference when all partial values are shallowly equal (`Object.is`) to current values
 */
export function State<T>(spec: Spec<T>): Immutable<T> {

	const actions = Object.fromEntries(Object.entries(spec)
		.filter(([, value]) => typeof value === "function")
		.map(([key, value]) => [key, function (this: Immutable<T>, ...inputs: readonly unknown[]): Immutable<T> {

			const partial = (value as Transition<T, readonly unknown[]>)(this as Data<T>, inputs);

			const changed = Object.entries(partial).some(([key, value]) =>
				!Object.is(value, this[key as keyof Immutable<T>])
			);

			return changed ? bind(Object.assign({}, this, immutable(partial))) : this;

		}]));


	// bind actions to enable method destructuring: const { increment } = state; increment();
	// use Object.freeze() instead of immutable() to avoid cloning, which would break method bindings

	function bind(data: any) {
		return Object.freeze(Object.assign(data, Object.fromEntries(Object.entries(actions)
			.map(([key, value]) => [key, value.bind(data)])
		)));
	}

	// actions overwrite transition methods in spec; the final object conforms to the expected interface

	return bind(Object.assign({}, immutable(spec)));

}
