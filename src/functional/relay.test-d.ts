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
import { Option, createRelay } from "./relay.js";


describe("Relay", () => {

	type TestOptions = {
		boolean: boolean
		string: string
		number: number
	}

	describe("Option type - ExactlyOne constraint", () => {

		test("should accept exactly one property", () => {

			const singleString: Option<TestOptions> = { string: "test" };
			const singleBoolean: Option<TestOptions> = { boolean: true };
			const singleNumber: Option<TestOptions> = { number: 42 };

			expectTypeOf(singleString).toHaveProperty("string");
			expectTypeOf(singleBoolean).toHaveProperty("boolean");
			expectTypeOf(singleNumber).toHaveProperty("number");

		});

		test("should reject multiple properties", () => {

			// @ts-expect-error - cannot have two properties
			const multipleProps: Option<TestOptions> = { string: "test", boolean: true };

			assertType<Option<TestOptions>>(multipleProps);

		});

		test("should reject empty object", () => {

			// @ts-expect-error - must have exactly one property
			const emptyObj: Option<TestOptions> = {};

			assertType<Option<TestOptions>>(emptyObj);

		});

	});

	describe("handler type inference", () => {

		test("should reject wrong handler parameter type", () => {

			// @ts-expect-error - handler should accept string, not number
			createRelay<TestOptions>({ string: "test" })({
				string: (v: number) => v * 2,
				boolean: (b) => b ? "true" : "false",
				number: (n) => n.toString()
			});

		});

		test("should reject inconsistent handler return types", () => {

			createRelay<TestOptions>({ string: "test" })({
				boolean: 42,
				number: 10,
				// @ts-expect-error - Type 'string' is not assignable to type 'Handler<string, number>'
				string: "not a number"
			});

		});

		test("should reject extra handler keys", () => {

			createRelay<TestOptions>({ string: "test" })({
				string: "ok",
				boolean: "error",
				number: "other",
				// @ts-expect-error - 'extra' is not a valid key
				extra: "not allowed"
			});

		});

		test("should infer handler parameter types correctly", () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				boolean: (b) => b ? 1 : 0,
				number: (n) => n * 2,
				string: (v) => v.length
			});

			// result is number | undefined because handlers are complete but no fallback
			expectTypeOf(result).toEqualTypeOf<number | undefined>();

		});

		test("should return R | undefined when some handlers missing", () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				string: "ok",
				boolean: "error"
			});

			expectTypeOf(result).toEqualTypeOf<string | undefined>();

		});

	});

	describe("fallback handler type behavior", () => {

		test("should reject wrong type for fallback handler", () => {

			createRelay<TestOptions>({ string: "test" })({
					string: (v) => v.length,
					number: (n) => n * 2,
					boolean: (b) => b ? 1 : 0
				},
				// @ts-expect-error - fallback returns string but R should be number
				"not a number"
			);

		});

		test("should accept fallback handler value", () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				string: "ok"
			}, "default");

			expectTypeOf(result).toBeString();

		});

		test("should return R (not R | undefined) with fallback", () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				boolean: "matched boolean"
			}, "default option");

			expectTypeOf(result).toBeString();

		});

	});

	describe("delegation type constraints", () => {

		type DelegationOptions = {
			value: string
			error: Error
		}

		test("handlers with fallback receive delegate parameter", () => {

			const result = createRelay<DelegationOptions>({ value: "test" })({
				value: (v, delegate) => delegate()
			}, "fallback");

			expectTypeOf(result).toBeString();

		});

		test("handlers without fallback have no delegate parameter", () => {

			const result = createRelay<DelegationOptions>({ value: "test" })({
				value: (v) => `value: ${v}`,
				error: (e) => `error: ${e.message}`
			});

			expectTypeOf(result).toEqualTypeOf<string | undefined>();

		});

	});

});
