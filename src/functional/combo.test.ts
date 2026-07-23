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
import { equals } from "../common/deep.js";
import { fold, intersection, map, some, union, unique } from "./combo.js";


describe("values", () => {

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

});

describe("arrays", () => {

	describe("some()", () => {

		it("should return an empty array when the value is undefined", async () => {
			expect(some(undefined)).toEqual([]);
		});

		it("should wrap a single value in an array", async () => {
			expect(some(42)).toEqual([42]);
		});

		it("should return the array unchanged for an array value", async () => {
			expect(some([1, 2, 3])).toEqual([1, 2, 3]);
		});

		it("should return an empty array for an empty array value", async () => {
			expect(some([])).toEqual([]);
		});

	});

	describe("unique()", () => {

		it("should return an empty array as-is", async () => {

			expect(unique([])).toEqual([]);

		});

		it("should return a new array", async () => {

			const values = [1, 2, 3];

			expect(unique(values)).not.toBe(values);

		});

		it("should keep unique primitives unchanged", async () => {

			expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
			expect(unique(["x", "y", "z"])).toEqual(["x", "y", "z"]);

		});

		it("should remove duplicate primitives keeping the first occurrence", async () => {

			expect(unique([1, 1, 2, 3, 3, 3])).toEqual([1, 2, 3]);
			expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
			expect(unique(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);

		});

		describe("default equality", () => {

			it("should deduplicate by Set identity", async () => {

				expect(unique([NaN, NaN])).toEqual([NaN]);
				expect(unique([-0, +0])).toEqual([0]);

			});

			it("should compare objects by reference", async () => {

				const uno = { x: 1 };
				const due = { x: 1 };

				expect(unique([uno, due])).toEqual([uno, due]);
				expect(unique([uno, uno, due])).toEqual([uno, due]);

			});

		});

		describe("custom equality", () => {

			it("should deduplicate using a custom equality function", async () => {

				const looseEqual = (x: unknown, y: unknown) => x == y;

				expect(unique([1, "1", 2], looseEqual)).toEqual([1, 2]);

			});

			it("should deduplicate objects by structural equality", async () => {

				const uno = { x: 1 };
				const due = { x: 1 };
				const tre = { x: 2 };

				expect(unique([uno, due, tre], (x, y) => equals(x, y))).toEqual([uno, tre]);

			});

			it("should deduplicate strings case-insensitively", async () => {

				const caseInsensitive = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();

				expect(unique(["Hello", "hello", "HELLO", "world"], caseInsensitive)).toEqual(["Hello", "world"]);

			});

		});

	});

	describe("union()", () => {

		it("should combine arrays keeping each distinct element", async () => {

			expect(union([[1, 2], [2, 3], [3, 4]])).toEqual([1, 2, 3, 4]);

		});

		it("should preserve first-seen order across arrays", async () => {

			expect(union([[3, 1], [2, 1], [4, 3]])).toEqual([3, 1, 2, 4]);

		});

		it("should drop duplicates within and across arrays", async () => {

			expect(union([[1, 1, 2], [2, 2, 3]])).toEqual([1, 2, 3]);

		});

		it("should return the distinct elements of a single array", async () => {

			expect(union([[1, 1, 2, 3, 3]])).toEqual([1, 2, 3]);

		});

		it("should ignore empty arrays", async () => {

			expect(union([[], [1, 2], []])).toEqual([1, 2]);

		});

		it("should return an empty array when given no arrays", async () => {

			expect(union([])).toEqual([]);

		});

		it("should return a new array", async () => {

			const values = [1, 2, 3];

			expect(union([values])).not.toBe(values);

		});

		describe("identity comparison", () => {

			it("should treat NaN as a single element", async () => {

				expect(union([[NaN], [NaN]])).toEqual([NaN]);

			});

			it("should compare objects by reference", async () => {

				const uno = { x: 1 };
				const due = { x: 1 };

				expect(union([[uno], [uno]])).toEqual([uno]);
				expect(union([[uno], [due]])).toEqual([uno, due]);

			});

		});

		describe("custom equality", () => {

			it("should merge elements equal under the comparator", async () => {

				const uno = { id: 1 };
				const dup = { id: 1 };
				const due = { id: 2 };

				expect(union([[uno], [dup, due]], (x, y) => x.id === y.id)).toEqual([uno, due]);

			});

		});

		it("should infer the element type", async () => {

			expectTypeOf(union([[1, 2], [2, 3]])).toEqualTypeOf<readonly number[]>();

		});

	});

	describe("intersection()", () => {

		it("should keep the elements common to all arrays", async () => {

			expect(intersection([[1, 2, 3], [2, 3, 4]])).toEqual([2, 3]);
			expect(intersection([[1, 2, 3], [2, 3, 4], [3, 4, 5]])).toEqual([3]);

		});

		it("should preserve the first-seen order of the first array", async () => {

			expect(intersection([[3, 1, 2], [2, 1, 3]])).toEqual([3, 1, 2]);

		});

		it("should drop duplicates", async () => {

			expect(intersection([[1, 1, 2, 2], [1, 2]])).toEqual([1, 2]);

		});

		it("should return an empty array when the arrays share nothing", async () => {

			expect(intersection([[1, 2], [3, 4]])).toEqual([]);

		});

		it("should return an empty array when any array is empty", async () => {

			expect(intersection([[1, 2], []])).toEqual([]);

		});

		it("should return the distinct elements of a single array", async () => {

			expect(intersection([[1, 1, 2]])).toEqual([1, 2]);

		});

		it("should return an empty array when given no arrays", async () => {

			expect(intersection([])).toEqual([]);

		});

		it("should return a new array", async () => {

			const values = [1, 2, 3];

			expect(intersection([values])).not.toBe(values);

		});

		describe("identity comparison", () => {

			it("should treat NaN as a single element", async () => {

				expect(intersection([[NaN], [NaN]])).toEqual([NaN]);

			});

			it("should compare objects by reference", async () => {

				const uno = { x: 1 };
				const due = { x: 1 };

				expect(intersection([[uno], [uno]])).toEqual([uno]);
				expect(intersection([[uno], [due]])).toEqual([]);

			});

		});

		describe("custom equality", () => {

			it("should intersect elements equal under the comparator", async () => {

				const a1 = { id: 1 };
				const a2 = { id: 2 };
				const b1 = { id: 1 };
				const b3 = { id: 3 };

				expect(intersection([[a1, a2], [b1, b3]], (x, y) => x.id === y.id)).toEqual([a1]);

			});

		});

		it("should infer the element type", async () => {

			expectTypeOf(intersection([[1, 2], [2, 3]])).toEqualTypeOf<readonly number[]>();

		});

	});

});
