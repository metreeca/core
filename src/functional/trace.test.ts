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

import { isArray, isNumber, isString, key } from "../index.js";
import { describe, expect, it } from "vitest";
import {
	test,
	all,
	any,
	array,
	domain,
	entry,
	fail,
	pattern,
	gt,
	gte,
	integer,
	keys,
	length,
	lt,
	lte,
	normalised,
	nullable,
	object,
	one,
	optional,
	pass,
	required,
	size,
	TraceError,
	type,
	values
} from "./trace.js";


// a single violation, whose exact wording is an implementation detail

const message = [expect.any(String)];

// two violations reported against the same position

const messages = [expect.any(String), expect.any(String)];


describe("TraceError", () => {

	it("extends RangeError", async () => {

		expect(new TraceError("invalid value", ["{size} out of range"])).toBeInstanceOf(RangeError);

	});

	it("exposes the fault as cause", async () => {

		const fault = ["{size} out of range"];

		expect(new TraceError("invalid value", fault).cause).toBe(fault);

	});

	it("includes the pretty-printed fault in the message", async () => {

		expect(new TraceError("invalid value", ["{size} out of range"]).message).toContain("out of range");

	});

});

describe("literal validators", () => {

	describe("integer", () => {

		it("accepts integral values", async () => {

			expect(integer()(42)).toBeUndefined();
			expect(integer()(-1)).toBeUndefined();
			expect(integer()(0)).toBeUndefined();

		});

		it("reports a fractional part", async () => {

			expect(integer()(1.5)).toEqual(message);

		});

	});

	describe("length", () => {

		it("accepts values within the inclusive bounds", async () => {

			expect(length(1, 3)("a")).toBeUndefined();
			expect(length(1, 3)("abc")).toBeUndefined();

		});

		it("reports a value shorter than the lower bound", async () => {

			expect(length(2, 3)("a")).toEqual(message);

		});

		it("reports a value longer than the upper bound", async () => {

			expect(length(1, 2)("abc")).toEqual(message);

		});

		it("leaves an undefined bound unconstrained", async () => {

			expect(length(undefined, 2)("")).toBeUndefined();
			expect(length(2, undefined)("abcdef")).toBeUndefined();
			expect(length(undefined, undefined)("")).toBeUndefined();

		});

	});

	describe("pattern", () => {

		it("accepts a matching value", async () => {

			expect(pattern(/^\d+$/u)("123")).toBeUndefined();

		});

		it("reads a string pattern as a regular expression source", async () => {

			expect(pattern("^\\d+$")("123")).toBeUndefined();
			expect(pattern("^\\d+$")("abc")).toEqual(message);

		});

		it("matches unanchored", async () => {

			expect(pattern(/\d/u)("abc1def")).toBeUndefined();

		});

		it("reports a non-matching value", async () => {

			expect(pattern(/^\d+$/u)("abc")).toEqual(message);

		});

		it("leaves an undefined pattern unconstrained", async () => {

			expect(pattern(undefined)("anything")).toBeUndefined();

		});

	});

	describe("normalised", () => {

		it("accepts normalised whitespace", async () => {

			expect(normalised()("well formed text")).toBeUndefined();

		});

		it("reports leading and trailing whitespace", async () => {

			expect(normalised()(" leading")).toEqual(message);
			expect(normalised()("trailing ")).toEqual(message);

		});

		it("reports repeated internal whitespace", async () => {

			expect(normalised()("two  spaces")).toEqual(message);

		});

		it("reports blank values as a consequence of the whitespace rules", async () => {

			expect(normalised()(" ")).toEqual(message);

		});

		it("reports newlines unless multiline", async () => {

			expect(normalised()("line\nbreak")).toEqual(message);

		});

		it("admits single and double newlines when multiline", async () => {

			expect(normalised(true)("line\nbreak")).toBeUndefined();
			expect(normalised(true)("paragraph\n\nbreak")).toBeUndefined();

		});

		it("reports more than two consecutive newlines when multiline", async () => {

			expect(normalised(true)("too\n\n\nmany")).toEqual(message);

		});

	});

	describe("gt", () => {

		it("compares numbers by magnitude", async () => {

			expect(gt(0)(1)).toBeUndefined();
			expect(gt(0)(0)).toEqual(message);
			expect(gt(0)(-1)).toEqual(message);

		});

		it("compares strings lexicographically", async () => {

			expect(gt("m")("z")).toBeUndefined();
			expect(gt("m")("a")).toEqual(message);

		});

		it("leaves an undefined limit unconstrained", async () => {

			expect(gt(undefined)(0)).toBeUndefined();

		});

	});

	describe("gte", () => {

		it("admits the limit itself", async () => {

			expect(gte(0)(0)).toBeUndefined();
			expect(gte(0)(-1)).toEqual(message);

		});

		it("leaves an undefined limit unconstrained", async () => {

			expect(gte(undefined)(-1)).toBeUndefined();

		});

	});

	describe("lt", () => {

		it("excludes the limit itself", async () => {

			expect(lt(10)(9)).toBeUndefined();
			expect(lt(10)(10)).toEqual(message);

		});

		it("leaves an undefined limit unconstrained", async () => {

			expect(lt(undefined)(10)).toBeUndefined();

		});

	});

	describe("lte", () => {

		it("admits the limit itself", async () => {

			expect(lte(10)(10)).toBeUndefined();
			expect(lte(10)(11)).toEqual(message);

		});

		it("leaves an undefined limit unconstrained", async () => {

			expect(lte(undefined)(11)).toBeUndefined();

		});

	});

	describe("domain", () => {

		it("accepts an admitted value", async () => {

			expect(domain(["draft", "final"])("draft")).toBeUndefined();

		});

		it("reports a value outside the domain", async () => {

			expect(domain(["draft", "final"])("review")).toEqual(message);

		});

		it("leaves an undefined domain unconstrained", async () => {

			expect(domain(undefined)(1)).toBeUndefined();

		});

	});

});

