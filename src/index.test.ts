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

import {
	asIdentifier,
	isAsyncIterable,
	isDefined,
	isError,
	isFunction,
	isRegExp,
	isDate,
	isIdentifier,
	isIterable,
	isPromise,
	isSymbol
} from "./index.js";


describe("isIdentifier()", () => {

	it("should return true for simple ASCII identifiers", () => {
		expect(isIdentifier("foo")).toBeTruthy();
		expect(isIdentifier("bar123")).toBeTruthy();
		expect(isIdentifier("camelCase")).toBeTruthy();
		expect(isIdentifier("PascalCase")).toBeTruthy();
		expect(isIdentifier("snake_case")).toBeTruthy();
	});

	it("should return true for identifiers starting with $ or _", () => {
		expect(isIdentifier("$")).toBeTruthy();
		expect(isIdentifier("_")).toBeTruthy();
		expect(isIdentifier("$dollar")).toBeTruthy();
		expect(isIdentifier("_private")).toBeTruthy();
		expect(isIdentifier("__proto")).toBeTruthy();
		expect(isIdentifier("$$")).toBeTruthy();
	});

	it("should return true for single character identifiers", () => {
		expect(isIdentifier("a")).toBeTruthy();
		expect(isIdentifier("Z")).toBeTruthy();
		expect(isIdentifier("_")).toBeTruthy();
		expect(isIdentifier("$")).toBeTruthy();
	});

	it("should return true for Unicode identifiers", () => {
		expect(isIdentifier("café")).toBeTruthy();
		expect(isIdentifier("日本語")).toBeTruthy();
		expect(isIdentifier("переменная")).toBeTruthy();
		expect(isIdentifier("αβγ")).toBeTruthy();
		expect(isIdentifier("π")).toBeTruthy();
	});

	it("should return true for reserved words (valid IdentifierNames)", () => {
		expect(isIdentifier("if")).toBeTruthy();
		expect(isIdentifier("else")).toBeTruthy();
		expect(isIdentifier("class")).toBeTruthy();
		expect(isIdentifier("function")).toBeTruthy();
		expect(isIdentifier("return")).toBeTruthy();
	});

	it("should return true for identifiers with ZWNJ/ZWJ in continuation", () => {
		expect(isIdentifier("a\u200Cb")).toBeTruthy(); // ZWNJ
		expect(isIdentifier("a\u200Db")).toBeTruthy(); // ZWJ
	});

	it("should return false for empty string", () => {
		expect(isIdentifier("")).toBeFalsy();
	});

	it("should return false for identifiers starting with digits", () => {
		expect(isIdentifier("0")).toBeFalsy();
		expect(isIdentifier("123")).toBeFalsy();
		expect(isIdentifier("1abc")).toBeFalsy();
		expect(isIdentifier("9test")).toBeFalsy();
	});

	it("should return false for strings with invalid characters", () => {
		expect(isIdentifier("foo bar")).toBeFalsy();
		expect(isIdentifier("foo-bar")).toBeFalsy();
		expect(isIdentifier("foo.bar")).toBeFalsy();
		expect(isIdentifier("foo+bar")).toBeFalsy();
		expect(isIdentifier("foo@bar")).toBeFalsy();
	});

	it("should return false for ZWNJ/ZWJ at start", () => {
		expect(isIdentifier("\u200C")).toBeFalsy(); // ZWNJ alone
		expect(isIdentifier("\u200D")).toBeFalsy(); // ZWJ alone
		expect(isIdentifier("\u200Cabc")).toBeFalsy(); // ZWNJ at start
		expect(isIdentifier("\u200Dabc")).toBeFalsy(); // ZWJ at start
	});

	it("should return false for non-strings", () => {
		expect(isIdentifier(123)).toBeFalsy();
		expect(isIdentifier(null)).toBeFalsy();
		expect(isIdentifier(undefined)).toBeFalsy();
		expect(isIdentifier({})).toBeFalsy();
		expect(isIdentifier([])).toBeFalsy();
		expect(isIdentifier(Symbol("foo"))).toBeFalsy();
	});

});

describe("asIdentifier()", () => {

	it("should return valid identifiers unchanged", async () => {
		expect(asIdentifier("foo")).toBe("foo");
		expect(asIdentifier("$")).toBe("$");
		expect(asIdentifier("_private")).toBe("_private");
		expect(asIdentifier("camelCase")).toBe("camelCase");
	});

	it("should throw RangeError for invalid identifiers", async () => {
		expect(() => asIdentifier("")).toThrow(RangeError);
		expect(() => asIdentifier("123")).toThrow(RangeError);
		expect(() => asIdentifier("foo bar")).toThrow(RangeError);
		expect(() => asIdentifier("foo-bar")).toThrow(RangeError);
	});

	it("should throw TypeError for non-string values", async () => {
		expect(() => asIdentifier(null as unknown as string)).toThrow(TypeError);
		expect(() => asIdentifier(undefined as unknown as string)).toThrow(TypeError);
		expect(() => asIdentifier(123 as unknown as string)).toThrow(TypeError);
		expect(() => asIdentifier({} as unknown as string)).toThrow(TypeError);
		expect(() => asIdentifier([] as unknown as string)).toThrow(TypeError);
	});

});

