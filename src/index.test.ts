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

import { describe, expect, it, vi } from "vitest";
import {
	assert, eager, error,
	isAny,
	isArray,
	isAsyncIterable,
	isBoolean,
	isDate,
	isDefined,
	isEager,
	isError,
	isFunction,
	isIdentifier,
	isIntersection,
	isIterable,
	isLazy,
	isLiteral,
	isNull,
	isNumber,
	isObject,
	isOptional,
	isPrimitive,
	isPromise,
	isPromiseLike,
	isRegExp,
	isScalar,
	isString,
	isSymbol,
	isUnion,
	isValue,
	key,
	lazy,
	map,
	opt
} from "./index.js";


describe("built-in guards", () => {

	describe("isDefined()", () => {

		it("should return false for undefined", () => {
			expect(isDefined(undefined)).toBeFalsy();
		});

		it("should return true for null", () => {
			expect(isDefined(null)).toBeTruthy();
		});

		it("should return true for defined values", () => {
			expect(isDefined(0)).toBeTruthy();
			expect(isDefined("")).toBeTruthy();
			expect(isDefined(false)).toBeTruthy();
			expect(isDefined({})).toBeTruthy();
			expect(isDefined([])).toBeTruthy();
		});

	});

	describe("isPrimitive()", () => {

		it("should return true for primitive values", () => {
			expect(isPrimitive(undefined)).toBeTruthy();
			expect(isPrimitive(null)).toBeTruthy();
			expect(isPrimitive(true)).toBeTruthy();
			expect(isPrimitive(42)).toBeTruthy();
			expect(isPrimitive(42n)).toBeTruthy();
			expect(isPrimitive("value")).toBeTruthy();
			expect(isPrimitive(Symbol("test"))).toBeTruthy();
		});

		it("should return true for non-finite numbers", () => {
			expect(isPrimitive(NaN)).toBeTruthy();
			expect(isPrimitive(Infinity)).toBeTruthy();
		});

		it("should return false for objects", () => {
			expect(isPrimitive({})).toBeFalsy();
			expect(isPrimitive([])).toBeFalsy();
			expect(isPrimitive(new Date())).toBeFalsy();
			expect(isPrimitive(new Map())).toBeFalsy();
		});

		it("should return false for wrapper objects", () => {
			expect(isPrimitive(new Number(42))).toBeFalsy();
			expect(isPrimitive(new String("value"))).toBeFalsy();
			expect(isPrimitive(new Boolean(true))).toBeFalsy();
		});

		it("should return false for functions", () => {
			expect(isPrimitive(() => {})).toBeFalsy();
			expect(isPrimitive(class {})).toBeFalsy();
		});

	});

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

		it("should return false for thenables", () => {
			expect(isPromise({ then: () => {} })).toBeFalsy();
			expect(isPromise({ then: () => {}, catch: () => {}, finally: () => {} })).toBeFalsy();
		});

		it("should return false for non-promises", () => {
			expect(isPromise({})).toBeFalsy();
			expect(isPromise(null)).toBeFalsy();
			expect(isPromise(() => {})).toBeFalsy();
		});

	});

	describe("isPromiseLike()", () => {

		it("should return true for promises", () => {
			expect(isPromiseLike(Promise.resolve())).toBeTruthy();
			expect(isPromiseLike(new Promise(() => {}))).toBeTruthy();
		});

		it("should return true for thenables", () => {
			expect(isPromiseLike({ then: () => {} })).toBeTruthy();
		});

		it("should return false for non-thenables", () => {
			expect(isPromiseLike({})).toBeFalsy();
			expect(isPromiseLike(null)).toBeFalsy();
			expect(isPromiseLike(() => {})).toBeFalsy();
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

describe("JSON guards", () => {

	describe("isValue()", () => {

		it("should return true for null", () => {
			expect(isValue(null)).toBeTruthy();
		});

		it("should return true for booleans", () => {
			expect(isValue(true)).toBeTruthy();
			expect(isValue(false)).toBeTruthy();
		});

		it("should return true for finite numbers", () => {
			expect(isValue(0)).toBeTruthy();
			expect(isValue(123)).toBeTruthy();
			expect(isValue(-456.78)).toBeTruthy();
		});

		it("should return false for non-finite numbers", () => {
			expect(isValue(NaN)).toBeFalsy();
			expect(isValue(Infinity)).toBeFalsy();
			expect(isValue(-Infinity)).toBeFalsy();
		});

		it("should return true for strings", () => {
			expect(isValue("")).toBeTruthy();
			expect(isValue("test")).toBeTruthy();
		});

		it("should return true for JSON arrays", () => {
			expect(isValue([])).toBeTruthy();
			expect(isValue([1, 2, 3])).toBeTruthy();
			expect(isValue(["a", "b", "c"])).toBeTruthy();
			expect(isValue([1, "two", true, null])).toBeTruthy();
		});

		it("should return false for arrays with non-JSON values", () => {
			expect(isValue([undefined])).toBeFalsy();
			expect(isValue([1, undefined])).toBeFalsy();
			expect(isValue([Symbol()])).toBeFalsy();
			expect(isValue([() => {}])).toBeFalsy();
		});

		it("should return true for JSON objects", () => {
			expect(isValue({})).toBeTruthy();
			expect(isValue({ a: 1 })).toBeTruthy();
			expect(isValue({ a: 1, b: "two", c: true, d: null })).toBeTruthy();
		});

		it("should return false for objects with non-JSON values", () => {
			expect(isValue({ a: undefined })).toBeFalsy();
			expect(isValue({ a: 1, b: undefined })).toBeFalsy();
			expect(isValue({ a: Symbol() })).toBeFalsy();
			expect(isValue({ a: () => {} })).toBeFalsy();
		});

		it("should return true for nested JSON structures", () => {
			expect(isValue({ a: [1, 2, 3], b: { c: "test" } })).toBeTruthy();
			expect(isValue([{ a: 1 }, { b: 2 }])).toBeTruthy();
		});

		it("should return false for non-plain objects", () => {
			expect(isValue(new Date())).toBeFalsy();
			expect(isValue(new RegExp(""))).toBeFalsy();
			expect(isValue(new Error())).toBeFalsy();
		});

		it("should return false for non-JSON primitives", () => {
			expect(isValue(undefined)).toBeFalsy();
			expect(isValue(Symbol())).toBeFalsy();
			expect(isValue(() => {})).toBeFalsy();
		});

	});

	describe("isNull()", () => {

		it("should return true for null", () => {
			expect(isNull(null)).toBeTruthy();
		});

		it("should return false for non-null values", () => {
			expect(isNull(undefined)).toBeFalsy();
			expect(isNull(0)).toBeFalsy();
			expect(isNull("")).toBeFalsy();
			expect(isNull(false)).toBeFalsy();
			expect(isNull({})).toBeFalsy();
			expect(isNull([])).toBeFalsy();
		});

	});

	describe("isScalar()", () => {

		it("should return true for booleans", () => {
			expect(isScalar(true)).toBeTruthy();
			expect(isScalar(false)).toBeTruthy();
		});

		it("should return true for finite numbers", () => {
			expect(isScalar(0)).toBeTruthy();
			expect(isScalar(123)).toBeTruthy();
			expect(isScalar(-456.78)).toBeTruthy();
		});

		it("should return true for strings", () => {
			expect(isScalar("")).toBeTruthy();
			expect(isScalar("test")).toBeTruthy();
		});

		it("should return false for null", () => {
			expect(isScalar(null)).toBeFalsy();
		});

		it("should return false for non-finite numbers", () => {
			expect(isScalar(NaN)).toBeFalsy();
			expect(isScalar(Infinity)).toBeFalsy();
			expect(isScalar(-Infinity)).toBeFalsy();
		});

		it("should return false for structured values", () => {
			expect(isScalar([])).toBeFalsy();
			expect(isScalar({})).toBeFalsy();
		});

		it("should return false for non-JSON primitives", () => {
			expect(isScalar(undefined)).toBeFalsy();
			expect(isScalar(Symbol())).toBeFalsy();
			expect(isScalar(() => {})).toBeFalsy();
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

		it("should validate tuple with template", () => {

			const template = [isString, isNumber];

			expect(isArray(["hello", 42], template)).toBeTruthy();
			expect(isArray([42, "hello"], template)).toBeFalsy();

		});

		it("should validate tuple length matches template", () => {

			const template = [isString, isNumber];

			expect(isArray(["hello"], template)).toBeFalsy();
			expect(isArray(["hello", 42, true], template)).toBeFalsy();

		});

		it("should validate tuple with literal predicate", () => {

			const template = [(v: unknown) => v === "fixed", isNumber];

			expect(isArray(["fixed", 42], template)).toBeTruthy();
			expect(isArray(["other", 42], template)).toBeFalsy();

		});

		it("should validate tuple with optional elements", () => {

			const template = [isString, (v: unknown) => isOptional(v, isNumber)];

			expect(isArray(["hello", 42], template)).toBeTruthy();
			expect(isArray(["hello", undefined], template)).toBeTruthy();
			expect(isArray(["hello", "world"], template)).toBeFalsy();

		});

		it("should validate empty array with empty template", () => {
			expect(isArray([], [])).toBeTruthy();
			expect(isArray([1], [])).toBeFalsy();
		});

		it("should validate tuple with set predicate", () => {

			const isABC = (v: unknown) => v === "a" || v === "b" || v === "c";
			const template = [isString, isABC];

			expect(isArray(["hello", "a"], template)).toBeTruthy();
			expect(isArray(["hello", "b"], template)).toBeTruthy();
			expect(isArray(["hello", "c"], template)).toBeTruthy();
			expect(isArray(["hello", "d"], template)).toBeFalsy();

		});

		it("should validate tuple with wildcard predicate", () => {

			const template = [isString, () => true];

			expect(isArray(["hello", 1], template)).toBeTruthy();
			expect(isArray(["hello", "any"], template)).toBeTruthy();
			expect(isArray(["hello", null], template)).toBeTruthy();
			expect(isArray([42, 1], template)).toBeFalsy();

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

		it("should validate values with predicate", async () => {

			const isNumberValue = (value: unknown) => isNumber(value);

			expect(isObject({ a: 1, b: 2 }, isNumberValue)).toBeTruthy();
			expect(isObject({ a: 1, b: "two" }, isNumberValue)).toBeFalsy();

		});

		it("should validate keys with predicate", async () => {

			const isABNumber = (value: unknown, k: string) =>
				(k === "a" || k === "b") && isNumber(value);

			expect(isObject({ a: 1, b: 2 }, isABNumber)).toBeTruthy();
			expect(isObject({ a: 1, c: 2 }, isABNumber)).toBeFalsy();

		});

		it("should validate with closed template using literal predicate", () => {

			const isCircle = (v: unknown) => v === "circle";

			expect(isObject({ kind: "circle" }, { kind: isCircle })).toBeTruthy();
			expect(isObject({ kind: "square" }, { kind: isCircle })).toBeFalsy();
			expect(isObject({ kind: "circle", extra: 1 }, { kind: isCircle })).toBeFalsy();

		});

		it("should validate with closed template using predicates", () => {

			expect(isObject({ x: 1, y: 2 }, { x: isNumber, y: isNumber })).toBeTruthy();
			expect(isObject({ x: 1, y: "two" }, { x: isNumber, y: isNumber })).toBeFalsy();
			expect(isObject({ x: 1 }, { x: isNumber, y: isNumber })).toBeFalsy();
			expect(isObject({ x: 1, y: 2, z: 3 }, { x: isNumber, y: isNumber })).toBeFalsy();

		});

		it("should validate with closed template using mixed predicates", () => {

			const isCircle = (v: unknown) => v === "circle";
			const template = { kind: isCircle, x: isNumber, y: isNumber, radius: isNumber };

			expect(isObject({ kind: "circle", x: 0, y: 0, radius: 10 }, template)).toBeTruthy();
			expect(isObject({ kind: "square", x: 0, y: 0, radius: 10 }, template)).toBeFalsy();
			expect(isObject({ kind: "circle", x: 0, y: 0 }, template)).toBeFalsy();

		});

		it("should validate with closed template using wildcard predicate", () => {

			const isCircle = (v: unknown) => v === "circle";
			const template = { kind: isCircle, data: () => true };

			expect(isObject({ kind: "circle", data: 1 }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", data: "any" }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", data: null }, template)).toBeTruthy();
			expect(isObject({ kind: "square", data: 1 }, template)).toBeFalsy();

		});

		it("should validate with closed template using set predicate", () => {

			const isCircleOrSquare = (v: unknown) => v === "circle" || v === "square";
			const template = { kind: isCircleOrSquare, x: isNumber, y: isNumber };

			expect(isObject({ kind: "circle", x: 0, y: 0 }, template)).toBeTruthy();
			expect(isObject({ kind: "square", x: 0, y: 0 }, template)).toBeTruthy();
			expect(isObject({ kind: "triangle", x: 0, y: 0 }, template)).toBeFalsy();

		});

		it("should validate with open template using predicate wildcard", () => {

			const isCircle = (v: unknown) => v === "circle";
			const template = { kind: isCircle, [key]: isNumber };

			expect(isObject({ kind: "circle" }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", x: 1, y: 2 }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", x: "one" }, template)).toBeFalsy();

		});

		it("should validate with open template using any wildcard", () => {

			const isCircle = (v: unknown) => v === "circle";
			const template = { kind: isCircle, [key]: () => true };

			expect(isObject({ kind: "circle" }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", x: 1, y: "two", z: null }, template)).toBeTruthy();
			expect(isObject({ kind: "square", x: 1 }, template)).toBeFalsy();

		});

		it("should validate with open template using set wildcard", () => {

			const isCircle = (v: unknown) => v === "circle";
			const isAB = (v: unknown) => v === "a" || v === "b";
			const template = { kind: isCircle, [key]: isAB };

			expect(isObject({ kind: "circle" }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", x: "a", y: "b" }, template)).toBeTruthy();
			expect(isObject({ kind: "circle", x: "c" }, template)).toBeFalsy();

		});

		it("should validate optional fields", () => {

			const template = { name: isString, age: (v: unknown) => isOptional(v, isNumber) };

			expect(isObject({ name: "Alice", age: 30 }, template)).toBeTruthy();
			expect(isObject({ name: "Bob" }, template)).toBeTruthy();
			expect(isObject({ name: "Charlie", age: "thirty" }, template)).toBeFalsy();

		});

		it("should validate empty object with empty template", () => {
			expect(isObject({}, {})).toBeTruthy();
			expect(isObject({ a: 1 }, {})).toBeFalsy();
		});

	});

});

describe("composable guards", () => {

	describe("isOptional()", () => {

		it("should return true for undefined", () => {
			expect(isOptional(undefined, isString)).toBeTruthy();
			expect(isOptional(undefined, isNumber)).toBeTruthy();
			expect(isOptional(undefined, isBoolean)).toBeTruthy();
		});

		it("should return true when value satisfies type guard", () => {
			expect(isOptional("test", isString)).toBeTruthy();
			expect(isOptional(123, isNumber)).toBeTruthy();
			expect(isOptional(true, isBoolean)).toBeTruthy();
		});

		it("should return false when value is not undefined and fails type guard", () => {
			expect(isOptional(123, isString)).toBeFalsy();
			expect(isOptional("test", isNumber)).toBeFalsy();
			expect(isOptional(null, isString)).toBeFalsy();
		});

		it("should return false for null", () => {
			expect(isOptional(null, isString)).toBeFalsy();
			expect(isOptional(null, isNumber)).toBeFalsy();
		});

		it("should work with complex type guards", () => {
			expect(isOptional({ a: 1 }, isObject)).toBeTruthy();
			expect(isOptional([1, 2, 3], isArray)).toBeTruthy();
			expect(isOptional(undefined, isObject)).toBeTruthy();
			expect(isOptional("string", isObject)).toBeFalsy();
		});

		it("should work with custom type guards", () => {

			const isPositive = (v: unknown): v is number => isNumber(v) && v > 0;

			expect(isOptional(5, isPositive)).toBeTruthy();
			expect(isOptional(undefined, isPositive)).toBeTruthy();
			expect(isOptional(-5, isPositive)).toBeFalsy();
			expect(isOptional(0, isPositive)).toBeFalsy();

		});

	});

	describe("isLiteral()", () => {

		it("should return true for matching string literal", () => {
			expect(isLiteral("foo", "foo")).toBeTruthy();
			expect(isLiteral("bar", "bar")).toBeTruthy();
		});

		it("should return false for non-matching string literal", () => {
			expect(isLiteral("foo", "bar")).toBeFalsy();
			expect(isLiteral("FOO", "foo")).toBeFalsy();
		});

		it("should return true for matching number literal", () => {
			expect(isLiteral(42, 42)).toBeTruthy();
			expect(isLiteral(0, 0)).toBeTruthy();
			expect(isLiteral(-1, -1)).toBeTruthy();
		});

		it("should return false for non-matching number literal", () => {
			expect(isLiteral(42, 43)).toBeFalsy();
			expect(isLiteral(0, 1)).toBeFalsy();
		});

		it("should return true for matching boolean literal", () => {
			expect(isLiteral(true, true)).toBeTruthy();
			expect(isLiteral(false, false)).toBeTruthy();
		});

		it("should return false for non-matching boolean literal", () => {
			expect(isLiteral(true, false)).toBeFalsy();
			expect(isLiteral(false, true)).toBeFalsy();
		});

		it("should return true when value matches one of array values", () => {
			expect(isLiteral("foo", ["foo", "bar", "baz"])).toBeTruthy();
			expect(isLiteral("bar", ["foo", "bar", "baz"])).toBeTruthy();
			expect(isLiteral("baz", ["foo", "bar", "baz"])).toBeTruthy();
		});

		it("should return false when value does not match any array value", () => {
			expect(isLiteral("qux", ["foo", "bar", "baz"])).toBeFalsy();
			expect(isLiteral("FOO", ["foo", "bar", "baz"])).toBeFalsy();
		});

		it("should return true for matching number in array", () => {
			expect(isLiteral(1, [1, 2, 3])).toBeTruthy();
			expect(isLiteral(2, [1, 2, 3])).toBeTruthy();
			expect(isLiteral(3, [1, 2, 3])).toBeTruthy();
		});

		it("should return false for non-matching number in array", () => {
			expect(isLiteral(4, [1, 2, 3])).toBeFalsy();
			expect(isLiteral(0, [1, 2, 3])).toBeFalsy();
		});

		it("should return false for wrong types", () => {
			expect(isLiteral(null, "foo")).toBeFalsy();
			expect(isLiteral(undefined, "foo")).toBeFalsy();
			expect(isLiteral({}, "foo")).toBeFalsy();
			expect(isLiteral([], "foo")).toBeFalsy();
			expect(isLiteral("42", 42)).toBeFalsy();
			expect(isLiteral(42, "42")).toBeFalsy();
		});

		it("should use strict equality", () => {
			expect(isLiteral(1, [1])).toBeTruthy();
			expect(isLiteral("1", [1] as unknown as string[])).toBeFalsy();
		});

	});

	describe("isAny()", () => {

		it("should return true for any value", () => {
			expect(isAny(undefined)).toBeTruthy();
			expect(isAny(null)).toBeTruthy();
			expect(isAny(true)).toBeTruthy();
			expect(isAny(false)).toBeTruthy();
			expect(isAny(0)).toBeTruthy();
			expect(isAny(42)).toBeTruthy();
			expect(isAny("")).toBeTruthy();
			expect(isAny("test")).toBeTruthy();
			expect(isAny({})).toBeTruthy();
			expect(isAny([])).toBeTruthy();
			expect(isAny(Symbol())).toBeTruthy();
			expect(isAny(() => {})).toBeTruthy();
		});

	});

	describe("isUnion()", () => {

		describe("with single guard", () => {

			it("should return true when value satisfies the guard", () => {
				expect(isUnion("test", [isString])).toBeTruthy();
				expect(isUnion(42, [isNumber])).toBeTruthy();
				expect(isUnion(true, [isBoolean])).toBeTruthy();
				expect(isUnion(null, [isNull])).toBeTruthy();
				expect(isUnion([1, 2], [isArray])).toBeTruthy();
				expect(isUnion({ a: 1 }, [isObject])).toBeTruthy();
			});

			it("should return false when value fails the guard", () => {
				expect(isUnion(42, [isString])).toBeFalsy();
				expect(isUnion("test", [isNumber])).toBeFalsy();
				expect(isUnion(null, [isBoolean])).toBeFalsy();
				expect(isUnion(undefined, [isNull])).toBeFalsy();
			});

		});

		describe("with multiple guards", () => {

			it("should return true when value satisfies any guard", () => {
				expect(isUnion("test", [isString, isNumber])).toBeTruthy();
				expect(isUnion(42, [isString, isNumber])).toBeTruthy();
				expect(isUnion(true, [isString, isNumber, isBoolean])).toBeTruthy();
			});

			it("should return false when value fails all guards", () => {
				expect(isUnion(null, [isString, isNumber])).toBeFalsy();
				expect(isUnion(undefined, [isString, isNumber, isBoolean])).toBeFalsy();
				expect(isUnion({}, [isString, isNumber])).toBeFalsy();
				expect(isUnion([], [isString, isNumber])).toBeFalsy();
			});

			it("should short-circuit on first matching guard", () => {

				let callCount = 0;

				const countingGuard = (v: unknown): v is number => {
					callCount++;
					return isNumber(v);
				};

				isUnion(42, [isString, countingGuard, isBoolean]);
				expect(callCount).toBe(1);

			});

		});

	});

	describe("isIntersection()", () => {

		describe("with single guard", () => {

			it("should return true when value satisfies the guard", async () => {
				expect(isIntersection("test", [isString])).toBeTruthy();
				expect(isIntersection(42, [isNumber])).toBeTruthy();
				expect(isIntersection(true, [isBoolean])).toBeTruthy();
				expect(isIntersection(null, [isNull])).toBeTruthy();
				expect(isIntersection([1, 2], [isArray])).toBeTruthy();
				expect(isIntersection({ a: 1 }, [isObject])).toBeTruthy();
			});

			it("should return false when value fails the guard", async () => {
				expect(isIntersection(42, [isString])).toBeFalsy();
				expect(isIntersection("test", [isNumber])).toBeFalsy();
				expect(isIntersection(null, [isBoolean])).toBeFalsy();
				expect(isIntersection(undefined, [isNull])).toBeFalsy();
			});

		});

		describe("with multiple guards", () => {

			it("should return true when value satisfies all guards", async () => {

				const isStringArray = (v: unknown): v is string[] => isArray(v, isString);
				const isNonEmpty = (v: unknown): v is unknown[] => isArray(v) && v.length > 0;

				expect(isIntersection(["a", "b"], [isStringArray, isNonEmpty])).toBeTruthy();

			});

			it("should return false when value fails any guard", async () => {

				const isStringArray = (v: unknown): v is string[] => isArray(v, isString);
				const isNonEmpty = (v: unknown): v is unknown[] => isArray(v) && v.length > 0;

				expect(isIntersection([], [isStringArray, isNonEmpty])).toBeFalsy();
				expect(isIntersection([1, 2], [isStringArray, isNonEmpty])).toBeFalsy();

			});

			it("should return true for object satisfying multiple shape guards", async () => {

				const hasName = (v: unknown): v is { name: string } =>
					isObject(v) && "name" in v && isString(v.name);
				const hasAge = (v: unknown): v is { age: number } =>
					isObject(v) && "age" in v && isNumber(v.age);

				expect(isIntersection({ name: "Alice", age: 30 }, [hasName, hasAge])).toBeTruthy();
				expect(isIntersection({ name: "Alice" }, [hasName, hasAge])).toBeFalsy();
				expect(isIntersection({ age: 30 }, [hasName, hasAge])).toBeFalsy();

			});

			it("should short-circuit on first failing guard", async () => {

				let callCount = 0;

				const countingGuard = (v: unknown): v is number => {
					callCount++;
					return isNumber(v);
				};

				isIntersection(42, [isString, countingGuard]);
				expect(callCount).toBe(0);

			});

		});

	});

});

describe("deferred values", () => {

	describe("isLazy()", () => {

		it("should return true for a plain value satisfying the guard", async () => {
			expect(isLazy("hello", isString)).toBeTruthy();
			expect(isLazy(42, isNumber)).toBeTruthy();
			expect(isLazy(true, isBoolean)).toBeTruthy();
		});

		it("should return false for a plain value failing the guard", async () => {
			expect(isLazy(42, isString)).toBeFalsy();
			expect(isLazy("hello", isNumber)).toBeFalsy();
			expect(isLazy(null, isString)).toBeFalsy();
		});

		it("should return true for a no-arg function", async () => {
			expect(isLazy(() => "hello", isString)).toBeTruthy();
			expect(isLazy(() => 42, isNumber)).toBeTruthy();
		});

		it("should return true for a no-arg function even when guard would fail on non-functions", async () => {
			expect(isLazy(() => 42, isString)).toBeTruthy();
			expect(isLazy(() => "hello", isNumber)).toBeTruthy();
		});

		it("should return false for functions with arguments", async () => {
			expect(isLazy((x: number) => x, isNumber)).toBeFalsy();
			expect(isLazy((a: string, b: string) => a+b, isString)).toBeFalsy();
			expect(isLazy(parseInt, isNumber)).toBeFalsy();
		});

		it("should return false for non-matching non-function values", async () => {
			expect(isLazy(undefined, isString)).toBeFalsy();
			expect(isLazy(null, isNumber)).toBeFalsy();
			expect(isLazy({}, isString)).toBeFalsy();
		});

		it("should work with custom type guards", async () => {

			const isPositive = (v: unknown): v is number => isNumber(v) && v > 0;

			expect(isLazy(5, isPositive)).toBeTruthy();
			expect(isLazy(() => 5, isPositive)).toBeTruthy();
			expect(isLazy(-1, isPositive)).toBeFalsy();

		});

	});

	describe("isEager()", () => {

		it("should return true for a plain value satisfying the guard", async () => {
			expect(isEager("hello", isString)).toBeTruthy();
			expect(isEager(42, isNumber)).toBeTruthy();
		});

		it("should return false for a plain value failing the guard", async () => {
			expect(isEager(42, isString)).toBeFalsy();
			expect(isEager("hello", isNumber)).toBeFalsy();
			expect(isEager(null, isString)).toBeFalsy();
		});

		it("should return true for any non-function value when the guard is omitted", async () => {
			expect(isEager("hello")).toBeTruthy();
			expect(isEager(null)).toBeTruthy();
			expect(isEager(undefined)).toBeTruthy();
		});

		it("should return false for functions of any arity", async () => {
			expect(isEager(() => "hello", isString)).toBeFalsy();
			expect(isEager((x: number) => x, isNumber)).toBeFalsy();
			expect(isEager(parseInt)).toBeFalsy();
		});

		it("should work with custom type guards", async () => {

			const isPositive = (v: unknown): v is number => isNumber(v) && v > 0;

			expect(isEager(5, isPositive)).toBeTruthy();
			expect(isEager(-1, isPositive)).toBeFalsy();
			expect(isEager(() => 5, isPositive)).toBeFalsy();

		});

	});

	describe("lazy()", () => {

		it("should hand back a plain value unchanged", async () => {

			const value = { label: "value" };

			expect(lazy(value)()).toBe(value);

		});

		it("should not compute a deferred value before first use", async () => {

			const factory = vi.fn(() => "computed");

			lazy(factory);

			expect(factory).not.toHaveBeenCalled();

		});

		it("should compute a deferred value on first use", async () => {
			expect(lazy(() => "computed")()).toBe("computed");
		});

		it("should compute a deferred value at most once", async () => {

			const factory = vi.fn(() => ({ label: "computed" }));
			const accessor = lazy(factory);

			expect(accessor()).toBe(accessor());
			expect(factory).toHaveBeenCalledTimes(1);

		});

	});

	describe("eager()", () => {

		it("should return a plain value unchanged", async () => {

			const value = { label: "value" };

			expect(eager(value)).toBe(value);

		});

		it("should resolve a no-arg factory to its value", async () => {
			expect(eager(() => "computed")).toBe("computed");
		});

		it("should call a factory on every call", async () => {

			const factory = vi.fn(() => "computed");

			eager(factory);
			eager(factory);

			expect(factory).toHaveBeenCalledTimes(2);

		});

	});

});

describe("functional idioms", () => {

	describe("map()", () => {

		it("should report the value computed by the mapper", async () => {
			expect(map("value", value => value.toUpperCase())).toBe("VALUE");
		});

		it("should map null as any other value", async () => {
			expect(map(null, value => String(value))).toBe("null");
		});

		it("should map undefined as any other value", async () => {
			expect(map(undefined, value => String(value))).toBe("undefined");
		});

		it("should propagate errors thrown by the mapper", async () => {
			expect(() => map("value", () => error(new RangeError("failed")))).toThrow(RangeError);
		});

	});

	describe("opt()", () => {

		it("should map a defined value", async () => {
			expect(opt("value", value => value.toUpperCase())).toBe("VALUE");
		});

		it("should map null as any other defined value", async () => {
			expect(opt(null, value => String(value))).toBe("null");
		});

		it("should report a missing value as undefined", async () => {

			const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase());

			expect(upper(undefined)).toBeUndefined();

		});

		it("should not call the mapper on a missing value", async () => {

			const mapper = vi.fn((value: string) => value.toUpperCase());
			const upper = (value: undefined | string) => opt(value, mapper);

			upper(undefined);

			expect(mapper).not.toHaveBeenCalled();

		});

		it("should propagate errors thrown by the mapper", async () => {
			expect(() => opt("value", () => error(new RangeError("failed")))).toThrow(RangeError);
		});

		describe("with a fallback", () => {

			it("should report the fallback for a missing value", async () => {

				const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase(), "NONE");

				expect(upper(undefined)).toBe("NONE");

			});

			it("should ignore the fallback for a defined value", async () => {

				const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase(), "NONE");

				expect(upper("value")).toBe("VALUE");

			});

			it("should resolve a deferred fallback for a missing value", async () => {

				const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase(), () => "NONE");

				expect(upper(undefined)).toBe("NONE");

			});

			it("should not resolve a deferred fallback for a defined value", async () => {

				const fallback = vi.fn(() => "NONE");
				const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase(), fallback);

				upper("value");

				expect(fallback).not.toHaveBeenCalled();

			});

			it("should propagate errors thrown by a deferred fallback", async () => {

				const upper = (value: undefined | string) => opt(value, defined => defined.toUpperCase(),
					() => error<string>(new RangeError("failed"))
				);

				expect(() => upper(undefined)).toThrow(RangeError);

			});

		});

	});

});

describe("error reporting", () => {

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

		it("should compute custom message from the offending value", async () => {
			expect(() => assert(123, isString, v => `unexpected <${v}>`)).toThrow("unexpected <123>");
		});

		it("should evaluate message factory only when guard fails", async () => {
			const factory = vi.fn(() => "custom message");

			expect(assert("hello", isString, factory)).toBe("hello");
			expect(factory).not.toHaveBeenCalled();
		});

		describe("default message generation", () => {

			it("should derive message from guard name starting with 'is'", async () => {
				// isString -> "expected <string> value"
				expect(() => assert(123, isString)).toThrow("expected <string> value");
			});

			it("should split camel case words in guard name", async () => {
				// isNonEmpty -> "expected <non empty> value"
				const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
				expect(() => assert("", isNonEmpty)).toThrow("expected <non empty> value");
			});

			it("should handle consecutive uppercase letters (acronyms)", async () => {
				// isHTTPError -> "expected <http error> value"
				const isHTTPError = (v: unknown): v is Error => v instanceof Error;
				expect(() => assert("not an error", isHTTPError)).toThrow("expected <http error> value");
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

});
