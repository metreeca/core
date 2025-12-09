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
import { isTagRange, isTag, matchTag, asTagRange, asTag } from "./language.js";


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
			expect(() => asTag(value)).not.toThrow();
			const result = asTag(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid language tags", () => {
		tags.invalid.forEach(({ value }) => {
			expect(() => asTag(value)).toThrow(RangeError);
		});
	});

	it("should throw RangeError with descriptive message", () => {
		expect(() => asTag("invalid tag")).toThrow("invalid language tag <invalid tag>");
	});

});


describe("isRange()", () => {

	it("should return true for valid language ranges", () => {
		ranges.valid.forEach(value => {
			expect(isTagRange(value)).toBe(true);
		});
	});

	it("should return false for invalid language ranges", () => {
		ranges.invalid.forEach(({ value }) => {
			expect(isTagRange(value)).toBe(false);
		});
	});

	it("should return false for non-string values", () => {
		expect(isTagRange(null)).toBe(false);
		expect(isTagRange(undefined)).toBe(false);
		expect(isTagRange(123)).toBe(false);
		expect(isTagRange({})).toBe(false);
		expect(isTagRange([])).toBe(false);
	});

});

describe("range()", () => {

	it("should create branded language ranges from valid strings", () => {
		ranges.valid.forEach(value => {
			expect(() => asTagRange(value)).not.toThrow();
			const result = asTagRange(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid language ranges", () => {
		ranges.invalid.forEach(({ value }) => {
			expect(() => asTagRange(value)).toThrow(RangeError);
		});
	});

	it("should throw RangeError with descriptive message", () => {
		expect(() => asTagRange("invalid range")).toThrow("invalid language range <invalid range>");
	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("matches()", () => {

	// RFC 4647 § 3.3.2 Extended Filtering test cases

	describe("wildcard range", () => {

		it("should match any non-empty tag with '*' range", async () => {
			expect(matchTag(asTag("en"), asTagRange("*"))).toBe(true);
			expect(matchTag(asTag("en-US"), asTagRange("*"))).toBe(true);
			expect(matchTag(asTag("zh-Hans-CN"), asTagRange("*"))).toBe(true);
		});

	});

	describe("basic matching", () => {

		it("should match exact tags", async () => {
			expect(matchTag(asTag("en"), asTagRange("en"))).toBe(true);
			expect(matchTag(asTag("de"), asTagRange("de"))).toBe(true);
			expect(matchTag(asTag("zh-Hans"), asTagRange("zh-Hans"))).toBe(true);
		});

		it("should match tags with additional subtags", async () => {
			expect(matchTag(asTag("en-US"), asTagRange("en"))).toBe(true);
			expect(matchTag(asTag("en-GB"), asTagRange("en"))).toBe(true);
			expect(matchTag(asTag("zh-Hans-CN"), asTagRange("zh"))).toBe(true);
			expect(matchTag(asTag("zh-Hans-CN"), asTagRange("zh-Hans"))).toBe(true);
		});

		it("should not match when first subtags differ", async () => {
			expect(matchTag(asTag("en"), asTagRange("de"))).toBe(false);
			expect(matchTag(asTag("fr"), asTagRange("en"))).toBe(false);
		});

		it("should not match when tag has fewer subtags than range", async () => {
			expect(matchTag(asTag("en"), asTagRange("en-US"))).toBe(false);
			expect(matchTag(asTag("zh"), asTagRange("zh-Hans"))).toBe(false);
		});

	});

	describe("case insensitivity", () => {

		it("should match case-insensitively", async () => {
			expect(matchTag(asTag("en-US"), asTagRange("EN-us"))).toBe(true);
			expect(matchTag(asTag("EN-US"), asTagRange("en-us"))).toBe(true);
			expect(matchTag(asTag("zh-Hans"), asTagRange("ZH-HANS"))).toBe(true);
		});

	});

	describe("extended filtering with wildcards", () => {

		// RFC 4647 § 3.3.2 example: "de-*-DE"

		it("should match tags per RFC 4647 de-*-DE example", async () => {
			const r = asTagRange("de-*-DE");

			expect(matchTag(asTag("de-DE"), r)).toBe(true);
			expect(matchTag(asTag("de-Latn-DE"), r)).toBe(true);
			expect(matchTag(asTag("de-Latf-DE"), r)).toBe(true);
			expect(matchTag(asTag("de-DE-x-goethe"), r)).toBe(true);
			expect(matchTag(asTag("de-Latn-DE-1996"), r)).toBe(true);
			expect(matchTag(asTag("de-Deva-DE"), r)).toBe(true);
		});

		it("should not match non-conforming tags per RFC 4647 de-*-DE example", async () => {
			const r = asTagRange("de-*-DE");

			expect(matchTag(asTag("de"), r)).toBe(false);           // missing 'DE'
			expect(matchTag(asTag("de-x-DE"), r)).toBe(false);      // singleton 'x' blocks
			expect(matchTag(asTag("de-Deva"), r)).toBe(false);      // 'Deva' != 'DE'
		});

		it("should handle wildcards in different positions", async () => {
			expect(matchTag(asTag("en-US"), asTagRange("*-US"))).toBe(true);
			expect(matchTag(asTag("de-CH"), asTagRange("*-CH"))).toBe(true);
			expect(matchTag(asTag("fr-Latn-CH"), asTagRange("*-CH"))).toBe(true);
		});

		it("should handle multiple wildcards", async () => {
			expect(matchTag(asTag("en-Latn-US"), asTagRange("*-*-US"))).toBe(true);
			expect(matchTag(asTag("de-Latn-DE-1996"), asTagRange("de-*-*"))).toBe(true);
		});

	});

	describe("singleton blocking", () => {

		it("should fail match when singleton subtag blocks required match", async () => {
			// per RFC 4647: singleton (single letter/digit including 'x') blocks further matching
			expect(matchTag(asTag("de-x-DE"), asTagRange("de-*-DE"))).toBe(false);
			expect(matchTag(asTag("en-a-value-US"), asTagRange("en-*-US"))).toBe(false);
		});

		it("should allow singleton after all range subtags matched", async () => {
			// singleton in tag is fine if all range subtags already matched
			expect(matchTag(asTag("de-DE-x-goethe"), asTagRange("de-*-DE"))).toBe(true);
			expect(matchTag(asTag("en-US-x-private"), asTagRange("en-US"))).toBe(true);
		});

	});

});
