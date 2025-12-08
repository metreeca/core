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
import { isRange, isTag, matches, range, tag } from "./language.js";


const tags = {
	valid: [
		"en",
		"fr",
		"de",
		"eng",
		"fra",
		"zh-Hans",
		"zh-Hant",
		"en-US",
		"en-GB",
		"fr-CA",
		"es-419",
		"sr-Latn-RS",
		"zh-Hans-CN",
		"en-US-x-private"
	],
	invalid: [
		{ value: "", reason: "empty string" },
		{ value: "e", reason: "single character" },
		{ value: "toolongprimary", reason: "primary subtag > 8 chars" },
		{ value: "en_US", reason: "underscore separator" },
		{ value: "en US", reason: "space separator" },
		{ value: "en-", reason: "trailing hyphen" },
		{ value: "-en", reason: "leading hyphen" },
		{ value: "en--US", reason: "double hyphen" },
		{ value: "123", reason: "numeric only primary" },
		{ value: "en-123456789", reason: "variant > 8 chars" },
		{ value: "http://example.com", reason: "contains invalid chars" }
	]
};

const ranges = {
	valid: [
		"*",
		"en",
		"en-US",
		"en-*",
		"*-CH",
		"de-*-DE",
		"zh-Hans-CN",
		"*-*",
		"*-*-*",
		"a",
		"abcdefgh",
		"en-12345678"
	],
	invalid: [
		{ value: "", reason: "empty string" },
		{ value: "-", reason: "hyphen only" },
		{ value: "-en", reason: "leading hyphen" },
		{ value: "en-", reason: "trailing hyphen" },
		{ value: "en--US", reason: "double hyphen" },
		{ value: "toolongsub", reason: "subtag > 8 chars" },
		{ value: "en-123456789", reason: "subtag > 8 chars" },
		{ value: "en_US", reason: "underscore separator" },
		{ value: "en US", reason: "space separator" }
	]
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("isTag()", () => {

	it("should return true for valid language tags", () => {
		tags.valid.forEach(value => {
			expect(isTag(value)).toBe(true);
		});
	});

	it("should return false for invalid language tags", () => {
		tags.invalid.forEach(({ value }) => {
			expect(isTag(value)).toBe(false);
		});
	});

	it("should return false for non-string values", () => {
		expect(isTag(null)).toBe(false);
		expect(isTag(undefined)).toBe(false);
		expect(isTag(123)).toBe(false);
		expect(isTag({})).toBe(false);
		expect(isTag([])).toBe(false);
	});

});

describe("tag()", () => {

	it("should create branded laguage tags from valid strings", () => {
		tags.valid.forEach(value => {
			expect(() => tag(value)).not.toThrow();
			const result = tag(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid language tags", () => {
		tags.invalid.forEach(({ value }) => {
			expect(() => tag(value)).toThrow(RangeError);
		});
	});

	it("should throw RangeError with descriptive message", () => {
		expect(() => tag("invalid tag")).toThrow("invalid language tag <invalid tag>");
	});

});


describe("isRange()", () => {

	it("should return true for valid language ranges", () => {
		ranges.valid.forEach(value => {
			expect(isRange(value)).toBe(true);
		});
	});

	it("should return false for invalid language ranges", () => {
		ranges.invalid.forEach(({ value }) => {
			expect(isRange(value)).toBe(false);
		});
	});

	it("should return false for non-string values", () => {
		expect(isRange(null)).toBe(false);
		expect(isRange(undefined)).toBe(false);
		expect(isRange(123)).toBe(false);
		expect(isRange({})).toBe(false);
		expect(isRange([])).toBe(false);
	});

});

describe("range()", () => {

	it("should create branded language ranges from valid strings", () => {
		ranges.valid.forEach(value => {
			expect(() => range(value)).not.toThrow();
			const result = range(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid language ranges", () => {
		ranges.invalid.forEach(({ value }) => {
			expect(() => range(value)).toThrow(RangeError);
		});
	});

	it("should throw RangeError with descriptive message", () => {
		expect(() => range("invalid range")).toThrow("invalid language range <invalid range>");
	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("matches()", () => {

	// RFC 4647 § 3.3.2 Extended Filtering test cases

	describe("wildcard range", () => {

		it("should match any non-empty tag with '*' range", async () => {
			expect(matches(tag("en"), range("*"))).toBe(true);
			expect(matches(tag("en-US"), range("*"))).toBe(true);
			expect(matches(tag("zh-Hans-CN"), range("*"))).toBe(true);
		});

	});

	describe("basic matching", () => {

		it("should match exact tags", async () => {
			expect(matches(tag("en"), range("en"))).toBe(true);
			expect(matches(tag("de"), range("de"))).toBe(true);
			expect(matches(tag("zh-Hans"), range("zh-Hans"))).toBe(true);
		});

		it("should match tags with additional subtags", async () => {
			expect(matches(tag("en-US"), range("en"))).toBe(true);
			expect(matches(tag("en-GB"), range("en"))).toBe(true);
			expect(matches(tag("zh-Hans-CN"), range("zh"))).toBe(true);
			expect(matches(tag("zh-Hans-CN"), range("zh-Hans"))).toBe(true);
		});

		it("should not match when first subtags differ", async () => {
			expect(matches(tag("en"), range("de"))).toBe(false);
			expect(matches(tag("fr"), range("en"))).toBe(false);
		});

		it("should not match when tag has fewer subtags than range", async () => {
			expect(matches(tag("en"), range("en-US"))).toBe(false);
			expect(matches(tag("zh"), range("zh-Hans"))).toBe(false);
		});

	});

	describe("case insensitivity", () => {

		it("should match case-insensitively", async () => {
			expect(matches(tag("en-US"), range("EN-us"))).toBe(true);
			expect(matches(tag("EN-US"), range("en-us"))).toBe(true);
			expect(matches(tag("zh-Hans"), range("ZH-HANS"))).toBe(true);
		});

	});

	describe("extended filtering with wildcards", () => {

		// RFC 4647 § 3.3.2 example: "de-*-DE"

		it("should match tags per RFC 4647 de-*-DE example", async () => {
			const r = range("de-*-DE");

			expect(matches(tag("de-DE"), r)).toBe(true);
			expect(matches(tag("de-Latn-DE"), r)).toBe(true);
			expect(matches(tag("de-Latf-DE"), r)).toBe(true);
			expect(matches(tag("de-DE-x-goethe"), r)).toBe(true);
			expect(matches(tag("de-Latn-DE-1996"), r)).toBe(true);
			expect(matches(tag("de-Deva-DE"), r)).toBe(true);
		});

		it("should not match non-conforming tags per RFC 4647 de-*-DE example", async () => {
			const r = range("de-*-DE");

			expect(matches(tag("de"), r)).toBe(false);           // missing 'DE'
			expect(matches(tag("de-x-DE"), r)).toBe(false);      // singleton 'x' blocks
			expect(matches(tag("de-Deva"), r)).toBe(false);      // 'Deva' != 'DE'
		});

		it("should handle wildcards in different positions", async () => {
			expect(matches(tag("en-US"), range("*-US"))).toBe(true);
			expect(matches(tag("de-CH"), range("*-CH"))).toBe(true);
			expect(matches(tag("fr-Latn-CH"), range("*-CH"))).toBe(true);
		});

		it("should handle multiple wildcards", async () => {
			expect(matches(tag("en-Latn-US"), range("*-*-US"))).toBe(true);
			expect(matches(tag("de-Latn-DE-1996"), range("de-*-*"))).toBe(true);
		});

	});

	describe("singleton blocking", () => {

		it("should fail match when singleton subtag blocks required match", async () => {
			// per RFC 4647: singleton (single letter/digit including 'x') blocks further matching
			expect(matches(tag("de-x-DE"), range("de-*-DE"))).toBe(false);
			expect(matches(tag("en-a-value-US"), range("en-*-US"))).toBe(false);
		});

		it("should allow singleton after all range subtags matched", async () => {
			// singleton in tag is fine if all range subtags already matched
			expect(matches(tag("de-DE-x-goethe"), range("de-*-DE"))).toBe(true);
			expect(matches(tag("en-US-x-private"), range("en-US"))).toBe(true);
		});

	});

});
