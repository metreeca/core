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
	isArray,
	isAsyncIterable,
	isBoolean,
	isDefined,
	isEmpty,
	isError,
	isFunction,
	isIterable,
	isJSON,
	isNumber,
	isObject,
	isPromise,
	isString,
	isSymbol
} from "./index.js";


describe("Runtime Guards", () => {

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

	describe("isEmpty()", () => {

		it("should return true for empty objects", () => {
			expect(isEmpty({})).toBeTruthy();
		});

		it("should return true for empty arrays", () => {
			expect(isEmpty([])).toBeTruthy();
		});

		it("should return false for non-empty objects", () => {
			expect(isEmpty({ uno: 1 })).toBeFalsy();
		});

		it("should return false for non-empty arrays", () => {
			expect(isEmpty([1])).toBeFalsy();
		});

		it("should return false for primitives", () => {
			expect(isEmpty(0)).toBeFalsy();
			expect(isEmpty("")).toBeFalsy();
			expect(isEmpty(null)).toBeFalsy();
			expect(isEmpty(undefined)).toBeFalsy();
		});

		it("should return false for non-plain objects", () => {
			expect(isEmpty(new Date())).toBeFalsy();
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

});

describe("Value Guards", () => {

	describe("isJSON()", () => {

		it("should return true for null", () => {
			expect(isJSON(null)).toBeTruthy();
		});

		it("should return true for booleans", () => {
			expect(isJSON(true)).toBeTruthy();
			expect(isJSON(false)).toBeTruthy();
		});

		it("should return true for finite numbers", () => {
			expect(isJSON(0)).toBeTruthy();
			expect(isJSON(123)).toBeTruthy();
			expect(isJSON(-456.78)).toBeTruthy();
		});

		it("should return false for non-finite numbers", () => {
			expect(isJSON(NaN)).toBeFalsy();
			expect(isJSON(Infinity)).toBeFalsy();
			expect(isJSON(-Infinity)).toBeFalsy();
		});

		it("should return true for strings", () => {
			expect(isJSON("")).toBeTruthy();
			expect(isJSON("test")).toBeTruthy();
		});

		it("should return true for JSON arrays", () => {
			expect(isJSON([])).toBeTruthy();
			expect(isJSON([1, 2, 3])).toBeTruthy();
			expect(isJSON(["a", "b", "c"])).toBeTruthy();
			expect(isJSON([1, "two", true, null])).toBeTruthy();
		});

		it("should return false for arrays with non-JSON values", () => {
			expect(isJSON([undefined])).toBeFalsy();
			expect(isJSON([1, undefined])).toBeFalsy();
			expect(isJSON([Symbol()])).toBeFalsy();
			expect(isJSON([() => {}])).toBeFalsy();
		});

		it("should return true for JSON objects", () => {
			expect(isJSON({})).toBeTruthy();
			expect(isJSON({ a: 1 })).toBeTruthy();
			expect(isJSON({ a: 1, b: "two", c: true, d: null })).toBeTruthy();
		});

		it("should return false for objects with non-JSON values", () => {
			expect(isJSON({ a: undefined })).toBeFalsy();
			expect(isJSON({ a: 1, b: undefined })).toBeFalsy();
			expect(isJSON({ a: Symbol() })).toBeFalsy();
			expect(isJSON({ a: () => {} })).toBeFalsy();
		});

		it("should return true for nested JSON structures", () => {
			expect(isJSON({ a: [1, 2, 3], b: { c: "test" } })).toBeTruthy();
			expect(isJSON([{ a: 1 }, { b: 2 }])).toBeTruthy();
		});

		it("should return false for non-plain objects", () => {
			expect(isJSON(new Date())).toBeFalsy();
			expect(isJSON(new RegExp(""))).toBeFalsy();
			expect(isJSON(new Error())).toBeFalsy();
		});

		it("should return false for non-JSON primitives", () => {
			expect(isJSON(undefined)).toBeFalsy();
			expect(isJSON(Symbol())).toBeFalsy();
			expect(isJSON(() => {})).toBeFalsy();
		});

	});

	describe("isBoolean()", () => {

		it("should return true for booleans", () => {
			expect(isBoolean(true)).toBeTruthy();
			expect(isBoolean(false)).toBeTruthy();
		});

		it("should return false for non-booleans", () => {
			expect(isBoolean(1)).toBeFalsy();
			expect(isBoolean("true")).toBeFalsy();
			expect(isBoolean(null)).toBeFalsy();
		});

	});

	describe("isNumber()", () => {

		it("should return true for finite numbers", () => {
			expect(isNumber(0)).toBeTruthy();
			expect(isNumber(123)).toBeTruthy();
			expect(isNumber(-456.78)).toBeTruthy();
		});

		it("should return false for non-finite numbers", () => {
			expect(isNumber(NaN)).toBeFalsy();
			expect(isNumber(Infinity)).toBeFalsy();
			expect(isNumber(-Infinity)).toBeFalsy();
		});

		it("should return false for non-numbers", () => {
			expect(isNumber("123")).toBeFalsy();
			expect(isNumber(null)).toBeFalsy();
		});

	});

	describe("isString()", () => {

		it("should return true for strings", () => {
			expect(isString("")).toBeTruthy();
			expect(isString("test")).toBeTruthy();
		});

		it("should return false for non-strings", () => {
			expect(isString(123)).toBeFalsy();
			expect(isString(null)).toBeFalsy();
			expect(isString({})).toBeFalsy();
		});

	});

	describe("isArray()", () => {

		it("should return true for arrays", () => {
			expect(isArray([])).toBeTruthy();
			expect(isArray([1, 2, 3])).toBeTruthy();
		});

		it("should validate elements with type guard", () => {
			expect(isArray([1, 2, 3], isNumber)).toBeTruthy();
			expect(isArray([1, "2", 3], isNumber)).toBeFalsy();
		});

		it("should return false for non-arrays", () => {
			expect(isArray({})).toBeFalsy();
			expect(isArray("array")).toBeFalsy();
			expect(isArray(null)).toBeFalsy();
		});

	});

	describe("isObject()", () => {

		it("should return true for plain objects", () => {
			expect(isObject({})).toBeTruthy();
			expect(isObject({ uno: 1 })).toBeTruthy();
		});

		it("should return false for objects with null prototype", () => {
			expect(isObject(Object.create(null))).toBeFalsy();
		});

		it("should return false for arrays", () => {
			expect(isObject([])).toBeFalsy();
		});

		it("should return false for built-in objects", () => {
			expect(isObject(new Date())).toBeFalsy();
			expect(isObject(new RegExp(""))).toBeFalsy();
			expect(isObject(new Error())).toBeFalsy();
		});

		it("should return false for primitives", () => {
			expect(isObject(null)).toBeFalsy();
			expect(isObject(undefined)).toBeFalsy();
			expect(isObject("string")).toBeFalsy();
			expect(isObject(123)).toBeFalsy();
		});

	});

});

