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

import { describe, expect, it } from "vitest";
import { equals } from "../common/deep.js";
import { fold, list, map, unique } from "./combo.js";


describe("list()", () => {

	it("should return an empty array when the value is undefined", async () => {
		expect(list(undefined)).toEqual([]);
	});

	it("should wrap a single value in an array", async () => {
		expect(list(42)).toEqual([42]);
	});

	it("should return the array unchanged for an array value", async () => {
		expect(list([1, 2, 3])).toEqual([1, 2, 3]);
	});

	it("should return an empty array for an empty array value", async () => {
		expect(list([])).toEqual([]);
	});

});

describe("map()", () => {

	it("should return the result of applying the mapper to the value", async () => {
		expect(map(2, n => n * 3)).toBe(6);
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
		expect(fold(2, n => n * 3, () => 0)).toBe(6);
	});

	it("should pass the value as the some argument", async () => {
		const record = { id: 42 };
		expect(fold(record, ({ id }) => id, () => 0)).toBe(42);
	});

	it("should support folding to a different type", async () => {
		expect(fold(42, n => `#${n}`, () => "none")).toBe("#42");
	});

	it("should evaluate the none thunk when the value is undefined", async () => {
		expect(fold(undefined as undefined | number, n => n * 3, () => -1)).toBe(-1);
	});

	it("should return the none value when it is not a function", async () => {
		expect(fold(undefined as undefined | number, n => n * 3, -1)).toBe(-1);
	});

	it("should not evaluate none when the value is defined", async () => {
		expect(fold(2, n => n * 3, () => { throw new Error("boom"); })).toBe(6);
	});

	it("should propagate errors thrown by some", async () => {
		expect(() => fold(0, () => { throw new Error("boom"); }, () => 0)).toThrow("boom");
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

		it("should use Object.is by default", async () => {

			expect(unique([NaN, NaN])).toEqual([NaN]);
			expect(unique([-0, +0])).toEqual([-0, +0]);

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
