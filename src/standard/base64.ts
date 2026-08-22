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
 * RFC 4648 base64 encoders and decoders
  *
 * Provides a symmetric encoder/decoder pair ({@link encodeBase64}, {@link decodeBase64}) for carrying arbitrary
 * Unicode text as base64, either in the standard alphabet of RFC 4648 § 4 or in the URL-safe variant of RFC 4648 § 5.
 * Wraps the standard {@link https://developer.mozilla.org/docs/Web/API/Window/btoa `btoa`} /
 * {@link https://developer.mozilla.org/docs/Web/API/Window/atob `atob`} primitives, addressing two limitations that
 * make them unsuitable on their own for Unicode and URL-bound text:
 *
 * - `btoa` / `atob` accept only binary (Latin-1) strings and throw on any code point above `0xFF`. The codec routes
 *   input through {@link https://developer.mozilla.org/docs/Web/API/TextEncoder `TextEncoder`} /
 *   {@link https://developer.mozilla.org/docs/Web/API/TextDecoder `TextDecoder`} to convert between JavaScript strings
 *   and UTF-8 byte sequences before delegating to the standard primitives, making multi-byte characters such as
 *   `"日"` transparently encodable.
 *
 * - The standard base64 alphabet uses `+`, `/`, and `=`, all of which carry special meaning in URLs and
 *   `application/x-www-form-urlencoded` payloads (`+` is interpreted as space, `/` as a path separator, `=` as the
 *   key/value separator). {@link encodeBase64} accordingly takes a `url` flag selecting the URL-safe variant of
 *   RFC 4648 § 5, which maps `+` / `/` to `-` / `_` and strips the trailing `=` padding. {@link decodeBase64} needs no
 *   such flag: it accepts either alphabet, padded or unpadded.
 *
 * **Usage**
 *
 * ```typescript
 * import { encodeBase64, decodeBase64 } from "@metreeca/core/base64";
 *
 * encodeBase64("hello");       // "aGVsbG8=" — standard alphabet, `=` padding retained
 * encodeBase64(">>>");         // "Pj4+"     — standard `+` retained
 * encodeBase64("???");         // "Pz8/"     — standard `/` retained
 * encodeBase64("日");           // "5pel"     — multi-byte UTF-8
 *
 * encodeBase64("hello", true); // "aGVsbG8"  — URL-safe: trailing `=` padding stripped
 * encodeBase64(">>>", true);   // "Pj4-"     — URL-safe: `+` remapped to `-`
 * encodeBase64("???", true);   // "Pz8_"     — URL-safe: `/` remapped to `_`
 *
 * decodeBase64("aGVsbG8");     // "hello"    — unpadded input accepted
 * decodeBase64("aGVsbG8=");    // "hello"    — padded input accepted
 * decodeBase64("Pj4+");        // ">>>"      — standard alphabet accepted
 * decodeBase64("Pj4-");        // ">>>"      — URL-safe alphabet accepted
 * ```
 *
 * > [!NOTE]
 * > A native path via `Uint8Array.prototype.toBase64({ alphabet, omitPadding })` and
 * > `Uint8Array.fromBase64(..., { alphabet })` covers this use case in one step and has been
 * > {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64 Baseline}
 * > across evergreen browsers since September 2025 (Chrome 140, Firefox 133, Safari 18.2). On Node.js, however,
 * > V8 still gates it behind the experimental `--js-base-64` flag. This module will switch to the native path once
 * > Node exposes it unflagged; until then, it keeps delegating to `btoa` / `atob` for portable server-side support.
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648 RFC 4648 - The Base16, Base32, and Base64 Data Encodings}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648#section-4 RFC 4648 § 4 - Base 64 Encoding}
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648#section-5 RFC 4648 § 5 - Base 64 Encoding with URL and Filename Safe Alphabet}
 */

/**
 * Encodes a string to base64.
 *
 * Converts the input to UTF-8 bytes and encodes them in the standard alphabet of RFC 4648 § 4, retaining the trailing
 * `=` padding, or in the URL-safe variant of RFC 4648 § 5, substituting `+` / `/` with `-` / `_` and stripping the
 * trailing `=` padding.
 *
 * > [!WARNING]
 * > Text carrying isolated UTF-16 surrogates doesn't survive the round trip: UTF-8 conversion replaces each one with
 * > `U+FFFD` REPLACEMENT CHARACTER, so decoding the result returns a string that differs from `plain`. Test the input
 * > with {@link strings!isWellFormed} or sanitise it with {@link strings!toWellFormed} where the distinction matters.
 *
 * @param plain The string to encode
 * @param url Whether to encode using the URL-safe alphabet of RFC 4648 § 5 rather than the standard alphabet of
 *     RFC 4648 § 4; defaults to `false`
 *
 * @returns The base64 representation of `plain` in the selected alphabet, with every isolated surrogate encoded as
 *     `U+FFFD`
 *
 * @see {@link decodeBase64}
 */
export function encodeBase64(plain: string, url = false): string {

	const bytes = new TextEncoder().encode(plain);

	// build the binary string one byte at a time to avoid the argument-count
	// limit that `String.fromCharCode(...bytes)` hits on large inputs

	const binary = Array.from(bytes, b => String.fromCharCode(b)).join("");
	const base64 = btoa(binary);

	if (url) {

		return base64
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

	} else {

		return base64;

	}

}

/**
 * Decodes a base64 string.
 *
 * Accepts input in either the standard alphabet of RFC 4648 § 4 or the URL-safe variant of RFC 4648 § 5, padded or
 * unpadded, restoring `+` / `/` in place of `-` / `_` and reattaching any missing `=` padding before decoding the
 * underlying bytes as UTF-8.
 *
 * > [!WARNING]
 * > Bytes that don't spell valid UTF-8 are not rejected: decoding replaces each malformed sequence with `U+FFFD`
 * > REPLACEMENT CHARACTER, so a truncated or corrupted payload yields text rather than an error.
 *
 * @param encoded The base64-encoded string, in either alphabet, padded or unpadded
 *
 * @returns The decoded UTF-8 string, with every malformed byte sequence replaced by `U+FFFD`
 *
 * @throws InvalidCharacterError If `encoded` contains characters outside the standard and URL-safe base64 alphabets
 *
 * @see {@link encodeBase64}
 */
export function decodeBase64(encoded: string): string {

	const base64 = encoded
		.replace(/-/g, "+")
		.replace(/_/g, "/");

	const padding = (4-base64.length%4)%4;
	const padded = padding > 0 ? base64+"=".repeat(padding) : base64;
	const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

	return new TextDecoder().decode(bytes);

}
