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
import { $, Meta } from "./meta.js";


describe("$() - metadata annotation", () => {

	describe("attaching metadata", () => {

		it("should attach metadata to an object", async () => {
			const data = { value: 42 };
			const metadata = { source: "test" };
			const annotated = $(data, metadata);

			expect(annotated).toBe(data);
			expect((annotated as any)[Meta]).toBe(metadata);
		});

		it("should throw when trying to reannotate", async () => {
			const data = { value: 42 };
			$(data, { version: 1 });

			expect(() => $(data, { version: 2 })).toThrow();
		});

		it("should attach metadata to functions", async () => {
			const fn = () => 42;
			const metadata = { cached: true, timeout: 1000 };
			const annotated = $(fn, metadata);

			expect(annotated).toBe(fn);
			expect($(annotated)).toBe(metadata);
		});

		it.each([
			["frozen", Object.freeze({ value: 42 })],
			["sealed", Object.seal({ value: 42 })],
			["non-extensible", Object.preventExtensions({ value: 42 })]
		])("should throw when unable to attach metadata to %s object", async (_, data) => {
			expect(() => $(data, { meta: "data" })).toThrow();
		});

		it("should throw when unable to attach metadata to primitives", async () => {
			expect(() => $("string", { meta: "data" })).toThrow();
			expect(() => $(42, { meta: "data" })).toThrow();
			expect(() => $(true, { meta: "data" })).toThrow();
		});

	});

	describe("retrieving metadata", () => {

		it("should retrieve attached metadata", async () => {
			const data = { value: 42 };
			const metadata = { source: "test", timestamp: 12345 };
			const annotated = $(data, metadata);

			const retrieved = $(annotated);
			expect(retrieved).toBe(metadata);
		});

		it("should retrieve metadata of different types", async () => {
			const obj1 = $([], "string metadata");
			const obj2 = $({}, 123);
			const obj3 = $({}, { complex: "object" });
			const obj4 = $({}, null);

			expect($(obj1)).toBe("string metadata");
			expect($(obj2)).toBe(123);
			expect($(obj3)).toEqual({ complex: "object" });
			expect($(obj4)).toBe(null);
		});

		it("should allow attaching and retrieving undefined metadata", async () => {
			const data = { value: 42 };
			const annotated = $(data, undefined);
			expect($(annotated)).toBe(undefined);
		});

		it("should throw for non-annotated objects", async () => {
			const data = { value: 42 };
			expect(() => $(data as any)).toThrow();
		});

	});

	describe("metadata lifecycle", () => {

		it("should preserve metadata across multiple retrievals", async () => {
			const data = { value: 42 };
			const metadata = { count: 0 };
			const annotated = $(data, metadata);

			const first = $(annotated);
			const second = $(annotated);

			expect(first).toBe(metadata);
			expect(second).toBe(metadata);
		});

		it("should not affect object enumeration", async () => {
			const data = { a: 1, b: 2 };
			$(data, { meta: "data" });

			const keys = Object.keys(data);
			expect(keys).toEqual(["a", "b"]);
		});

		it("should not affect JSON serialization", async () => {
			const data = { value: 42 };
			$(data, { hidden: "metadata" });

			const json = JSON.stringify(data);
			expect(json).toBe("{\"value\":42}");
		});

	});

	describe("type safety", () => {

		it("should maintain data type after annotation", async () => {
			const data = { value: 42 };
			const annotated = $(data, { source: "test" });
			expect(annotated.value).toBe(42);
		});

	});

});
