/*
 * Copyright © 2025-2026 Metreeca srl
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

import { createState, manageState, State, Version } from "./state.js";


describe("State()", () => {

	describe("State object creation", () => {

		it("should create state object with initial data properties", () => {

			interface Counter extends State {
				readonly count: number;
				readonly step: number;
			}

			const s = createState<Counter>({
				count: 0,
				step: 1
			});

			expect(s.count).toBe(0);
			expect(s.step).toBe(1);

		});

		it("should create state object with action methods", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			expect(typeof s.increment).toBe("function");

		});

		it("should handle multiple data properties", () => {

			interface Person extends State {
				readonly name: string;
				readonly age: number;
				readonly active: boolean;
			}

			const s = createState<Person>({
				name: "Alice",
				age: 30,
				active: true
			});

			expect(s.name).toBe("Alice");
			expect(s.age).toBe(30);
			expect(s.active).toBe(true);

		});

	});

	describe("Action method behavior", () => {

		it("should apply transition and return new state", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment();

			expect(next.count).toBe(1);

		});

		it("should support method extraction (destructuring)", () => {

			interface Counter extends State {
				readonly value: number;

				up(): this;
			}

			const counter = createState<Counter>({
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

			interface Counter extends State {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				reset() { return { count: 0 }; }
			});

			// Extract methods
			const { increment, reset } = s;

			// Should work when called standalone and chained
			const next = increment();
			const next2 = next.increment();
			const next3 = reset();

			expect(next.count).toBe(1);
			expect(next2.count).toBe(2);
			expect(next3.count).toBe(0);

		});

		it("should chain multiple action calls", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s
				.increment()
				.increment()
				.increment();

			expect(next.count).toBe(3);

		});

		it("should preserve unchanged properties", () => {

			interface Counter extends State {
				readonly count: number;
				readonly step: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				step: 5,
				increment() { return { count: this.count+this.step }; }
			});

			const next = s.increment();

			expect(next.count).toBe(5);
			expect(next.step).toBe(5);

		});

		it("should allow multiple actions on same state", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				reset() { return { count: 0 }; }
			});

			const incremented = s.increment().increment();
			const resetted = incremented.reset();

			expect(incremented.count).toBe(2);
			expect(resetted.count).toBe(0);

		});

		it("should provide current state to transition function", () => {

			interface Counter extends State {
				readonly count: number;
				readonly delta: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 10,
				delta: 3,
				increment() { return { count: this.count+this.delta }; }
			});

			const next = s.increment();

			expect(next.count).toBe(13);
			expect(next.delta).toBe(3);

		});

	});

	describe("Parameterized action behavior", () => {

		it("should accept and use single parameter", () => {

			interface Toggle extends State {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			const s = createState<Toggle>({
				items: [],
				toggle(item: string) {
					const items = this.items.includes(item)
						? this.items.filter(i => i !== item)
						: [...this.items, item];
					return { items };
				}
			});

			const next = s.toggle("apple");

			expect(next.items).toEqual(["apple"]);

		});

		it("should handle multiple parameters", () => {

			interface Calculator extends State {
				readonly result: number;

				add(x: number, y: number): this;
			}

			const s = createState<Calculator>({
				result: 0,
				add(x: number, y: number) {
					return { result: this.result+x+y };
				}
			});

			const next = s.add(10, 5);

			expect(next.result).toBe(15);

		});

		it("should chain parameterized action calls", () => {

			interface Counter extends State {
				readonly count: number;

				add(delta: number): this;
			}

			const s = createState<Counter>({
				count: 0,
				add(delta: number) {
					return { count: this.count+delta };
				}
			});

			const next = s
				.add(10)
				.add(5)
				.add(3);

			expect(next.count).toBe(18);

		});

		it("should mix parameterless and parameterized actions", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;

				add(delta: number): this;

				reset(): this;
			}

			const s = createState<Counter>({
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

			const next = s
				.increment()
				.add(10)
				.increment()
				.add(5);

			expect(next.count).toBe(17);

		});

		it("should toggle items with parameterized action", () => {

			interface Toggle extends State {
				readonly items: readonly string[];

				toggle(item: string): this;
			}

			const s = createState<Toggle>({
				items: [],
				toggle(item: string) {
					const items = this.items.includes(item)
						? this.items.filter(i => i !== item)
						: [...this.items, item];
					return { items };
				}
			});

			const step1 = s.toggle("apple");
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

			interface UserManager extends State {
				readonly user: User;

				setUser(user: User): this;

				updateName(name: string): this;
			}

			const s = createState<UserManager>({
				user: { name: "Alice", age: 30 },
				setUser(user: User) {
					return { user };
				},
				updateName(name: string) {
					return { user: { ...this.user, name } };
				}
			});

			const next = s
				.updateName("Bob")
				.setUser({ name: "Charlie", age: 25 });

			expect(next.user).toEqual({ name: "Charlie", age: 25 });

		});

		it("should access current state in parameterized actions", () => {

			interface ShoppingCart extends State {
				readonly items: readonly string[];
				readonly total: number;

				addItem(item: string, price: number): this;
			}

			const s = createState<ShoppingCart>({
				items: [],
				total: 0,
				addItem(item: string, price: number) {
					return {
						items: [...this.items, item],
						total: this.total+price
					};
				}
			});

			const next = s
				.addItem("apple", 1.5)
				.addItem("banana", 0.75)
				.addItem("orange", 2.0);

			expect(next.items).toEqual(["apple", "banana", "orange"]);
			expect(next.total).toBe(4.25);

		});

		it("should handle optional parameters", () => {

			interface Counter extends State {
				readonly count: number;

				increment(delta?: number): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment(delta?: number) {
					return { count: this.count+(delta ?? 1) };
				}
			});

			const step1 = s.increment();
			const step2 = step1.increment(5);
			const step3 = step2.increment();

			expect(step1.count).toBe(1);
			expect(step2.count).toBe(6);
			expect(step3.count).toBe(7);

		});

		it("should preserve other properties in parameterized actions", () => {

			interface Config extends State {
				readonly host: string;
				readonly port: number;
				readonly enabled: boolean;

				setHost(host: string): this;

				setPort(port: number): this;
			}

			const s = createState<Config>({
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

			const next = s
				.setHost("example.com")
				.setPort(443);

			expect(next.host).toBe("example.com");
			expect(next.port).toBe(443);
			expect(next.enabled).toBe(true);

		});

	});

	describe("Immutability guarantees", () => {

		it("should return new state object after action", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment();

			expect(next).not.toBe(s);

		});

		it("should not mutate original state", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			s.increment();

			expect(s.count).toBe(0);

		});

		it("should preserve intermediate states", () => {

			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const step1 = s.increment();
			const step2 = step1.increment();
			const step3 = step2.increment();

			expect(s.count).toBe(0);
			expect(step1.count).toBe(1);
			expect(step2.count).toBe(2);
			expect(step3.count).toBe(3);

		});

	});

	describe("Empty update optimization", () => {

		it("should return same state reference when transition returns empty object", () => {

			interface Counter extends State {
				readonly count: number;

				noop(): this;
			}

			const s = createState<Counter>({
				count: 0,
				noop() { return {}; }
			});

			const next = s.noop();

			expect(next).toBe(s);

		});

		it("should return same state reference when no properties change", () => {

			interface Counter extends State {
				readonly count: number;

				setToSame(): this;
			}

			const s = createState<Counter>({
				count: 42,
				setToSame() { return { count: this.count }; }
			});

			const next = s.setToSame();

			expect(next).toBe(s);

		});

		it("should return new state when at least one property changes", () => {

			interface Counter extends State {
				readonly count: number;
				readonly step: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				step: 1,
				increment() { return { count: this.count+this.step }; }
			});

			const next = s.increment();

			expect(next).not.toBe(s);

		});

	});

	describe("Complex state scenarios", () => {

		it("should handle state with nested objects", () => {

			interface AppState extends State {
				readonly user: { name: string; age: number };
				readonly settings: { theme: string };

				updateName(): this;
			}

			const s = createState<AppState>({
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" },
				updateName() { return { user: { name: "Bob", age: 30 } }; }
			});

			const next = s.updateName();

			expect(next.user.name).toBe("Bob");
			expect(next.settings.theme).toBe("dark");

		});

		it("should support conditional transitions", () => {

			interface Counter extends State {
				readonly count: number;
				readonly max: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				max: 10,
				increment() {
					return this.count < this.max ? { count: this.count+1 } : {};
				}
			});

			const step1 = s.increment();
			expect(step1.count).toBe(1);

			const atMax = createState<Counter>({
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

			interface Point extends State {
				readonly x: number;
				readonly y: number;

				move(): this;
			}

			const s = createState<Point>({
				x: 0,
				y: 0,
				move() { return { x: this.x+1, y: this.y+1 }; }
			});

			const next = s.move();

			expect(next.x).toBe(1);
			expect(next.y).toBe(1);

		});

		it("should support realistic counter example from documentation", () => {

			interface Counter extends State {
				readonly count: number;
				readonly step: number;

				increment(): this;

				reset(): this;
			}

			const counter = createState<Counter>({
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

	describe("attach via $(s).attach(observer)", () => {

		it("should return new state with observer attached", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const observer = () => {};
			const next = manageState(s).attach(observer);

			expect(next).not.toBe(s);
		});

		it("should return same state when observer already attached (idempotent)", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer = () => {};

			const first = manageState(s).attach(observer);
			const second = manageState(first).attach(observer);

			expect(second).toBe(first);
		});

		it("should allow attaching multiple different observers", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer1 = (s: Counter) => {};
			const observer2 = (s: Counter) => {};

			const next = manageState(manageState(s).attach(observer1)).attach(observer2);

			expect(next).not.toBe(s);
		});

		it("should support method destructuring", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const manager = manageState(s);
			const observer = () => {};

			const next = manager.attach(observer);

			expect(next).not.toBe(s);
		});

	});

	describe("detach via $(s).detach(observer)", () => {

		it("should return new state without observer", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer = () => {};

			const withObserver = manageState(s).attach(observer);
			const withoutObserver = manageState(withObserver).detach(observer);

			expect(withoutObserver).not.toBe(withObserver);
		});

		it("should return same state when observer not attached (idempotent)", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer = () => {};

			const next = manageState(s).detach(observer);

			expect(next).toBe(s);
		});

		it("should preserve other observers when detaching one", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let observer1Called = false;
			let observer2Called = false;

			const observer1 = () => { observer1Called = true; };
			const observer2 = () => { observer2Called = true; };

			const withBoth = manageState(manageState(s).attach(observer1)).attach(observer2);
			const withOne = manageState(withBoth).detach(observer1);

			withOne.increment();

			// Wait for microtasks
			return new Promise<void>(resolve => setTimeout(() => {
				expect(observer1Called).toBe(false);
				expect(observer2Called).toBe(true);
				resolve();
			}, 0));
		});

		it("should require exact same reference (reference equality)", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer1 = () => {};
			const observer2 = () => {}; // Different reference

			const withObserver = manageState(s).attach(observer1);
			const next = manageState(withObserver).detach(observer2);

			// Should return same state since observer2 was never attached
			expect(next).toBe(withObserver);
		});

	});

	describe("observer notification", () => {

		it("should notify observer on state change", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			withObserver.increment();

			// Wait for microtasks
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(true);
		});

		it("should pass new state to observer", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const nextHolder: (typeof s)[] = [];

			const receivedState = await new Promise<Counter>(resolve => {
				const withObserver = manageState(s).attach((s: Counter) => {
					resolve(s);
				});
				const next = withObserver.increment();
				nextHolder.push(next);
			});

			expect(receivedState).toBe(nextHolder[0]);
			expect(receivedState.count).toBe(1);
		});

		it("should notify all observers", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let observer1Called = false;
			let observer2Called = false;
			let observer3Called = false;

			const observer1 = () => { observer1Called = true; };
			const observer2 = () => { observer2Called = true; };
			const observer3 = () => { observer3Called = true; };

			const withObservers = manageState(manageState(manageState(s).attach(observer1)).attach(observer2)).attach(observer3);

			withObservers.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observer1Called).toBe(true);
			expect(observer2Called).toBe(true);
			expect(observer3Called).toBe(true);
		});

		it("should NOT notify when state doesn't change (same-state optimization)", async () => {
			interface Counter extends State {
				readonly count: number;

				noop(): this;
			}

			const s = createState<Counter>({
				count: 0,
				noop() { return {}; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			withObserver.noop();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(false);
		});

		it("should notify asynchronously using microtasks", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			withObserver.increment();

			// Should not be called yet (microtasks run after sync code)
			expect(notified).toBe(false);
		});

	});

	describe("observer inheritance", () => {

		it("should inherit observers through state transitions", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let callCount = 0;
			const observer = () => { callCount++; };

			const withObserver = manageState(s).attach(observer);
			withObserver.increment().increment().increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(callCount).toBe(3);
		});

		it("should preserve observers through chained actions", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				reset() { return { count: 0 }; }
			});

			const states: number[] = [];
			const observer = (s: Counter) => { states.push(s.count); };

			const withObserver = manageState(s).attach(observer);
			withObserver
				.increment()
				.increment()
				.reset()
				.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(states).toEqual([1, 2, 0, 1]);
		});

		it("should work with destructured methods", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			const { increment } = withObserver;

			increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(notified).toBe(true);
		});

	});

	describe("error handling", () => {

		it("should continue notifying other observers after error", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			let observer2Called = false;
			let observer3Called = false;

			const observer1 = () => { throw new Error("Error"); };
			const observer2 = () => { observer2Called = true; };
			const observer3 = () => { observer3Called = true; };

			const withObservers = manageState(manageState(manageState(s).attach(observer1)).attach(observer2)).attach(observer3);

			withObservers.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observer2Called).toBe(true);
			expect(observer3Called).toBe(true);

			errorSpy.mockRestore();
		});

		it("should complete state transition even if observer throws", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const throwingObserver = () => { throw new Error("Error"); };
			const withObserver = manageState(s).attach(throwingObserver);

			const next = withObserver.increment();

			expect(next.count).toBe(1);
		});

	});

	describe("edge cases", () => {

		it("should handle empty observer list", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			// Should not throw
			expect(() => {
				s.increment();
			}).not.toThrow();
		});

		it("should handle attaching and detaching same observer multiple times", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const observer = () => {};

			const s1 = manageState(s).attach(observer);
			const s2 = manageState(s1).attach(observer); // Should return same
			const s3 = manageState(s2).detach(observer);
			const s4 = manageState(s3).detach(observer); // Should return same

			expect(s2).toBe(s1);
			expect(s4).toBe(s3);
		});

		it("should work with parameterized actions", async () => {
			interface Counter extends State {
				readonly count: number;

				add(delta: number): this;
			}

			const s = createState<Counter>({
				count: 0,
				add(delta) { return { count: this.count+delta }; }
			});

			let receivedCount = 0;
			const observer = (s: Counter) => { receivedCount = s.count; };

			const withObserver = manageState(s).attach(observer);
			withObserver.add(5);

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(receivedCount).toBe(5);
		});

		it("should work with multiple data properties", async () => {
			interface Point extends State {
				readonly x: number;
				readonly y: number;

				move(dx: number, dy: number): this;
			}

			const s = createState<Point>({
				x: 0,
				y: 0,
				move(dx, dy) { return { x: this.x+dx, y: this.y+dy }; }
			});

			const receivedPoint = await new Promise<Point>(resolve => {
				const withObserver = manageState(s).attach((s: Point) => {
					resolve(s);
				});
				withObserver.move(3, 4);
			});

			expect(receivedPoint.x).toBe(3);
			expect(receivedPoint.y).toBe(4);
		});

	});

});

describe("State snapshots", () => {

	describe("snapshot creation via $(s).capture()", () => {

		it("should create snapshot from current state", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 5,
				increment() { return { count: this.count+1 }; }
			});

			const snapshot = manageState(s).capture();

			expect(snapshot).toBeDefined();
			expect(typeof snapshot).toBe("object");
		});

		it("should create different snapshots for different states", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const state1 = createState<Counter>({ count: 1 });
			const state2 = createState<Counter>({ count: 2 });

			const snapshot1 = manageState(state1).capture();
			const snapshot2 = manageState(state2).capture();

			expect(snapshot1).not.toBe(snapshot2);
		});

		it("should create snapshot with current data values", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment().increment().increment();
			const snapshot = manageState(next).capture();

			// Snapshot should capture count=3 (verified through restoration test)
			expect(snapshot).toBeDefined();
		});

	});

	describe("snapshot restoration", () => {

		it("should restore state from snapshot", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment().increment().increment();
			const snapshot = manageState(next).capture();

			const restored = manageState(s).restore(snapshot);

			expect(restored.count).toBe(3);
		});

		it("should return new state object after restoration", () => {
			interface Counter extends State {
				readonly count: number;
			}

			const s = createState<Counter>({ count: 0 });
			const snapshot = manageState(s).capture();

			const restored = manageState(s).restore(snapshot);

			expect(restored).not.toBe(s);
		});

		it("should restore all data properties", () => {
			interface Point extends State {
				readonly x: number;
				readonly y: number;

				move(dx: number, dy: number): this;
			}

			const s = createState<Point>({
				x: 0,
				y: 0,
				move(dx, dy) { return { x: this.x+dx, y: this.y+dy }; }
			});

			const moved = s.move(10, 20);
			const snapshot = manageState(moved).capture();

			const restored = manageState(s).restore(snapshot);

			expect(restored.x).toBe(10);
			expect(restored.y).toBe(20);
		});

		it("should preserve action methods after restoration", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment();
			const snapshot = manageState(next).capture();

			const restored = manageState(s).restore(snapshot);

			expect(typeof restored.increment).toBe("function");
			expect(restored.increment().count).toBe(2);
		});

		it("should NOT restore observers from snapshot", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			const snapshot = manageState(withObserver).capture();

			const restored = manageState(s).restore(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			// Observer should NOT be notified (not restored from snapshot)
			expect(notified).toBe(false);
		});

		it("should preserve current observers during restoration", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const temp = s.increment().increment();
			const snapshot = manageState(temp).capture();

			let notified = false;
			const observer = () => { notified = true; };

			const withObserver = manageState(s).attach(observer);
			const restored = manageState(withObserver).restore(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			// Current observer should be notified
			expect(notified).toBe(true);
		});

	});

	describe("snapshot inheritance through transitions", () => {

		it("should create valid snapshot after state transitions", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const next = s.increment().increment();
			const snapshot = manageState(next).capture();
			const restored = manageState(next).restore(snapshot);

			expect(restored.count).toBe(2);
		});

		it("should maintain lineage compatibility through transitions", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;

				reset(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				reset() { return { count: 0 }; }
			});

			const step1 = s.increment();
			const step2 = step1.increment();
			const snapshot2 = manageState(step2).capture();

			const step3 = step2.reset();
			const step4 = step3.increment();

			// step4 is in same lineage, should accept snapshot from step2
			const restored = manageState(step4).restore(snapshot2);

			expect(restored.count).toBe(2);
		});

		it("should work with destructured methods", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const { increment } = s;
			const next = increment();
			const snapshot = manageState(next).capture();

			const restored = manageState(s).restore(snapshot);

			expect(restored.count).toBe(1);
		});

	});

	describe("complex snapshot scenarios", () => {

		it("should handle multiple snapshots from same lineage", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			const step1 = s.increment();
			const snapshot1 = manageState(step1).capture();

			const step2 = step1.increment();
			const snapshot2 = manageState(step2).capture();

			const step3 = step2.increment();
			const snapshot3 = manageState(step3).capture();

			// All snapshots belong to same lineage
			expect(manageState(s).restore(snapshot1).count).toBe(1);
			expect(manageState(s).restore(snapshot2).count).toBe(2);
			expect(manageState(s).restore(snapshot3).count).toBe(3);
		});

		it("should support snapshot-based undo/redo pattern", () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;

				decrement(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; },
				decrement() { return { count: this.count-1 }; }
			});

			const history: Version<Counter>[] = [];

			// Build history
			let current = s;
			history.push(manageState(current).capture());

			current = current.increment();
			history.push(manageState(current).capture());

			current = current.increment();
			history.push(manageState(current).capture());

			current = current.decrement();
			history.push(manageState(current).capture());

			// Undo to step 2 (count=2)
			const undone = manageState(s).restore(history[2]);
			expect(undone.count).toBe(2);

			// Redo to step 3 (count=1)
			const redone = manageState(s).restore(history[3]);
			expect(redone.count).toBe(1);
		});

		it("should handle snapshots with nested data structures", () => {
			interface AppState extends State {
				readonly user: { name: string; age: number };
				readonly settings: { theme: string };

				updateUser(name: string, age: number): this;
			}

			const s = createState<AppState>({
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" },
				updateUser(name, age) {
					return { user: { name, age } };
				}
			});

			const updated = s.updateUser("Bob", 25);
			const snapshot = manageState(updated).capture();

			const restored = manageState(s).restore(snapshot);

			expect(restored.user.name).toBe("Bob");
			expect(restored.user.age).toBe(25);
			expect(restored.settings.theme).toBe("dark");
		});

		it("should work with observers and snapshots together", async () => {
			interface Counter extends State {
				readonly count: number;

				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				increment() { return { count: this.count+1 }; }
			});

			let observedCount = 0;
			const observer = (s: Counter) => { observedCount = s.count; };

			const withObserver = manageState(s).attach(observer);
			const step1 = withObserver.increment();
			const snapshot = manageState(step1).capture();

			// Restore and verify observer notified
			const restored = manageState(withObserver).restore(snapshot);
			restored.increment();

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(observedCount).toBe(2);
		});

	});

});
