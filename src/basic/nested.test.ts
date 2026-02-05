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
import { isNumber, isObject, isString } from "../index.js";

import { equals, immutable } from "./nested.js";


describe("equals()", () => {

	// Note: equals() does not handle circular references and will cause stack overflow.
	// This is documented behavior in the implementation (see src/nested.ts)

	it("should handle primitive values", async () => {

		expect(equals(undefined, undefined)).toBeTruthy();
		expect(equals(undefined, null)).toBeFalsy();

		expect(equals(null, null)).toBeTruthy();
		expect(equals(null, true)).toBeFalsy();

		expect(equals(true, true)).toBeTruthy();
		expect(equals(true, false)).toBeFalsy();
		expect(equals(true, "true")).toBeFalsy();

		expect(equals("x", "x")).toBeTruthy();
		expect(equals("x", "y")).toBeFalsy();
		expect(equals("x", 0)).toBeFalsy();

		expect(equals(0, 0)).toBeTruthy();
		expect(equals(0, 1)).toBeFalsy();
		expect(equals(0, undefined)).toBeFalsy();

		expect(equals(-0, +0)).toBeFalsy();
		expect(equals(-0, -0)).toBeTruthy();
		expect(equals(+0, +0)).toBeTruthy();

		expect(equals("x", {})).toBeFalsy();
		expect(equals("x", [])).toBeFalsy();

	});

	it("should handle functions", async () => {

		const uno = () => 1;
		const due = () => 2;

		expect(equals(uno, uno)).toBeTruthy();
		expect(equals(uno, due)).toBeFalsy();
		expect(equals(uno, {})).toBeFalsy();

	});

	describe("equals({})", () => {

		it("should handle empty objects", async () => {

			expect(equals({}, {})).toBeTruthy();
			expect(equals({}, { uno: 1 })).toBeFalsy();

		});

		it("should handle flat objects", async () => {

			expect(equals({ uno: 1, due: 2 }, { uno: 1, due: 2 })).toBeTruthy();
			expect(equals({ uno: 1, due: 2 }, { uno: 1 })).toBeFalsy();
			expect(equals({ uno: 1, due: 2 }, { uno: 1, tre: 3 })).toBeFalsy();
			expect(equals({ uno: 1, due: 2 }, { uno: 1, due: 2, tre: 3 })).toBeFalsy();

		});

		it("should ignore entry order", async () => {

			expect(equals({ uno: 1, due: 2, tre: 3 }, { due: 2, tre: 3, uno: 1 })).toBeTruthy();

		});

		it("should handle nested objects", async () => {

			expect(equals({ nested: { uno: 1, due: 2 } }, { nested: { uno: 1, due: 2 } })).toBeTruthy();
			expect(equals({ nested: { uno: 1, due: 2 } }, { nested: { uno: 1, tre: 3 } })).toBeFalsy();

		});

		it("should handle nested arrays", async () => {

			expect(equals({ nested: [1, 2] }, { nested: [1, 2] })).toBeTruthy();
			expect(equals({ nested: [1, 2] }, { nested: [1, 3] })).toBeFalsy();

		});

	});

	describe("equals([])", () => {

		it("should handle empty arrays", async () => {

			expect(equals([], [])).toBeTruthy();
			expect(equals([], [1])).toBeFalsy();

		});

		it("should handle flat arrays", async () => {

			expect(equals([1, 2], [1, 2])).toBeTruthy();
			expect(equals([1, 2], [1])).toBeFalsy();
			expect(equals([1, 2], [1, 3])).toBeFalsy();
			expect(equals([1, 2], [1, 2, 3])).toBeFalsy();

		});

		it("should consider item order", async () => {

			expect(equals([1, 2, 3], [1, 2, 3])).toBeTruthy();
			expect(equals([1, 2, 3], [2, 3, 1])).toBeFalsy();

		});

		it("should handle nested arrays", async () => {

			expect(equals([1, [2, 3]], [1, [2, 3]])).toBeTruthy();
			expect(equals([1, [2, 3]], [1, [3, 2]])).toBeFalsy();

		});

		it("should handle nested objects", async () => {

			expect(equals([{ uno: 1, due: 2 }], [{ uno: 1, due: 2 }])).toBeTruthy();
			expect(equals([{ uno: 1, due: 2 }], [{ uno: 1, tre: 3 }])).toBeFalsy();

		});

	});

	describe("custom equality", () => {

		it("should use Object.is by default", async () => {

			expect(equals(-0, +0)).toBeFalsy();
			expect(equals(NaN, NaN)).toBeTruthy();

		});

		it("should use custom equality for primitives", async () => {

			const looseEqual = (x: unknown, y: unknown) => x == y;

			expect(equals(1, "1", looseEqual)).toBeTruthy();
			expect(equals(0, false, looseEqual)).toBeTruthy();
			expect(equals(null, undefined, looseEqual)).toBeTruthy();

		});

		it("should use custom equality for nested primitives in objects", async () => {

			const looseEqual = (x: unknown, y: unknown) => x == y;

			expect(equals({ a: 1 }, { a: "1" }, looseEqual)).toBeTruthy();
			expect(equals({ a: { b: 0 } }, { a: { b: false } }, looseEqual)).toBeTruthy();

		});

		it("should use custom equality for nested primitives in arrays", async () => {

			const looseEqual = (x: unknown, y: unknown) => x == y;

			expect(equals([1, 2], ["1", "2"], looseEqual)).toBeTruthy();
			expect(equals([[0]], [[false]], looseEqual)).toBeTruthy();

		});

		it("should use custom equality for case-insensitive string comparison", async () => {

			const caseInsensitive = (x: unknown, y: unknown) =>
				typeof x === "string" && typeof y === "string"
					? x.toLowerCase() === y.toLowerCase()
					: Object.is(x, y);

			expect(equals("Hello", "hello", caseInsensitive)).toBeTruthy();
			expect(equals({ name: "Alice" }, { name: "ALICE" }, caseInsensitive)).toBeTruthy();
			expect(equals(["A", "B"], ["a", "b"], caseInsensitive)).toBeTruthy();

			// non-strings still use Object.is semantics
			expect(equals(1, 1, caseInsensitive)).toBeTruthy();
			expect(equals(1, 2, caseInsensitive)).toBeFalsy();

		});

		it("should use custom equality for numeric tolerance comparison", async () => {

			const tolerance = 0.001;
			const approxEqual = (x: unknown, y: unknown) =>
				typeof x === "number" && typeof y === "number"
					? Math.abs(x-y) < tolerance
					: Object.is(x, y);

			expect(equals(0.1+0.2, 0.3, approxEqual)).toBeTruthy();
			expect(equals({ value: 1.0001 }, { value: 1.0002 }, approxEqual)).toBeTruthy();
			expect(equals([0.1, 0.2], [0.1001, 0.2001], approxEqual)).toBeTruthy();

		});

	});

});

