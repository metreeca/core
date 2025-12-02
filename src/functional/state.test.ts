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

import { describe, expect, it, vi } from "vitest";
import { Immutable } from "../basic/nested.js";

import { Snapshot, State } from "./state.js";

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
				increment() { return { count: this.count+this.delta }; },
				decrement() { return { count: this.count-this.delta }; },
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
				increment() {
					// only return count update, delta remains unchanged
					return { count: this.count+this.delta };
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


	describe("Parameterized actions - Action<T, I> to Transition<T, I> mapping", () => {


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
				add(delta: string) {
					return { value: this.value+Number(delta) };
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

			// ✗ invalid: transition expects 2 parameters but receives 3
			// Type error is caught at compile time by @ts-expect-error

			State<Multiplier>({
				value: 1,
				// @ts-expect-error
				multiply(x: number, y: number, z: number) {
					return { value: this.value*x*y*z };
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
				add(item: string) {
					return { items: [...this.items, item] };
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
				increment(delta?: string) {
					return { count: this.count+(Number(delta) || 1) };
				}
			});

			expect(true).toBe(true); // Type check test

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
				increment() { return { count: this.count+1 }; }
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
				increment() { return { count: this.count+1 }; }
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
				up() { return { value: this.value+1 }; }
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
				increment() { return { count: this.count+1 }; },
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
				increment() { return { count: this.count+1 }; }
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
				increment() { return { count: this.count+this.step }; }
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
				increment() { return { count: this.count+1 }; },
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
				increment() { return { count: this.count+this.delta }; }
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
				toggle(item: string) {
					const items = this.items.includes(item)
						? this.items.filter(i => i !== item)
						: [...this.items, item];
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
				add(x: number, y: number) {
					return { result: this.result+x+y };
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
				add(delta: number) {
					return { count: this.count+delta };
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
				increment() {
					return { count: this.count+1 };
				},
				add(delta: number) {
					return { count: this.count+delta };
				},
				reset() {
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
				toggle(item: string) {
					const items = this.items.includes(item)
						? this.items.filter(i => i !== item)
						: [...this.items, item];
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
				setUser(user: User) {
					return { user };
				},
				updateName(name: string) {
					return { user: { ...this.user, name } };
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
				addItem(item: string, price: number) {
					return {
						items: [...this.items, item],
						total: this.total+price
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
				increment(delta?: number) {
					return { count: this.count+(delta ?? 1) };
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
				setHost(host: string) {
					return { host };
				},
				setPort(port: number) {
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

	describe("Immutability guarantees", () => {

		it("should return new state object after action", () => {

			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
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
				increment() { return { count: this.count+1 }; }
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
				increment() { return { count: this.count+1 }; }
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
				setToSame() { return { count: this.count }; }
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
				increment() { return { count: this.count+this.step }; }
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
				increment() {
					return this.count < this.max ? { count: this.count+1 } : {};
				}
			});

			const step1 = state.increment();
			expect(step1.count).toBe(1);

			const atMax = State<Counter>({
				count: 10,
				max: 10,
				increment() {
					return this.count < this.max ? { count: this.count+1 } : {};
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
				move() { return { x: this.x+1, y: this.y+1 }; }
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
				increment() { return { count: this.count+this.step }; },
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

describe("State observers", () => {

	describe("attach (functional signature with attached=true)", () => {

		it("should return new state with observer attached", () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			const observer = (s: Counter) => {};
			const next = state(observer, true);

			expect(next).not.toBe(state);
		});

		it("should return same state when observer already attached (idempotent)", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer = (s: Counter) => {};

			const first = state(observer, true);
			const second = first(observer, true);

			expect(second).toBe(first);
		});

		it("should allow attaching multiple different observers", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer1 = (s: Counter) => {};
			const observer2 = (s: Counter) => {};

			const next = state(observer1, true)(observer2, true);

			expect(next).not.toBe(state);
		});

		it("should support function call destructuring", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const stateFunc = state;
			const observer = (s: Counter) => {};

			const next = stateFunc(observer, true);

			expect(next).not.toBe(state);
		});

	});

	describe("detach (functional signature with attached=false)", () => {

		it("should return new state without observer", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer = (s: Counter) => {};

			const withObserver = state(observer, true);
			const withoutObserver = withObserver(observer, false);

			expect(withoutObserver).not.toBe(withObserver);
		});

		it("should return same state when observer not attached (idempotent)", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer = (s: Counter) => {};

			const next = state(observer, false);

			expect(next).toBe(state);
		});

		it("should preserve other observers when detaching one", () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let observer1Called = false;
			let observer2Called = false;

			const observer1 = () => { observer1Called = true; };
			const observer2 = () => { observer2Called = true; };

			const withBoth = state(observer1, true)(observer2, true);
			const withOne = withBoth(observer1, false);

			withOne.increment();

			// Wait for microtasks
			return new Promise<void>(resolve => setTimeout(() => {
				expect(observer1Called).toBe(false);
				expect(observer2Called).toBe(true);
				resolve();
			}, 0));
		});

		it("should require exact same reference (reference equality)", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer1 = (s: Counter) => {};
			const observer2 = (s: Counter) => {}; // Different reference

			const withObserver = state(observer1, true);
			const next = withObserver(observer2, false);

			// Should return same state since observer2 was never attached
			expect(next).toBe(withObserver);
		});

	});

	describe("observer notification", () => {

		it("should notify observer on state change", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			withObserver.increment();

			// Wait for microtasks
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(true);
		});

		it("should pass new state to observer", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			const nextHolder: (typeof state)[] = [];

			const receivedState = await new Promise<Immutable<Counter>>(resolve => {
				const withObserver = state((s: Immutable<Counter>) => {
					resolve(s);
				}, true);
				const next = withObserver.increment();
				nextHolder.push(next as typeof state);
			});

			expect(receivedState).toBe(nextHolder[0]);
			expect(receivedState.count).toBe(1);
		});

		it("should notify all observers", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let observer1Called = false;
			let observer2Called = false;
			let observer3Called = false;

			const observer1 = () => { observer1Called = true; };
			const observer2 = () => { observer2Called = true; };
			const observer3 = () => { observer3Called = true; };

			const withObservers = state(observer1, true)(observer2, true)(observer3, true);

			withObservers.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observer1Called).toBe(true);
			expect(observer2Called).toBe(true);
			expect(observer3Called).toBe(true);
		});

		it("should NOT notify when state doesn't change (same-state optimization)", async () => {
			interface Counter {
				readonly count: number;
				noop(): this;
			}

			const state = State<Counter>({
				count: 0,
				noop() { return {}; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			withObserver.noop();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(false);
		});

		it("should notify asynchronously using microtasks", () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			withObserver.increment();

			// Should not be called yet (microtasks run after sync code)
			expect(notified).toBe(false);
		});

	});

	describe("observer inheritance", () => {

		it("should inherit observers through state transitions", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let callCount = 0;
			const observer = () => { callCount++; };

			const withObserver = state(observer, true);
			withObserver.increment().increment().increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(callCount).toBe(3);
		});

		it("should preserve observers through chained actions", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
				reset(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; },
				reset() { return { count: 0 }; }
			});

			const states: number[] = [];
			const observer = (s: Counter) => { states.push(s.count); };

			const withObserver = state(observer, true);
			withObserver
				.increment()
				.increment()
				.reset()
				.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(states).toEqual([1, 2, 0, 1]);
		});

		it("should work with destructured methods", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			const { increment } = withObserver;

			increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(true);
		});

	});

	describe("error handling", () => {

		it("should continue notifying other observers after error", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			let observer2Called = false;
			let observer3Called = false;

			const observer1 = () => { throw new Error("Error"); };
			const observer2 = () => { observer2Called = true; };
			const observer3 = () => { observer3Called = true; };

			const withObservers = state(observer1, true)(observer2, true)(observer3, true);

			withObservers.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observer2Called).toBe(true);
			expect(observer3Called).toBe(true);

			errorSpy.mockRestore();
		});

		it("should complete state transition even if observer throws", async () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			const throwingObserver = () => { throw new Error("Error"); };
			const withObserver = state(throwingObserver, true);

			const next = withObserver.increment();

			expect(next.count).toBe(1);
		});

	});

	describe("edge cases", () => {

		it("should handle empty observer list", () => {
			interface Counter {
				readonly count: number;
				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count + 1 }; }
			});

			// Should not throw
			expect(() => {
				state.increment();
			}).not.toThrow();
		});

		it("should handle attaching and detaching same observer multiple times", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const observer = (s: Counter) => {};

			const s1 = state(observer, true);
			const s2 = s1(observer, true); // Should return same
			const s3 = s2(observer, false);
			const s4 = s3(observer, false); // Should return same

			expect(s2).toBe(s1);
			expect(s4).toBe(s3);
		});

		it("should work with parameterized actions", async () => {
			interface Counter {
				readonly count: number;
				add(delta: number): this;
			}

			const state = State<Counter>({
				count: 0,
				add(delta) { return { count: this.count + delta }; }
			});

			let receivedCount = 0;
			const observer = (s: Counter) => { receivedCount = s.count; };

			const withObserver = state(observer, true);
			withObserver.add(5);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(receivedCount).toBe(5);
		});

		it("should work with multiple data properties", async () => {
			interface Point {
				readonly x: number;
				readonly y: number;
				move(dx: number, dy: number): this;
			}

			const state = State<Point>({
				x: 0,
				y: 0,
				move(dx, dy) { return { x: this.x + dx, y: this.y + dy }; }
			});

			const receivedPoint = await new Promise<Immutable<Point>>(resolve => {
				const withObserver = state((s: Immutable<Point>) => {
					resolve(s);
				}, true);
				withObserver.move(3, 4);
			});

			expect(receivedPoint.x).toBe(3);
			expect(receivedPoint.y).toBe(4);
		});

	});

});

