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
 * Type-safe immutable state management.
 *
 * Use when managing objects that change over time through named transitions - like a counter
 * with increment and decrement operations, a shopping cart adding and removing items, or
 * a toggle managing on/off state with enable and disable transitions.
 *
 * **Concepts**
 *
 * - {@link State}: An interface defining version data properties and transition methods
 * - {@link Version}: The data properties of a {@link State}, excluding transition methods and
 *   observers
 * - {@link Transition}: A method that takes inputs and returns a new {@link State} with updated
 *   version data
 * - {@link Update}: A function that accesses current version data via `this` and returns partial
 *   version data to be merged into the state
 * - {@link Observer}: A function called asynchronously when state transitions occur
 * - {@link Manager}: Housekeeping operations (snapshots, observers) accessed via {@link manageState}`(state)`,
 *   kept separate from {@link State} to avoid polluting user-defined interfaces
 *
 * States are created by the {@link State} factory from a {@link Seed} where transition
 * methods are implemented as {@link Update} functions that return partial updates. These
 * updates are merged into a new immutable state, and transition methods return the
 * new state. Eliminates manual state spreading and ensures type-safe updates.
 *
 * **Basic Usage**
 *
 * Define a state interface with data properties and transition methods, then create a state
 * by providing initial values and update functions:
 *
 * ```typescript
 * import { createState } from '@metreeca/core/state';
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
 * const counter = createState<Counter>({
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
 * **Chaining Transitions**
 *
 * Transitions return new immutable states:
 *
 * ```typescript
 * counter
 *   .increment()  // count is 1
 *   .increment()  // count is 2
 *   .reset();     // count is 0
 * ```
 *
 * **Parameterized Transitions**
 *
 * Transitions can accept parameters, which are passed as individual arguments to the update function:
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
 * const toggle = createState<Toggle>({
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
 * States support the observer pattern through manager metadata accessed via {@link manageState}`(state)`.
 * The manager's `attach(observer)` and `detach(observer)` methods create and return
 * a **new** state with the observer attached or detached, preserving immutability.
 * Observers are called asynchronously when transitions occur:
 *
 * ```typescript
 * const counter = createState<Counter>({
 *
 *   count: 0,
 *
 *   increment() { return { count: this.count + 1 }; }
 *
 * });
 *
 * const observer = (version: Version<Counter>) => {
 *   console.log("Count changed:", version.count);
 * };
 *
 * // Get manager and attach observer - returns a new state with the observer attached
 *
 * const withObserver = manageState(counter).attach(observer);
 *
 * withObserver.increment(); // Logs asynchronously: "Count changed: 1"
 *
 * // Observers inherited through transitions
 *
 * withObserver.increment().increment(); // Each transition notifies observers
 *
 * // Detach observer - returns a new state without the observer
 *
 * const withoutObserver = manageState(withObserver).detach(observer);
 * ```
 *
 * Observers are compared by **reference** equality (`===`), which means the same function
 * reference can only be attached once and must be used to detach.
 *
 * **Snapshots**
 *
 * States support creating and restoring version snapshots for implementing features
 * like undo/redo, checkpointing, or time-travel debugging through manager metadata
 * accessed via {@link manageState}`(state)`. Snapshots capture the current version data but not observers.
 *
 * Call the manager's `capture()` method to create a snapshot:
 *
 * ```typescript
 * const counter = createState<Counter>({
 *   count: 0,
 *   increment() { return { count: this.count + 1 }; }
 * });
 *
 * const step1 = counter.increment();
 * const step2 = step1.increment();
 *
 * // Create snapshot at step2 (count is 2)
 * const snapshot = manageState(step2).capture();
 * ```
 *
 * Restore state from a snapshot by calling the manager's `restore(snapshot)` method:
 *
 * ```typescript
 * const step3 = step2.increment(); // count is 3
 *
 * // Restore to step2 (count is 2)
 * const restored = manageState(step3).restore(snapshot);
 *
 * console.log(restored.count); // 2
 * ```
 *
 * Snapshots enable, for instance, undo/redo patterns by storing version history:
 *
 * ```typescript
 * const history: Version<Counter>[] = [];
 * let current = counter;
 *
 * history.push(manageState(current).capture()); // Save initial version
 * current = current.increment();
 *
 * history.push(manageState(current).capture()); // Save after increment
 * current = current.increment();
 *
 * history.push(manageState(current).capture()); // Save after second increment
 *
 * // Undo to previous version
 * current = manageState(current).restore(history[history.length - 2]);
 * ```
 *
 * @module
 */

import { immutable } from "../basic/nested.js";


/**
 * Symbol used to store managers on state instances.
 * Non-enumerable to prevent enumeration and maintain clean state interface.
 */
const Manager = Symbol("manager");

/**
 * Symbol used to store observers on state instances.
 * Non-enumerable to prevent enumeration and maintain clean state interface.
 */
const Observers = Symbol("observers");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Versioned data.
 *
 * An immutable object combining:
 *
 * - **Version Data** - Data properties describing the current state
 * - **Transition Methods** - Methods with signature like `transition(...inputs): this` that
 *   take inputs and generate a new immutable state with updated version data.
 *
 * @remarks
 *
 * **Immutability**
 *
 * - States are immutable; all changes go through transition methods
 * - Transition methods return new immutable States
 *
 * **Transitions**
 *
 * - Transition methods can be destructured and called independently (e.g., `const { increment } = state; increment();`)
 */
export interface State {

	[member: string]: unknown | Transition<this, readonly unknown[]>;

}


/**
 * State instance.
 *
 * A concrete {@link State} implementation created by the {@link createState} factory. Combines state
 * interface members (data properties and transition methods) with {@link Manager} operations
 * accessible via {@link manageState}`(state)`.
 *
 * @typeParam T The state interface type
 */
export type Instance<T extends State> = T & {

	readonly __brand: unique symbol

};

/**
 * State manager.
 *
 * Provides housekeeping operations for state instances, including snapshotting, restoration,
 * and observer management. See module documentation for detailed usage examples.
 *
 * @typeParam T The state type this manager is attached to
 */
export type Manager<T extends State> = {

	/**
	 * Captures a snapshot of the current version.
	 *
	 * Returns a snapshot containing only the data properties, excluding transition
	 * methods and observers. Useful for persistence, undo/redo, or time-travel debugging.
	 *
	 * @returns Snapshot of the current version
	 */
	capture(): Version<T>;

	/**
	 * Restores a state from a snapshot.
	 *
	 * Returns a **new** state with version data restored from the snapshot.
	 * Transition methods and observers are preserved.
	 *
	 * @param snapshot Snapshot created by calling `capture()` on this State or a related state
	 *
	 * @returns A new state with restored version data
	 */
	restore(snapshot: Version<T>): Instance<T>;


	/**
	 * Attaches an observer.
	 *
	 * Returns a **new** state with the observer attached. Observers are notified
	 * asynchronously when transitions occur. Observer errors are caught and silently ignored.
	 *
	 * The operation is idempotent - attaching an already-attached observer returns the
	 * same State reference. Observer identity is determined by reference equality (`===`).
	 *
	 * @param observer Function called with the new version after each transition
	 *
	 * @returns A new state with observer attached, or same reference if already attached
	 */
	attach(observer: Observer<T>): Instance<T>;

	/**
	 * Detaches an observer.
	 *
	 * Returns a **new** state with the observer detached.
	 *
	 * The operation is idempotent - detaching a non-attached observer returns the
	 * same State reference. Observer identity is determined by reference equality (`===`).
	 *
	 * @param observer Function to remove from observers
	 *
	 * @returns A new state with observer detached, or same reference if not attached
	 */
	detach(observer: Observer<T>): Instance<T>;

}

/**
 * State version.
 *
 * The data properties of a {@link State}, excluding transition methods and observers.
 */
export type Version<T extends State> = {

	[K in keyof T as T[K] extends Function ? never : K]: T[K]

};

/**
 * State observer.
 *
 * Receives version data after a transition and performs side effects. Observers are
 * called asynchronously via `queueMicrotask()`. Errors are caught and silently ignored
 * to prevent affecting other observers or the transition itself.
 *
 * @typeParam T The State type
 */
export type Observer<T extends State> = {

	(version: Instance<T>): void

};


/**
 * State seed value.
 *
 * Maps a state interface to the seed value type required by {@link State} factory:
 *
 * - Data properties are preserved unchanged
 * - {@link Transition} methods are mapped to {@link Update} functions with inferred parameter types
 * - Other function types are excluded
 *
 * @typeParam T The state interface type
 *
 * @remarks
 *
 * The type automatically infers input parameter types from transition signatures, ensuring
 * type safety between transition method parameters and their corresponding update functions.
 */
export type Seed<T> = {

	[K in keyof T]:

	T[K] extends Transition<T, infer I> ? Update<T, I>
		: T[K] extends Function ? never
			: T[K];

};


/**
 * State transition.
 *
 * Transition methods take inputs and generate a new immutable state by applying an
 * {@link Update} to the current state.
 *
 * @typeParam T The state type
 * @typeParam I The transition input parameters as a readonly tuple
 */
export type Transition<T, I extends readonly unknown[]> = {

	(...inputs: I): T

};

/**
 * State update.
 *
 * Update functions receive transition inputs, access current version data via `this`,
 * and return a partial update containing only the properties to change.
 *
 * @typeParam T The state type
 * @typeParam I The transition input parameters as a readonly tuple
 */
export type Update<T, I extends readonly unknown[]> = {

	(...inputs: I): Partial<T>

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * State factory.
 *
 * Creates a state implementation from a seed value providing:
 *
 * - For each data property: initial value
 * - For each {@link Transition} method: {@link Update} function taking the same inputs
 *
 * @typeParam T The state interface type to be implemented
 *
 * @param seed Seed value with initial data and update functions
 *
 * @returns A new state implementation enforcing deep immutability with attached manager metadata
 *
 * @remarks
 *
 * **Performance Optimization**
 *
 * - Returns same state reference when update returns empty partial
 * - Returns same state reference when all partial values are shallowly equal (`Object.is`) to
 *   current values
 */
export function createState<T extends State>(seed: Seed<T>): Instance<T> {

	/**
	 * Internal type representing a state object with observer storage.
	 * Extends the immutable state with non-enumerable observer set.
	 */
	type Observed<T extends State> = Instance<T> & {

		[Observers]?: Set<Observer<T>>;

	};


	const actions = Object.fromEntries(Object.entries(seed)
		.filter(([, value]) => typeof value === "function")
		.map(([key, value]) => [key, function (this: Observed<T>, ...inputs: readonly unknown[]): T {

			const partial = (value as Update<T, readonly unknown[]>).call(this, ...inputs);

			const changed = Object.entries(partial).some(([key, value]) =>
				!Object.is(value, this[key as keyof Observed<T>])
			);

			if ( changed ) { // create new state and explicitly preserve observers

				const data = Object.assign({}, this, immutable(partial));
				const observers = this[Observers];

				const next = bind(data, observers);

				if ( observers ) {
					notify(observers, next);
				}

				return next;

			} else {

				return this;

			}

		}]));


	// actions overwrite transition methods in seed; the final object conforms to the expected interface

	return bind(Object.assign({}, immutable(seed)));


	function bind(data: any, observers?: Set<Observer<T>>): Instance<T> {

		const state = {} as Observed<T>;

		// assign all data properties

		for (const [key, value] of Object.entries(data)) {
			Object.defineProperty(state, key, {
				value: value,
				enumerable: true,
				writable: true,
				configurable: true
			});
		}

		// assign all transition methods

		for (const [key, value] of Object.entries(actions)) {
			Object.defineProperty(state, key, {
				value: (value as Function).bind(state),
				enumerable: true,
				writable: true,
				configurable: true
			});
		}

		// add observers if provided

		if ( observers !== undefined ) {
			Object.defineProperty(state, Observers, {
				value: observers,
				enumerable: false,
				writable: false,
				configurable: false
			});
		}

		// create and attach manager

		Object.defineProperty(state, Manager, {
			value: {
				capture: () => capture.call(state),
				restore: (version: Version<T>) => restore.call(state, version),
				attach: (observer: Observer<T>) => attach.call(state, observer),
				detach: (observer: Observer<T>) => detach.call(state, observer)
			},
			enumerable: false,
			writable: false,
			configurable: false
		});

		return Object.freeze(state) as Instance<T>;
	}


	function capture(this: Observed<T>): Version<T> {

		return Object.fromEntries(Object.entries(this)
			.filter(([, value]) => typeof value !== "function")
		) as Version<T>;

	}

	function restore(this: Observed<T>, version: Version<T>) {

		return bind(Object.assign({}, this, immutable(version)), this[Observers]);

	}


	function attach(this: Observed<T>, observer: Observer<T>): Instance<T> {

		const observers = this[Observers] || new Set<Observer<T>>();

		return observers.has(observer)
			? this // same-state optimization
			: bind(Object.assign({}, this), insert(observers, observer));

	}

	function detach(this: Observed<T>, observer: Observer<T>): Instance<T> {

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

	function notify(observers: Set<Observer<T>>, version: Instance<T>): void {

		observers.forEach(observer => queueMicrotask(() => {

			try { observer(version); } catch ( ignore ) {/**/} // !!! reconsider

		}));

	}

}

/**
 * Retrieves the {@link Manager} for a state instance.
 *
 * @typeParam T The state type
 *
 * @param instance The state instance
 *
 * @returns The state instance manager providing snapshot, restoration, and observer operations
 *
 * @throws Error if the object is not a valid state instance
 */
export function manageState<T extends State>(instance	: Instance<T>): Manager<T> {

	if ( instance === null || typeof instance !== "object" || !(Manager in instance) ) {
		throw new Error("not a state instance");
	}

	return (instance as any)[Manager];

}