describe("immutable()", () => {

	// Note: immutable() does not handle circular references and will cause stack overflow.
	// This is documented behavior in the implementation (see src/nested.ts)

	it("should return input primitives", async () => {

		expect(immutable(undefined)).toBe(undefined);
		expect(immutable(null)).toBe(null);
		expect(immutable(true)).toBe(true);
		expect(immutable(0)).toBe(0);
		expect(immutable("x")).toBe("x");

	});

	it("should return an immutable empty object clone", async () => {

		const value = {};
		const clone = immutable(value);

		expect(clone).not.toBe(value);
		expect(clone).toEqual(value);

	});

	it("should return an immutable object clone", async () => {

		const value = { uno: 1, due: 2 };
		const clone = immutable(value);

		expect(clone).not.toBe(value);
		expect(clone).toEqual(value);

		expect(() => (clone as any).uno = 3).toThrow();

	});

	it("should return an immutable empty array clone", async () => {

		const value: number[] = [];
		const clone = immutable(value);

		expect(clone).not.toBe(value);
		expect(clone).toEqual(value);

	});

	it("should return an immutable array clone", async () => {

		const value = [1, 2];
		const clone = immutable(value);

		expect(clone).not.toBe(value);
		expect(clone).toEqual(value);

		expect(() => (clone as any)[1] = 3).toThrow();

	});

	it("should return a plain function as-is", async () => {

		const value = () => "hello";
		const clone = immutable(value);

		expect(clone).toBe(value);
		expect((clone as any)()).toBe("hello");

	});

	it("should return functions unchanged (not frozen)", async () => {

		type FnWithConfig = (() => string) & { config: { port: number } };

		const value = (() => "hello") as FnWithConfig;
		value.config = { port: 3000 };

		const fn = immutable(value);

		expect(fn).toBe(value); // Same function reference
		expect((fn as any)()).toBe("hello"); // Function still works
		expect(fn.config).toEqual({ port: 3000 }); // Property preserved

		// Functions are not frozen - modifications allowed
		fn.config.port = 8080;
		expect(fn.config.port).toBe(8080);

	});

	it("should skip non-configurable properties on functions", async () => {

		type FnWithConfig = (() => string) & { config: { port: number } };

		const value = (() => "hello") as FnWithConfig;

		// Add non-configurable property
		Object.defineProperty(value, "config", {
			value: { port: 3000 },
			writable: true,
			enumerable: true,
			configurable: false  // Non-configurable
		});

		// Should not throw - non-configurable properties are skipped
		const fn = immutable(value);

		expect(fn).toBe(value); // Same function reference
		expect((fn as any)()).toBe("hello"); // Function still works
		expect(fn.config).toEqual({ port: 3000 }); // Property preserved

		// Non-configurable property remains mutable (wasn't frozen)
		fn.config.port = 8080;
		expect(fn.config.port).toBe(8080);

	});

	describe("Idempotency", () => {

		it("should be idempotent for objects (calling twice returns same structure)", async () => {

			const original = { name: "Alice", age: 30 };
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(frozen2).toEqual(frozen1);
			expect(frozen2).toEqual(original);

		});

		it("should be idempotent for nested objects", async () => {

			const original = {
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" }
			};

			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(frozen2).toEqual(frozen1);
			expect(frozen2).toEqual(original);
			expect(frozen2.user).toEqual({ name: "Alice", age: 30 });
			expect(frozen2.settings).toEqual({ theme: "dark" });

		});

		it("should be idempotent for arrays", async () => {

			const original = [1, 2, 3];
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(frozen2).toEqual(frozen1);
			expect(frozen2).toEqual(original);

		});

		it("should be idempotent for nested arrays", async () => {

			const original = [1, [2, 3], { x: 4 }];
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(frozen2).toEqual(frozen1);
			expect(frozen2).toEqual(original);

		});

		it("should preserve all properties when re-freezing objects", async () => {

			const original = { a: 1, b: 2, c: 3 };
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(Object.keys(frozen2)).toEqual(["a", "b", "c"]);
			expect(frozen2.a).toBe(1);
			expect(frozen2.b).toBe(2);
			expect(frozen2.c).toBe(3);

		});

		it("should preserve nested properties when re-freezing", async () => {

			const original = {
				level1: {
					level2: {
						value: "deep"
					}
				}
			};

			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			expect(frozen2.level1.level2.value).toBe("deep");

		});

		it("should return same reference when re-freezing objects (optimization)", async () => {

			const original = { name: "Alice", age: 30 };
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			// optimization: should return same reference if already immutable
			expect(frozen2).toBe(frozen1);

		});

		it("should return same reference when re-freezing arrays (optimization)", async () => {

			const original = [1, 2, 3];
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			// optimization: should return same reference if already immutable
			expect(frozen2).toBe(frozen1);

		});

		it("should return same reference for nested arrays (optimization)", async () => {

			const original = [1, [2, 3], { x: 4 }];
			const frozen1 = immutable(original);
			const frozen2 = immutable(frozen1);

			// optimization: should return same reference if already immutable
			expect(frozen2).toBe(frozen1);

		});

		it("should handle manually frozen objects (without tag)", async () => {

			// create a manually frozen object (not via immutable())
			const manuallyFrozen = Object.freeze({
				user: Object.freeze({ name: "Alice" }),
				settings: { theme: "dark" }  // nested object NOT frozen
			});

			const processed = immutable(manuallyFrozen);

			// should process it fully since it doesn't have the immutable tag
			expect(processed).toEqual(manuallyFrozen);
			expect(processed.user.name).toBe("Alice");
			expect(processed.settings.theme).toBe("dark");

			// verify nested object is now frozen
			expect(() => (processed.settings as any).theme = "light").toThrow();

		});

		it("should tag nested objects during deep freeze", async () => {

			const original = {
				user: { name: "Alice", age: 30 },
				settings: { theme: "dark" }
			};

			const frozen = immutable(original);

			// extract nested objects
			const user = frozen.user;
			const settings = frozen.settings;

			// re-freeze the nested objects - should return same reference
			const userRefrozen = immutable(user);
			const settingsRefrozen = immutable(settings);

			expect(userRefrozen).toBe(user);
			expect(settingsRefrozen).toBe(settings);

		});

		it("should tag deeply nested objects", async () => {

			const original = {
				level1: {
					level2: {
						level3: {
							value: "deep"
						}
					}
				}
			};

			const frozen = immutable(original);

			// extract deeply nested object
			const level3 = frozen.level1.level2.level3;

			// re-freeze should return same reference
			const refrozen = immutable(level3);

			expect(refrozen).toBe(level3);

		});

		it("should tag nested arrays during deep freeze", async () => {

			const original = {
				items: [1, 2, 3],
				nested: [[4, 5], [6, 7]]
			};

			const frozen = immutable(original);

			// extract nested arrays
			const items = frozen.items;
			const nestedArray = frozen.nested[0];

			// re-freeze should return same reference
			const itemsRefrozen = immutable(items);
			const nestedRefrozen = immutable(nestedArray);

			expect(itemsRefrozen).toBe(items);
			expect(nestedRefrozen).toBe(nestedArray);

		});

		it("should tag objects within arrays", async () => {

			const original = [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" }
			];

			const frozen = immutable(original);

			// extract object from array
			const firstItem = frozen[0];
			const secondItem = frozen[1];

			// re-freeze should return same reference
			const firstRefrozen = immutable(firstItem);
			const secondRefrozen = immutable(secondItem);

			expect(firstRefrozen).toBe(firstItem);
			expect(secondRefrozen).toBe(secondItem);

		});

		it("should handle primitive array items correctly", async () => {

			const original = [1, 2, 3, "hello", true];
			const frozen = immutable(original);

			// extract primitive items
			const num = frozen[0];
			const str = frozen[3];
			const bool = frozen[4];

			// primitives should be returned as-is (they're immutable by nature)
			expect(immutable(num)).toBe(num);
			expect(immutable(str)).toBe(str);
			expect(immutable(bool)).toBe(bool);

		});

		it("should tag array items that are arrays", async () => {

			const original = [[1, 2], [3, 4], [5, 6]];
			const frozen = immutable(original);

			// extract nested arrays
			const first = frozen[0];
			const second = frozen[1];
			const third = frozen[2];

			// re-freeze should return same reference
			expect(immutable(first)).toBe(first);
			expect(immutable(second)).toBe(second);
			expect(immutable(third)).toBe(third);

		});

		it("should tag mixed array items (objects and arrays)", async () => {

			const original = [
				{ type: "object", value: 1 },
				[2, 3, 4],
				{ type: "another", value: 5 },
				[[6, 7], [8, 9]]
			];

			const frozen = immutable(original);

			// extract different types of items
			const obj1 = frozen[0];
			const arr1 = frozen[1];
			const obj2 = frozen[2];
			const nestedArr = frozen[3];

			// all should return same reference when re-frozen
			expect(immutable(obj1)).toBe(obj1);
			expect(immutable(arr1)).toBe(arr1);
			expect(immutable(obj2)).toBe(obj2);
			expect(immutable(nestedArr)).toBe(nestedArr);

			// verify deeply nested items are also tagged
			const deepNested = (nestedArr as ReadonlyArray<unknown>)[0];
			expect(immutable(deepNested)).toBe(deepNested);

		});

		it("should hide internal immutable tag from enumeration and serialization (objects)", async () => {

			const original = {
				user: { name: "Alice", age: 30 },
				items: [1, 2, 3]
			};

			const frozen = immutable(original);

			// verify tag doesn't appear in Object.keys()
			expect(Object.keys(frozen)).toEqual(["user", "items"]);
			expect(Object.keys(frozen.user)).toEqual(["name", "age"]);

			// verify tag doesn't appear in JSON serialization
			expect(JSON.stringify(frozen)).toBe(JSON.stringify(original));

			// verify tag is non-enumerable
			const enumerableKeys = [];
			for (const key in frozen) {
				enumerableKeys.push(key);
			}
			expect(enumerableKeys).toEqual(["user", "items"]);

		});

		it("should hide internal immutable tag from array operations", async () => {

			const original = [1, 2, 3, { nested: "value" }];
			const frozen = immutable(original);

			// verify tag doesn't affect array length
			expect(frozen.length).toBe(4);

			// verify tag doesn't appear in Object.keys() (should show array indices)
			expect(Object.keys(frozen)).toEqual(["0", "1", "2", "3"]);

			// verify tag doesn't appear in JSON serialization
			expect(JSON.stringify(frozen)).toBe(JSON.stringify(original));

			// verify tag doesn't interfere with array iteration
			const collected: unknown[] = [];
			frozen.forEach(item => collected.push(item));
			expect(collected).toEqual([1, 2, 3, { nested: "value" }]);

			// verify tag is non-enumerable in for...in loops
			const indices = [];
			for (const index in frozen) {
				indices.push(index);
			}
			expect(indices).toEqual(["0", "1", "2", "3"]);

		});

		it("should return functions unchanged (no idempotency tracking)", async () => {

			type FnWithConfig = (() => string) & { config: { port: number } };

			const original = (() => "hello") as FnWithConfig;
			original.config = { port: 3000 };

			const result1 = immutable(original);
			const result2 = immutable(result1);

			// Same reference - functions are returned as-is
			expect(result1).toBe(original);
			expect(result2).toBe(original);

			// Function still works
			expect((result2 as any)()).toBe("hello");
			expect(result2.config).toEqual({ port: 3000 });

			// Functions are not frozen - modifications allowed
			result2.config.port = 8080;
			expect(result2.config.port).toBe(8080);

		});

	});

	describe("Property Descriptors", () => {

		it("should handle non-enumerable properties on objects", async () => {

			const original = { visible: 1 };
			Object.defineProperty(original, "hidden", {
				value: 2,
				writable: true,
				enumerable: false,
				configurable: true
			});

			const frozen = immutable(original);

			// Should preserve the property value
			expect((frozen as any).hidden).toBe(2);
			expect(frozen.visible).toBe(1);

			// Check if non-enumerable property is still non-enumerable
			const descriptor = Object.getOwnPropertyDescriptor(frozen, "hidden");
			expect(descriptor?.enumerable).toBe(false);

			// Should be frozen
			expect(() => (frozen as any).hidden = 3).toThrow();
			expect(() => (frozen as any).visible = 3).toThrow();

		});

		it("should handle non-enumerable symbol properties", async () => {

			const Brand = Symbol("brand");
			const original = { visible: 1 };

			Object.defineProperty(original, Brand, {
				value: "branded",
				writable: true,
				enumerable: false,
				configurable: true
			});

			const frozen = immutable(original);

			// Should preserve the symbol property value
			expect((frozen as any)[Brand]).toBe("branded");
			expect(frozen.visible).toBe(1);

			// Check if non-enumerable symbol property is still non-enumerable
			const descriptor = Object.getOwnPropertyDescriptor(frozen, Brand);
			expect(descriptor?.enumerable).toBe(false);

			// Should be frozen
			expect(() => (frozen as any)[Brand] = "changed").toThrow();

		});

		it("should preserve getters but remove setters from accessor properties", async () => {

			const original = {
				_value: 10,
				get value() { return this._value; },
				set value(v: number) { this._value = v; }
			};

			const frozen = immutable(original);

			// getter should be preserved and functional
			expect((frozen as any).value).toBe(10);

			// setter should be removed for true immutability
			const descriptor = Object.getOwnPropertyDescriptor(frozen, "value");
			expect(descriptor?.get).toBeDefined();
			expect(descriptor?.set).toBeUndefined();

			// assignment should throw in strict mode (modules are strict by default)
			expect(() => { (frozen as any).value = 20; }).toThrow(TypeError);

		});

	});

	describe("Built-in Objects", () => {

		it("should return Date objects as-is", async () => {

			const original = new Date("2025-01-01T00:00:00Z");
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.getFullYear()).toBe(2025);
			expect(result.getMonth()).toBe(0);
			expect(result.getDate()).toBe(1);

		});

		it("should return RegExp objects as-is", async () => {

			const original = /test-(\d+)/gi;
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.test("test-123")).toBe(true);
			expect(result.flags).toBe("gi");
			expect(result.source).toBe("test-(\\d+)");

		});

		it("should return Map objects as-is", async () => {

			const original = new Map([["key1", "value1"], ["key2", "value2"]]);
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.get("key1")).toBe("value1");
			expect(result.get("key2")).toBe("value2");
			expect(result.size).toBe(2);

		});

		it("should return Set objects as-is", async () => {

			const original = new Set([1, 2, 3, 4]);
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.has(1)).toBe(true);
			expect(result.has(5)).toBe(false);
			expect(result.size).toBe(4);

		});

		it("should return WeakMap objects as-is", async () => {

			const key1 = {};
			const key2 = {};
			const original = new WeakMap([[key1, "value1"], [key2, "value2"]]);
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.get(key1)).toBe("value1");
			expect(result.get(key2)).toBe("value2");

		});

		it("should return WeakSet objects as-is", async () => {

			const obj1 = {};
			const obj2 = {};
			const original = new WeakSet([obj1, obj2]);
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result.has(obj1)).toBe(true);
			expect(result.has(obj2)).toBe(true);
			expect(result.has({})).toBe(false);

		});

		it("should return custom class instances as-is", async () => {

			class MyClass {
				constructor(public value: number) {}

				method() { return this.value*2; }
			}

			const original = new MyClass(42);
			const result = immutable(original);

			// Should return the same reference
			expect(result).toBe(original);

			// Should remain functional
			expect(result instanceof MyClass).toBe(true);
			expect(result.value).toBe(42);
			expect(result.method()).toBe(84);

		});

	});

});