describe("structural validators", () => {

	describe("array", () => {

		it("accepts an array whose elements all pass", async () => {

			expect(array(length(1, 3))(["a", "ab"])).toBeUndefined();

		});

		it("keys element violations by position", async () => {

			expect(array(length(1, 3))(["ok", "far too long"])).toEqual([
				{ "1": message }
			]);

		});

		it("applies a tuple template positionally", async () => {

			expect(array([integer(), integer()])([1, 2])).toBeUndefined();
			expect(array([integer(), integer()])([1, 2.5])).toEqual([
				{ "1": message }
			]);

		});

		it("reports a tuple template length mismatch", async () => {

			expect(array([integer(), integer()])([1])).toEqual(message);

		});

		it("reports the whole-array violations ahead of the element reports", async () => {

			expect(array(length(1, 3), size(3, undefined))(["ok", "far too long"])).toEqual([
				expect.any(String),
				{ "1": message }
			]);

		});

		it("accepts every element when the element validator is omitted or disabled", async () => {

			expect(array(false)(["anything"])).toBeUndefined();
			expect(array(undefined)(["anything"])).toBeUndefined();

		});

		it("still applies the whole-array validator when the element validator is omitted or disabled", async () => {

			expect(array(false, size(1, undefined))([])).toEqual(message);
			expect(array(undefined, size(1, undefined))([])).toEqual(message);

		});

	});

	describe("object", () => {

		it("applies a record template by property name", async () => {

			expect(object({ label: length(1, 3) })({ label: "ab" })).toBeUndefined();
			expect(object({ label: length(1, 3) })({ label: "far too long" })).toEqual([
				{ label: message }
			]);

		});

		it("reports a property the template names but the record omits", async () => {

			expect(object({ label: required(type(isString, length(1, 3))) })({})).toEqual([
				{ label: message }
			]);

		});

		it("leaves an omitted optional property unconstrained", async () => {

			expect(object({ label: optional(type(isString, length(1, 3))) })({})).toBeUndefined();

		});

		it("rejects unnamed properties under a closed template", async () => {

			expect(object({ label: pass })({ label: "a", extra: "b" })).toEqual([
				{ extra: message }
			]);

		});

		it("admits unnamed properties under a wildcard entry", async () => {

			expect(object({ label: pass, [key]: pass })({ label: "a", extra: "b" })).toBeUndefined();

		});

		it("applies the wildcard validator to unnamed properties only", async () => {

			expect(object({ label: pass, [key]: length(1, 3) })({ label: "far too long", extra: "way too long" }))
				.toEqual([{ extra: message }]);

		});

		it("applies an entry validator to every property as a name/value pair", async () => {

			expect(object(entry([pattern(/^[^_]/u)]))({ _private: "a" })).toEqual([
				{ _private: message }
			]);

		});

		it("reports the whole-record violations ahead of the property reports", async () => {

			expect(object({ label: length(1, 3) }, size(2, undefined))({ label: "far too long" })).toEqual([
				expect.any(String),
				{ label: message }
			]);

		});

		it("still applies the whole-record validator when the entries validator is omitted or disabled", async () => {

			expect(object(false, size(1, undefined))({})).toEqual(message);
			expect(object(undefined, size(1, undefined))({})).toEqual(message);

		});

	});

	describe("entry", () => {

		it("keys the violations of both halves under the entry key", async () => {

			expect(entry([pattern(/^[^_]/u), length(1, 3)])(["_bad", "far too long"])).toEqual([
				{ _bad: messages }
			]);

		});

		it("collects a facet contributed by both halves", async () => {

			expect(entry([pattern(/^[^_]/u), pattern(/^\d+$/u)])(["_bad", "abc"])).toEqual([
				{ _bad: messages }
			]);

		});

		it("leaves an omitted or disabled half unconstrained", async () => {

			expect(entry([undefined, length(1, 3)])(["anything", "ab"])).toBeUndefined();
			expect(entry([pattern(/^\w+$/u)])(["name", "anything at all"])).toBeUndefined();

		});

	});

	describe("size", () => {

		it("counts array elements", async () => {

			expect(size(1, 2)(["a"])).toBeUndefined();
			expect(size(1, 2)([])).toEqual(message);
			expect(size(1, 2)(["a", "b", "c"])).toEqual(message);

		});

		it("counts object properties", async () => {

			expect(size(1, 2)({ a: 1 })).toBeUndefined();
			expect(size(1, 2)({})).toEqual(message);

		});

		it("leaves an undefined bound unconstrained", async () => {

			expect(size(undefined, undefined)([])).toBeUndefined();

		});

	});

	describe("keys", () => {

		it("checks object property names", async () => {

			expect(keys(["id"])({ id: 1 })).toBeUndefined();
			expect(keys(["id"])({ code: 1 })).toEqual([{ id: message }]);

		});

		it("checks array indices", async () => {

			expect(keys([1])(["a", "b"])).toBeUndefined();
			expect(keys([1])(["a"])).toEqual([{ "1": message }]);

		});

		it("reports one entry per missing key", async () => {

			expect(keys(["id", "code"])({})).toEqual([{ id: message, code: message }]);

		});

		it("leaves undefined keys unconstrained", async () => {

			expect(keys(undefined)({})).toBeUndefined();

		});

	});

	describe("values", () => {

		it("checks array elements", async () => {

			expect(values(["en"])(["en", "it"])).toBeUndefined();
			expect(values(["en"])(["it"])).toEqual(message);

		});

		it("checks object property values", async () => {

			expect(values(["en"])({ tag: "en" })).toBeUndefined();
			expect(values(["en"])({ tag: "it" })).toEqual(message);

		});

		it("lists every missing value in a single message", async () => {

			expect(values(["en", "it"])(["en"])).toEqual(message);

		});

		it("leaves undefined values unconstrained", async () => {

			expect(values(undefined)([])).toBeUndefined();

		});

	});

});

