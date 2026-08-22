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

import { describe, expect, expectTypeOf, it } from "vitest";
import { fold, map, pipe } from "./combo.js";


describe("map()", () => {

	it("should return the result of applying the mapper to the value", async () => {
		expect(map(2, n => n*3)).toBe(6);
	});

	it("should pass the value as the mapper argument", async () => {
		const record = { id: 42 };
		expect(map(record, ({ id }) => id)).toBe(42);
	});

	it("should support transforming to a different type", async () => {
		expect(map(42, n => `#${n}`)).toBe("#42");
	});

	it("should propagate errors thrown by the mapper", async () => {
		expect(() => map(0, () => { throw new Error("boom"); })).toThrow("boom");
	});

});

describe("fold()", () => {

	it("should apply some to the value when defined", async () => {
		expect(fold(2, n => n*3, () => 0)).toBe(6);
	});

	it("should pass the value as the some argument", async () => {
		const record = { id: 42 };
		expect(fold(record, ({ id }) => id, () => 0)).toBe(42);
	});

	it("should support folding to a different type", async () => {
		expect(fold(42, n => `#${n}`, () => "none")).toBe("#42");
	});

	it("should evaluate the none thunk when the value is undefined", async () => {
		expect(fold(undefined as undefined | number, n => n*3, () => -1)).toBe(-1);
	});

	it("should return the none value when it is not a function", async () => {
		expect(fold(undefined as undefined | number, n => n*3, -1)).toBe(-1);
	});

	it("should not evaluate none when the value is defined", async () => {
		expect(fold(2, n => n*3, () => { throw new Error("boom"); })).toBe(6);
	});

	it("should propagate errors thrown by some", async () => {
		expect(() => fold(0, () => { throw new Error("boom"); }, () => 0)).toThrow("boom");
	});

	describe("without none", () => {

		it("should apply some to the value when defined", async () => {
			expect(fold(2, n => n*3)).toBe(6);
		});

		it("should return undefined when the value is undefined", async () => {
			expect(fold(undefined as undefined | number, n => n*3)).toBeUndefined();
		});

		it("should propagate errors thrown by some", async () => {
			expect(() => fold(0, () => { throw new Error("boom"); })).toThrow("boom");
		});

		it("should widen the result type with undefined", async () => {
			expectTypeOf(fold(2 as undefined | number, n => n*3)).toEqualTypeOf<undefined | number>();
		});

	});

});

describe("pipe()", () => {

	it("should apply operators in sequence, feeding each with the result of the previous one", async () => {
		expect(pipe<number>(n => n+1, n => n*2)(3)).toBe(8);
	});

	it("should return the value unchanged when no operators are provided", async () => {
		const record = { id: 42 };
		expect(pipe<typeof record>()(record)).toBe(record);
	});

	it("should return an operator reusable across values", async () => {
		const increment = pipe<number>(n => n+1);
		expect([increment(1), increment(2)]).toEqual([2, 3]);
	});

	it("should propagate errors thrown by an operator", async () => {
		expect(() => pipe<number>(() => { throw new Error("boom"); }, n => n*2)(0)).toThrow("boom");
	});

});
