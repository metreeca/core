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
import { Handlers, createRelay } from "./relay.js";

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
				value: (_v: string, delegate: () => string | undefined) => delegate()
			} as Partial<Handlers<TestOptions, string | undefined>>);

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
