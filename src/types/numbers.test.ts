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
import { add, div, mul, sub } from "./numbers.js";


describe("add()", () => {

	describe("numbers", () => {

		it("should add two numbers", async () => {

			expect(add(1, 2)).toBe(3);
			expect(add(-1, 2)).toBe(1);
			expect(add(0.5, 0.25)).toBe(0.75);

		});

	});

	describe("bigints", () => {

		it("should add two bigints", async () => {

			expect(add(1n, 2n)).toBe(3n);
			expect(add(-1n, 2n)).toBe(1n);

		});

		it("should preserve the precision of large values", async () => {

			expect(add(2n**60n, 1n)).toBe(1152921504606846977n);

		});

	});

	describe("mixed operands", () => {

		it("should report a number added to a bigint", async () => {

			// mixed operands are only typeable when the type parameter widens to the whole union

			const sum: (x: number | bigint, y: number | bigint) => number | bigint = add;

			expect(() => sum(1, 2n)).toThrow(TypeError);
			expect(() => sum(1n, 2)).toThrow(TypeError);

		});

	});

});

describe("sub()", () => {

	describe("numbers", () => {

		it("should subtract two numbers", async () => {

			expect(sub(3, 1)).toBe(2);
			expect(sub(1, 3)).toBe(-2);
			expect(sub(0.75, 0.25)).toBe(0.5);

		});

	});

	describe("bigints", () => {

		it("should subtract two bigints", async () => {

			expect(sub(3n, 1n)).toBe(2n);
			expect(sub(1n, 3n)).toBe(-2n);

		});

		it("should preserve the precision of large values", async () => {

			expect(sub(2n**60n+1n, 1n)).toBe(1152921504606846976n);

		});

	});

	describe("mixed operands", () => {

		it("should report a number subtracted from a bigint", async () => {

			// mixed operands are only typeable when the type parameter widens to the whole union

			const difference: (x: number | bigint, y: number | bigint) => number | bigint = sub;

			expect(() => difference(1, 2n)).toThrow(TypeError);
			expect(() => difference(1n, 2)).toThrow(TypeError);

		});

	});

});

describe("mul()", () => {

	describe("number multiplicands", () => {

		it("should multiply as an IEEE 754 double", async () => {

			expect(mul(3, 2)).toBe(6);
			expect(mul(-3, 2)).toBe(-6);
			expect(mul(3, -2)).toBe(-6);

		});

		it("should multiply by a fractional factor", async () => {

			expect(mul(7, 0.5)).toBe(3.5);

		});

	});

	describe("bigint multiplicands", () => {

		it("should return an exact product", async () => {

			expect(mul(3n, 2)).toBe(6n);
			expect(mul(-3n, 2)).toBe(-6n);
			expect(mul(3n, -2)).toBe(-6n);
			expect(mul(-3n, -2)).toBe(6n);

		});

		it("should preserve the precision of large values", async () => {

			expect(mul(2n**60n+1n, 2)).toBe(2305843009213693954n);

		});

		it("should return the multiplicand unaltered on a unit factor", async () => {

			expect(mul(7n, 1)).toBe(7n);
			expect(mul(7n, -1)).toBe(-7n);

		});

		it("should return zero on a zero factor", async () => {

			expect(mul(7n, 0)).toBe(0n);

		});

	});

	describe("validation", () => {

		it("should report a fractional factor for a bigint multiplicand", async () => {

			expect(() => mul(7n, 0.5)).toThrow(RangeError);

		});

		it("should report a non-finite factor for a bigint multiplicand", async () => {

			expect(() => mul(7n, NaN)).toThrow(RangeError);
			expect(() => mul(7n, Infinity)).toThrow(RangeError);

		});

	});

});

describe("div()", () => {

	describe("number dividends", () => {

		it("should divide as an IEEE 754 double", async () => {

			expect(div(7, 2)).toBe(3.5);
			expect(div(-7, 2)).toBe(-3.5);
			expect(div(7, -2)).toBe(-3.5);

		});

		it("should divide by a fractional divisor", async () => {

			expect(div(1, 0.5)).toBe(2);

		});

	});

	describe("bigint dividends", () => {

		it("should return an exact quotient as it is", async () => {

			expect(div(10n, 5)).toBe(2n);
			expect(div(-10n, 5)).toBe(-2n);
			expect(div(10n, -5)).toBe(-2n);
			expect(div(-10n, -5)).toBe(2n);

		});

		it("should round towards the nearest integer", async () => {

			expect(div(1n, 3)).toBe(0n);
			expect(div(2n, 3)).toBe(1n);
			expect(div(-1n, 3)).toBe(0n);
			expect(div(-2n, 3)).toBe(-1n);

		});

		it("should round halves away from zero", async () => {

			expect(div(1n, 2)).toBe(1n);
			expect(div(5n, 2)).toBe(3n);
			expect(div(-1n, 2)).toBe(-1n);
			expect(div(-5n, 2)).toBe(-3n);

		});

		it("should round by the magnitude of the quotient on a negative divisor", async () => {

			expect(div(3n, -4)).toBe(-1n);
			expect(div(7n, -2)).toBe(-4n);
			expect(div(-7n, -2)).toBe(4n);
			expect(div(1n, -3)).toBe(0n);

		});

		it("should preserve the precision of large values", async () => {

			expect(div(2n**60n+1n, 2)).toBe(576460752303423489n);

		});

		it("should return the dividend unaltered on a unit divisor", async () => {

			expect(div(7n, 1)).toBe(7n);
			expect(div(7n, -1)).toBe(-7n);

		});

	});

	describe("validation", () => {

		it("should report a fractional divisor for a bigint dividend", async () => {

			expect(() => div(7n, 0.5)).toThrow(RangeError);

		});

		it("should report a non-finite divisor for a bigint dividend", async () => {

			expect(() => div(7n, NaN)).toThrow(RangeError);
			expect(() => div(7n, Infinity)).toThrow(RangeError);

		});

	});

});