describe("custom validators", () => {

	describe("test", () => {

		it("accepts a value satisfying the predicate", async () => {

			expect(test((v: number) => v % 3 === 0 || ["expected a multiple of 3"])(9)).toBeUndefined();

		});

		it("reports a fixed message", async () => {

			expect(test((v: number) => v % 3 === 0 || ["expected a multiple of 3"])(4))
				.toEqual(["expected a multiple of 3"]);

		});

		it("reports a facet-keyed trace", async () => {

			expect(test((v: number) => v % 3 === 0 || [{ "{multiple}": ["expected a multiple of 3"] }])(4))
				.toEqual([{ "{multiple}": ["expected a multiple of 3"] }]);

		});

		it("computes the report from the rejected value", async () => {

			expect(test((v: number) => v % 3 === 0 || [`unexpected <${v}>`])(4)).toEqual(["unexpected <4>"]);

		});

		it("builds the report only when the value is rejected", async () => {

			let built = 0;

			test((v: number) => v % 3 === 0 || [`${++built}`])(9);

			expect(built).toBe(0);

		});

	});

	describe("pass", () => {

		it("accepts every value", async () => {

			expect(pass(undefined)).toBeUndefined();
			expect(pass("anything")).toBeUndefined();

		});

	});

	describe("fail", () => {

		it("rejects every value", async () => {

			expect(fail(["rejected"])("anything")).toEqual(["rejected"]);

		});

		it("computes the report from the rejected value", async () => {

			expect(fail((v: string) => [`unexpected <${v}>`])("x")).toEqual(["unexpected <x>"]);

		});

	});

});