describe("isDefined()", () => {

	it("should return false for undefined", () => {
		expect(isDefined(undefined)).toBeFalsy();
	});

	it("should return false for null", () => {
		expect(isDefined(null)).toBeFalsy();
	});

	it("should return true for defined values", () => {
		expect(isDefined(0)).toBeTruthy();
		expect(isDefined("")).toBeTruthy();
		expect(isDefined(false)).toBeTruthy();
		expect(isDefined({})).toBeTruthy();
		expect(isDefined([])).toBeTruthy();
	});

});

describe("isSymbol()", () => {

	it("should return true for symbols", () => {
		expect(isSymbol(Symbol())).toBeTruthy();
		expect(isSymbol(Symbol("test"))).toBeTruthy();
	});

	it("should return false for non-symbols", () => {
		expect(isSymbol("symbol")).toBeFalsy();
		expect(isSymbol(123)).toBeFalsy();
		expect(isSymbol({})).toBeFalsy();
	});

});

describe("isFunction()", () => {

	it("should return true for functions", () => {
		expect(isFunction(() => {})).toBeTruthy();
		expect(isFunction(function () {})).toBeTruthy();
		expect(isFunction(async () => {})).toBeTruthy();
	});

	it("should return false for non-functions", () => {
		expect(isFunction({})).toBeFalsy();
		expect(isFunction("function")).toBeFalsy();
		expect(isFunction(null)).toBeFalsy();
	});

});

describe("isError()", () => {

	it("should return true for Error instances", () => {
		expect(isError(new Error())).toBeTruthy();
		expect(isError(new TypeError())).toBeTruthy();
		expect(isError(new RangeError())).toBeTruthy();
	});

	it("should return false for non-error objects", () => {
		expect(isError({ message: "error" })).toBeFalsy();
		expect(isError("Error")).toBeFalsy();
		expect(isError(null)).toBeFalsy();
	});

});

describe("isRegExp()", () => {

	it("should return true for RegExp instances", () => {
		expect(isRegExp(/test/)).toBeTruthy();
		expect(isRegExp(new RegExp("test"))).toBeTruthy();
		expect(isRegExp(/test/gi)).toBeTruthy();
	});

	it("should return false for non-regexp values", () => {
		expect(isRegExp("/test/")).toBeFalsy();
		expect(isRegExp({ source: "test" })).toBeFalsy();
		expect(isRegExp(null)).toBeFalsy();
	});

});

describe("isDate()", () => {

	it("should return true for Date instances", () => {
		expect(isDate(new Date())).toBeTruthy();
		expect(isDate(new Date("2024-01-01"))).toBeTruthy();
		expect(isDate(new Date(0))).toBeTruthy();
	});

	it("should return false for non-date values", () => {
		expect(isDate("2024-01-01")).toBeFalsy();
		expect(isDate(1704067200000)).toBeFalsy();
		expect(isDate({ getTime: () => 0 })).toBeFalsy();
		expect(isDate(null)).toBeFalsy();
	});

});

describe("isPromise()", () => {

	it("should return true for promises", () => {
		expect(isPromise(Promise.resolve())).toBeTruthy();
		expect(isPromise(new Promise(() => {}))).toBeTruthy();
	});

	it("should return true for thenables", () => {
		expect(isPromise({ then: () => {} })).toBeTruthy();
	});

	it("should return false for non-promises", () => {
		expect(isPromise({})).toBeFalsy();
		expect(isPromise(null)).toBeFalsy();
		expect(isPromise(() => {})).toBeFalsy();
	});

});

describe("isIterable()", () => {

	it("should return true for iterables", () => {
		expect(isIterable([])).toBeTruthy();
		expect(isIterable("string")).toBeTruthy();
		expect(isIterable(new Set())).toBeTruthy();
		expect(isIterable(new Map())).toBeTruthy();
	});

	it("should return false for non-iterables", () => {
		expect(isIterable({})).toBeFalsy();
		expect(isIterable(123)).toBeFalsy();
		expect(isIterable(null)).toBeFalsy();
	});

});

describe("isAsyncIterable()", () => {

	it("should return true for async iterables", () => {
		const asyncIterable = {
			async* [Symbol.asyncIterator]() {
				yield 1;
			}
		};
		expect(isAsyncIterable(asyncIterable)).toBeTruthy();
	});

	it("should return false for non-async iterables", () => {
		expect(isAsyncIterable([])).toBeFalsy();
		expect(isAsyncIterable({})).toBeFalsy();
		expect(isAsyncIterable(null)).toBeFalsy();
	});

});
