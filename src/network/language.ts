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
 * Language tags and ranges.
 *
 * Provides branded types and utilities for working with BCP 47 language tags ({@link Tag}) and RFC 4647 language
 * ranges ({@link TagRange}). Use {@link asTag} and {@link asTagRange} to create validated instances, {@link isTag} and
 * {@link isTagRange} as type guards, and {@link matchTag} to test tags against range patterns.
 *
 * **Language Tags**
 *
 * ```typescript
 * import { isTag, asTag } from "@metreeca/core/language";
 *
 * if (isTag(value)) {
 *   // value is typed as Tag
 * }
 *
 * const languageTag = asTag("en-US");      // US English
 * const simpleTag = asTag("fr");           // French
 * const complexTag = asTag("zh-Hans-CN");  // Simplified Chinese (China)
 * ```
 *
 * **Language Ranges**
 *
 * ```typescript
 * import { isTagRange, asTagRange } from "@metreeca/core/language";
 *
 * if (isTagRange(value)) {
 *   // value is typed as TagRange
 * }
 *
 * const wildcard = asTagRange("*");       // matches any language
 * const english = asTagRange("en-*");     // matches any English variant
 * const swiss = asTagRange("*-CH");       // matches any language in Switzerland
 * ```
 *
 * **Matching**
 *
 * ```typescript
 * import { matchTag, asTag, asTagRange } from "@metreeca/core/language";
 *
 * matchTag(asTag("de-CH"), asTagRange("de-*"));  // true - Swiss German matches German range
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */


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
 * Regular expression for matching BCP 47 extended language ranges.
 *
 * Matches strings following the extended language range syntax defined in RFC 4647 § 2.2.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */
const TagRangePattern = /^(?:[a-z]{1,8}|\*)(?:-(?:[a-z0-9]{1,8}|\*))*$/i;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Language tag as defined by BCP 47/RFC 5646.
 *
 * A language tag identifies a natural language (e.g., "en" for English, "fr-CA" for Canadian French)
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
 * > using {@link isTag} or {@link asTag}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes ISO 639-2 Language Codes}
 */
export type Tag = string

/**
 * Language range as defined by BCP 47/RFC 4647.
 *
 * A language range is used to match language tags for content negotiation and filtering.
 * An extended language range allows `*` (asterisk) as a wildcard for any subtag
 * (e.g., `en-*`, `*-CH`, `de-*-DE`), or as a standalone `*` to match any language tag.
 *
 * **Grammar**
 *
 * Matches extended language range pattern per BCP 47/RFC 4647 § 2.2:
 *
 * ```
 * extended-language-range = (1*8ALPHA / "*") *("-" (1*8alphanum / "*"))
 * ```
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isTagRange} or {@link asTagRange}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 * @see {@link Tag}
 */
export type TagRange = string


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid language tag.
 *
 * Validates language tags according to BCP 47/RFC 5646.
 *
 * @param value The value to validate as a language tag
 *
 * @returns `true` if the value is a non-empty string matching the BCP 47 pattern; `false` otherwise
 *
 * @see {@link Tag}
 */
export function isTag(value: unknown): value is Tag {
	return isString(value) && value.length > 0 && TagPattern.test(value);
}

/**
 * Checks if a value is a valid language range.
 *
 * Validates extended language ranges according to RFC 4647 § 2.2.
 * An extended language range allows `*` as a wildcard for any subtag (e.g., `en-*`, `*-CH`).
 *
 * @param value The value to validate as a language range
 *
 * @returns `true` if the value matches the extended language range pattern; `false` otherwise
 *
 * @see {@link TagRange}
 */
export function isTagRange(value: unknown): value is TagRange {
	return isString(value) && value.length > 0 && TagRangePattern.test(value);
}


/**
 * Creates a validated language tag from a string.
 *
 * Validates language tags according to BCP 47/RFC 5646.
 *
 * @param value The value to convert to a language tag
 *
 * @returns The validated language tag
 *
 * @throws TypeError If the value is not a string
 * @throws RangeError If the value is not a valid BCP 47 language tag
 *
 * @see {@link isTag} for validation rules
 * @see {@link Tag}
 * @see {@link TagRange}
 */
export function asTag(value: string): Tag {

	if ( !isString(value) ) {
		throw new TypeError("expected string");
	}

	if ( !isTag(value) ) {
		throw new RangeError(`invalid language tag <${value}>`);
	}

	return value;
}

/**
 * Creates a validated language range from a string.
 *
 * Validates extended language ranges according to RFC 4647 § 2.2.
 * An extended language range allows `*` as a wildcard for any subtag (e.g., `en-*`, `*-CH`).
 *
 * @param value The value to convert to a language range
 *
 * @returns The validated language range
 *
 * @throws TypeError If the value is not a string
 * @throws RangeError If the value is not a valid language range
 *
 * @see {@link isTagRange} for validation rules
 * @see {@link Tag}
 * @see {@link TagRange}
 */
export function asTagRange(value: string): TagRange {

	if ( !isString(value) ) {
		throw new TypeError("expected string");
	}

	if ( !isTagRange(value) ) {
		throw new RangeError(`invalid language range <${value}>`);
	}

	return value;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a language tag matches a language range.
 *
 * Implements Extended Filtering per RFC 4647 § 3.3.2. Matching is case-insensitive and compares subtags sequentially:
 *
 * - Wildcard `*` in range matches any subtag sequence
 * - Singleton subtags (single character) in tag block further matching
 * - Range subtags must appear in order, but tag may have additional subtags between matches
 *
 * @param tag The language tag to test
 * @param range The language range to match against
 *
 * @returns `true` if the tag matches the range pattern; `false` otherwise
 *
 * @example
 *
 * ```typescript
 * import { matchTag, asTag, asTagRange } from "@metreeca/core/language";
 *
 * matchTag(asTag("de-DE"), asTagRange("de-*-DE"));        // true
 * matchTag(asTag("de-Latn-DE"), asTagRange("de-*-DE"));   // true
 * matchTag(asTag("de"), asTagRange("de-*-DE"));           // false - missing 'DE'
 * matchTag(asTag("de-x-DE"), asTagRange("de-*-DE"));      // false - singleton 'x' blocks
 * ```
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html#section-3.3.2 RFC 4647 § 3.3.2 - Extended Filtering}
 * @see {@link Tag}
 * @see {@link TagRange}
 */
export function matchTag(tag: string | Tag, range: string | TagRange): boolean {

	const tagSubtags = asTag(tag).toLowerCase().split("-");
	const rangeSubtags = asTagRange(range).toLowerCase().split("-");

	const [firstTag, ...restTag] = tagSubtags;
	const [firstRange, ...restRange] = rangeSubtags;

	// first subtags must match (unless range starts with wildcard)

	const firstMatch = firstRange === "*" || firstRange === firstTag;

	// filter out wildcards and match required range subtags against tag subtags

	const requiredSubtags = restRange.filter(s => s !== "*");

	const { matched } = requiredSubtags.reduce(
		(state, target) => state.matched ? matchSubtag(state.remaining, target) : state,
		{ matched: firstMatch, remaining: restTag }
	);

	return matched;


	function matchSubtag(subtags: string[], target: string): { matched: boolean; remaining: string[] } {

		const targetIndex = subtags.findIndex(s => s === target);

		// singleton (single char) before target blocks matching per RFC 4647

		const blockedBySingleton = targetIndex > 0
			&& subtags.slice(0, targetIndex).some(s => s.length === 1);

		const found = targetIndex !== -1 && !blockedBySingleton;

		return found
			? { matched: true, remaining: subtags.slice(targetIndex+1) }
			: { matched: false, remaining: [] };

	}

}
