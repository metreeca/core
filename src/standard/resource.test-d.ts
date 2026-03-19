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

import { describe, expectTypeOf, test } from "vitest";
import type { IRI, Namespace } from "./resource.js";
import { createNamespace } from "./resource.js";


describe("Namespace", () => {

	describe("open namespace", () => {

		test("should allow any string key", () => {
			const ns = createNamespace("http://example.org/");
			expectTypeOf(ns[""]).toEqualTypeOf<IRI>();
			expectTypeOf(ns["anything"]).toEqualTypeOf<IRI>();
		});

	});

	describe("closed namespace", () => {

		test("should allow declared terms", () => {
			const ns = createNamespace("http://example.org/", ["label", "comment"]);
			expectTypeOf(ns[""]).toEqualTypeOf<IRI>();
			expectTypeOf(ns.label).toEqualTypeOf<IRI>();
			expectTypeOf(ns.comment).toEqualTypeOf<IRI>();
		});

		test("should reject unknown terms", () => {
			const ns = createNamespace("http://example.org/", ["label", "comment"]);

			// @ts-expect-error - unknown term on closed namespace
			ns.unknown;
		});

	});

});
