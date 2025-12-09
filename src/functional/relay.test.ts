/*
 * Copyright © 2025 Metreeca srl
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
import { Option, createRelay } from "./relay.js";


/**
 * Type system validation tests.
 *
 * These tests verify TypeScript's compile-time type checking behavior.
 * Tests marked with @ts-expect-error should fail compilation, demonstrating
 * that the type system prevents invalid usage. Runtime assertions are secondary
 * and only ensure the test file remains valid JavaScript.
 */
describe("Relay", () => {

	type TestOptions = {
		boolean: boolean
		string: string
		number: number
	}

	describe("Condition type - ExactlyOne constraint", () => {

		it("should accept exactly one property", async () => {

			// these assignments verify Condition<C> accepts single properties

			const singleString: Option<TestOptions> = { string: "test" };
			const singleBoolean: Option<TestOptions> = { boolean: true };
			const singleNumber: Option<TestOptions> = { number: 42 };

			// runtime verification

			expect(singleString).toEqual({ string: "test" });
			expect(singleBoolean).toEqual({ boolean: true });
			expect(singleNumber).toEqual({ number: 42 });

		});

		it("type check: should reject multiple properties", async () => {

			// ⚠️ this test verifies COMPILE-TIME behavior only
			// TypeScript will error on the next line, preventing invalid code
			// the runtime assertion just ensures the test file remains valid

			// @ts-expect-error - cannot have two properties
			const multipleProps: Option<TestOptions> = { string: "test", boolean: true };

			// runtime check is secondary

			expect(multipleProps).toBeDefined();

		});

		it("type check: should reject empty object", async () => {

			// ⚠️ this test verifies COMPILE-TIME behavior only

			// @ts-expect-error - must have exactly one property
			const emptyObj: Option<TestOptions> = {};

			// runtime check is secondary

			expect(emptyObj).toBeDefined();

		});

	});

	describe("Fallback type constraints", () => {

		it("type check: fallback accepts handler value", async () => {

			// ✅ valid: fallback as handler

			const singleProp = createRelay<TestOptions>({ string: "test" })({
				string: "ok"
			}, "default");

			expect(singleProp).toBe("ok");

		});


	});

	describe("Handler type inference", () => {

		it("type check: should reject wrong handler parameter type", async () => {

			// @ts-expect-error - handler should accept string, not number

			const result = createRelay<TestOptions>({ string: "test" })({
				string: (v: number) => v*2,
				boolean: (b) => b ? "true" : "false",
				number: (n) => n.toString()
			});

			expect(result).toBeDefined();

		});

		it("type check: should reject inconsistent handler return types", async () => {

			// this test verifies that all handlers should return the same type
			// when implemented, TypeScript should enforce consistent return types

			const result = createRelay<TestOptions>({ string: "test" })({
				boolean: 42,
				number: 10,
				// @ts-expect-error - Type 'string' is not assignable to type 'Handler<string, number>'
				string: "not a number" // this string is inconsistent with number returns
			});

			// runtime: the matched handler returns its value

			expect(result).toBe("not a number");

		});

		it("should infer handler parameter types correctly", async () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				boolean: (b) => b ? 1 : 0, // b is inferred as boolean
				number: (n) => n*2, // n is inferred as number
				string: (v) => v.length // v is inferred as string
			});

			// result should be number

			expect(result).toBe(4);

		});

		it("should return R | undefined when some handlers missing", async () => {

			// missing 'number' handler, so result is string | undefined

			const result: string | undefined = createRelay<TestOptions>({ string: "test" })({
				string: "ok",
				boolean: "error"
			});

			expect(result).toBe("ok");

		});

		it("type check: should reject extra handler keys", async () => {

			const result = createRelay<TestOptions>({ string: "test" })({
				string: "ok",
				boolean: "error",
				number: "other",
				// @ts-expect-error - 'extra' is not a valid key
				extra: "not allowed"
			});

			expect(result).toBe("ok");

		});

	});

	describe("Fallback handler type behavior", () => {

		it("should support fallback handler", async () => {

			const result: string = createRelay<TestOptions>({ string: "test" })({
				string: "matched string",
				boolean: "matched boolean",
				number: "matched number"
			}, "fallback");

			expect(result).toBe("matched string");

		});

		it("should pass union of all option types to fallback handler", async () => {

			const result: string = createRelay<TestOptions>({ number: 42 })({
				string: (v) => `string: ${v}`,
				number: (n) => `number: ${n}`,
				boolean: (b) => `boolean: ${b}`
			}, (v) => {
				// v is string | number | boolean
				if ( typeof v === "string" ) {
					return `default string: ${v}`;
				}
				if ( typeof v === "number" ) {
					return `default number: ${v}`;
				}
				return `default boolean: ${v}`;
			});

			expect(result).toBe("number: 42");

		});

		it("should support constant fallback value", async () => {

			const result: number = createRelay<TestOptions>({ boolean: true })({
				boolean: 1,
				string: 2,
				number: 3
			}, 999);

			expect(result).toBe(1);

		});

		it("should return R (not R | undefined) with fallback", async () => {

			const result: string = createRelay<TestOptions>({ string: "test" })({
				boolean: "matched boolean"
				// 'string' and 'number' handlers missing, but fallback guarantees a result
			}, "default option");

			expect(result).toBe("default option");

		});


		it("type check: should reject wrong type for fallback handler", async () => {

			const result = createRelay<TestOptions>({ string: "test" })({
					string: (v) => v.length,
					number: (n) => n*2,
					boolean: (b) => b ? 1 : 0
				},
				// @ts-expect-error - fallback returns string but R should be number
				"not a number"
			);

			expect(typeof result).toBe("number");

		});

	});

	describe("Fallback parameter requirements", () => {

		it("type check: fallback parameter can be specified", async () => {

			// ✅ valid: Fallback parameter specified

			const a = createRelay<{ value: string; error: Error }>({ value: "done" })({
				value: (v) => `value: ${v}`
			}, () => "unhandled");

			expect(a).toBe("value: done");

		});

	});

	describe("Delegation type constraints", () => {

		type TestOptions = {
			value: string
			error: Error
		}

		it("type check: handlers with fallback receive delegate parameter", async () => {

			// ✅ valid: delegate parameter available when fallback is provided

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (v, delegate) => delegate()
			}, "fallback");

			expect(result).toBe("fallback");

		});

		it("type check: handlers without fallback have no delegate parameter", async () => {

			// ✅ valid: single-parameter handler for complete handlers

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (v) => `value: ${v}`,
				error: (e) => `error: ${e.message}`
			});

			expect(result).toBe("value: test");

		});

		it("type check: should reject delegate usage without fallback in complete handlers", async () => {

			// ⚠️ this test verifies COMPILE-TIME behavior only
			// TypeScript errors on the next line because delegate is not in the handler signature
			// runtime assertion is secondary

			// @ts-expect-error - delegate parameter not available without fallback
			const result = createRelay<TestOptions>({ value: "test" })({
				value: (v, delegate) => delegate(),
				error: (e) => `error: ${e.message}`
			});

			// runtime: delegate() returns undefined when no fallback provided
			expect(result).toBeUndefined();

		});

		it("type check: should reject delegate usage in partial handlers without fallback", async () => {

			// ⚠️ this test verifies COMPILE-TIME behavior only
			// TypeScript errors on the next line because delegate is not in the handler signature
			// runtime assertion is secondary

			// @ts-expect-error - delegate parameter not available without fallback
			const result = createRelay<TestOptions>({ value: "test" })({
				value: (v, delegate) => delegate()
			});

			// runtime: delegate() returns undefined when no fallback provided
			expect(result).toBeUndefined();

		});

	});

});

