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
import { createRelay } from "./relay.js";

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

		it("should handle fokrm state transitions with fallback", async () => {

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

	describe("returned values", () => {

		type StructuredOptions = {
			object: { id: number, name: string }
			array: string[]
			primitive: number
		}

		it("should return values from function handlers as-is", async () => {

			const object = { id: 1, name: "test" };

			const result = createRelay<StructuredOptions>({ object })({
				object: (o) => o
			});

			expect(result).toBe(object);
			expect(Object.isFrozen(result)).toBeFalsy();

		});

		it("should return values from constant handlers as-is", async () => {

			const matched = { status: "matched" };

			const result = createRelay<StructuredOptions>({ object: { id: 1, name: "test" } })({
				object: matched,
				array: { status: "array" },
				primitive: { status: "primitive" }
			});

			expect(result).toBe(matched);
			expect(Object.isFrozen(result)).toBeFalsy();

		});

		it("should return values from fallback functions as-is", async () => {

			const fallback = ["fallback"];

			const result = createRelay<StructuredOptions>({ object: { id: 1, name: "test" } })({}, () => fallback);

			expect(result).toBe(fallback);
			expect(Object.isFrozen(result)).toBeFalsy();

		});

		it("should return constant fallbacks as-is", async () => {

			const fallback = { fallback: true };

			const result = createRelay<StructuredOptions>({ object: { id: 1, name: "test" } })({}, fallback);

			expect(result).toBe(fallback);
			expect(Object.isFrozen(result)).toBeFalsy();

		});

		it("should leave nested structures mutable", async () => {

			const result = createRelay<StructuredOptions>({ array: ["a", "b"] })({
				array: (a) => ({ outer: { inner: [...a] } })
			});

			expect(Object.isFrozen(result?.outer)).toBeFalsy();
			expect(Object.isFrozen(result?.outer.inner)).toBeFalsy();

		});

		it("should return primitives unchanged", async () => {

			const result = createRelay<StructuredOptions>({ primitive: 42 })({
				object: () => 0,
				array: () => 0,
				primitive: (n) => n*2
			});

			expect(result).toBe(84);

		});

	});

	describe("immutability", () => {

		it("should return a frozen relay", async () => {

			expect(Object.isFrozen(createRelay<TestOptions>({ value: "test" }))).toBeTruthy();

		});

	});

});
