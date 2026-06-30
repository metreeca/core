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
import { map } from "./combo.js";


describe("map()", () => {

	it("should return the result of applying the mapper to the value", async () => {
		expect(map(2, n => n * 3)).toBe(6);
	});

	it("should pass the value as the mapper argument", async () => {
		const record = { id: 42 };
		expect(map(record, ({ id }) => id)).toBe(42);
	});

	it("should support transforming to a different type", async () => {
		expect(map(42, n => `#${n}`)).toBe("#42");
	});

	it("should propagate errors thrown by the mapper", async () => {
		expect(() => map(0, () => { throw new Error("boom"); })).toThrow("boom");
	});

});