describe("relay()", () => {

	/**
	 * Test type used throughout the runtime behavior tests.
	 * Represents a common set of operation states: value, error, or loading.
	 */
	type TestOptions = {
		value: string
		error: Error
		loading: boolean
	}


	describe("complete handlers", () => {

		it("should handle all options with function handlers", async () => {

			const result = createRelay<TestOptions>({ value: "success" })({
				value: (v) => `Value: ${v}`,
				error: (e) => `Error: ${e.message}`,
				loading: (l) => `Loading: ${l}`
			});

			expect(result).toBe("Value: success");

		});

		it("should handle all options with constant handlers", async () => {

			const result = createRelay<TestOptions>({ error: new Error("failed") })({
				value: 1,
				error: 2,
				loading: 3
			});

			expect(result).toBe(2);

		});

		it("should handle mixed function and constant handlers", async () => {

			const result = createRelay<TestOptions>({ loading: true })({
				value: (v) => v.length,
				error: 0,
				loading: (l) => l ? 100 : 0
			});

			expect(result).toBe(100);

		});

		it("should correctly pass the active option value to handler", async () => {

			const testError = new Error("test error");
			const result = createRelay<TestOptions>({ error: testError })({
				value: (v) => `value: ${v}`,
				error: (e) => e.message,
				loading: (l) => `loading: ${l}`
			});

			expect(result).toBe("test error");

		});

	});

	describe("partial handlers without fallback", () => {

		it("should return handler result when option matches", async () => {

			const result = createRelay<TestOptions>({ value: "done" })({
				value: "matched",
				error: "error matched"
			});

			expect(result).toBe("matched");

		});

		it("should return undefined when option does not match any handler", async () => {

			const result = createRelay<TestOptions>({ loading: true })({
				value: "value matched",
				error: "error matched"
			});

			expect(result).toBeUndefined();

		});

		it("should return undefined with empty handlers object", async () => {

			const result = createRelay<TestOptions>({ value: "test" })({});

			expect(result).toBeUndefined();

		});

		it("should handle function handlers in partial mode", async () => {

			const result = createRelay<TestOptions>({ error: new Error("oops") })({
				error: (e) => `Error occurred: ${e.message}`
			});

			expect(result).toBe("Error occurred: oops");

		});

	});

	describe("partial handlers with fallback", () => {

		it("should use specific handler when option matches", async () => {

			const result = createRelay<TestOptions>({ value: "hello" })({
				value: "specific handler"
			}, "fallback handler");

			expect(result).toBe("specific handler");

		});

		it("should use fallback when option does not match any specific handler", async () => {

			const result = createRelay<TestOptions>({ loading: false })({
				value: "value handler"
			}, "fallback handler");

			expect(result).toBe("fallback handler");

		});

		it("should pass value to fallback function handler", async () => {

			const result = createRelay<TestOptions>({ error: new Error("fail") })({
				value: (v) => `value: ${v}`
			}, (v) => {
				if ( v instanceof Error ) {
					return `fallback error: ${v.message}`;
				}
				return `fallback: ${v}`;
			});

			expect(result).toBe("fallback error: fail");

		});

		it("should use constant fallback handler", async () => {

			const result = createRelay<TestOptions>({ loading: true })({}, 999);

			expect(result).toBe(999);

		});

		it("should prefer specific handler over fallback", async () => {

			const result = createRelay<TestOptions>({ value: "test" })({
				value: "specific",
				error: "error",
				loading: "loading"
			}, "fallback");

			expect(result).toBe("specific");

		});

	});

	describe("different option value types", () => {

		type MixedOptions = {
			string: string
			number: number
			boolean: boolean
			object: { id: number, name: string }
			array: string[]
		}

		it("should handle string values", async () => {

			const result = createRelay<MixedOptions>({ string: "hello" })({
				string: (v) => v.toUpperCase(),
				number: (n) => n.toString(),
				boolean: (b) => b.toString(),
				object: (o) => o.name,
				array: (a) => a.join(",")
			});

			expect(result).toBe("HELLO");

		});

		it("should handle number values", async () => {

			const result = createRelay<MixedOptions>({ number: 42 })({
				string: (v) => v.length,
				number: (n) => n*2,
				boolean: (b) => b ? 1 : 0,
				object: (o) => o.id,
				array: (a) => a.length
			});

			expect(result).toBe(84);

		});

		it("should handle boolean values", async () => {

			const result = createRelay<MixedOptions>({ boolean: true })({
				string: "string",
				number: "number",
				boolean: (b) => b ? "yes" : "no",
				object: "object",
				array: "array"
			});

			expect(result).toBe("yes");

		});

		it("should handle object values", async () => {

			const obj = { id: 123, name: "test" };
			const result = createRelay<MixedOptions>({ object: obj })({
				string: (v) => `string: ${v}`,
				number: (n) => `number: ${n}`,
				boolean: (b) => `boolean: ${b}`,
				object: (o) => `${o.name}:${o.id}`,
				array: (a) => `array: ${a.join(",")}`
			});

			expect(result).toBe("test:123");

		});

		it("should handle array values", async () => {

			const arr = ["a", "b", "c"];
			const result = createRelay<MixedOptions>({ array: arr })({
				string: (v) => [v],
				number: (n) => [n.toString()],
				boolean: (b) => [b.toString()],
				object: (o) => [o.name],
				array: (a) => a.map(x => x.toUpperCase())
			});

			expect(result).toEqual(["A", "B", "C"]);

		});

	});

	describe("real-world use cases", () => {

		type AsyncResult<T> = {
			pending: undefined
			success: T
			failure: Error
		}

		it("should handle async operation states", async () => {

			const pending = createRelay<AsyncResult<string>>({ pending: undefined })({
				pending: "Loading...",
				success: (data) => `Success: ${data}`,
				failure: (err) => `Error: ${err.message}`
			});

			const success = createRelay<AsyncResult<string>>({ success: "data loaded" })({
				pending: "Loading...",
				success: (data) => `Success: ${data}`,
				failure: (err) => `Error: ${err.message}`
			});

			const failure = createRelay<AsyncResult<string>>({ failure: new Error("network error") })({
				pending: "Loading...",
				success: (data) => `Success: ${data}`,
				failure: (err) => `Error: ${err.message}`
			});

			expect(pending).toBe("Loading...");
			expect(success).toBe("Success: data loaded");
			expect(failure).toBe("Error: network error");

		});

		type HttpStatus = {
			ok: { data: string }
			notFound: { path: string }
			serverError: { code: number }
		}

		it("should handle HTTP response status patterns", async () => {

			const ok = createRelay<HttpStatus>({ ok: { data: "response" } })({
				ok: (res) => res.data,
				notFound: (err) => `Not found: ${err.path}`,
				serverError: (err) => `Server error: ${err.code}`
			});

			const notFound = createRelay<HttpStatus>({ notFound: { path: "/api/users" } })({
				ok: (res) => res.data,
				notFound: (err) => `Not found: ${err.path}`,
				serverError: (err) => `Server error: ${err.code}`
			});

			expect(ok).toBe("response");
			expect(notFound).toBe("Not found: /api/users");

		});

		type FormState = {
			empty: undefined
			editing: { value: string }
			submitting: { value: string }
			submitted: { id: string }
		}

		it("should handle form state transitions with fallback", async () => {

			const result = createRelay<FormState>({ editing: { value: "text" } })({
				submitted: (s) => `Submitted with id: ${s.id}`
			}, "Form is not submitted");

			expect(result).toBe("Form is not submitted");

		});

	});

	describe("undefined values", () => {

		type SomeNoneOptions = {
			some: string
			none: undefined
		}

		it("should handle undefined as a valid option value", async () => {

			const result = createRelay<SomeNoneOptions>({ none: undefined })({
				some: (v) => `Value: ${v}`,
				none: "No value"
			});

			expect(result).toBe("No value");

		});

		it("should distinguish undefined from missing property", async () => {

			const result = createRelay<SomeNoneOptions>({ none: undefined })({
				none: (v) => `none: ${v}`,
				some: (v) => `some: ${v}`
			});

			expect(result).toBe("none: undefined");

		});

	});

	describe("edge options", () => {

		type EdgeOptions = {
			zero: number
			emptyString: string
			falseBool: boolean
			nullValue: null
		}

		it("should handle zero as a value", async () => {

			const result = createRelay<EdgeOptions>({ zero: 0 })({
				zero: (n) => `zero: ${n}`,
				emptyString: "empty",
				falseBool: "false",
				nullValue: "null"
			});

			expect(result).toBe("zero: 0");

		});

		it("should handle empty string as a value", async () => {

			const result = createRelay<EdgeOptions>({ emptyString: "" })({
				zero: "zero",
				emptyString: (s) => `empty: ${s}`,
				falseBool: "false",
				nullValue: "null"
			});

			expect(result).toBe("empty: ");

		});

		it("should handle false as a value", async () => {

			const result = createRelay<EdgeOptions>({ falseBool: false })({
				zero: "zero",
				emptyString: "empty",
				falseBool: (b) => `false: ${b}`,
				nullValue: "null"
			});

			expect(result).toBe("false: false");

		});

		it("should handle null as a value", async () => {

			const result = createRelay<EdgeOptions>({ nullValue: null })({
				zero: "zero",
				emptyString: "empty",
				falseBool: "false",
				nullValue: (n) => `null: ${n}`
			});

			expect(result).toBe("null: null");

		});

	});

	describe("delegation to fallback", () => {

		type TestOptions = {
			value: string
			error: Error
			loading: boolean
		}

		it("should allow handler to delegate to constant fallback", async () => {

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (_v, delegate) => delegate()
			}, "fallback value");

			expect(result).toBe("fallback value");

		});

		it("should allow handler to delegate to function fallback", async () => {

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (v, delegate) => delegate()
			}, (v) => `fallback: ${v}`);

			expect(result).toBe("fallback: test");

		});

		it("should allow handler to conditionally delegate", async () => {

			const handleValue = (v: string, delegate: () => string) =>
				v.length > 5 ? `long: ${v}` : delegate();

			const longResult = createRelay<TestOptions>({ value: "lengthy" })({
				value: handleValue
			}, "short value");

			const shortResult = createRelay<TestOptions>({ value: "hi" })({
				value: handleValue
			}, "short value");

			expect(longResult).toBe("long: lengthy");
			expect(shortResult).toBe("short value");

		});

		it("should pass value to fallback function when delegating", async () => {

			const result = createRelay<TestOptions>({ error: new Error("oops") })({
				error: (_e, delegate) => delegate()
			}, (v) => {
				if ( v instanceof Error ) {
					return `delegated error: ${v.message}`;
				}
				return `delegated: ${v}`;
			});

			expect(result).toBe("delegated error: oops");

		});

		it("should allow mixing delegating and non-delegating handlers", async () => {

			const result = createRelay<TestOptions>({ loading: true })({
				value: "direct value",
				loading: (_l, delegate) => delegate()
			}, "fallback");

			expect(result).toBe("fallback");

		});

		it("should return undefined when delegating without fallback", async () => {

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (_v, delegate) => delegate()
			});

			expect(result).toBeUndefined();

		});

		it("should allow complete handlers to delegate to factored fallback", async () => {

			// common formatting logic factored into fallback
			const format = (v: string | Error | boolean) =>
				v instanceof Error ? `error: ${v.message}`
					: typeof v === "boolean" ? `loading: ${v}`
						: `value: ${v}`;

			const result = createRelay<TestOptions>({ value: "test" })({
				value: (_v, delegate) => delegate(),
				error: (_e, delegate) => delegate(),
				loading: (_l, delegate) => delegate()
			}, format);

			expect(result).toBe("value: test");

		});

		it("should allow complete handlers to selectively delegate", async () => {

			const result = createRelay<TestOptions>({ error: new Error("oops") })({
				value: (v) => `direct: ${v}`,
				error: (_e, delegate) => delegate(),
				loading: (l) => `direct: ${l}`
			}, (v) => `delegated: ${v instanceof Error ? v.message : v}`);

			expect(result).toBe("delegated: oops");

		});

	});

});
