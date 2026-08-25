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
import { isDefined, given } from "./index.js";


describe("built-in guards", () => {

	describe("isDefined()", () => {

		test("should narrow unions to their defined constituents", () => {

			const value = undefined as string | undefined;

			if ( isDefined(value) ) {
				expectTypeOf(value).toEqualTypeOf<string>();
			}

		});

		test("should narrow unions to undefined on failure", () => {

			const value = undefined as string | undefined;

			if ( !isDefined(value) ) {
				expectTypeOf(value).toEqualTypeOf<undefined>();
			}

		});

		test("should retain null constituents", () => {

			const value = undefined as string | null | undefined;

			if ( isDefined(value) ) {
				expectTypeOf(value).toEqualTypeOf<string | null>();
			}

		});

		test("should narrow when used as a filtering predicate", () => {

			const values = [] as (string | undefined)[];

			expectTypeOf(values.filter(isDefined)).toEqualTypeOf<string[]>();

		});

	});

});

describe("functional idioms", () => {

	describe("given()", () => {

		test("should report a defined result for a defined value", () => {

			const value = "value" as string;

			expectTypeOf(given(value)(mapped => mapped.length)).toEqualTypeOf<number>();

		});

		test("should report an optional result for an optional value", () => {

			const value = undefined as string | undefined;

			expectTypeOf(given(value)(mapped => mapped.length)).toEqualTypeOf<number | undefined>();

		});

		test("should report a defined result for a nullable value", () => {

			const value = null as string | null;

			expectTypeOf(given(value)(mapped => mapped)).toEqualTypeOf<string | null>();

		});

		test("should hand a defined value on to the mapper", () => {

			const value = undefined as string | null | undefined;

			given(value)(mapped => expectTypeOf(mapped).toEqualTypeOf<string | null>());

		});

	});

});
