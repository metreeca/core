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
import type { Guard } from "../index.js";

import { immutable } from "./nested.js";


describe("immutable(value)", () => {

	test("should infer string type", () => {

		const value = "hello";
		const result = immutable(value);

		expectTypeOf(result).toBeString();

	});

	test("should infer number type", () => {

		const value = 42;
		const result = immutable(value);

		expectTypeOf(result).toBeNumber();

	});

	test("should infer boolean type", () => {

		const value = true;
		const result = immutable(value);

		expectTypeOf(result).toBeBoolean();

	});

	test("should infer object type", () => {

		const value = { name: "Alice", age: 30 };
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }>();

	});

	test("should infer array type", () => {

		const value = [1, 2, 3];
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<number[]>();

	});

	test("should infer nested object type", () => {

		const value = { user: { name: "Alice" }, items: [1, 2] };
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<{ user: { name: string }; items: number[] }>();

	});

});

describe("immutable(value, guard)", () => {

	test("should require guard to narrow unknown value", () => {

		const value: unknown = { name: "Alice" };
		const result = immutable(value);

		// without guard, unknown value returns unknown
		expectTypeOf(result).toBeUnknown();

		// @ts-expect-error - unknown result cannot be assigned to typed variable without guard
		assertType<{ name: string }>(immutable(value));

	});

	test("should infer return type from guard", () => {

		const guard: Guard<{ name: string; age: number }> = (v): v is { name: string; age: number } =>
			typeof v === "object" && v !== null && "name" in v && "age" in v;

		const value: unknown = { name: "Alice", age: 30 };
		const result = immutable(value, guard);

		expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }>();

	});

	test("should accept unknown value", () => {

		const guard: Guard<string> = (v): v is string => typeof v === "string";

		const value: unknown = "hello";
		const result = immutable(value, guard);

		expectTypeOf(result).toBeString();

	});

	test("should infer array type from guard", () => {

		const guard: Guard<number[]> = (v): v is number[] =>
			Array.isArray(v) && v.every(n => typeof n === "number");

		const value: unknown = [1, 2, 3];
		const result = immutable(value, guard);

		expectTypeOf(result).toEqualTypeOf<number[]>();

	});

});
