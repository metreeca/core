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
 * @module
 *
 * **Concepts**
 *
 * - **State Interface**: An interface defining data properties and action methods
 * - **State Manager**: An object implementing a state interface and managing state transitions
 *
 * State managers are created by the {@link State} function from a {@link Spec} where action
 * methods are defined as {@link Transition} functions that return partial updates. These
 * updates are merged into a new immutable state manager, and the action methods return the
 * new state manager. Eliminates manual state spreading and ensures type-safe updates.
 *
 * **Basic Usage**
 *
 * Define a state interface with data properties and action methods, then create a state
 * manager by providing initial values and transition functions:
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
 *   increment() {
 *     return { count: this.count + 1 };
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
 * Actions return new immutable state managers (required for immutability):
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
 * Actions can accept parameters, which are passed as individual arguments to the transition function:
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
 *   toggle(item) {
 *     return {
 *       items: this.items.includes(item)
 *         ? this.items.filter(i => i !== item)
 *         : [...this.items, item]
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
 * **Observers**
 *
 * State managers support the observer pattern through `attach()` and `detach()` methods.
 * Both methods create and return a **new** state manager, preserving immutability.
 * Observers are called asynchronously when state changes occur:
 *
 * ```typescript
 * const counter = State<Counter>({
 *
 *   count: 0,
 *
 *   increment() { return { count: this.count + 1 }; }
 *
 * });
 *
 * const observer = (state: Counter) => {
 *   console.log("Count changed:", state.count);
 * };
 *
 * // attach() returns a NEW state manager with the observer attached
 *
 * const withObserver = counter.attach(observer);
 *
 * withObserver.increment(); // Logs asynchronously: "Count changed: 1"
 *
 * // Observers inherited through state transitions
 *
 * withObserver.increment().increment(); // Each transition notifies observers
 *
 * // detach() returns a NEW state manager without the observer
 *
 * const withoutObserver = withObserver.detach(observer);
 * ```
 *
 * Observers are compared by **reference** equality (`===`), which means the same function
 * reference can only be attached once and must be used to detach.
 *
 * @module
 */

import { immutable, Immutable } from "../basic/nested.js";


/**
 * Symbol used to store observers on state objects.
 * Non-enumerable to prevent enumeration and maintain clean state interface.
 */
const Observers = Symbol("observers");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * State manager interface.
 *
 * Provides methods to attach and detach observers that are notified asynchronously
 * when state changes occur. Both methods preserve immutability by creating new state
 * managers rather than modifying existing ones.
 *
 * Observers are inherited through state transitions: when an action creates a new state
 * manager, all attached observers are automatically transferred to the new state manager
 * and notified.
 *
 * @typeParam T The state interface type
 *
 * @remarks
 *
 * Observer notifications are asynchronous and executed via queueMicrotask(), ensuring
 * that state transitions complete synchronously while observers run after the current
 * execution context. Observer errors are caught and logged without affecting the state
 * transition or other observers.
 */
export interface State<T> {

	/**
	 * Attaches an observer to receive state change notifications.
	 *
	 * Creates and returns a **new** state manager with the observer attached. The original
	 * state manager is not modified. Observers are called asynchronously after each state
	 * transition using `queueMicrotask()`. If the observer is already attached, returns
	 * the same state manager reference (idempotent operation).
	 *
	 * Observer identity is determined by reference equality (`===`). The same function
	 * reference cannot be attached multiple times.
	 *
	 * @param observer Function called with the new state after each transition
	 * @returns New state manager with observer attached, or same reference if already attached
	 */
	attach(observer: Observer<T>): this;

	/**
	 * Detaches an observer from state change notifications.
	 *
	 * Creates and returns a **new** state manager without the observer. The original
	 * state manager is not modified. If the observer is not currently attached, returns
	 * the same state manager reference (idempotent operation).
	 *
	 * Observer identity is determined by reference equality (`===`). You must pass
	 * the exact same function reference that was attached.
	 *
	 * @param observer Function to stop notifying
	 * @returns New state manager without observer, or same reference if not attached
	 */
	detach(observer: Observer<T>): this;

}

/**
 * Observer function type.
 *
 * Receives the new state data after a transition and performs side effects.
 * Observers are called asynchronously via `queueMicrotask()` and should not throw errors.
 *
 * @typeParam T The state interface type
 *
 * @remarks
 *
 * Observer errors are caught and silently ignored, preventing them from affecting other
 * observers or the state transition itself.
 */
export type Observer<T> = (data: Immutable<T>) => void;


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
 * Actions are methods defined in state interfaces that generate a new immutable state manager
 * by applying a {@link Transition} to the current state.
 *
 * @typeParam T The state interface type
 * @typeParam I The action input parameters as a readonly tuple
 */
export type Action<T, I extends readonly unknown[]> = (...args: I) => T;

/**
 * State transition.
 *
 * Transitions receive action inputs, access current state data via `this`, and return
 * a partial state object containing only the properties to update.
 *
 * @typeParam T The state interface type
 * @typeParam I The action input parameters as a readonly tuple
 */
export type Transition<T, I extends readonly unknown[]> = (...args: I) => Partial<T>;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a state manager from a specification.
 *
 * Takes a state specification object that must provide:
 *
 * - For each data field in the interface: a data field providing the initial value
 * - For each action in the interface: a {@link Transition} function taking the same inputs
 *
 * Returns a state manager implementing the state interface. Action methods in the returned
 * state manager apply transitions and return a new immutable state manager.
 *
 * Supports both parameterless actions and parameterized actions with type-safe parameter inference.
 *
 * @typeParam T The state interface type defining data properties and action methods
 *
 * @param spec The state specification with initial values and transition functions
 *
 * @returns A new state manager implementing the given state interface (type `State<T> & Immutable<T>`)
 *
 * @remarks
 *
 * **Immutability**
 *
 * - State managers are immutable; all changes must go through action methods
 * - Action methods apply transitions and return new immutable state managers
 *
 * **Actions & Transitions**
 *
 * - Action methods can be destructured and called independently (e.g., `const { increment } = state; increment();`)
 * - Transition functions receive original input parameters and access state via `this`
 *
 * **Observer System**
 *
 * - Observers are attached via `attach()` and inherited through state transitions
 * - Observers are notified asynchronously after state changes using `queueMicrotask()`
 * - Observer identity is based on reference equality; the same function can only be attached once
 *
 * **Performance Optimization**
 *
 * - Returns same state manager reference when transition returns empty partial update
 * - Returns same state manager reference when all partial values are shallowly equal (`Object.is`) to current values
 */
export function State<T>(spec: Spec<T>): State<T> & Immutable<T> {

	/**
	 * Internal type representing a state object with observer storage.
	 * Extends the immutable state with non-enumerable observer set.
	 */
	type StateWithObservers<T> = State<T> & Immutable<T> & {
		[Observers]?: Set<Observer<T>>;
	};


	const actions = Object.fromEntries([

		// system methods

		["attach", attach],
		["detach", detach],

		// spec-based actions

		...Object.entries(spec)
			.filter(([, value]) => typeof value === "function")
			.map(([key, value]) => [
				key,
				function (this: StateWithObservers<T>, ...inputs: readonly unknown[]): State<T> {

					const partial = (value as Transition<T, readonly unknown[]>).call(this, ...inputs);

					const changed = Object.entries(partial).some(([key, value]) =>
						!Object.is(value, this[key as keyof Immutable<T>])
					);

					if ( changed ) { // create new state and explicitly preserve observers

						const data = Object.assign({}, this, immutable(partial));
						const observers = this[Observers];

						const next = bind(data, observers);

						if ( observers ) {
							notify(observers, next as Immutable<T>);
						}

						return next;

					} else {

						return this;

					}

				}]),

	]);


	// actions overwrite transition methods in spec; the final object conforms to the expected interface

	return bind(Object.assign({}, immutable(spec)));


	function bind(data: any, observers?: Set<Observer<T>>): State<T> & Immutable<T> {

		// bind actions to enable method destructuring: const { increment } = state; increment();
		// use Object.freeze() instead of immutable() to avoid cloning, which would break method bindings

		const bound = Object.assign(data, Object.fromEntries(Object.entries(actions)
			.map(([key, value]) => [key, (value as Function).bind(data)])
		));

		return Object.freeze(observers === undefined ? bound : Object.defineProperty(bound, Observers, {
			value: observers,
			enumerable: false,
			writable: false,
			configurable: false
		}));
	}


	function attach(this: StateWithObservers<T>, observer: Observer<T>): State<T> {

		const observers = this[Observers] || new Set<Observer<T>>();

		return observers.has(observer)
			? this // same-state optimization
			: bind(Object.assign({}, this), insert(observers, observer));

	}

	function detach(this: StateWithObservers<T>, observer: Observer<T>): State<T> {

		const observers = this[Observers];

		return observers && observers.has(observer)
			? bind(Object.assign({}, this), remove(observers, observer))
			: this; // same-state optimization

	}


	function insert(observers: Set<Observer<T>>, observer: Observer<T>): Set<Observer<T>> {

		const updated = new Set(observers);

		updated.add(observer);

		return updated;
	}

	function remove(observers: Set<Observer<T>>, observer: Observer<T>): Set<Observer<T>> {

		const updated = new Set(observers);

		updated.delete(observer);

		return updated;
	}

	function notify<T>(observers: Set<Observer<T>>, state: Immutable<T>): void {
		observers.forEach(observer => queueMicrotask(() => {

			try { observer(state); } catch ( ignore ) {/**/} // !!! reconsider

		}));
	}

}
