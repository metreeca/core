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

/**
 * BCP 47 language tags and RFC 4647 basic language ranges.
 *
 * Provides types and utilities for working with BCP 47 language tags ({@link Tag}) and RFC 4647 basic language
 * ranges ({@link TagRange}). Use {@link isTag} and {@link isTagRange} as type guards, and {@link matchTag} to test tags
 * against range patterns.
 *
 * **Language Tags**
 *
 * ```typescript
 * import { isTag } from "@metreeca/core/language";
 *
 * if (isTag(value)) {
 *   // value is typed as Tag
 * }
 * ```
 *
 * **Basic Language Ranges**
 *
 * ```typescript
 * import { isTagRange } from "@metreeca/core/language";
 *
 * if (isTagRange(value)) {
 *   // value is typed as TagRange
 * }
 * ```
 *
 * **Matching**
 *
 * ```typescript
 * import { matchTag } from "@metreeca/core/language";
 *
 * matchTag("de-CH", "de");  // true - Swiss German matches German range
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */


import { assert } from "../common/report.js";
import { isString } from "../index.js";


/**
 * Regular expression for matching BCP 47 language tags.
 *
 * Matches strings following the language tag syntax defined in RFC 5646 § 2.1, excluding grandfathered tags.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 */
const TagPattern = (() => {

	const language = "(?:[a-z]{2,3}(?:-[a-z]{3}){0,3}|[a-z]{4}|[a-z]{5,8})"; // 2-3 + extlang / 4 / 5-8 letters
	const script = "(?:-[a-z]{4})?"; // optional 4-letter script
	const region = "(?:-(?:[a-z]{2}|[0-9]{3}))?"; // optional 2-letter or 3-digit region
	const variant = "(?:-(?:[a-z0-9]{5,8}|[0-9][a-z0-9]{3}))*"; // zero or more variants
	const extension = "(?:-[0-9a-wy-z](?:-[a-z0-9]{2,8})+)*"; // zero or more extensions
	const privateUse = "(?:-x(?:-[a-z0-9]{1,8})+)?"; // optional private use
	const privateOnly = "x(?:-[a-z0-9]{1,8})+"; // standalone private use tag
	const langtag = `${language}${script}${region}${variant}${extension}${privateUse}`;

	return new RegExp(`^(?:${langtag}|${privateOnly})$`, "i");

})();

/**
 * Regular expression for matching RFC 4647 basic language ranges.
 *
 * Matches strings following the basic language range syntax defined in RFC 4647 § 2.1: a sequence of subtags or the
 * standalone `*` wildcard.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */
const TagRangePattern = /^(?:[a-z]{1,8}(?:-[a-z0-9]{1,8})*|\*)$/i;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Language tag as defined by BCP 47/RFC 5646 § 2.1.
 *
 * A language tag identifies a natural language (e.g., `en` for English, `fr-CA` for Canadian French)
 * and consists of subtags for language, script, region, variant, and extension components.
 *
 * **Grammar**
 *
 * Matches BCP 47 language tag pattern per RFC 5646 § 2.1:
 *
 * ```
 * Language-Tag = langtag / privateuse / grandfathered
 * langtag = language ["-" script] ["-" region] *("-" variant) *("-" extension) ["-" privateuse]
 * ```
 *
 * Grandfathered tags are omitted from validation for simplicity.
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isTag}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes ISO 639-2 Language Codes}
 */
export type Tag = string

/**
 * Basic language range as defined by RFC 4647 § 2.1.
 *
 * A language range matches language tags for content negotiation and filtering. A basic language range is
 * either a sequence of subtags (e.g., `en`, `en-US`, `zh-Hans-CN`), or the standalone `*` wildcard matching
 * any language tag.
 *
 * **Grammar**
 *
 * Matches the basic language range pattern per RFC 4647 § 2.1:
 *
 * ```
 * language-range = (1*8ALPHA *("-" 1*8alphanum)) / "*"
 * ```
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isTagRange}.
 *
 * > [!IMPORTANT]
 * > Extended language ranges with interior or trailing `*` (e.g., `de-*`, `*-CH`) are not valid: under
 * > RFC 4647 basic filtering they carry no extra matching power over their basic prefix.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 * @see {@link Tag}
 */
export type TagRange = string


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid language tag.
 *
 * Validates language tags according to BCP 47/RFC 5646 § 2.1.
 * A language tag is a sequence of subtags identifying a natural language (e.g., `en`, `fr-CA`, `zh-Hans-CN`).
 *
 * @param value The value to validate as a language tag
 *
 * @returns `true` if the value matches the language tag pattern; `false` otherwise
 *
 * @see {@link Tag}
 */
export function isTag(value: unknown): value is Tag {
	return isString(value) && value.length > 0 && TagPattern.test(value);
}

/**
 * Checks if a value is a valid basic language range.
 *
 * Validates basic language ranges according to RFC 4647 § 2.1.
 * A basic language range is a sequence of subtags (e.g., `en`, `en-US`) or the standalone `*` wildcard.
 *
 * @param value The value to validate as a basic language range
 *
 * @returns `true` if the value matches the basic language range pattern; `false` otherwise
 *
 * @see {@link TagRange}
 */
export function isTagRange(value: unknown): value is TagRange {
	return isString(value) && value.length > 0 && TagRangePattern.test(value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a language tag matches a basic language range.
 *
 * Implements Basic Filtering per RFC 4647 § 3.3.1. Matching is case-insensitive:
 *
 * - The standalone `*` range matches any language tag
 * - Otherwise the range matches if it equals the tag, or equals a prefix of the tag ending at a subtag
 *   boundary (the tag character following the prefix is `-`)
 *
 * @param tag The language tag to test
 * @param range The basic language range to match against
 *
 * @returns `true` if the tag matches the range pattern; `false` otherwise
 *
 * @throws TypeError If `tag` is not a valid language tag or `range` is not a valid basic language range
 *
 * @example
 *
 * ```typescript
 * import { matchTag } from "@metreeca/core/language";
 *
 * matchTag("de-CH", "de");      // true  - de-CH has subtag prefix de
 * matchTag("de-CH", "de-CH");   // true  - exact match
 * matchTag("de", "de-CH");      // false - range is longer than tag
 * matchTag("deu", "de");        // false - de is not a subtag prefix of deu
 * matchTag("en-US", "*");       // true  - wildcard matches any tag
 * ```
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html#section-3.3.1 RFC 4647 § 3.3.1 - Basic Filtering}
 * @see {@link Tag}
 * @see {@link TagRange}
 */
export function matchTag(tag: Tag, range: TagRange): boolean {

	const $tag = assert(tag, isTag).toLowerCase();
	const $range = assert(range, isTagRange).toLowerCase();

	// basic filtering: the '*' wildcard matches any tag; otherwise the range must equal the tag or a
	// subtag prefix of it (the character following the prefix in the tag is "-")

	return $range === "*" || $tag === $range || $tag.startsWith(`${$range}-`);

}
