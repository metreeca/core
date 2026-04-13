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

import { type DeepPartial, immutable } from "./deep.js";


type StringIndexSource = Record<string, { title: string }>;
type StringIndexExpected = Readonly<Partial<Record<string, { readonly title?: string }>>>;

type NumericIndexSource = Record<number, { value: string }>;
type NumericIndexExpected = Readonly<Partial<Record<number, { readonly value?: string }>>>;


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

describe("DeepPartial<T>", () => {

	describe("primitive leaves", () => {

		test("should preserve string, number, boolean", async () => {
			expectTypeOf<DeepPartial<string>>().toEqualTypeOf<string>();
			expectTypeOf<DeepPartial<number>>().toEqualTypeOf<number>();
			expectTypeOf<DeepPartial<boolean>>().toEqualTypeOf<boolean>();
		});

		test("should preserve null and undefined", async () => {
			expectTypeOf<DeepPartial<null>>().toEqualTypeOf<null>();
			expectTypeOf<DeepPartial<undefined>>().toEqualTypeOf<undefined>();
		});

		test("should preserve literal types", async () => {
			expectTypeOf<DeepPartial<"a">>().toEqualTypeOf<"a">();
			expectTypeOf<DeepPartial<42>>().toEqualTypeOf<42>();
			expectTypeOf<DeepPartial<true>>().toEqualTypeOf<true>();
		});

	});

	describe("arrays", () => {

		test("should map mutable arrays to readonly arrays of partialised elements", async () => {
			expectTypeOf<DeepPartial<number[]>>().toEqualTypeOf<readonly number[]>();
		});

		test("should preserve readonly arrays", async () => {
			expectTypeOf<DeepPartial<readonly number[]>>().toEqualTypeOf<readonly number[]>();
		});

		test("should partialise array element objects", async () => {
			expectTypeOf<DeepPartial<{ x: number }[]>>()
				.toEqualTypeOf<readonly { readonly x?: number }[]>();
		});

		test("should partialise nested arrays", async () => {
			expectTypeOf<DeepPartial<number[][]>>()
				.toEqualTypeOf<readonly (readonly number[])[]>();
		});

	});

	describe("tuples", () => {

		test("should preserve empty tuple", async () => {
			expectTypeOf<DeepPartial<readonly []>>().toEqualTypeOf<readonly []>();
		});

		test("should partialise singleton tuple element-wise", async () => {
			expectTypeOf<DeepPartial<readonly [{ x: number }]>>()
				.toEqualTypeOf<readonly [{ readonly x?: number }]>();
		});

		test("should partialise multi-element tuples preserving length", async () => {
			expectTypeOf<DeepPartial<readonly [{ x: number }, { y: string }]>>()
				.toEqualTypeOf<readonly [{ readonly x?: number }, { readonly y?: string }]>();
		});

		test("should partialise heterogeneous tuples", async () => {
			expectTypeOf<DeepPartial<readonly [string, { a: number }, number[]]>>()
				.toEqualTypeOf<readonly [string, { readonly a?: number }, readonly number[]]>();
		});

		test("should preserve labelled tuple element names", async () => {
			expectTypeOf<DeepPartial<readonly [id: string, count: number]>>()
				.toEqualTypeOf<readonly [id: string, count: number]>();
		});

		test("should preserve rest-tail tuple shape", async () => {
			expectTypeOf<DeepPartial<readonly [{ a: number }, ...{ b: string }[]]>>()
				.toEqualTypeOf<readonly [{ readonly a?: number }, ...(readonly { readonly b?: string }[])]>();
		});

		test("should preserve rest-head tuple shape", async () => {
			expectTypeOf<DeepPartial<readonly [...{ a: number }[], { b: string }]>>()
				.toEqualTypeOf<readonly [...(readonly { readonly a?: number }[]), { readonly b?: string }]>();
		});

		test("should preserve rest-middle tuple shape", async () => {
			expectTypeOf<DeepPartial<readonly [{ a: number }, ...{ b: string }[], { c: boolean }]>>()
				.toEqualTypeOf<readonly [
					{ readonly a?: number },
					...(readonly { readonly b?: string }[]),
					{ readonly c?: boolean },
				]>();
		});

	});

	describe("plain objects", () => {

		test("should make every property optional and readonly", async () => {
			expectTypeOf<DeepPartial<{ a: number; b: string }>>()
				.toEqualTypeOf<{ readonly a?: number; readonly b?: string }>();
		});

		test("should recurse into nested objects", async () => {
			expectTypeOf<DeepPartial<{ a: { b: { c: number } } }>>()
				.toEqualTypeOf<{ readonly a?: { readonly b?: { readonly c?: number } } }>();
		});

		test("should partialise array-valued properties", async () => {
			expectTypeOf<DeepPartial<{ items: { id: number }[] }>>()
				.toEqualTypeOf<{ readonly items?: readonly { readonly id?: number }[] }>();
		});

		test("should preserve already-optional properties", async () => {
			expectTypeOf<DeepPartial<{ a: number; b?: string }>>()
				.toEqualTypeOf<{ readonly a?: number; readonly b?: string }>();
		});

	});

	describe("index signatures", () => {

		test("should partialise values under a string index signature", async () => {
			expectTypeOf<DeepPartial<StringIndexSource>>().toEqualTypeOf<StringIndexExpected>();
		});

		test("should partialise values under a number index signature", async () => {
			expectTypeOf<DeepPartial<NumericIndexSource>>().toEqualTypeOf<NumericIndexExpected>();
		});

	});

	describe("unions", () => {

		test("should distribute over unions", async () => {
			expectTypeOf<DeepPartial<{ a: number } | string>>()
				.toEqualTypeOf<{ readonly a?: number } | string>();
		});

	});

});
