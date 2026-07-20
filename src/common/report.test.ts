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
import { isString } from "../index.js";
import { assert, error, message, time } from "./report.js";


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

	it("should quote and escape strings", () => {
		expect(message("text")).toBe("\"text\"");
		expect(message("say \"hi\"")).toBe("\"say \\\"hi\\\"\"");
		expect(message("c:\\path")).toBe("\"c:\\\\path\"");
		expect(message("line\nbreak")).toBe("\"line\\nbreak\"");
	});

	it("should escape hidden characters as unicode escapes", () => {
		const wrap = (code: number): string => `x${ String.fromCodePoint(code) }y`;

		expect(message(wrap(0x0001))).toBe("\"x\\u0001y\""); // control
		expect(message(wrap(0x007F))).toBe("\"x\\u007fy\""); // delete
		expect(message(wrap(0x00A0))).toBe("\"x\\u00a0y\""); // no-break space
		expect(message(wrap(0x00AD))).toBe("\"x\\u00ady\""); // soft hyphen
		expect(message(wrap(0x200B))).toBe("\"x\\u200by\""); // zero width space
		expect(message(wrap(0x202E))).toBe("\"x\\u202ey\""); // right-to-left override
		expect(message(wrap(0x2028))).toBe("\"x\\u2028y\""); // line separator
		expect(message(wrap(0xFEFF))).toBe("\"x\\ufeffy\""); // byte order mark
		expect(message(wrap(0x3000))).toBe("\"x\\u3000y\""); // ideographic space
	});

	it("should escape hidden supplementary characters as surrogate pairs", () => {
		expect(message(`x${ String.fromCodePoint(0xE0041) }y`)).toBe("\"x\\udb40\\udc41y\"");
	});

	it("should leave plain spaces and visible characters untouched", () => {
		expect(message("hello world")).toBe("\"hello world\"");
		expect(message("é 中 \u{1F600}")).toBe("\"é 中 \u{1F600}\"");
	});

	it("should leave zero width joiners untouched to keep composed emoji intact", () => {
		const zwj=String.fromCodePoint(0x200D);
		const family=`\u{1F468}${ zwj }\u{1F469}${ zwj }\u{1F467}`;

		expect(family).toContain(zwj);
		expect(message(family)).toBe(`"${ family }"`);
	});

	it("should not clip strings by default", () => {
		expect(message("abcdefghij")).toBe("\"abcdefghij\"");
	});

	it("should clip strings longer than the given length", () => {
		expect(message("abcdefghij", 5)).toBe("\"abcd…\"");
		expect(message("abcdefghij", 1)).toBe("\"…\"");
	});

	it("should leave strings not longer than the given length unclipped", () => {
		expect(message("abcde", 5)).toBe("\"abcde\"");
		expect(message("abc", 5)).toBe("\"abc\"");
	});

	it("should not clip strings when the given length is zero or negative", () => {
		expect(message("abcdefghij", 0)).toBe("\"abcdefghij\"");
		expect(message("abcdefghij", -1)).toBe("\"abcdefghij\"");
	});

	it("should count code points rather than code units when clipping", () => {
		expect(message("\u{1F600}\u{1F601}\u{1F602}\u{1F603}", 3)).toBe("\"\u{1F600}\u{1F601}…\"");
	});

	it("should escape hidden characters surviving the clip", () => {
		expect(message(`ab${ String.fromCodePoint(0x00A0) }cd`, 4)).toBe("\"ab\\u00a0…\"");
	});

	it("should ignore the length for values other than strings", () => {
		expect(message(1234567.89, 3)).toBe("1,234,567.89");
		expect(message(new Error("a long error message"), 3)).toBe("a long error message");
		expect(message(true, 3)).toBe("true");
	});

	it("should convert other values to string", () => {
		expect(message(true)).toBe("true");
		expect(message(null)).toBe("null");
		expect(message(undefined)).toBe("undefined");
		expect(message({ key: "value" })).toBe("[object Object]");
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