describe("immutable() with guard", () => {

	// type guard that always passes
	const isAny = (_v: unknown): _v is unknown => true;

	// different guard for testing re-validation
	const isAnyOther = (_v: unknown): _v is unknown => true;

	describe("validation", () => {

		it("returns value when guard passes", async () => {

			expect(immutable(42, isNumber)).toBe(42);
			expect(immutable("hello", isString)).toBe("hello");

		});

		it("throws TypeError when guard fails", async () => {

			expect(() => immutable("not a number", isNumber)).toThrow(TypeError);
			expect(() => immutable(42, isString)).toThrow(TypeError);

		});

	});

	describe("with non-plain-object values", () => {

		it("validates and returns primitives unchanged", async () => {

			expect(immutable(42, isNumber)).toBe(42);
			expect(immutable("hello", isString)).toBe("hello");

		});

		it("does not cache primitives", async () => {

			let validationCount = 0;
			const countingGuard = (v: unknown): v is number => {
				validationCount++;
				return typeof v === "number";
			};

			immutable(42, countingGuard);
			immutable(42, countingGuard);

			expect(validationCount).toBe(2);

		});

		it("validates and freezes arrays", async () => {

			const isNumberArray = (v: unknown): v is number[] =>
				Array.isArray(v) && v.every(n => typeof n === "number");

			const arr = [1, 2, 3];
			const result = immutable(arr, isNumberArray);

			expect(result).toEqual([1, 2, 3]);
			expect(Object.isFrozen(result)).toBeTruthy();

		});

	});

	describe("with unbranded plain object", () => {

		it("runs value through guard", async () => {

			let validated = false;
			const trackingGuard = (v: unknown): v is object => {
				validated = true;
				return isObject(v);
			};

			immutable({ a: 1 }, trackingGuard);

			expect(validated).toBeTruthy();

		});

		it("returns immutable object", async () => {

			const result = immutable({ a: 1 }, isObject);

			expect(Object.isFrozen(result)).toBeTruthy();

		});

	});

	describe("with branded plain object", () => {

		it("accepts any brand when called without guard", async () => {

			const first = immutable({ a: 1 }, isAny);
			const second = immutable(first);

			expect(second).toBe(first);

		});

		it("returns same object when branded with same guard", async () => {

			const first = immutable({ a: 1 }, isAny);
			const second = immutable(first, isAny);

			expect(second).toBe(first);

		});

		it("skips validation when branded with same guard", async () => {

			let validationCount = 0;
			const countingGuard = (v: unknown): v is object => {
				validationCount++;
				return isObject(v);
			};

			const first = immutable({ a: 1 }, countingGuard);
			immutable(first, countingGuard);

			expect(validationCount).toBe(1);

		});

		it("revalidates and rebrands when branded with different guard", async () => {

			let validationCount = 0;
			const countingGuard = (v: unknown): v is object => {
				validationCount++;
				return isObject(v);
			};

			const first = immutable({ a: 1 }, isAny);
			const second = immutable(first, countingGuard);

			// revalidates
			expect(validationCount).toBe(1);

			// returns new reference (rebranded copy)
			expect(second).not.toBe(first);
			expect(second).toEqual(first);

			// rebranded: calling with new guard returns same reference
			const third = immutable(second, countingGuard);
			expect(third).toBe(second);
			expect(validationCount).toBe(1); // no re-validation

		});

	});

	describe("with branded array", () => {

		it("accepts any brand when called without guard", async () => {

			const first = immutable([1, 2, 3], isAny);
			const second = immutable(first);

			expect(second).toBe(first);

		});

		it("revalidates and rebrands when branded with different guard", async () => {

			let validationCount = 0;
			const countingGuard = (v: unknown): v is unknown[] => {
				validationCount++;
				return Array.isArray(v);
			};

			const first = immutable([1, 2, 3], isAny);
			const second = immutable(first, countingGuard);

			// revalidates
			expect(validationCount).toBe(1);

			// returns new reference (rebranded copy)
			expect(second).not.toBe(first);
			expect(second).toEqual(first);
			expect(Object.isFrozen(second)).toBeTruthy();

			// rebranded: calling with new guard returns same reference
			const third = immutable(second, countingGuard);
			expect(third).toBe(second);
			expect(validationCount).toBe(1); // no re-validation

		});

	});

	describe("with function", () => {

		it("returns function unchanged", async () => {

			const fn = () => 42;
			const first = immutable(fn, isAny);
			const second = immutable(first, isAnyOther);

			// same reference - functions are returned as-is
			expect(first).toBe(fn);
			expect(second).toBe(fn);

		});

		it("validates on each call (no memoization)", async () => {

			let validationCount = 0;
			const countingGuard = (v: unknown): v is Function => {
				validationCount++;
				return typeof v === "function";
			};

			const fn = () => 42;

			immutable(fn, countingGuard);
			immutable(fn, countingGuard);

			// functions are validated each time (not branded)
			expect(validationCount).toBe(2);

		});

	});

	describe("with frozen value", () => {

		it("creates a copy preserving all properties", async () => {

			const frozen = Object.freeze({ a: 1, b: 2 });
			const result = immutable(frozen, isAny);

			expect(result).toEqual({ a: 1, b: 2 });
			expect(result).not.toBe(frozen);

		});

		it("preserves non-enumerable properties", async () => {

			const obj = {};
			Object.defineProperty(obj, "hidden", { value: 42, enumerable: false });
			const frozen = Object.freeze(obj);

			const result = immutable(frozen, isAny);
			const descriptor = Object.getOwnPropertyDescriptor(result, "hidden");

			expect(descriptor?.value).toBe(42);

		});

		it("preserves symbol properties", async () => {

			const sym = Symbol("test");
			const obj: Record<symbol | string, unknown> = { a: 1 };
			obj[sym] = "symbol-value";
			const frozen = Object.freeze(obj);

			const result = immutable(frozen, isAny) as Record<symbol | string, unknown>;

			expect(result[sym]).toBe("symbol-value");

		});

	});

	describe("with sealed value", () => {

		it("creates a copy preserving all properties", async () => {

			const sealed = Object.seal({ a: 1, b: 2 });
			const result = immutable(sealed, isAny);

			expect(result).toEqual({ a: 1, b: 2 });
			expect(result).not.toBe(sealed);

		});

	});

});
