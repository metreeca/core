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

import { assertType, describe, expectTypeOf, test } from "vitest";
import { createState, State } from "./state.js";


describe("State", () => {

	describe("invalid action signatures - return type constraints", () => {

		test("should reject action returning string instead of this", () => {

			interface InvalidReturnType extends State {
				readonly value: number;
				step(): string;
			}

			createState<InvalidReturnType>({
				value: 0,
				// @ts-expect-error - action method returns `string` instead of `this`
				step() { return "invalid"; }
			});

		});

		test("should reject async actions (Promise<this>)", () => {

			interface InvalidPromiseReturn extends State {
				readonly data: string;
				load(): Promise<this>;
			}

			createState<InvalidPromiseReturn>({
				data: "",
				// @ts-expect-error - async actions not supported (returns `Promise<this>` not `this`)
				load() { return { data: "loaded" }; }
			});

		});

	});

	describe("transition implementation validation", () => {

		test("should reject transition returning wrong type", () => {

			interface ValidInterface extends State {
				readonly value: number;
				increment(): this;
			}

			createState<ValidInterface>({
				value: 0,
				// @ts-expect-error - transition returns wrong type (should return `Partial<ValidInterface>`)
				increment() { return "not a partial state"; }
			});

		});

		test("should reject missing required data properties", () => {

			interface RequiredData extends State {
				readonly value: number;
				readonly label: string;
				update(): this;
			}

			// @ts-expect-error - missing required `label` property
			createState<RequiredData>({
				value: 0,
				update() { return { value: 1 }; }
			});

		});

	});

	describe("parameterized actions - Action<T, I> to Transition<T, I> mapping", () => {

		test("should reject transition with wrong parameter type", () => {

			interface Adder extends State {
				readonly value: number;
				add(delta: number): this;
			}

			createState<Adder>({
				value: 0,
				// @ts-expect-error - transition expects [number] but receives [string]
				add(delta: string) {
					return { value: this.value + Number(delta) };
				}
			});

		});

		test("should reject transition with wrong number of parameters", () => {

			interface Multiplier extends State {
				readonly value: number;
				multiply(x: number, y: number): this;
			}

			createState<Multiplier>({
				value: 1,
				// @ts-expect-error - transition expects 2 parameters but receives 3
				multiply(x: number, y: number, z: number) {
					return { value: this.value * x * y * z };
				}
			});

		});

		test("should reject parameterized action returning wrong type", () => {

			interface InvalidParamReturn extends State {
				readonly items: readonly string[];
				add(item: string): string; // returns string instead of this
			}

			createState<InvalidParamReturn>({
				items: [],
				// @ts-expect-error - parameterized action must return `this`
				add(item: string) {
					return { items: [...this.items, item] };
				}
			});

		});

		test("should reject optional parameter type mismatch", () => {

			interface OptionalParam extends State {
				readonly count: number;
				increment(delta?: number): this;
			}

			createState<OptionalParam>({
				count: 0,
				// @ts-expect-error - optional parameter has wrong type (string instead of number | undefined)
				increment(delta?: string) {
					return { count: this.count + (Number(delta) || 1) };
				}
			});

		});

	});

	describe("valid state interfaces", () => {

		test("should accept simple state with single transition", () => {

			interface ValidSimple extends State {
				readonly value: number;
				step(): this;
			}

			const s = createState<ValidSimple>({
				value: 0,
				step() { return { value: 1 }; }
			});

			expectTypeOf(s).toHaveProperty("value");
			expectTypeOf(s.value).toBeNumber();
			expectTypeOf(s.step).toBeFunction();

		});

		test("should accept state with multiple actions", () => {

			interface ValidMultiAction extends State {
				readonly count: number;
				readonly delta: number;
				increment(): this;
				decrement(): this;
				reset(): this;
			}

			const s = createState<ValidMultiAction>({
				count: 0,
				delta: 1,
				increment() { return { count: this.count + this.delta }; },
				decrement() { return { count: this.count - this.delta }; },
				reset() { return { count: 0 }; }
			});

			expectTypeOf(s.count).toBeNumber();
			expectTypeOf(s.delta).toBeNumber();
			expectTypeOf(s.increment).toBeFunction();
			expectTypeOf(s.decrement).toBeFunction();
			expectTypeOf(s.reset).toBeFunction();

		});

		test("should accept state with optional properties", () => {

			interface ValidOptional extends State {
				readonly value: number;
				readonly label?: string;
				setValue(): this;
			}

			const s = createState<ValidOptional>({
				value: 0,
				setValue() { return { value: 42 }; }
			});

			expectTypeOf(s.value).toBeNumber();
			expectTypeOf(s.label).toEqualTypeOf<string | undefined>();

		});

		test("should accept data-only state (no actions)", () => {

			interface ValidDataOnly extends State {
				readonly x: number;
				readonly y: number;
			}

			const s = createState<ValidDataOnly>({
				x: 0,
				y: 0
			});

			expectTypeOf(s.x).toBeNumber();
			expectTypeOf(s.y).toBeNumber();

		});

		test("should accept transitions returning partial state updates", () => {

			interface Counter extends State {
				readonly count: number;
				readonly delta: number;
				increment(): this;
			}

			const s = createState<Counter>({
				count: 0,
				delta: 1,
				increment() {
					return { count: this.count + this.delta };
				}
			});

			// increment() returns the same type as the state interface
			expectTypeOf(s.increment).returns.toExtend<Counter>();

		});

	});

});
