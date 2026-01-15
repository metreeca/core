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
import { isString } from "../index.js";
import { assert, error, message, time } from "./error.js";


describe("assert()", () => {

	it("should return value when guard passes", async () => {
		expect(assert("hello", isString)).toBe("hello");
	});

	it("should throw TypeError when guard fails", async () => {
		expect(() => assert(123, isString)).toThrow(TypeError);
	});

	it("should use custom message when provided", async () => {
		expect(() => assert(123, isString, "custom message")).toThrow("custom message");
	});

	describe("default message generation", () => {

		it("should derive message from guard name starting with 'is'", async () => {
			// isString -> "expected string"
			expect(() => assert(123, isString)).toThrow("expected string");
		});

		it("should split camel case words in guard name", async () => {
			// isNonEmpty -> "expected non empty"
			const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
			expect(() => assert("", isNonEmpty)).toThrow("expected non empty");
		});

		it("should handle consecutive uppercase letters (acronyms)", async () => {
			// isHTTPError -> "expected h t t p error"
			const isHTTPError = (v: unknown): v is Error => v instanceof Error;
			expect(() => assert("not an error", isHTTPError)).toThrow("expected http error");
		});

		it("should use fallback message for guards not matching pattern", async () => {
			// guard name doesn't start with "is" + uppercase
			const checkString = (v: unknown): v is string => typeof v === "string";
			expect(() => assert(123, checkString)).toThrow("assertion failed");
		});

		it("should use fallback message for anonymous guards", async () => {
			expect(() => assert(123, (v: unknown): v is string => typeof v === "string")).toThrow("assertion failed");
		});

	});

});

describe("error()", () => {

	it("should throw an Error from string message", () => {
		expect(() => error("test message")).toThrow(Error);
		expect(() => error("test message")).toThrow("test message");
	});

	it("should throw the provided Error instance", () => {
		const customError = new TypeError("custom error");
		expect(() => error(customError)).toThrow(TypeError);
		expect(() => error(customError)).toThrow("custom error");
	});

	it("should never return a value", () => {
		const fn = (): string => {
			return error("unreachable");
		};
		expect(fn).toThrow();
	});

});

describe("message()", () => {

	it("should extract message from Error objects", () => {
		const err = new Error("test error");
		expect(message(err)).toBe("test error");
	});

	it("should format numbers with US locale", () => {
		expect(message(1234567.89)).toBe("1,234,567.89");
		expect(message(1000)).toBe("1,000");
	});

	it("should convert other values to string", () => {
		expect(message("text")).toBe("text");
		expect(message(true)).toBe("true");
		expect(message(null)).toBe("null");
		expect(message(undefined)).toBe("undefined");
	});

});


describe("time()", () => {

	describe("synchronous execution", () => {

		it("should return the task result", () => {
			const result = time(
				() => 42,
				() => {}
			);
			expect(result).toBe(42);
		});

		it("should invoke monitor with result and elapsed time", () => {
			let monitoredValue: number | undefined;
			let monitoredElapsed: number | undefined;

			time(
				() => 42,
				(value, elapsed) => {
					monitoredValue = value;
					monitoredElapsed = elapsed;
				}
			);

			expect(monitoredValue).toBe(42);
			expect(monitoredElapsed).toBeGreaterThanOrEqual(0);
		});

		it("should throw error from task without calling monitor", () => {
			let monitorCalled = false;

			expect(() => time(
				() => { throw new Error("task error"); },
				() => { monitorCalled = true; }
			)).toThrow("task error");

			expect(monitorCalled).toBe(false);
		});

	});

	describe("asynchronous execution", () => {

		it("should return a promise resolving to task result", async () => {
			const result = await time(
				async () => 42,
				() => {}
			);
			expect(result).toBe(42);
		});

		it("should invoke monitor with result and elapsed time", async () => {
			let monitoredValue: number | undefined;
			let monitoredElapsed: number | undefined;

			await time(
				async () => 42,
				(value, elapsed) => {
					monitoredValue = value;
					monitoredElapsed = elapsed;
				}
			);

			expect(monitoredValue).toBe(42);
			expect(monitoredElapsed).toBeGreaterThanOrEqual(0);
		});

		it("should reject with error from task without calling monitor", async () => {
			let monitorCalled = false;

			await expect(time(
				async () => { throw new Error("task error"); },
				() => { monitorCalled = true; }
			)).rejects.toThrow("task error");

			expect(monitorCalled).toBe(false);
		});

		it("should measure elapsed time accurately", async () => {
			let elapsed: number | undefined;

			await time(
				async () => {
					await new Promise(resolve => setTimeout(resolve, 10));
					return "done";
				},
				(_value, e) => { elapsed = e; }
			);

			expect(elapsed).toBeGreaterThanOrEqual(10);
		});

	});

});
