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

import { type Atomic, type DeepReadonly, immutable, type DeepPartial } from "./values.js";


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

	test("should infer read-only object type", () => {

		const value = { name: "Alice", age: 30 };
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<{ readonly name: string; readonly age: number }>();

	});

	test("should infer read-only array type", () => {

		const value = [1, 2, 3];
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<readonly number[]>();

	});

	test("should infer read-only nested object type", () => {

		const value = { user: { name: "Alice" }, items: [1, 2] };
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<{
			readonly user: { readonly name: string };
			readonly items: readonly number[];
		}>();

	});

	test("should reject writes to the frozen graph", () => {

		const result = immutable({ user: { name: "Alice" }, items: [1, 2] });

		// @ts-expect-error - nested property is read-only
		result.user.name = "Bob";

		// @ts-expect-error - nested array is read-only
		result.items[0] = 3;

	});

	test("should carry atoms through unchanged", () => {

		const value = { at: new Date(), tags: new Set(["x"]), run: () => "hello" };
		const result = immutable(value);

		expectTypeOf(result).toEqualTypeOf<{
			readonly at: Date;
			readonly tags: Set<string>;
			readonly run: () => string;
		}>();

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

		expectTypeOf(result).toEqualTypeOf<{ readonly name: string; readonly age: number }>();

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

		expectTypeOf(result).toEqualTypeOf<readonly number[]>();

	});

});


describe("Atomic", () => {

	test("should accept primitives", () => {

		expectTypeOf<undefined>().toExtend<Atomic>();
		expectTypeOf<null>().toExtend<Atomic>();
		expectTypeOf<boolean>().toExtend<Atomic>();
		expectTypeOf<number>().toExtend<Atomic>();
		expectTypeOf<bigint>().toExtend<Atomic>();
		expectTypeOf<string>().toExtend<Atomic>();
		expectTypeOf<symbol>().toExtend<Atomic>();

	});

	test("should accept functions and built-in objects", () => {

		expectTypeOf<() => string>().toExtend<Atomic>();
		expectTypeOf<Date>().toExtend<Atomic>();
		expectTypeOf<RegExp>().toExtend<Atomic>();
		expectTypeOf<Promise<string>>().toExtend<Atomic>();
		expectTypeOf<Map<string, number>>().toExtend<Atomic>();
		expectTypeOf<Set<string>>().toExtend<Atomic>();
		expectTypeOf<WeakMap<object, number>>().toExtend<Atomic>();
		expectTypeOf<WeakSet<object>>().toExtend<Atomic>();

	});

	test("should reject records and arrays", () => {

		expectTypeOf<{ name: string }>().not.toExtend<Atomic>();
		expectTypeOf<readonly string[]>().not.toExtend<Atomic>();
		expectTypeOf<[string, number]>().not.toExtend<Atomic>();

	});

});


describe("DeepReadonly<T>", () => {

	test("should carry atoms through unchanged", () => {

		expectTypeOf<DeepReadonly<string>>().toEqualTypeOf<string>();
		expectTypeOf<DeepReadonly<undefined>>().toEqualTypeOf<undefined>();
		expectTypeOf<DeepReadonly<Date>>().toEqualTypeOf<Date>();
		expectTypeOf<DeepReadonly<Map<string, number>>>().toEqualTypeOf<Map<string, number>>();
		expectTypeOf<DeepReadonly<() => string>>().toEqualTypeOf<() => string>();

	});

	test("should mark nested properties read-only", () => {

		expectTypeOf<DeepReadonly<{ user: { name: string } }>>()
			.toEqualTypeOf<{ readonly user: { readonly name: string } }>();

	});

	test("should preserve array arity", () => {

		expectTypeOf<DeepReadonly<number[]>>().toEqualTypeOf<readonly number[]>();
		expectTypeOf<DeepReadonly<[number, { a: string }]>>().toEqualTypeOf<readonly [number, { readonly a: string }]>();

	});

	test("should preserve optionality", () => {

		expectTypeOf<DeepReadonly<{ a?: string }>>().toEqualTypeOf<{ readonly a?: string }>();

	});

	test("should distribute over unions", () => {

		expectTypeOf<DeepReadonly<string | { a: number }>>().toEqualTypeOf<string | { readonly a: number }>();

	});

	test("should leave unknown alone", () => {

		expectTypeOf<DeepReadonly<unknown>>().toEqualTypeOf<unknown>();

	});

});


describe("DeepPartial<T>", () => {

	test("should carry atoms through unchanged", () => {

		expectTypeOf<DeepPartial<string>>().toEqualTypeOf<string>();
		expectTypeOf<DeepPartial<Date>>().toEqualTypeOf<Date>();
		expectTypeOf<DeepPartial<() => string>>().toEqualTypeOf<() => string>();

	});

	test("should make nested properties optional", () => {

		expectTypeOf<DeepPartial<{ user: { name: string; age: number } }>>()
			.toEqualTypeOf<{ user?: { name?: string; age?: number } }>();

	});

	test("should carry readonly over from the source", () => {

		expectTypeOf<DeepPartial<{ a: string }>>().toEqualTypeOf<{ a?: string }>();
		expectTypeOf<DeepPartial<{ readonly a: string }>>().toEqualTypeOf<{ readonly a?: string }>();

	});

	test("should keep array arity and widen items", () => {

		expectTypeOf<DeepPartial<{ a: string }[]>>().toEqualTypeOf<{ a?: string }[]>();
		expectTypeOf<DeepPartial<[{ a: string }, number]>>().toEqualTypeOf<[{ a?: string }, number]>();

	});

	test("should compose with a deeply read-only view", () => {

		expectTypeOf<DeepPartial<DeepReadonly<{ user: { name: string } }>>>()
			.toEqualTypeOf<{ readonly user?: { readonly name?: string } }>();

	});

	test("should hold stated slots to their declared type", () => {

		type User = { name: string, address: { city: string } };

		assertType<DeepPartial<User>>({ address: { city: "Rome" } });

		// @ts-expect-error - no such slot
		assertType<DeepPartial<User>>({ address: { town: "Rome" } });

		// @ts-expect-error - wrong type for a stated slot
		assertType<DeepPartial<User>>({ address: { city: 42 } });

	});

	test("should leave unknown alone", () => {

		expectTypeOf<DeepPartial<unknown>>().toEqualTypeOf<unknown>();

	});

});
