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

import { describe, expect, it } from "vitest";

import { Action, State, Transition } from "./state.js";

/**
 * Type system validation tests.
 *
 * These tests verify TypeScript's compile-time type checking behavior.
 * Tests marked with @ts-expect-error should fail compilation, demonstrating
 * that the type system prevents invalid usage. runtime assertions are secondary
 * and only ensure the test file remains valid JavaScript.
 */
describe("State", () => {

	describe("State interface - Action signature validation", () => {

		it("should accept simple state with single action", async () => {

			// valid state interface with action returning `this`

			interface ValidSimple {
				readonly value: number;

				step(): this;
			}

			// ✓ valid: action method returns `this`

			const state = State<ValidSimple>({
				value: 0,
				step() { return { value: 1 }; }
			});

			expect(state.value).toBe(0);
			expect(typeof state.step).toBe("function");

		});

		it("should accept state with multiple actions", async () => {

			// valid state interface with multiple actions

			interface ValidMultiAction {
				readonly count: number;
				readonly delta: number;

				increment(): this;

				decrement(): this;

				reset(): this;
			}

			// ✓ valid: all action methods return `this`

			const state = State<ValidMultiAction>({
				count: 0,
				delta: 1,
				increment({ count, delta }) { return { count: count+delta }; },
				decrement({ count, delta }) { return { count: count-delta }; },
				reset() { return { count: 0 }; }
			});

			expect(state.count).toBe(0);
			expect(state.delta).toBe(1);

		});

		it("should accept state with optional properties", async () => {

			// valid state interface with optional properties

			interface ValidOptional {
				readonly value: number;
				readonly label?: string;

				setValue(): this;
			}

			// ✓ valid: optional data properties are allowed

			const state = State<ValidOptional>({
				value: 0,
				setValue() { return { value: 42 }; }
			});

			expect(state.value).toBe(0);

		});

		it("should accept data-only state (no actions)", async () => {

			// valid state interface with readonly data only

			interface ValidDataOnly {
				readonly x: number;
				readonly y: number;
			}

			// ✓ valid: interfaces with only data properties (no actions)

			const state = State<ValidDataOnly>({
				x: 0,
				y: 0
			});

			expect(state.x).toBe(0);
			expect(state.y).toBe(0);

		});

	});

	describe("Invalid action signatures - Return type constraints", () => {

		it("type check: should reject action returning string instead of this", async () => {

			// invalid state interface with action returning non-`this` type

			interface InvalidReturnType {
				readonly value: number;

				step(): string;
			}

			// ✗ invalid: action method returns `string` instead of `this`
			// Type error is caught at compile time by @ts-expect-error

			State<InvalidReturnType>({
				value: 0,
				// @ts-expect-error
				step() { return "invalid"; }
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject action returning void instead of this", async () => {

			// invalid state interface with action returning `void`

			interface InvalidVoidReturn {
				readonly count: number;

				increment(): void;
			}

			// ✗ invalid: action method returns `void` instead of `this`
			// Type error is caught at compile time by @ts-expect-error

			State<InvalidVoidReturn>({
				count: 0,
				// @ts-expect-error
				increment() { return {}; }
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject action returning number instead of this", async () => {

			// invalid state interface with action returning primitive type

			interface InvalidNumberReturn {
				readonly value: number;

				getValue(): number;
			}

			// ✗ invalid: action method returns `number` instead of `this`
			// Type error is caught at compile time by @ts-expect-error

			State<InvalidNumberReturn>({
				value: 42,
				// @ts-expect-error
				getValue() { return { value: 0 }; }
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject async actions (Promise<this>)", async () => {

			// invalid state interface with action returning Promise

			interface InvalidPromiseReturn {
				readonly data: string;

				load(): Promise<this>;
			}

			// ✗ invalid: async actions not supported (returns `Promise<this>` not `this`)
			// Type error is caught at compile time by @ts-expect-error

			State<InvalidPromiseReturn>({
				data: "",
				// @ts-expect-error
				load() { return { data: "loaded" }; }
			});

			expect(true).toBe(true); // Type check test

		});

	});

	describe("Transition implementation validation", () => {

		it("should accept transitions returning partial state updates", async () => {

			// verify transitions can return partial updates

			interface Counter {
				readonly count: number;
				readonly delta: number;

				increment(): this;
			}

			// ✓ valid: transition returns only changed properties

			const state = State<Counter>({
				count: 0,
				delta: 1,
				increment({ count, delta }) {
					// only return count update, delta remains unchanged
					return { count: count+delta };
				}
			});

			expect(state.count).toBe(0);
			expect(state.delta).toBe(1);

		});

		it("type check: should reject transition returning wrong type", async () => {

			// invalid implementation with wrong transition signature

			interface ValidInterface {
				readonly value: number;

				increment(): this;
			}

			// ✗ invalid: transition returns wrong type (should return `Partial<ValidInterface>`)
			// Type error is caught at compile time by @ts-expect-error

			State<ValidInterface>({
				value: 0,
				// @ts-expect-error
				increment() { return "not a partial state"; }
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject missing required data properties", async () => {

			// invalid implementation missing required data property

			interface RequiredData {
				readonly value: number;
				readonly label: string;

				update(): this;
			}

			// ✗ invalid: missing required `label` property
			// Type error is caught at compile time by @ts-expect-error

			// @ts-expect-error
			State<RequiredData>({
				value: 0,
				update() { return { value: 1 }; }
			});

			expect(true).toBe(true); // Type check test

		});

	});

	describe("Type transformation behavior", () => {

		it("should transform Action<T> to Transition<T>", async () => {

			// verify the mapped type transformation

			interface SimpleState {
				readonly value: number;

				step(): this;
			}

			type ImplementationType = {
				[K in keyof SimpleState]: SimpleState[K] extends Action<SimpleState, infer I>
					? Transition<SimpleState, I>
					: SimpleState[K] extends Function
						? never
					: SimpleState[K];
			};

			// type check: step should be Transition<SimpleState>

			const impl: ImplementationType = {
				value: 0,
				step(state, _inputs: []) {
					// state parameter should be typed as SimpleState
					return { value: state.value+1 };
				}
			};

			expect(impl.value).toBe(0);

		});

		it("should preserve data properties unchanged", async () => {

			// verify data properties maintain their types

			interface MixedState {
				readonly count: number;
				readonly label: string;
				readonly active: boolean;

				increment(): this;
			}

			// data properties should have same types in implementation

			const state = State<MixedState>({
				count: 42,
				label: "test",
				active: true,
				increment({ count }) { return { count: count+1 }; }
			});

			expect(state.count).toBe(42);
			expect(state.label).toBe("test");
			expect(state.active).toBe(true);

		});

		it("type check: should exclude non-Action function types as never", async () => {

			// functions that don't return `this` become `never` in implementation type

			interface WithNonAction {
				readonly value: number;

				validAction(): this;

				invalidAction(): string; // this becomes `never`
			}

			// type check: attempting to use this interface shows invalidAction is required but impossible
			// this demonstrates the type system correctly rejects invalid action signatures
			// Type error is caught at compile time by @ts-expect-error

			// @ts-expect-error - invalidAction is typed as `never` (impossible to satisfy)
			State<WithNonAction>({
				value: 0,
				validAction() { return { value: 1 }; }
				// cannot provide invalidAction because it's typed as `never`
			});

			expect(true).toBe(true); // Type check test

		});

	});

	describe("Parameterized actions - Action<T, I> to Transition<T, I> mapping", () => {

		it("should accept action with single parameter", async () => {

			// valid state interface with parameterized action

			interface Toggle {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			// ✓ valid: action with parameter maps to transition with inputs tuple

			const state = State<Toggle>({
				items: [],
				toggle(state, [item]: [string]) {
					const items = state.items.includes(item)
						? state.items.filter(i => i !== item)
						: [...state.items, item];
					return { items };
				}
			});

			expect(state.items).toEqual([]);
			expect(typeof state.toggle).toBe("function");

		});

		it("should accept action with multiple parameters", async () => {

			// valid state interface with multi-parameter action

			interface Calculator {
				readonly result: number;

				add(x: number, y: number): this;

				multiply(x: number, y: number): this;
			}

			// ✓ valid: actions with multiple parameters map to transition with inputs tuple

			const state = State<Calculator>({
				result: 0,
				add(state, [x, y]: [number, number]) {
					return { result: state.result+x+y };
				},
				multiply(state, [x, y]: [number, number]) {
					return { result: state.result*x*y };
				}
			});

			expect(state.result).toBe(0);
			expect(typeof state.add).toBe("function");
			expect(typeof state.multiply).toBe("function");

		});

		it("should accept mixed parameterless and parameterized actions", async () => {

			// valid state interface with both parameterless and parameterized actions

			interface Counter {
				readonly count: number;

				increment(): this;

				add(delta: number): this;

				reset(): this;
			}

			// ✓ valid: mix of parameterless and parameterized actions

			const state = State<Counter>({
				count: 0,
				increment(state, _inputs: []) {
					return { count: state.count+1 };
				},
				add(state, [delta]: [number]) {
					return { count: state.count+delta };
				},
				reset(_state, _inputs: []) {
					return { count: 0 };
				}
			});

			expect(state.count).toBe(0);
			expect(typeof state.increment).toBe("function");
			expect(typeof state.add).toBe("function");
			expect(typeof state.reset).toBe("function");

		});

		it("type check: should reject transition with wrong parameter type", async () => {

			// invalid implementation with wrong parameter type in transition

			interface Adder {
				readonly value: number;

				add(delta: number): this;
			}

			// ✗ invalid: transition expects [number] but receives [string]
			// Type error is caught at compile time by @ts-expect-error

			State<Adder>({
				value: 0,
				// @ts-expect-error
				add(state: Adder, [delta]: [string]) {
					return { value: state.value+Number(delta) };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject transition with wrong number of parameters", async () => {

			// invalid implementation with wrong parameter count

			interface Multiplier {
				readonly value: number;

				multiply(x: number, y: number): this;
			}

			// ✗ invalid: transition expects [number, number] but receives [number]
			// Type error is caught at compile time by @ts-expect-error

			State<Multiplier>({
				value: 1,
				// @ts-expect-error
				multiply(state: Multiplier, [x]: [number]) {
					return { value: state.value*x };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject parameterized action returning wrong type", async () => {

			// invalid state interface with parameterized action returning non-`this` type

			interface InvalidParamReturn {
				readonly items: readonly string[];

				add(item: string): string; // returns string instead of this
			}

			// ✗ invalid: parameterized action must return `this`
			// Type error is caught at compile time by @ts-expect-error

			State<InvalidParamReturn>({
				items: [],
				// @ts-expect-error
				add(state: InvalidParamReturn, [item]: [string]) {
					return { items: [...state.items, item] };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject primitive type mismatch in inputs", async () => {

			// invalid implementation with wrong primitive type

			interface StringSetter {
				readonly value: string;

				setValue(newValue: string): this;
			}

			// ✗ invalid: transition expects [string] but receives [number]
			// Type error is caught at compile time by @ts-expect-error

			State<StringSetter>({
				value: "",
				// @ts-expect-error
				setValue(_state: StringSetter, [newValue]: [number]) {
					return { value: String(newValue) };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject object type mismatch in inputs", async () => {

			// invalid implementation with incompatible object types

			interface User {
				name: string;
				age: number;
			}

			interface Profile {
				readonly user: User;

				setUser(user: User): this;
			}

			interface WrongUser {
				name: string;
				email: string; // different structure
			}

			// ✗ invalid: transition expects [User] but receives [WrongUser]
			// Type error is caught at compile time by @ts-expect-error

			State<Profile>({
				user: { name: "", age: 0 },
				// @ts-expect-error
				setUser(_state: Profile, [user]: [WrongUser]) {
					return { user: { name: user.name, age: 0 } };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject mixed correct and incorrect parameter types", async () => {

			// invalid implementation where some parameters have wrong types

			interface Updater {
				readonly value: number;
				readonly label: string;

				update(newValue: number, newLabel: string): this;
			}

			// ✗ invalid: second parameter type is wrong (number instead of string)
			// Type error is caught at compile time by @ts-expect-error

			State<Updater>({
				value: 0,
				label: "",
				// @ts-expect-error
				update(_state: Updater, [newValue, newLabel]: [number, number]) {
					return { value: newValue, label: String(newLabel) };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("type check: should reject optional parameter type mismatch", async () => {

			// invalid implementation with optional parameter type mismatch

			interface OptionalParam {
				readonly count: number;

				increment(delta?: number): this;
			}

			// ✗ invalid: optional parameter has wrong type (string instead of number | undefined)
			// Type error is caught at compile time by @ts-expect-error

			State<OptionalParam>({
				count: 0,
				// @ts-expect-error
				increment(state: OptionalParam, [delta]: [string?]) {
					return { count: state.count+(Number(delta) || 1) };
				}
			});

			expect(true).toBe(true); // Type check test

		});

		it("should transform Action<T, I> to Transition<T, I> with correct parameter types", async () => {

			// verify the mapped type transformation for parameterized actions

			interface StateWithParams {
				readonly items: readonly number[];

				push(value: number): this;

				extend(a: number, b: string): this;
			}

			type ImplementationType = {
				[K in keyof StateWithParams]: StateWithParams[K] extends Action<StateWithParams, infer I>
					? Transition<StateWithParams, I>
					: StateWithParams[K];
			};

			// type check: push should be Transition<StateWithParams, [number]>
			// type check: extend should be Transition<StateWithParams, [number, string]>

			const impl: ImplementationType = {
				items: [],
				push(state, [value]: [number]) {
					return { items: [...state.items, value] };
				},
				extend(state, [a, b]: [number, string]) {
					return { items: [...state.items, a, Number(b)] };
				}
			};

			expect(impl.items).toEqual([]);
			expect(typeof impl.push).toBe("function");
			expect(typeof impl.extend).toBe("function");

		});

	});

});

describe("State()", () => {

	describe("State object creation", () => {

		it("should create state object with initial data properties", () => {

			interface Counter {
				readonly count: number;
				readonly step: number;
			}

			const state = State<Counter>({
				count: 0,
				step: 1
			});

			expect(state.count).toBe(0);
			expect(state.step).toBe(1);

		});

		it("should create state object with action methods", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			expect(typeof state.increment).toBe("function");

		});

		it("should handle multiple data properties", () => {

			interface Person {
				readonly name: string;
				readonly age: number;
				readonly active: boolean;
			}

			const state = State<Person>({
				name: "Alice",
				age: 30,
				active: true
			});

			expect(state.name).toBe("Alice");
			expect(state.age).toBe(30);
			expect(state.active).toBe(true);

		});

	});

	describe("Action method behavior", () => {

		it("should apply transition and return new state", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			const next = state.increment();

			expect(next.count).toBe(1);

		});

		it("should support method extraction (destructuring)", () => {

			interface Counter {
				readonly value: number;

				up(): this;
			}

			const counter = State<Counter>({
				value: 0,
				up({ value }) { return { value: value+1 }; }
			});

			// Extract method
			const { up } = counter;

			// Should work when called standalone
			const next = up();

			expect(next.value).toBe(1);
			expect(next).not.toBe(counter);

		});

		it("should support method extraction with chaining", () => {

			interface Counter {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; },
				reset() { return { count: 0 }; }
			});

			// Extract methods
			const { increment, reset } = state;

			// Should work when called standalone and chained
			const next = increment();
			const next2 = next.increment();
			const next3 = reset();

			expect(next.count).toBe(1);
			expect(next2.count).toBe(2);
			expect(next3.count).toBe(0);

		});

		it("should chain multiple action calls", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			const next = state
				.increment()
				.increment()
				.increment();

			expect(next.count).toBe(3);

		});

		it("should preserve unchanged properties", () => {

			interface Counter {
				readonly count: number;
				readonly step: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				step: 5,
				increment({ count, step }) { return { count: count+step }; }
			});

			const next = state.increment();

			expect(next.count).toBe(5);
			expect(next.step).toBe(5);

		});

		it("should allow multiple actions on same state", () => {

			interface Counter {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; },
				reset() { return { count: 0 }; }
			});

			const incremented = state.increment().increment();
			const resetted = incremented.reset();

			expect(incremented.count).toBe(2);
			expect(resetted.count).toBe(0);

		});

		it("should provide current state to transition function", () => {

			interface Counter {
				readonly count: number;
				readonly delta: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 10,
				delta: 3,
				increment({ count, delta }) { return { count: count+delta }; }
			});

			const next = state.increment();

			expect(next.count).toBe(13);
			expect(next.delta).toBe(3);

		});

	});

	describe("Parameterized action behavior", () => {

		it("should accept and use single parameter", () => {

			interface Toggle {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			const state = State<Toggle>({
				items: [],
				toggle(state, [item]: [string]) {
					const items = state.items.includes(item)
						? state.items.filter(i => i !== item)
						: [...state.items, item];
					return { items };
				}
			});

			const next = state.toggle("apple");

			expect(next.items).toEqual(["apple"]);

		});

		it("should handle multiple parameters", () => {

			interface Calculator {
				readonly result: number;

				add(x: number, y: number): this;
			}

			const state = State<Calculator>({
				result: 0,
				add(state, [x, y]: [number, number]) {
					return { result: state.result+x+y };
				}
			});

			const next = state.add(10, 5);

			expect(next.result).toBe(15);

		});

		it("should chain parameterized action calls", () => {

			interface Counter {
				readonly count: number;

				add(delta: number): this;
			}

			const state = State<Counter>({
				count: 0,
				add(state, [delta]: [number]) {
					return { count: state.count+delta };
				}
			});

			const next = state
				.add(10)
				.add(5)
				.add(3);

			expect(next.count).toBe(18);

		});

		it("should mix parameterless and parameterized actions", () => {

			interface Counter {
				readonly count: number;

				increment(): this;

				add(delta: number): this;

				reset(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment(state, _inputs: []) {
					return { count: state.count+1 };
				},
				add(state, [delta]: [number]) {
					return { count: state.count+delta };
				},
				reset(_state, _inputs: []) {
					return { count: 0 };
				}
			});

			const next = state
				.increment()
				.add(10)
				.increment()
				.add(5);

			expect(next.count).toBe(17);

		});

		it("should toggle items with parameterized action", () => {

			interface Toggle {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			const state = State<Toggle>({
				items: [],
				toggle(state, [item]: [string]) {
					const items = state.items.includes(item)
						? state.items.filter(i => i !== item)
						: [...state.items, item];
					return { items };
				}
			});

			const step1 = state.toggle("apple");
			const step2 = step1.toggle("banana");
			const step3 = step2.toggle("apple");

			expect(step1.items).toEqual(["apple"]);
			expect(step2.items).toEqual(["apple", "banana"]);
			expect(step3.items).toEqual(["banana"]);

		});

		it("should handle complex parameter types", () => {

			interface User {
				name: string;
				age: number;
			}

			interface UserManager {
				readonly user: User;

				setUser(user: User): this;

				updateName(name: string): this;
			}

			const state = State<UserManager>({
				user: { name: "Alice", age: 30 },
				setUser(_state, [user]: [User]) {
					return { user };
				},
				updateName(state, [name]: [string]) {
					return { user: { ...state.user, name } };
				}
			});

			const next = state
				.updateName("Bob")
				.setUser({ name: "Charlie", age: 25 });

			expect(next.user).toEqual({ name: "Charlie", age: 25 });

		});

		it("should access current state in parameterized actions", () => {

			interface ShoppingCart {
				readonly items: readonly string[];
				readonly total: number;

				addItem(item: string, price: number): this;
			}

			const state = State<ShoppingCart>({
				items: [],
				total: 0,
				addItem(state, [item, price]: [string, number]) {
					return {
						items: [...state.items, item],
						total: state.total+price
					};
				}
			});

			const next = state
				.addItem("apple", 1.5)
				.addItem("banana", 0.75)
				.addItem("orange", 2.0);

			expect(next.items).toEqual(["apple", "banana", "orange"]);
			expect(next.total).toBe(4.25);

		});

		it("should handle optional parameters", () => {

			interface Counter {
				readonly count: number;

				increment(delta?: number): this;
			}

			const state = State<Counter>({
				count: 0,
				increment(state, [delta]: [number?]) {
					return { count: state.count+(delta ?? 1) };
				}
			});

			const step1 = state.increment();
			const step2 = step1.increment(5);
			const step3 = step2.increment();

			expect(step1.count).toBe(1);
			expect(step2.count).toBe(6);
			expect(step3.count).toBe(7);

		});

		it("should preserve other properties in parameterized actions", () => {

			interface Config {
				readonly host: string;
				readonly port: number;
				readonly enabled: boolean;

				setHost(host: string): this;

				setPort(port: number): this;
			}

			const state = State<Config>({
				host: "localhost",
				port: 8080,
				enabled: true,
				setHost(_state, [host]: [string]) {
					return { host };
				},
				setPort(_state, [port]: [number]) {
					return { port };
				}
			});

			const next = state
				.setHost("example.com")
				.setPort(443);

			expect(next.host).toBe("example.com");
			expect(next.port).toBe(443);
			expect(next.enabled).toBe(true);

		});

	});

	describe("Parameterized action immutability", () => {

		it("should return new state object after parameterized action", () => {

			interface Counter {
				readonly count: number;

				add(delta: number): this;
			}

			const state = State<Counter>({
				count: 0,
				add({ count }, [delta]: [number]) {
					return { count: count+delta };
				}
			});

			const next = state.add(5);

			expect(next).not.toBe(state);

		});

		it("should not mutate original state with parameterized actions", () => {

			interface Toggle {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			const state = State<Toggle>({
				items: ["apple"],
				toggle({ items }, [item]: [string]) {
					return {
						items: items.includes(item)
							? items.filter(i => i !== item)
							: [...items, item]
					};
				}
			});

			state.toggle("banana");

			expect(state.items).toEqual(["apple"]);

		});

		it("should preserve intermediate states with parameterized actions", () => {

			interface Counter {
				readonly count: number;

				add(delta: number): this;
			}

			const state = State<Counter>({
				count: 0,
				add({ count }, [delta]: [number]) {
					return { count: count+delta };
				}
			});

			const step1 = state.add(10);
			const step2 = step1.add(5);
			const step3 = step2.add(3);

			expect(state.count).toBe(0);
			expect(step1.count).toBe(10);
			expect(step2.count).toBe(15);
			expect(step3.count).toBe(18);

		});

		it("should return same state reference when parameterized action returns empty object", () => {

			interface Counter {
				readonly count: number;

				noop(value: number): this;
			}

			const state = State<Counter>({
				count: 42,
				noop(_state, _inputs: [number]) {
					return {};
				}
			});

			const next = state.noop(999);

			expect(next).toBe(state);

		});

		it("should return same state reference when parameterized action returns unchanged values", () => {

			interface Counter {
				readonly count: number;

				setToSame(value: number): this;
			}

			const state = State<Counter>({
				count: 42,
				setToSame({ count }, _inputs: [number]) {
					return { count };
				}
			});

			const next = state.setToSame(999);

			expect(next).toBe(state);

		});

		it("should return new state when parameterized action changes at least one property", () => {

			interface Counter {
				readonly count: number;
				readonly step: number;

				add(delta: number): this;
			}

			const state = State<Counter>({
				count: 0,
				step: 1,
				add({ count }, [delta]: [number]) {
					return { count: count+delta };
				}
			});

			const next = state.add(5);

			expect(next).not.toBe(state);

		});

	});

	describe("Immutability guarantees", () => {

		it("should return new state object after action", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			const next = state.increment();

			expect(next).not.toBe(state);

		});

		it("should not mutate original state", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			state.increment();

			expect(state.count).toBe(0);

		});

		it("should preserve intermediate states", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment({ count }) { return { count: count+1 }; }
			});

			const step1 = state.increment();
			const step2 = step1.increment();
			const step3 = step2.increment();

			expect(state.count).toBe(0);
			expect(step1.count).toBe(1);
			expect(step2.count).toBe(2);
			expect(step3.count).toBe(3);

		});

	});

	describe("Empty update optimization", () => {

		it("should return same state reference when transition returns empty object", () => {

			interface Counter {
				readonly count: number;

				noop(): this;
			}

			const state = State<Counter>({
				count: 0,
				noop() { return {}; }
			});

			const next = state.noop();

			expect(next).toBe(state);

		});

		it("should return same state reference when no properties change", () => {

			interface Counter {
				readonly count: number;

				setToSame(): this;
			}

			const state = State<Counter>({
				count: 42,
				setToSame({ count }) { return { count }; }
			});

			const next = state.setToSame();

			expect(next).toBe(state);

		});

		it("should return new state when at least one property changes", () => {

			interface Counter {
				readonly count: number;
				readonly step: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				step: 1,
				increment({ count, step }) { return { count: count+step }; }
			});

			const next = state.increment();

			expect(next).not.toBe(state);

		});

	});

	describe("Complex state scenarios", () => {

		it("should handle state with nested objects", () => {

			interface AppState {
				readonly user: { name: string; age: number };
				readonly settings: { theme: string };

				updateName(): this;
			}

			const state = State<AppState>({
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" },
				updateName() { return { user: { name: "Bob", age: 30 } }; }
			});

			const next = state.updateName();

			expect(next.user.name).toBe("Bob");
			expect(next.settings.theme).toBe("dark");

		});

		it("should support conditional transitions", () => {

			interface Counter {
				readonly count: number;
				readonly max: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				max: 10,
				increment({ count, max }) {
					return count < max ? { count: count+1 } : {};
				}
			});

			const step1 = state.increment();
			expect(step1.count).toBe(1);

			const atMax = State<Counter>({
				count: 10,
				max: 10,
				increment({ count, max }) {
					return count < max ? { count: count+1 } : {};
				}
			});

			const noChange = atMax.increment();
			expect(noChange).toBe(atMax);
			expect(noChange.count).toBe(10);

		});

		it("should handle multiple properties updating together", () => {

			interface Point {
				readonly x: number;
				readonly y: number;

				move(): this;
			}

			const state = State<Point>({
				x: 0,
				y: 0,
				move({ x, y }) { return { x: x+1, y: y+1 }; }
			});

			const next = state.move();

			expect(next.x).toBe(1);
			expect(next.y).toBe(1);

		});

		it("should support realistic counter example from documentation", () => {

			interface Counter {
				readonly count: number;
				readonly step: number;

				increment(): this;

				reset(): this;
			}

			const counter = State<Counter>({
				count: 0,
				step: 1,
				increment({ count, step }) { return { count: count+step }; },
				reset() { return { count: 0 }; }
			});

			const result = counter
				.increment()
				.increment()
				.reset();

			expect(result.count).toBe(0);

		});

	});

});
