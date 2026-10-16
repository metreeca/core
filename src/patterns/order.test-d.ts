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

import { describe, expectTypeOf, it } from "vitest";
import type { Nullable } from "../index.js";
import { absent, ascending, by, type Comparator, compound, descending, locale, present, reverse } from "./order.js";


describe("Comparator", () => {

	it("should accept the built-in comparators", async () => {
		expectTypeOf(ascending<number>).toEqualTypeOf<Comparator<number>>();
		expectTypeOf(descending<number>).toEqualTypeOf<Comparator<number>>();
	});

	it("should reject functions returning non-numeric results", async () => {
		expectTypeOf<(a: number, b: number) => boolean>().not.toExtend<Comparator<number>>();
	});

});

describe("by()", () => {

	it("should return a comparator over the selected values", async () => {
		expectTypeOf(by((value: { name: string }) => value.name)).toEqualTypeOf<Comparator<{ name: string }>>();
	});

	it("should require a key comparator matching the selected key", async () => {
		expectTypeOf(by<{ age: number }, number>).parameter(1).toEqualTypeOf<Comparator<number> | undefined>();
	});

});

describe("locale()", () => {

	it("should return a comparator over nullable strings", async () => {
		expectTypeOf(locale()).toEqualTypeOf<Comparator<Nullable<string>>>();
	});

});

describe("reverse()", () => {

	it("should return a comparator over the values of the reversed comparator", async () => {
		expectTypeOf(reverse(ascending<number>)).toEqualTypeOf<Comparator<number>>();
	});

});

describe("absent()", () => {

	it("should return a comparator over nullable values", async () => {
		expectTypeOf(absent<Nullable<number>>(ascending)).toEqualTypeOf<Comparator<Nullable<number>>>();
	});

});

describe("present()", () => {

	it("should return a comparator over nullable values", async () => {
		expectTypeOf(present<Nullable<number>>(ascending)).toEqualTypeOf<Comparator<Nullable<number>>>();
	});

});

describe("compound()", () => {

	it("should return a comparator over the values of the combined comparators", async () => {
		expectTypeOf(compound(ascending<number>, descending<number>)).toEqualTypeOf<Comparator<number>>();
	});

});
