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

import { isArray, isBoolean, isEmpty, isNull, isNumber, isObject, isScalar, isString, isValue } from "./json.js";


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

	it("should return false for non-finite numbers", () => {
		expect(isScalar(NaN)).toBeFalsy();
		expect(isScalar(Infinity)).toBeFalsy();
		expect(isScalar(-Infinity)).toBeFalsy();
	});

	it("should return true for strings", () => {
		expect(isScalar("")).toBeTruthy();
		expect(isScalar("test")).toBeTruthy();
	});

	it("should return false for null", () => {
		expect(isScalar(null)).toBeFalsy();
	});

	it("should return false for undefined", () => {
		expect(isScalar(undefined)).toBeFalsy();
	});

	it("should return false for arrays", () => {
		expect(isScalar([])).toBeFalsy();
		expect(isScalar([1, 2, 3])).toBeFalsy();
	});

	it("should return false for objects", () => {
		expect(isScalar({})).toBeFalsy();
		expect(isScalar({ a: 1 })).toBeFalsy();
	});

	it("should return false for symbols", () => {
		expect(isScalar(Symbol())).toBeFalsy();
	});

	it("should return false for functions", () => {
		expect(isScalar(() => {})).toBeFalsy();
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
