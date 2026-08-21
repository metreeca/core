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
import { createScope } from "./scope.js";


describe("createScope()", () => {

	it("should return an immutable scope", async () => {
		expect(Object.isFrozen(createScope())).toBe(true);
	});


	describe("anonymous allocation", () => {

		it("should start ids at 0", async () => {
			expect(createScope().resolve()).toBe(0);
		});

		it("should allocate a fresh id on every call", async () => {
			const scope = createScope();
			expect([scope.resolve(), scope.resolve(), scope.resolve()]).toEqual([0, 1, 2]);
		});

	});


	describe("keyed allocation", () => {

		it("should return the cached id on a repeat hit", async () => {
			const scope = createScope();
			const key = {};
			expect(scope.resolve(key)).toBe(scope.resolve(key));
		});

		it("should allocate unique ids for unique keys", async () => {
			const scope = createScope();
			expect([scope.resolve({}), scope.resolve({})]).toEqual([0, 1]);
		});

		it("should match keys by reference, not structure", async () => {
			const scope = createScope();
			expect(scope.resolve({ id: 1 })).not.toBe(scope.resolve({ id: 1 }));
		});

		it("should cache the first allocated id even when it is 0", async () => {
			const scope = createScope();
			const key = {};
			scope.resolve(key); // allocates id 0
			expect(scope.resolve(key)).toBe(0);
		});

		it("should cache null as a key", async () => {
			const scope = createScope();
			expect(scope.resolve(null)).toBe(scope.resolve(null));
		});

	});


	describe("composite allocation", () => {

		it("should return the cached id on a repeat composite hit", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			expect(scope.resolve(a, b)).toBe(scope.resolve(a, b));
		});

		it("should match composite keys component-wise by reference", async () => {
			const scope = createScope();
			const a = {};
			expect(scope.resolve(a, {})).not.toBe(scope.resolve(a, {}));
		});

		it("should distinguish composite keys by component order", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			expect(scope.resolve(a, b)).not.toBe(scope.resolve(b, a));
		});

		it("should distinguish composite keys differing in any component", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			const c = {};
			expect([scope.resolve(a, b), scope.resolve(a, c), scope.resolve(c, b)]).toEqual([0, 1, 2]);
		});

		it("should not collide a single key with a composite sharing its first component", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			expect(scope.resolve(a)).not.toBe(scope.resolve(a, b));
		});

		it("should distinguish a composite from a longer composite extending it", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			const c = {};
			expect(scope.resolve(a, b)).not.toBe(scope.resolve(a, b, c));
		});

		it("should cache composite keys of arbitrary length", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			const c = {};
			const d = {};
			expect(scope.resolve(a, b, c, d)).toBe(scope.resolve(a, b, c, d));
		});

		it("should cache the first allocated composite id even when it is 0", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			scope.resolve(a, b); // allocates id 0
			expect(scope.resolve(a, b)).toBe(0);
		});

	});


	describe("shared counter", () => {

		it("should draw keyed and anonymous ids from one monotonic sequence", async () => {
			const scope = createScope();
			const key = {};
			expect([scope.resolve(key), scope.resolve(), scope.resolve(key), scope.resolve()]).toEqual([0, 1, 0, 2]);
		});

		it("should draw single, composite, and anonymous ids from one monotonic sequence", async () => {
			const scope = createScope();
			const a = {};
			const b = {};
			expect([scope.resolve(a), scope.resolve(a, b), scope.resolve(), scope.resolve(a, b)]).toEqual([0, 1, 2, 1]);
		});

	});


	describe("scope isolation", () => {

		it("should allocate ids independently per scope", async () => {
			const key = {};
			expect([createScope().resolve(key), createScope().resolve(key)]).toEqual([0, 0]);
		});

	});


	describe("mapped allocation", () => {

		it("should pass each id through the mapper", async () => {
			const scope = createScope(index => `v${index}`);
			expect([scope.resolve(), scope.resolve()]).toEqual(["v0", "v1"]);
		});

		it("should cache the mapped value on a repeat hit", async () => {
			const scope = createScope(() => ({}));
			const key = {};
			expect(scope.resolve(key)).toBe(scope.resolve(key));
		});

		it("should invoke the mapper once per allocated id", async () => {
			const mapper = vi.fn((index: number) => index);
			const scope = createScope(mapper);
			const key = {};
			scope.resolve(key);
			scope.resolve(key);
			scope.resolve();
			expect(mapper).toHaveBeenCalledTimes(2);
		});

	});

});
