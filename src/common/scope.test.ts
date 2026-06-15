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
import { createScope } from "./scope.js";


describe("createScope()", () => {

	it("should return an immutable scope", async () => {
		expect(Object.isFrozen(createScope())).toBe(true);
	});


	describe("anonymous allocation", () => {

		it("should start ids at 0", async () => {
			expect(createScope().variable()).toBe(0);
		});

		it("should allocate a fresh id on every call", async () => {
			const scope = createScope();
			expect([scope.variable(), scope.variable(), scope.variable()]).toEqual([0, 1, 2]);
		});

	});


	describe("keyed allocation", () => {

		it("should return the cached id on a repeat hit", async () => {
			const scope = createScope();
			const key = {};
			expect(scope.variable(key)).toBe(scope.variable(key));
		});

		it("should allocate distinct ids for distinct keys", async () => {
			const scope = createScope();
			expect([scope.variable({}), scope.variable({})]).toEqual([0, 1]);
		});

		it("should match keys by reference, not structure", async () => {
			const scope = createScope();
			expect(scope.variable({ id: 1 })).not.toBe(scope.variable({ id: 1 }));
		});

		it("should cache the first allocated id even when it is 0", async () => {
			const scope = createScope();
			const key = {};
			scope.variable(key); // allocates id 0
			expect(scope.variable(key)).toBe(0);
		});

		it("should cache null as a key", async () => {
			const scope = createScope();
			expect(scope.variable(null)).toBe(scope.variable(null));
		});

	});


	describe("shared counter", () => {

		it("should draw keyed and anonymous ids from one monotonic sequence", async () => {
			const scope = createScope();
			const key = {};
			expect([scope.variable(key), scope.variable(), scope.variable(key), scope.variable()]).toEqual([0, 1, 0, 2]);
		});

	});


	describe("scope isolation", () => {

		it("should allocate ids independently per scope", async () => {
			const key = {};
			expect([createScope().variable(key), createScope().variable(key)]).toEqual([0, 0]);
		});

	});

});
