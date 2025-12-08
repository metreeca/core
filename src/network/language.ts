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
 * Provides types and functions for RFC 5646 language tags and RFC 4647 language ranges.
 *
 * **Language Tags**
 *
 * Type guards:
 *
 * ```typescript
 * import { isTag } from "@metreeca/core";
 *
 * const value = "en-US";
 *
 * if (isTag(value)) {
 *   // value is typed as Tag (BCP 47)
 * }
 * ```
 *
 * Creating language tags:
 *
 * ```typescript
 * import { tag } from "@metreeca/core";
 *
 * const languageTag = tag("en-US");      // US English
 * const simpleTag = tag("fr");           // French
 * const complexTag = tag("zh-Hans-CN");  // Simplified Chinese (China)
 * ```
 *
 * **Language Ranges**
 *
 * Type guards:
 *
 * ```typescript
 * import { isRange } from "@metreeca/core";
 *
 * const value = "en-*";
 *
 * if (isRange(value)) {
 *   // value is typed as Range (RFC 4647)
 * }
 * ```
 *
 * Creating language ranges:
 *
 * ```typescript
 * import { range } from "@metreeca/core";
 *
 * const wildcard = range("*");       // matches any language
 * const english = range("en-*");     // matches any English variant
 * const swiss = range("*-CH");       // matches any language in Switzerland
 * ```
 *
 * @module
 *
 * @see [RFC 5646 - Tags for Identifying Languages](https://www.rfc-editor.org/rfc/rfc5646.html)
 * @see [RFC 4647 - Matching of Language Tags](https://www.rfc-editor.org/rfc/rfc4647.html)
 */

import { isString } from "../common/json.js";


/**
 * Matches BCP 47 language tag pattern per RFC 5646 § 2.1
 *
 * Language-Tag = langtag / privateuse / grandfathered
 * langtag = language ["-" script] ["-" region] *("-" variant) *("-" extension) ["-" privateuse]
 *
 * @remarks
 *
 * Grandfathered tags are omitted from this regex for simplicity.
 *
 * @see [BCP 47 - Tags for Identifying Languages](https://www.rfc-editor.org/info/bcp47)
 * @see [RFC 5646 - Tags for Identifying Languages](https://www.rfc-editor.org/rfc/rfc5646.html)
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
 * Matches BCP 47 extended language range pattern per RFC 4647 § 2.2:
 *
 * extended-language-range = (1*8ALPHA / "*") *("-" (1*8alphanum / "*"))
 *
 * @see [BCP 47 - Tags for Identifying Languages](https://www.rfc-editor.org/info/bcp47)
 * @see [RFC 4647 - Matching of Language Tags](https://www.rfc-editor.org/rfc/rfc4647.html)
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
 * @see [RFC 5646 - Tags for Identifying Languages](https://www.rfc-editor.org/rfc/rfc5646.html)
 * @see [ISO 639-2 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes)
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
 * @see [RFC 4647 - Matching of Language Tags](https://www.rfc-editor.org/rfc/rfc4647.html)
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
 * @param value Value to validate as a language tag
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
 * @param value String to convert to a language tag
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
 * @param value Value to validate as a language range
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
 * @param value String to convert to a language range
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
