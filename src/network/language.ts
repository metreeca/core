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

/**
 * Language tags and ranges.
 *
 * Provides branded types and utilities for working with BCP 47 language tags ({@link Tag}) and RFC 4647 language
 * ranges ({@link Range}). Use {@link tag} and {@link range} to create validated instances, {@link isTag} and
 * {@link isRange} as type guards, and {@link matches} to test tags against range patterns.
 *
 * **Language Tags**
 *
 * ```typescript
 * import { isTag, tag } from "@metreeca/core";
 *
 * if (isTag(value)) {
 *   // value is typed as Tag
 * }
 *
 * const languageTag = tag("en-US");      // US English
 * const simpleTag = tag("fr");           // French
 * const complexTag = tag("zh-Hans-CN");  // Simplified Chinese (China)
 * ```
 *
 * **Language Ranges**
 *
 * ```typescript
 * import { isRange, range } from "@metreeca/core";
 *
 * if (isRange(value)) {
 *   // value is typed as Range
 * }
 *
 * const wildcard = range("*");       // matches any language
 * const english = range("en-*");     // matches any English variant
 * const swiss = range("*-CH");       // matches any language in Switzerland
 * ```
 *
 * **Matching**
 *
 * ```typescript
 * import { matches, tag, range } from "@metreeca/core";
 *
 * matches(tag("de-CH"), range("de-*"));  // true - Swiss German matches German range
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */

import { isString } from "../basic/json.js";


/**
 * Matches BCP 47 language tag pattern per RFC 5646 § 2.1.
 *
 * ```
 * Language-Tag = langtag / privateuse / grandfathered
 * langtag = language ["-" script] ["-" region] *("-" variant) *("-" extension) ["-" privateuse]
 * ```
 *
 * @remarks
 *
 * Grandfathered tags are omitted from this regex for simplicity.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 */
const RFC5646Pattern = (() => {

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
 * Matches BCP 47 extended language range pattern per RFC 4647 § 2.2.
 *
 * ```
 * extended-language-range = (1*8ALPHA / "*") *("-" (1*8alphanum / "*"))
 * ```
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */
const RFC4647Pattern = /^(?:[a-z]{1,8}|\*)(?:-(?:[a-z0-9]{1,8}|\*))*$/i;


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
 * @remarks
 *
 * This opaque type ensures that only validated BCP 47 language tags can be used where a language tag is expected,
 * preventing raw strings from being passed directly without validation.
 *
 * The brand is a compile-time construct with no runtime overhead.
 *
 * Use {@link tag} to construct validated language tags or {@link isTag} as a type guard.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes ISO 639-2 Language Codes}
 */
export type Tag = string & {

	readonly __brand: unique symbol

}

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
 * @remarks
 *
 * This opaque type ensures that only validated BCP 47 language ranges can be used where a range is expected,
 * preventing raw strings from being passed directly without validation.
 *
 * The brand is a compile-time construct with no runtime overhead.
 *
 * Use {@link range} to construct validated language ranges or {@link isRange} as a type guard.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 * @see {@link Tag}
 */
export type Range = string & {

	readonly __brand: unique symbol

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid language tag.
 *
 * Validates language tags according to BCP 47/RFC 5646.
 *
 * @param value The value to validate as a language tag
 *
 * @returns `true` if the value is a non-empty string matching the BCP 47 pattern
 *
 * @see {@link Tag}
 */
export function isTag(value: unknown): value is Tag {
	return isString(value) && value.length > 0 && RFC5646Pattern.test(value);
}

/**
 * Creates a validated language tag from a string.
 *
 * Validates language tags according to BCP 47/RFC 5646.
 *
 * @param value The string to convert to a language tag
 *
 * @returns The validated language tag
 *
 * @throws RangeError If the value is not a valid BCP 47 language tag
 *
 * @see {@link isTag} for validation rules
 * @see {@link Tag}
 */
export function tag(value: string): Tag {

	if ( !isTag(value) ) {
		throw new RangeError(`invalid language tag <${value}>`);
	}

	return value;
}


/**
 * Checks if a value is a valid language range.
 *
 * Validates extended language ranges according to RFC 4647 § 2.2.
 * An extended language range allows `*` as a wildcard for any subtag (e.g., `en-*`, `*-CH`).
 *
 * @param value The value to validate as a language range
 *
 * @returns `true` if the value matches the extended language range pattern
 *
 * @see {@link Range}
 */
export function isRange(value: unknown): value is Range {
	return isString(value) && value.length > 0 && RFC4647Pattern.test(value);
}

/**
 * Creates a validated language range from a string.
 *
 * Validates extended language ranges according to RFC 4647 § 2.2.
 * An extended language range allows `*` as a wildcard for any subtag (e.g., `en-*`, `*-CH`).
 *
 * @param value The string to convert to a language range
 *
 * @returns The validated language range
 *
 * @throws RangeError If the value is not a valid language range
 *
 * @see {@link isRange} for validation rules
 * @see {@link Range}
 */
export function range(value: string): Range {

	if ( !isRange(value) ) {
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
 * @returns `true` if the tag matches the range pattern
 *
 * @example
 *
 * ```typescript
 * import { matches, tag, range } from "@metreeca/core";
 *
 * matches(tag("de-DE"), range("de-*-DE"));        // true
 * matches(tag("de-Latn-DE"), range("de-*-DE"));   // true
 * matches(tag("de"), range("de-*-DE"));           // false - missing 'DE'
 * matches(tag("de-x-DE"), range("de-*-DE"));      // false - singleton 'x' blocks
 * ```
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html#section-3.3.2 RFC 4647 § 3.3.2 - Extended Filtering}
 * @see {@link Tag}
 * @see {@link Range}
 */
export function matches(tag: Tag, range: Range): boolean {

	const tagSubtags = tag.toLowerCase().split("-");
	const rangeSubtags = range.toLowerCase().split("-");

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
			? { matched: true, remaining: subtags.slice(targetIndex + 1) }
			: { matched: false, remaining: [] };

	}

}
