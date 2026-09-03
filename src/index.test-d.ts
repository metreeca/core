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
import { assert, isDefined, isString, map, opt } from "./index.js";


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

describe("error reporting", () => {

	describe("assert()", () => {

		test("should report the guarded type for an unknown value", () => {

			const value = "value" as unknown;

			expectTypeOf(assert(value, isString)).toEqualTypeOf<string>();

		});

		test("should report the guarded type for a typed value", () => {

			const value = "value" as string | number;

			expectTypeOf(assert(value, isString)).toEqualTypeOf<string>();

		});

		test("should report the declared type under a plain predicate", () => {

			const value = "value" as string;

			expectTypeOf(assert(value, (checked: string) => checked.length > 0)).toEqualTypeOf<string>();

		});

		test("should bind an inline predicate parameter to the declared type", () => {

			const value = "value" as string;

			expectTypeOf(assert(value, checked => {

				expectTypeOf(checked).toEqualTypeOf<string>();

				return checked.length > 0;

			})).toEqualTypeOf<string>();

		});

		test("should bind an inline predicate parameter to a generic declared type", () => {

			function required<V>(values: Iterable<V>): V {
				return assert(Array.from(values), values => values.length === 1, "expected single value")[0];
			}

			expectTypeOf(required(["value"])).toEqualTypeOf<string>();

		});

		test("should hand the declared value on to the message factory of a plain predicate", () => {

			const value = "value" as string | number;

			assert(value, (checked: string | number) => checked !== 0, offending => {

				expectTypeOf(offending).toEqualTypeOf<string | number>();

				return "message";

			});

		});

	});

});

describe("functional idioms", () => {

	describe("map()", () => {

		test("should report a defined result", () => {

			const value = "value" as string;

			expectTypeOf(map(value, mapped => mapped.length)).toEqualTypeOf<number>();

		});

		test("should accept a nullable value", () => {

			const value = null as string | null;

			expectTypeOf(map(value, mapped => mapped)).toEqualTypeOf<string | null>();

		});

		test("should accept a value that may be missing", () => {

			const value = undefined as string | undefined;

			expectTypeOf(map(value, mapped => mapped)).toEqualTypeOf<string | undefined>();

		});

	});

	describe("opt()", () => {

		test("should report an optional result for an optional value", () => {

			const value = undefined as string | undefined;

			expectTypeOf(opt(value, mapped => mapped.length)).toEqualTypeOf<number | undefined>();

		});

		test("should report an optional result for a defined value", () => {

			const value = "value" as string;

			expectTypeOf(opt(value, mapped => mapped.length)).toEqualTypeOf<number | undefined>();

		});

		test("should hand a defined value on to the mapper", () => {

			const value = undefined as string | null | undefined;

			opt(value, mapped => expectTypeOf(mapped).toEqualTypeOf<string | null>());

		});

		test("should report a defined result under a fallback", () => {

			const value = undefined as string | undefined;

			expectTypeOf(opt(value, mapped => mapped.length, 0)).toEqualTypeOf<number>();

		});

		test("should report a defined result under a deferred fallback", () => {

			const value = undefined as string | undefined;

			expectTypeOf(opt(value, mapped => mapped.length, () => 0)).toEqualTypeOf<number>();

		});

		test("should reject a fallback of a different type", () => {

			const value = undefined as string | undefined;

			// @ts-expect-error the fallback must match the type reported by the mapper
			opt(value, mapped => mapped.length, "none");

		});

	});

});
