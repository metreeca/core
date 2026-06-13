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
import { isTag, isTagRange, matchTag } from "./language.js";


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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("matches()", () => {

	// RFC 4647 § 3.3.2 Extended Filtering test cases

	describe("wildcard range", () => {

		it("should match any non-empty tag with '*' range", async () => {
			expect(matchTag("en", "*")).toBe(true);
			expect(matchTag("en-US", "*")).toBe(true);
			expect(matchTag("zh-Hans-CN", "*")).toBe(true);
		});

	});

	describe("basic matching", () => {

		it("should match exact tags", async () => {
			expect(matchTag("en", "en")).toBe(true);
			expect(matchTag("de", "de")).toBe(true);
			expect(matchTag("zh-Hans", "zh-Hans")).toBe(true);
		});

		it("should match tags with additional subtags", async () => {
			expect(matchTag("en-US", "en")).toBe(true);
			expect(matchTag("en-GB", "en")).toBe(true);
			expect(matchTag("zh-Hans-CN", "zh")).toBe(true);
			expect(matchTag("zh-Hans-CN", "zh-Hans")).toBe(true);
		});

		it("should not match when first subtags differ", async () => {
			expect(matchTag("en", "de")).toBe(false);
			expect(matchTag("fr", "en")).toBe(false);
		});

		it("should not match when tag has fewer subtags than range", async () => {
			expect(matchTag("en", "en-US")).toBe(false);
			expect(matchTag("zh", "zh-Hans")).toBe(false);
		});

	});

	describe("case insensitivity", () => {

		it("should match case-insensitively", async () => {
			expect(matchTag("en-US", "EN-us")).toBe(true);
			expect(matchTag("EN-US", "en-us")).toBe(true);
			expect(matchTag("zh-Hans", "ZH-HANS")).toBe(true);
		});

	});

	describe("extended filtering with wildcards", () => {

		// RFC 4647 § 3.3.2 example: "de-*-DE"

		it("should match tags per RFC 4647 de-*-DE example", async () => {
			const r = "de-*-DE";

			expect(matchTag("de-DE", r)).toBe(true);
			expect(matchTag("de-Latn-DE", r)).toBe(true);
			expect(matchTag("de-Latf-DE", r)).toBe(true);
			expect(matchTag("de-DE-x-goethe", r)).toBe(true);
			expect(matchTag("de-Latn-DE-1996", r)).toBe(true);
			expect(matchTag("de-Deva-DE", r)).toBe(true);
		});

		it("should not match non-conforming tags per RFC 4647 de-*-DE example", async () => {
			const r = "de-*-DE";

			expect(matchTag("de", r)).toBe(false);           // missing 'DE'
			expect(matchTag("de-x-DE", r)).toBe(false);      // singleton 'x' blocks
			expect(matchTag("de-Deva", r)).toBe(false);      // 'Deva' != 'DE'
		});

		it("should handle wildcards in different positions", async () => {
			expect(matchTag("en-US", "*-US")).toBe(true);
			expect(matchTag("de-CH", "*-CH")).toBe(true);
			expect(matchTag("fr-Latn-CH", "*-CH")).toBe(true);
		});

		it("should handle multiple wildcards", async () => {
			expect(matchTag("en-Latn-US", "*-*-US")).toBe(true);
			expect(matchTag("de-Latn-DE-1996", "de-*-*")).toBe(true);
		});

	});

	describe("singleton blocking", () => {

		it("should fail match when singleton subtag blocks required match", async () => {
			// per RFC 4647: singleton (single letter/digit including 'x') blocks further matching
			expect(matchTag("de-x-DE", "de-*-DE")).toBe(false);
			expect(matchTag("en-a-value-US", "en-*-US")).toBe(false);
		});

		it("should allow singleton after all range subtags matched", async () => {
			// singleton in tag is fine if all range subtags already matched
			expect(matchTag("de-DE-x-goethe", "de-*-DE")).toBe(true);
			expect(matchTag("en-US-x-private", "en-US")).toBe(true);
		});

	});

});
