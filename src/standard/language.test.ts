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
import { isTag, isTagRange, matchTag, nameTag } from "./language.js";


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
		"zh-Hans-CN",
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
		{ value: "en-*", reason: "trailing wildcard (extended range)" },
		{ value: "*-CH", reason: "leading wildcard (extended range)" },
		{ value: "de-*-DE", reason: "interior wildcard (extended range)" },
		{ value: "*-*", reason: "wildcard subtags (extended range)" },
		{ value: "*-*-*", reason: "wildcard subtags (extended range)" },
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

describe("isTagRange()", () => {

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

describe("matchTag()", () => {

	// RFC 4647 § 3.3.1 Basic Filtering test cases

	describe("wildcard range", () => {

		it("should match any tag with '*' range", async () => {
			expect(matchTag("en", "*")).toBe(true);
			expect(matchTag("en-US", "*")).toBe(true);
			expect(matchTag("zh-Hans-CN", "*")).toBe(true);
		});

	});

	describe("exact match", () => {

		it("should match equal tags", async () => {
			expect(matchTag("en", "en")).toBe(true);
			expect(matchTag("de", "de")).toBe(true);
			expect(matchTag("zh-Hans", "zh-Hans")).toBe(true);
			expect(matchTag("en-US", "en-US")).toBe(true);
		});

	});

	describe("prefix match", () => {

		it("should match a range that is a subtag prefix of the tag", async () => {
			expect(matchTag("en-US", "en")).toBe(true);
			expect(matchTag("en-GB", "en")).toBe(true);
			expect(matchTag("zh-Hans-CN", "zh")).toBe(true);
			expect(matchTag("zh-Hans-CN", "zh-Hans")).toBe(true);
			expect(matchTag("en-US-x-private", "en-US")).toBe(true);
		});

	});

	describe("non-matching", () => {

		it("should not match when first subtags differ", async () => {
			expect(matchTag("en", "de")).toBe(false);
			expect(matchTag("fr", "en")).toBe(false);
		});

		it("should not match when the range is longer than the tag", async () => {
			expect(matchTag("en", "en-US")).toBe(false);
			expect(matchTag("zh", "zh-Hans")).toBe(false);
		});

		it("should not match a prefix that does not align to a subtag boundary", async () => {
			expect(matchTag("deu", "de")).toBe(false);
			expect(matchTag("eng", "en")).toBe(false);
		});

	});

	describe("case insensitivity", () => {

		it("should match case-insensitively", async () => {
			expect(matchTag("en-US", "EN-us")).toBe(true);
			expect(matchTag("EN-US", "en-us")).toBe(true);
			expect(matchTag("zh-Hans", "ZH-HANS")).toBe(true);
			expect(matchTag("DE-CH", "de")).toBe(true);
		});

	});

	describe("validation", () => {

		it("should throw for an invalid tag", async () => {
			expect(() => matchTag("en_US", "en")).toThrow();
		});

		it("should throw for an invalid range", async () => {
			expect(() => matchTag("de-CH", "de-*")).toThrow();
		});

		it("should throw for former extended-range matches", async () => {
			// ranges that matched under § 3.3.2 extended filtering are no longer valid ranges
			expect(() => matchTag("de-Latn-DE", "de-*-DE")).toThrow();
			expect(() => matchTag("en-US", "*-US")).toThrow();
			expect(() => matchTag("fr-Latn-CH", "*-CH")).toThrow();
		});

	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("nameTag()", () => {

	describe("language subtag", () => {

		it("should name a language identified by a 2-letter subtag", async () => {
			expect(nameTag("en")).toBe("English");
			expect(nameTag("fr")).toBe("French");
			expect(nameTag("de")).toBe("German");
		});

		it("should name a language identified by a 3-letter subtag", async () => {
			expect(nameTag("eng")).toBe("English");
			expect(nameTag("fra")).toBe("French");
		});

	});

	describe("script, region and variant subtags", () => {

		it("should qualify the name with the script subtag", async () => {
			expect(nameTag("zh-Hans")).toBe("Simplified Chinese");
			expect(nameTag("zh-Hant")).toBe("Traditional Chinese");
		});

		it("should qualify the name with the region subtag", async () => {
			expect(nameTag("en-US")).toBe("American English");
			expect(nameTag("en-GB")).toBe("British English");
			expect(nameTag("fr-CA")).toBe("Canadian French");
			expect(nameTag("es-419")).toBe("Latin American Spanish");
		});

		it("should qualify the name with the variant subtag", async () => {
			expect(nameTag("de-CH-1901")).toBe("Swiss High German (Traditional German orthography)");
		});

		it("should qualify the name with script and region subtags together", async () => {
			expect(nameTag("sr-Latn-RS")).toBe("Serbian (Latin, Serbia)");
			expect(nameTag("zh-Hans-CN")).toBe("Chinese (Simplified, China)");
		});

	});

	describe("locale-only subtags", () => {

		it("should leave private use subtags out of the name", async () => {
			expect(nameTag("en-US-x-private")).toBe("American English");
		});

		it("should leave extension subtags out of the name", async () => {
			expect(nameTag("en-u-ca-gregory")).toBe("English");
		});

	});

	describe("case insensitivity", () => {

		it("should name a language whatever the case of its subtags", async () => {
			expect(nameTag("EN-us")).toBe("American English");
			expect(nameTag("ZH-hans")).toBe("Simplified Chinese");
		});

	});

	describe("naming language", () => {

		it("should default to English", async () => {
			expect(nameTag("fr")).toBe(nameTag("fr", "en"));
		});

		it("should give the name in the requested language", async () => {
			expect(nameTag("fr", "it")).toBe("francese");
			expect(nameTag("zh-Hans", "it")).toBe("cinese semplificato");
			expect(nameTag("en-US", "fr")).toBe("anglais américain");
			expect(nameTag("de", "de")).toBe("Deutsch");
		});

		it("should fall back on the runtime default language if the requested one isn't supported", async () => {
			expect(nameTag("en", "zz")).toBe("English");
		});

	});

	describe("fallback", () => {

		it("should return a malformed tag as it stands", async () => {
			expect(nameTag("en_US")).toBe("en_US");
			expect(nameTag("")).toBe("");
			expect(nameTag("toolongprimary")).toBe("toolongprimary");
		});

		it("should return the tag as it stands if the naming language is malformed", async () => {
			expect(nameTag("fr", "it_IT")).toBe("fr");
			expect(nameTag("fr", "")).toBe("fr");
		});

		it("should return a tag it knows no name for as it stands", async () => {
			expect(nameTag("qaa")).toBe("qaa");
			expect(nameTag("zzz")).toBe("zzz");
		});

	});

});
