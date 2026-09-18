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

import { describe, expectTypeOf, it } from "vitest";
import { difference, intersection, nonempty, type Some, some, union, unique } from "./arrays.js";


function* iterate<T>(...values: T[]): Generator<T> {
	yield* values;
}


describe("some()", () => {

	it("should normalise a single-or-many value to its element type", async () => {

		expectTypeOf(some(42)).toEqualTypeOf<readonly number[]>();
		expectTypeOf(some([1, 2])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from any collection", async () => {

		expectTypeOf(some(new Set([1, 2]))).toEqualTypeOf<readonly number[]>();
		expectTypeOf(some(new Map([["x", 1]]).values())).toEqualTypeOf<readonly number[]>();
		expectTypeOf(some(iterate(1, 2))).toEqualTypeOf<readonly number[]>();

	});

	it("should keep a string singular", async () => {

		expectTypeOf(some("xy")).toEqualTypeOf<readonly string[]>();

	});

	it("should flatten a single level only", async () => {

		expectTypeOf(some([[1], [2]])).toEqualTypeOf<readonly number[][]>();

	});

	it("should reject a value of the wrong element type", async () => {

		const tags = (values: Some<string>) => some(values);

		// @ts-expect-error — a number is not a string
		tags(42);

		// @ts-expect-error — an array of numbers is not a collection of strings
		tags([1]);

		// @ts-expect-error — a set of numbers is not a collection of strings
		tags(new Set([1]));

	});

});


describe("unique()", () => {

	it("should infer the element type from any collection", async () => {

		expectTypeOf(unique([1, 2])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(unique(new Set([1, 2]))).toEqualTypeOf<readonly number[]>();
		expectTypeOf(unique(new Map([["x", 1]]).values())).toEqualTypeOf<readonly number[]>();
		expectTypeOf(unique(iterate(1, 2))).toEqualTypeOf<readonly number[]>();

	});

	it("should type the comparator on the element type", async () => {

		unique(iterate({ id: 1 }), (x, y) => {

			expectTypeOf(x).toEqualTypeOf<{ id: number }>();
			expectTypeOf(y).toEqualTypeOf<{ id: number }>();

			return true;

		});

	});

	it("should reject a non-collection source", async () => {

		// @ts-expect-error — a number is not a collection
		unique(42);

	});

});

describe("union()", () => {

	it("should infer the element type from any collection", async () => {

		expectTypeOf(union([[1, 2], [2, 3]])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(union([new Set([1, 2])])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(union(iterate(iterate(1, 2)))).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from declared array collections", async () => {

		const mutable: number[] = [1, 2];
		const immutable: readonly number[] = [2, 3];

		expectTypeOf(union([mutable, immutable])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from generator collections", async () => {

		expectTypeOf(union([iterate(1, 2), iterate(2, 3)])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer a shared element type from mixed collections", async () => {

		expectTypeOf(union([[1, 2], new Set([3])])).toEqualTypeOf<readonly number[]>();

	});

	it("should type the comparator on the element type", async () => {

		union(iterate(iterate({ id: 1 })), (x, y) => {

			expectTypeOf(x).toEqualTypeOf<{ id: number }>();
			expectTypeOf(y).toEqualTypeOf<{ id: number }>();

			return true;

		});

	});

	it("should reject a collection of non-collections", async () => {

		// @ts-expect-error — a number is not a collection
		union([1, 2]);

	});

});

describe("intersection()", () => {

	it("should infer the element type from any collection", async () => {

		expectTypeOf(intersection([[1, 2], [2, 3]])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(intersection([new Set([1, 2])])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(intersection(iterate(iterate(1, 2)))).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from declared array collections", async () => {

		const mutable: number[] = [1, 2];
		const immutable: readonly number[] = [2, 3];

		expectTypeOf(intersection([mutable, immutable])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from generator collections", async () => {

		expectTypeOf(intersection([iterate(1, 2), iterate(2, 3)])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer a shared element type from mixed collections", async () => {

		expectTypeOf(intersection([[1, 2], new Set([3])])).toEqualTypeOf<readonly number[]>();

	});

	it("should type the comparator on the element type", async () => {

		intersection(iterate(iterate({ id: 1 })), (x, y) => {

			expectTypeOf(x).toEqualTypeOf<{ id: number }>();
			expectTypeOf(y).toEqualTypeOf<{ id: number }>();

			return true;

		});

	});

	it("should reject a collection of non-collections", async () => {

		// @ts-expect-error — a number is not a collection
		intersection([1, 2]);

	});

});

describe("difference()", () => {

	it("should infer the element type from any collection", async () => {

		expectTypeOf(difference([[1, 2], [2, 3]])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(difference([new Set([1, 2])])).toEqualTypeOf<readonly number[]>();
		expectTypeOf(difference(iterate(iterate(1, 2)))).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from declared array collections", async () => {

		const mutable: number[] = [1, 2];
		const immutable: readonly number[] = [2, 3];

		expectTypeOf(difference([mutable, immutable])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer the element type from generator collections", async () => {

		expectTypeOf(difference([iterate(1, 2), iterate(2, 3)])).toEqualTypeOf<readonly number[]>();

	});

	it("should infer a shared element type from mixed collections", async () => {

		expectTypeOf(difference([[1, 2], new Set([3])])).toEqualTypeOf<readonly number[]>();

	});

	it("should type the comparator on the element type", async () => {

		difference(iterate(iterate({ id: 1 })), (x, y) => {

			expectTypeOf(x).toEqualTypeOf<{ id: number }>();
			expectTypeOf(y).toEqualTypeOf<{ id: number }>();

			return true;

		});

	});

	it("should reject a collection of non-collections", async () => {

		// @ts-expect-error — a number is not a collection
		difference([1, 2]);

	});

});

describe("nonempty()", () => {

	it("should guarantee a first element", async () => {

		expectTypeOf(nonempty(42)).toEqualTypeOf<readonly [number, ...number[]]>();
		expectTypeOf(nonempty([1, 2])[0]).toEqualTypeOf<number>();

	});

	it("should infer the element type from any collection", async () => {

		expectTypeOf(nonempty(new Set([1, 2]))).toEqualTypeOf<readonly [number, ...number[]]>();
		expectTypeOf(nonempty(iterate(1, 2))).toEqualTypeOf<readonly [number, ...number[]]>();

	});

	it("should reject a value of the wrong element type", async () => {

		const tags = (values: Some<string>) => nonempty(values);

		// @ts-expect-error — a number is not a string
		tags(42);

	});

});