describe("State snapshots", () => {

	describe("snapshot creation", () => {

		it("should create snapshot from current state", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 5,
				increment() { return { count: this.count+1 }; }
			});

			const snapshot = state();

			expect(snapshot).toBeDefined();
			expect(typeof snapshot).toBe("object");
		});

		it("should create opaque snapshot (no direct data access)", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 42 });
			const snapshot = state();

			// Snapshot should be opaque - cannot access count directly through type system
			// @ts-expect-error
			const _ = snapshot.count;

			expect(true).toBe(true); // Type check test
		});

		it("should create different snapshots for different states", () => {
			interface Counter {
				readonly count: number;
			}

			const state1 = State<Counter>({ count: 1 });
			const state2 = State<Counter>({ count: 2 });

			const snapshot1 = state1();
			const snapshot2 = state2();

			expect(snapshot1).not.toBe(snapshot2);
		});

		it("should create snapshot with current data values", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = state.increment().increment().increment() as typeof state;
			const snapshot = next();

			// Snapshot should capture count=3 (verified through restoration test)
			expect(snapshot).toBeDefined();
		});

	});

	describe("snapshot restoration", () => {

		it("should restore state from snapshot", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = state.increment().increment().increment() as typeof state;
			const snapshot = next();

			const restored = state(snapshot);

			expect(restored.count).toBe(3);
		});

		it("should return new state object after restoration", () => {
			interface Counter {
				readonly count: number;
			}

			const state = State<Counter>({ count: 0 });
			const snapshot = state();

			const restored = state(snapshot);

			expect(restored).not.toBe(state);
		});

		it("should restore all data properties", () => {
			interface Point {
				readonly x: number;
				readonly y: number;

				move(dx: number, dy: number): this;
			}

			const state = State<Point>({
				x: 0,
				y: 0,
				move(dx, dy) { return { x: this.x+dx, y: this.y+dy }; }
			});

			const moved = state.move(10, 20) as typeof state;
			const snapshot = moved();

			const restored = state(snapshot);

			expect(restored.x).toBe(10);
			expect(restored.y).toBe(20);
		});

		it("should preserve action methods after restoration", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = state.increment() as typeof state;
			const snapshot = next();

			const restored = state(snapshot);

			expect(typeof restored.increment).toBe("function");
			expect(restored.increment().count).toBe(2);
		});

		it("should NOT restore observers from snapshot", async () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			const snapshot = withObserver();

			const restored = state(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			// Observer should NOT be notified (not restored from snapshot)
			expect(notified).toBe(false);
		});

		it("should preserve current observers during restoration", async () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const temp = state.increment().increment() as typeof state;
			const snapshot = temp();

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = state(observer, true);
			const restored = withObserver(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			// Current observer should be notified
			expect(notified).toBe(true);
		});

	});

	describe("lineage validation", () => {

		it("should throw TypeError when restoring snapshot from different state lineage", () => {
			interface Counter {
				readonly count: number;
			}

			const state1 = State<Counter>({ count: 0 });
			const state2 = State<Counter>({ count: 0 });

			const snapshot1 = state1();

			expect(() => {
				state2(snapshot1);
			}).toThrow(TypeError);
		});

		it("should include lineage information in error message", () => {
			interface Counter {
				readonly count: number;
			}

			const state1 = State<Counter>({ count: 0 });
			const state2 = State<Counter>({ count: 0 });

			const snapshot = state1();

			expect(() => {
				state2(snapshot);
			}).toThrow(/lineage/i);
		});

		it("should allow restoration within same lineage after transitions", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = state.increment().increment() as typeof state;
			const snapshot = next();

			// Restore to original state in same lineage
			const restored = state(snapshot);

			expect(restored.count).toBe(2);
		});

		it("should allow restoration to any state in same lineage", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const step1 = state.increment() as typeof state;
			const step2 = step1.increment() as typeof state;
			const snapshot = step2();

			// Can restore to step1 (same lineage)
			const restored = step1(snapshot);

			expect(restored.count).toBe(2);
		});

	});

	describe("snapshot inheritance through transitions", () => {

		it("should create valid snapshot after state transitions", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = state.increment().increment() as typeof state;
			const snapshot = next();
			const restored = next(snapshot);

			expect(restored.count).toBe(2);
		});

		it("should maintain lineage compatibility through transitions", () => {
			interface Counter {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				reset() { return { count: 0 }; }
			});

			const step1 = state.increment() as typeof state;
			const step2 = step1.increment() as typeof state;
			const snapshot2 = step2();

			const step3 = step2.reset() as typeof state;
			const step4 = step3.increment() as typeof state;

			// step4 is in same lineage, should accept snapshot from step2
			const restored = step4(snapshot2);

			expect(restored.count).toBe(2);
		});

		it("should work with destructured methods", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const { increment } = state;
			const next = increment() as typeof state;
			const snapshot = next();

			const restored = state(snapshot);

			expect(restored.count).toBe(1);
		});

	});

	describe("complex snapshot scenarios", () => {

		it("should handle multiple snapshots from same lineage", () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const step1 = state.increment() as typeof state;
			const snapshot1 = step1();

			const step2 = step1.increment() as typeof state;
			const snapshot2 = step2();

			const step3 = step2.increment() as typeof state;
			const snapshot3 = step3();

			// All snapshots belong to same lineage
			expect(state(snapshot1).count).toBe(1);
			expect(state(snapshot2).count).toBe(2);
			expect(state(snapshot3).count).toBe(3);
		});

		it("should support snapshot-based undo/redo pattern", () => {
			interface Counter {
				readonly count: number;

				increment(): this;

				decrement(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				decrement() { return { count: this.count-1 }; }
			});

			const history: Snapshot<Counter>[] = [];

			// Build history
			let current = state;
			history.push(current());

			current = current.increment() as typeof state;
			history.push(current());

			current = current.increment() as typeof state;
			history.push(current());

			current = current.decrement() as typeof state;
			history.push(current());

			// Undo to step 2 (count=2)
			const undone = state(history[2]);
			expect(undone.count).toBe(2);

			// Redo to step 3 (count=1)
			const redone = state(history[3]);
			expect(redone.count).toBe(1);
		});

		it("should handle snapshots with nested data structures", () => {
			interface AppState {
				readonly user: { name: string; age: number };
				readonly settings: { theme: string };

				updateUser(name: string, age: number): this;
			}

			const state = State<AppState>({
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" },
				updateUser(name, age) {
					return { user: { name, age } };
				}
			});

			const updated = state.updateUser("Bob", 25) as typeof state;
			const snapshot = updated();

			const restored = state(snapshot);

			expect(restored.user.name).toBe("Bob");
			expect(restored.user.age).toBe(25);
			expect(restored.settings.theme).toBe("dark");
		});

		it("should work with observers and snapshots together", async () => {
			interface Counter {
				readonly count: number;

				increment(): this;
			}

			const state = State<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let observedCount = 0;
			const observer = (s: Counter) => { observedCount = s.count; };

			const withObserver = state(observer, true);
			const step1 = withObserver.increment() as typeof state;
			const snapshot = step1();

			// Restore and verify observer notified
			const restored = withObserver(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observedCount).toBe(2);
		});

	});

});