describe("combinators", () => {

	describe("required", () => {

		it("delegates to the wrapped validator unchanged", async () => {

			expect(required(length(1, 3))("ab")).toBeUndefined();
			expect(required(length(1, 3))("far too long")).toEqual(message);

		});

		it("reports an absent value", async () => {

			expect(required(length(1, 3))(undefined)).toEqual(message);

		});

		it("reports an absent value even when the validator is omitted or disabled", async () => {

			expect(required(false)("anything")).toBeUndefined();
			expect(required(false)(undefined)).toEqual(message);

		});

	});

	describe("optional", () => {

		it("accepts absent values unconditionally", async () => {

			expect(optional(length(1, 3))(undefined)).toBeUndefined();

		});

		it("constrains present values", async () => {

			expect(optional(length(1, 3))("far too long")).toEqual(message);

		});

	});

	describe("nullable", () => {

		it("accepts null unconditionally", async () => {

			expect(nullable(length(1, 3))(null)).toBeUndefined();

		});

		it("constrains non-null values", async () => {

			expect(nullable(length(1, 3))("far too long")).toEqual(message);

		});

		it("tolerates both when wrapped in optional", async () => {

			expect(optional(nullable(length(1, 3)))(undefined)).toBeUndefined();
			expect(optional(nullable(length(1, 3)))(null)).toBeUndefined();

		});

	});

	describe("all", () => {

		it("passes when every validator passes", async () => {

			expect(all(integer(), gte(0))(1)).toBeUndefined();

		});

		it("accumulates the violations of every validator", async () => {

			expect(all(integer(), gte(0))(-1.5)).toEqual(messages);

		});

		it("collects the violations several validators report against the same facet", async () => {

			expect(all(length(1, 3), length(2, 4))("far too long")).toEqual(messages);

		});

		it("drops a violation reported more than once against the same facet", async () => {

			expect(all(length(1, 3), length(1, 3))("far too long")).toEqual(message);

		});

		it("accumulates a bare message beside a facet-prefixed one", async () => {

			expect(all(fail(["rejected"]), length(1, 3))("far too long")).toEqual([
				"rejected",
				expect.any(String)
			]);

		});

		it("collects several bare messages", async () => {

			expect(all(fail(["rejected"]), fail(["also rejected"]))("anything"))
				.toEqual(["rejected", "also rejected"]);

		});

		it("ignores omitted and disabled validators", async () => {

			expect(all(false && integer(), undefined, gte(0))(1.5)).toBeUndefined();

		});

	});

	describe("any", () => {

		it("passes when at least one validator passes", async () => {

			expect(any(length(3, 3), length(5, 5))("abc")).toBeUndefined();

		});

		it("reports a message when no alternative matches", async () => {

			expect(any(length(3, 3), length(5, 5))("abcd")).toEqual(message);

		});

		it("ignores omitted and disabled validators", async () => {

			expect(any(false && length(3, 3), length(5, 5))("abcde")).toBeUndefined();

		});

	});

	describe("one", () => {

		it("passes when exactly one validator passes", async () => {

			expect(one(pattern(/^\d+$/u), pattern(/^[a-z]+$/u))("123")).toBeUndefined();

		});

		it("reports a message when no alternative matches", async () => {

			expect(one(pattern(/^\d+$/u), pattern(/^[a-z]+$/u))("a1")).toEqual(message);

		});

		it("reports a message when several alternatives match", async () => {

			expect(one(length(1, 5), length(1, 10))("abc")).toEqual(message);

		});

		it("tells the two failure modes apart", async () => {

			expect(one(pattern(/^\d+$/u), pattern(/^[a-z]+$/u))("a1"))
				.not.toEqual(one(length(1, 5), length(1, 10))("abc"));

		});

	});

	describe("type", () => {

		it("applies the included validator to a matching value", async () => {

			expect(type(isString, length(1, 3))("ab")).toBeUndefined();
			expect(type(isString, length(1, 3))("far too long")).toEqual(message);

		});

		it("reports the excluded violation for a non-matching value", async () => {

			expect(type(isString, pass, fail(["expected a string"]))(42)).toEqual(["expected a string"]);

		});

		it("computes the excluded report from the rejected value", async () => {

			expect(type(isString, pass, fail(value => [`unexpected <${typeof value}>`]))(42))
				.toEqual(["unexpected <number>"]);

		});

		it("rejects a non-matching value when the excluded report is omitted", async () => {

			expect(type(isString, pass)(42)).toEqual(message);

		});

		it("names the expected type after the guard", async () => {

			expect(type(isString, pass)(42)).toEqual([expect.stringContaining("<string>")]);
			expect(type(isNumber, pass)("x")).toEqual([expect.stringContaining("<number>")]);

		});

		it("reports generically when the guard name states no type", async () => {

			expect(type((value: unknown): value is string => isString(value), pass)(42))
				.toEqual([expect.not.stringContaining("<")]);

		});

		it("narrows the value for the included branch", async () => {

			expect(type(isNumber, gte(0))(-1)).toEqual(message);

		});

		it("branches element-wise when wrapped in array", async () => {

			expect(array(type(isString, length(1, 3), fail(["expected a string"])))(["ab", 42])).toEqual([
				{ "1": ["expected a string"] }
			]);

		});

	});

});

describe("composition", () => {

	it("reports every violation across nesting levels at once", async () => {

		const validate = object({

			label: type(isString, all(length(1, 3), normalised())),
			tags: type(isArray, array(type(isString, length(1, 3), fail(["expected a string"])), size(0, 10))),

			[key]: pass

		});

		expect(validate({ label: "far too long", tags: ["ok", 42] })).toEqual([
			{
				label: message,
				tags: [{ "1": ["expected a string"] }]
			}
		]);

	});

});
