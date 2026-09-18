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
 * **Language Tags**
 *
 * Confirm that a value carries a well-formed language tag before handing it to an API that expects one:
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
 * Confirm in the same way that a value carries a well-formed basic language range, wildcard included:
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
 * Select the content whose language answers a request, testing a tag against the ranges a client accepts:
 *
 * ```typescript
 * import { matchTag } from "@metreeca/core/language";
 *
 * matchTag("de-CH", "de");  // true - Swiss German matches German range
 * ```
 *
 * **Naming**
 *
 * Present a tag to readers as the name of the language it identifies, in a language they understand:
 *
 * ```typescript
 * import { nameTag } from "@metreeca/core/language";
 *
 * nameTag("zh-Hans");        // "Simplified Chinese" - named in English by default
 * nameTag("zh-Hans", "it");  // "cinese semplificato" - named in Italian
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */

import { assert, isString } from "../index.js";


/**
 * Regular expression matching BCP 47 language tags.
 *
 * Recognises the language tag syntax defined in RFC 5646 § 2.1, excluding grandfathered tags, whatever the case of its
 * subtags. The pattern is anchored, matching a whole tag and nothing less; carrying no flags, it keeps no state
 * between tests and may be shared freely.
 *
 * Reach for it wherever a language tag is to be recognised by a regular expression rather than by a call, as in a
 * form control or a schema; {@link isTag} validates values in code.
 *
 * @remarks
 *
 * Case tolerance is built into the expression itself rather than left to an `i` flag, so that its `source` carries the
 * whole grammar wherever flags aren't available.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc5646.html RFC 5646 - Tags for Identifying Languages}
 */
export const TagPattern = (() => {

	const language = "(?:[a-zA-Z]{2,3}(?:-[a-zA-Z]{3}){0,3}|[a-zA-Z]{4}|[a-zA-Z]{5,8})"; // 2-3 + extlang / 4 / 5-8
	const script = "(?:-[a-zA-Z]{4})?"; // optional 4-letter script
	const region = "(?:-(?:[a-zA-Z]{2}|[0-9]{3}))?"; // optional 2-letter or 3-digit region
	const variant = "(?:-(?:[a-zA-Z0-9]{5,8}|[0-9][a-zA-Z0-9]{3}))*"; // zero or more variants
	const extension = "(?:-[0-9a-wA-Wy-zY-Z](?:-[a-zA-Z0-9]{2,8})+)*"; // zero or more extensions
	const privateUse = "(?:-[xX](?:-[a-zA-Z0-9]{1,8})+)?"; // optional private use
	const privateOnly = "[xX](?:-[a-zA-Z0-9]{1,8})+"; // standalone private use tag
	const langtag = `${language}${script}${region}${variant}${extension}${privateUse}`;

	return new RegExp(`^(?:${langtag}|${privateOnly})$`);

})();

/**
 * Regular expression matching RFC 4647 basic language ranges.
 *
 * Recognises the basic language range syntax defined in RFC 4647 § 2.1, whatever the case of its subtags: a sequence
 * of subtags or the standalone `*` wildcard. The pattern is anchored, matching a whole range and nothing less;
 * carrying no flags, it keeps no state between tests and may be shared freely.
 *
 * Reach for it wherever a language range is to be recognised by a regular expression rather than by a call, as in a
 * form control or a schema; {@link isTagRange} validates values in code.
 *
 * @remarks
 *
 * Case tolerance is built into the expression itself rather than left to an `i` flag, so that its `source` carries the
 * whole grammar wherever flags aren't available.
 *
 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 - Tags for Identifying Languages}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4647.html RFC 4647 - Matching of Language Tags}
 */
export const TagRangePattern = /^(?:[a-zA-Z]{1,8}(?:-[a-zA-Z0-9]{1,8})*|\*)$/;


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
 * Validates language tags according to BCP 47/RFC 5646 § 2.1, excluding grandfathered tags. A language tag is a
 * sequence of subtags identifying a natural language, for example `en`, `fr-CA` or `zh-Hans-CN`; case is not
 * significant, so `EN-us` is accepted alongside `en-US`.
 *
 * @param value The value to validate as a language tag
 *
 * @returns true if `value` is a well-formed language tag; false otherwise
 *
 * @see {@link Tag}
 */
export function isTag(value: unknown): value is Tag {
	return isString(value) && value.length > 0 && TagPattern.test(value);
}

/**
 * Checks if a value is a valid basic language range.
 *
 * Validates basic language ranges according to RFC 4647 § 2.1. A basic language range is a sequence of subtags, for
 * example `en` or `en-US`, or the standalone `*` wildcard; case is not significant, so `EN-US` is accepted alongside
 * `en-US`.
 *
 * @param value The value to validate as a basic language range
 *
 * @returns true if `value` is a well-formed basic language range; false otherwise
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
 * @throws {@link !TypeError TypeError} If `tag` is not a valid language tag or `range` is not a valid basic language
 *     range
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

/**
 * Names the language identified by a language tag.
 *
 * Every subtag a tag carries is taken into account: the name reflects the language, script, region and variant
 * subtags, while extension and private use subtags, which carry no name of their own, are ignored.
 *
 * > [!IMPORTANT]
 * > Names are supplied by the JavaScript runtime: availability and wording vary with the platform and with the
 * > language the name is given in. Names are intended for display and must not be relied on as stable values for
 * > comparison or storage.
 *
 * @param tag The language {@link Tag} identifying the language to be named
 * @param locale The language {@link Tag} identifying the language the name is to be given in; defaults to English; a
 * well-formed tag the runtime doesn't support is replaced by the runtime default language
 *
 * @returns The name of the language identified by `tag`, given in the language identified by `locale`, or `tag` as it
 * stands if either tag isn't well-formed or no name is available
 */
export function nameTag(tag: Tag, locale: Tag = "en"): string {

	try {

		return new Intl.DisplayNames([locale], { type: "language" }).of(new Intl.Locale(tag).baseName) || tag;

	} catch {

		return tag;

	}

}
