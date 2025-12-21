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
 * Resource identifiers and HTTP utilities.
 *
 * Provides types and functions for resource identifiers (URI/IRI), namespace factories,
 * HTTP error handling, and fetch operations.
 *
 * **Type Guards**
 *
 * ```typescript
 * import { isURI, isIRI } from "@metreeca/core";
 *
 * const value = "http://example.org/resource";
 *
 * if (isURI(value)) {
 *   // value is typed as URI (ASCII-only)
 * }
 *
 * if (isIRI(value)) {
 *   // value is typed as IRI (allows Unicode)
 * }
 * ```
 *
 * **Identifier Factories**
 *
 * ```typescript
 * import { asURI, asIRI } from "@metreeca/core";
 *
 * // Absolute identifiers
 *
 * const absoluteURI = asURI("http://example.org/resource");
 * const absoluteIRI = asIRI("http://example.org/resource");
 *
 * // Relative references
 *
 * const relativeURI = asURI("../resource", "relative");
 * const relativeIRI = asIRI("../resource", "relative");
 *
 * // Root-relative (internal) paths
 *
 * const internalURI = asURI("/resource", "internal");
 * const internalIRI = asIRI("/resource", "internal");
 *
 * // Unicode in IRIs (throws for URIs)
 *
 * const unicodeIRI = asIRI("http://example.org/资源");
 * ```
 *
 * **Reference Operations**
 *
 * ```typescript
 * import { resolve, relativize, internalize, asURI } from "@metreeca/core";
 *
 * const base = asURI("http://example.com/a/b/c");
 *
 * // Resolve relative references against base
 *
 * resolve(base, asURI("../d", "relative"));  // "http://example.com/a/d"
 * resolve(base, asURI("/d", "internal"));    // "http://example.com/d"
 *
 * // Convert absolute to root-relative (internal) path
 *
 * internalize(base, asURI("http://example.com/x/y"));  // "/x/y"
 *
 * // Convert absolute to relative path
 *
 * relativize(base, asURI("http://example.com/a/d"));   // "../d"
 * ```
 *
 * **Namespace Factories**
 *
 * ```typescript
 * import { createNamespace } from "@metreeca/core";
 *
 * // Closed namespace with predefined terms
 *
 * const rdfs = createNamespace("http://www.w3.org/2000/01/rdf-schema#", [
 *   "label",
 *   "comment"
 * ]);
 *
 * rdfs();           // IRI: "http://www.w3.org/2000/01/rdf-schema#"
 * rdfs.label;        // IRI: "http://www.w3.org/2000/01/rdf-schema#label"
 * rdfs("comment");   // IRI: "http://www.w3.org/2000/01/rdf-schema#comment"
 * rdfs("seeAlso");   // Throws RangeError: unknown term
 *
 * // Open namespace for dynamic terms
 *
 * const ex = createNamespace("http://example.org/");
 *
 * ex();              // IRI: "http://example.org/"
 * ex("anything");    // IRI: "http://example.org/anything"
 * ```
 *
 * **HTTP Error Handling**
 *
 * ```typescript
 * import { Problem } from "@metreeca/core";
 *
 * const problem: Problem = {
 *   status: 404,
 *   title: "Not Found",
 *   detail: "Resource /api/users/123 does not exist",
 *   instance: "/api/users/123",
 *   report: { timestamp: "2025-12-02T10:30:00Z" }
 * };
 * ```
 *
 * **Fetch Utilities**
 *
 * ```typescript
 * import { createFetch } from "@metreeca/core";
 *
 * const guard = createFetch(fetch);
 *
 * try {
 *   const response = await guard("https://api.example.com/data");
 *   // response.ok is guaranteed true
 * } catch (problem) {
 *   // problem is a Problem with parsed error details
 *   console.error(problem.status, problem.detail, problem.report);
 * }
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986 - Uniform Resource Identifiers (URIs)}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html RFC 3987 - Internationalized Resource Identifiers (IRIs)}
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7807 RFC 7807 - Problem Details for HTTP APIs}
 */

import { isString, type Value } from "../basic/json.js";
import { immutable } from "../basic/nested.js";
import { error } from "../basic/error.js";


/**
 * Matches scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
 */
const SchemePattern = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Excluded characters per RFC 3987 § 2.2: control chars, whitespace, special chars
 */
const ExcludedPattern = /[\x00-\x1F\x7F-\x9F\s<>"{}|\\^`]/;

/**
 * ASCII-only pattern for URI validation per RFC 3986 (characters U+0000-U+007F)
 */
const ASCIIPattern = /^[\x00-\x7F]*$/;


/**
 * Validates and normalizes a reference.
 *
 * Performs syntax validation (string type, excluded characters), path normalization
 * per RFC 3986 § 5.2.4 (Remove Dot Segments), and variant-specific validation.
 *
 * @param value The value to validate and normalize
 * @param variant The identifier variant
 *
 * @returns The validated and normalized reference, or `undefined` if invalid
 */
function normalize<T extends URI | IRI>(value: unknown, variant: Variant): T | undefined {

	// syntax validation

	const validSyntax = isString(value) && !ExcludedPattern.test(value);
	const hasScheme = validSyntax && SchemePattern.test(value);

	// path normalization (URL API silently clips excessive `..` at root)

	const normalized = !validSyntax ? undefined
		: hasScheme ? parseURL(value, url => url.href)
			: value.startsWith("/") ? parseURL(value, url => url.pathname+url.search+url.hash, "x:/")
				: value; // relative paths: keep `.` and `..` for later resolution

	if ( normalized === undefined ) { return undefined; }

	// variant validation (hierarchy: hierarchical ⊂ absolute ⊂ internal ⊂ relative)

	const isHierarchical = hasScheme && normalized.startsWith(normalized.slice(0, normalized.indexOf(":")+1)+"//");
	const isAbsolute = hasScheme && normalized.indexOf(":") < normalized.length-1;
	const isInternal = isAbsolute || normalized.startsWith("/");

	const valid = variant === "hierarchical" && isHierarchical
		|| variant === "absolute" && isAbsolute
		|| variant === "internal" && isInternal
		|| variant === "relative";

	return valid ? normalized as T : undefined;


	function parseURL(ref: string, extract: (url: URL) => string, base?: string): string | undefined {
		try { return extract(new URL(ref, base)); } catch { return undefined; }
	}

}

/**
 * Resolves a reference against a base URL.
 *
 * Aligns with standard URL API semantics: excessive `..` segments that would
 * go above root are silently clipped rather than throwing errors.
 *
 * @param base The parsed base URL
 * @param reference The normalized reference string
 *
 * @returns The resolved URL
 */
function merge(base: URL, reference: string): URL {
	return new URL(reference, base);
}

/**
 * Throws a RangeError for an invalid reference.
 *
 * @param value The invalid value
 * @param variant The expected variant
 *
 * @returns Never (always throws)
 */
function invalid(value: unknown, variant: Variant): never {
	return error(new RangeError(`invalid ${variant} reference <${value}>`));
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Uniform Resource Identifier (URI) as defined by RFC 3986.
 *
 * A URI is a sequence of characters that identifies an abstract or physical resource using
 * only ASCII characters (U+0000-U+007F).
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isURI} or {@link asURI}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986 - URI Generic Syntax}
 */
export type URI = string

/**
 * Internationalized Resource Identifier (IRI) as defined by RFC 3987.
 *
 * An IRI is a sequence of characters that identifies an abstract or physical resource, allowing
 * Unicode characters beyond the ASCII subset permitted in URIs.
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isIRI} or {@link asIRI}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html#section-2.2 RFC 3987 § 2.2 - IRI Syntax}
 */
export type IRI = string


/**
 * Identifier variant per RFC 3986 §§ 4.2-4.3.
 *
 * - `"hierarchical"`: Absolute with authority (e.g., `http://example.org/path`) — can be used as resolution base
 * - `"absolute"`: Contains scheme (e.g., `http://example.org/path`, `urn:example:resource`)
 * - `"internal"`: Root-relative path starting with `/` (e.g., `/path`)
 * - `"relative"`: Reference without scheme (e.g., `../path`, `path`)
 *
 * @remarks
 *
 * - Variants form an inclusivity hierarchy: `hierarchical ⊂ absolute ⊂ internal ⊂ relative`
 * - The `"internal"` variant is project-specific, not formally defined in RFC 3986
 * - For opaque URIs (e.g., `urn:`, `mailto:`), reference operations adapt their behaviour:
 *   - {@link resolve}: Throws `RangeError` for relative references (no standard resolution)
 *   - {@link internalize}: Returns scheme-specific part if schemes match
 *   - {@link relativize}: Returns scheme-specific part if schemes match
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-4.2 RFC 3986 § 4.2 - Relative Reference}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-4.3 RFC 3986 § 4.3 - Absolute URI}
 * @see {@link https://www.rfc-editor.org/rfc/rfc6454#section-4 RFC 6454 § 4 - Origin of a URI}
 */
export type Variant =
	| "hierarchical"
	| "absolute"
	| "internal"
	| "relative"


/**
 * Factory function type for generating IRIs within a common namespace.
 *
 * A callable function that constructs IRIs by appending names to the namespace IRI.
 * When created via {@link createNamespace} with predefined terms, the function is augmented
 * with typed properties for direct access to known terms.
 *
 * The function signature accepts an optional name parameter and returns the constructed {@link IRI}.
 * If name is omitted, returns the namespace IRI itself.
 *
 * @see {@link createNamespace} for creating namespace factories with typed term properties
 */
export type Namespace =
	((name?: string) => IRI)

/**
 * Mapped type for namespace term properties.
 *
 * Creates an object type with IRI-valued properties for each term in the array.
 *
 * @typeParam T The readonly array type of term names
 */
export type Terms<T extends readonly string[]> = {

	[K in T[number]]: IRI

}


/**
 * Problem Details for HTTP APIs.
 *
 * Standardized format for machine-readable error information in HTTP responses, as defined by RFC 7807.
 * All fields are optional, allowing flexibility in error reporting. Use {@link detail} for human-readable
 * occurrence-specific information, and {@link report} for machine-readable data.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7807 RFC 7807 - Problem Details for HTTP APIs}
 */
export interface Problem {

	/**
	 * Short, human-readable summary of the problem type.
	 *
	 * Should be the same for all occurrences of this problem type (e.g., "Payment Required", "Not Found").
	 */
	readonly title?: string;

	/**
	 * URI reference identifying the problem type.
	 *
	 * @defaultValue "about:blank"
	 */
	readonly type?: string;

	/**
	 * URI reference identifying the specific occurrence of the problem.
	 */
	readonly instance?: string;

	/**
	 * HTTP status code generated by the origin server.
	 */
	readonly status?: number;

	/**
	 * Human-readable explanation specific to this occurrence of the problem.
	 */
	readonly detail?: string;

	/**
	 * Machine-readable error report (extension field).
	 */
	readonly report?: Value;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid URI.
 *
 * Validates URIs according to RFC 3986, restricting identifiers to ASCII characters only.
 *
 * @param value The value to validate as a URI
 * @param variant The identifier variant to validate against (default: `"absolute"`)
 *
 * @returns `true` if the value is a valid ASCII-only URI matching the specified variant
 *
 * @see {@link URI}
 * @see {@link Variant}
 */
export function isURI(value: unknown, variant: Variant = "absolute"): value is URI {

	return isString(value) && ASCIIPattern.test(value) && normalize(value, variant) !== undefined;

}

/**
 * Creates a validated URI from a string.
 *
 * Validates URIs according to RFC 3986, restricting identifiers to ASCII characters only.
 * For non-absolute variants, normalizes paths by removing `.` segments and resolving `..` segments.
 *
 * @param value The string to convert to a URI
 * @param variant The identifier variant to validate against (default: `"absolute"`)
 *
 * @returns The validated and normalized URI
 *
 * @throws RangeError If the value is not a valid ASCII-only URI for the specified variant,
 *   or if `..` segments would climb above the root
 *
 * @see {@link isURI} for validation rules
 * @see {@link URI}
 * @see {@link Variant}
 */
export function asURI(value: string, variant: Variant = "absolute"): URI {

	return (ASCIIPattern.test(value) ? normalize(value, variant) : undefined) ?? invalid(value, variant);

}


/**
 * Checks if a value is a valid IRI.
 *
 * Validates IRIs according to RFC 3987 with variant-specific rules:
 *
 * - `"hierarchical"`: Absolute with authority (`scheme://...`) — can be used as resolution base
 * - `"absolute"`: Hierarchical or opaque (`scheme:...`)
 * - `"internal"`: Root-relative (`/...`) or absolute
 * - `"relative"`: Any well-formed reference
 *
 * For non-absolute variants, rejects paths where `..` segments would climb above the root.
 *
 * **Excluded characters** (per RFC 3987 § 2.2): Control characters (U+0000-U+001F, U+007F-U+009F),
 * whitespace, and `< > " { } | \ ^ `` ` (backtick)
 *
 * @param value The value to validate as an IRI
 * @param variant The identifier variant to validate against (default: `"absolute"`)
 *
 * @returns `true` if the value is a string conforming to IRI syntax rules for the specified variant
 *
 * @remarks
 *
 * This function serves as a type guard, narrowing the type from `string` to {@link IRI}
 * when used in conditional checks.
 *
 * @see {@link IRI}
 * @see {@link Variant}
 */
export function isIRI(value: unknown, variant: Variant = "absolute"): value is IRI {

	return normalize(value, variant) !== undefined;

}

/**
 * Creates a validated IRI from a string.
 *
 * For non-absolute variants, normalizes paths by removing `.` segments and resolving `..` segments.
 *
 * @param value The string to convert to an IRI
 * @param variant The identifier variant to validate against (default: `"absolute"`)
 *
 * @returns The validated and normalized IRI
 *
 * @throws RangeError If the value is not a valid IRI for the specified variant,
 *   or if `..` segments would climb above the root
 *
 * @see {@link isIRI} for validation rules
 * @see {@link Variant}
 */
export function asIRI(value: string, variant: Variant = "absolute"): IRI {

	return normalize(value, variant) ?? invalid(value, variant);

}


/**
 * Resolves a reference against a base identifier.
 *
 * - **Hierarchical identifiers**: Implements RFC 3986 § 5 reference resolution, combining `base` and `reference`
 *   to produce an absolute identifier
 * - **Opaque identifiers** (e.g., `urn:`, `mailto:`): Absolute references are returned unchanged; relative
 *   references cannot be resolved and throw an error
 *
 * @remarks
 *
 * While RFC 3986 § 5 defines a path-merging algorithm that technically applies to all URI schemes, opaque identifiers
 * lack a hierarchical authority component, making relative resolution semantically undefined in practice. The WHATWG
 * URL Standard follows RFC 6454, which assigns opaque origins (serialized as the string `"null"`) to such URIs,
 * explicitly preventing same-origin comparisons and relative resolution.
 *
 * This implementation aligns with WHATWG/URL API behavior by rejecting relative references against opaque bases,
 * providing clearer error semantics than the underlying URL API.
 *
 * @typeParam T The identifier type ({@link URI} or {@link IRI})
 *
 * @param base The absolute base identifier to resolve against
 * @param reference The reference to resolve
 *
 * @returns The resolved absolute identifier
 *
 * @throws RangeError If the resolved path contains tree-climbing segments that would go above the root,
 *   or if a relative reference cannot be resolved against an opaque base
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-5 RFC 3986 § 5 - Reference Resolution}
 * @see {@link https://www.rfc-editor.org/rfc/rfc6454#section-4 RFC 6454 § 4 - Origin of a URI}
 * @see {@link https://url.spec.whatwg.org/#origin WHATWG URL Standard - Origin}
 */
export function resolve<T extends URI | IRI>(base: string|T, reference: string|T): T {

	const normalizedBase = normalize<T>(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize<T>(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);

	// opaque base URI: URL API can't resolve relative references

	return baseURL.origin === "null" && !SchemePattern.test(normalizedReference)
		? error(new RangeError(`cannot resolve <${normalizedReference}> against opaque <${normalizedBase}>`))
		: merge(baseURL, normalizedReference).href as T;

}

/**
 * Extracts a root-relative reference.
 *
 * - **Hierarchical identifiers**: Returns the root-relative path (starting with `/`) if scheme and authority match
 * - **Opaque identifiers**: Returns the scheme-specific part if schemes match
 *
 * @typeParam T The identifier type ({@link URI} or {@link IRI})
 *
 * @param base The absolute base identifier providing the scheme and authority context
 * @param reference The reference to internalize
 *
 * @returns A root-relative reference if same origin, or the normalized absolute reference otherwise
 *
 * @throws RangeError If the resolved path contains tree-climbing segments that would go above the root
 */
export function internalize<T extends URI | IRI>(base: string|T, reference: string|T): T {

	const normalizedBase = normalize<T>(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize<T>(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);
	const referenceURL = merge(baseURL, normalizedReference);

	// for opaque URIs (origin === "null"), compare protocols instead

	const sameOrigin = baseURL.origin !== "null"
		? baseURL.origin === referenceURL.origin
		: baseURL.protocol === referenceURL.protocol;

	return (sameOrigin

			// same origin: return root-relative path (already normalized by URL API)

			? referenceURL.pathname+referenceURL.search+referenceURL.hash

			// different origin: return absolute reference (already normalized by URL API)

			: referenceURL.href

	) as T;

}

/**
 * Creates a relative reference from base to reference.
 *
 * - **Hierarchical identifiers**: Computes the shortest path-relative reference that, when resolved against `base`,
 *   yields `reference`
 * - **Opaque identifiers**: Returns the scheme-specific part if schemes match
 *
 * @typeParam T The identifier type ({@link URI} or {@link IRI})
 *
 * @param base The absolute base identifier
 * @param reference The reference to relativize
 *
 * @returns A relative reference from `base` to `reference`, or the normalized absolute reference if not relativizable
 *
 * @throws RangeError If the resolved path contains tree-climbing segments that would go above the root
 */
export function relativize<T extends URI | IRI>(base: string|T, reference: string|T): T {

	const normalizedBase = normalize<T>(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize<T>(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);
	const referenceURL = merge(baseURL, normalizedReference);

	// for opaque URIs (origin === "null"), compare protocols instead

	const sameOrigin = baseURL.origin !== "null"
		? baseURL.origin === referenceURL.origin
		: baseURL.protocol === referenceURL.protocol;

	return !sameOrigin ? absolute()
		: baseURL.origin === "null" ? internal()
			: relative();


	// different origin: return absolute reference (already normalized by URL API)

	function absolute(): T {

		return referenceURL.href as T;

	}

	// opaque URIs: return scheme-specific part (not a hierarchical path)

	function internal(): T {

		return (referenceURL.pathname+referenceURL.search+referenceURL.hash) as T;

	}

	// hierarchical URIs: compute relative path

	function relative(): T {

		const baseParts = baseURL.pathname.split("/").slice(0, -1); // directory segments
		const refParts = referenceURL.pathname.split("/");

		const commonLength = baseParts.reduce(
			(len, seg, i) => len < i || seg !== refParts[i] ? len : len+1,
			0
		);

		const upSegments = baseParts.slice(commonLength).map(() => "..");
		const downSegments = refParts.slice(commonLength);
		const relativePath = [...upSegments, ...downSegments].join("/") || ".";

		return (relativePath+referenceURL.search+referenceURL.hash) as T;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a namespace factory for generating IRIs within a common namespace.
 *
 * Returns a callable function that constructs IRIs by appending names to the namespace,
 * enhanced with typed properties for each predefined term. This enables both dynamic IRI creation
 * (`ns("custom")`) and type-safe access to known terms (`ns.label`).
 *
 * @typeParam T The readonly array type of term names, inferred as const
 *
 * @param namespace The namespace IRI to which names and terms are appended
 * @param terms Optional array of predefined term names to expose as typed properties
 *
 * @returns A callable function accepting a name parameter, augmented with IRI properties for each term
 *
 * @throws RangeError If the namespace or any term produces an invalid IRI during initialization.
 *   For closed namespaces, also throws when the factory is called with an undefined term name.
 *   For open namespaces, throws when the factory is called with a name that produces an invalid IRI.
 *
 * @remarks
 *
 * **Open namespaces** (no terms provided): Accept any term name dynamically, constructing IRIs on demand.
 *
 * **Closed namespaces** (terms provided): Restrict access to predefined terms only, throwing errors
 * for undefined term names.
 */
export function createNamespace<const T extends readonly string[]>(namespace: string|IRI, terms?: T): Namespace & Terms<T> {

	const ns=asIRI(namespace); // validate namespace eagerly

	const dictionary = Object.fromEntries((terms ?? []).map(term => [term, asIRI(ns+term)])) as Terms<T>;

	const factory = terms && terms.length > 0

		// closed namespace: only allow predefined terms

		? (name?: string): IRI => name === undefined ? ns
			: name in dictionary ? dictionary[name as T[number]]
				: error(new RangeError(`unknown term <${name}> in closed namespace <${ns}>`))

		// open namespace: dynamically create IRIs

		: (name?: string): IRI => name === undefined ? ns : asIRI(ns+name);

	return Object.assign(factory, dictionary);

}

/**
 * Creates a fetch function with consistent promise resolution/rejection behavior.
 *
 * Wraps a fetch function to provide consistent, sensible promise semantics where successful responses resolve
 * and all errors reject with structured {@link Problem} exceptions:
 *
 * - **Response is `ok`** (2xx `status`): Promise resolves with the response unchanged
 * - **Response is not `ok`** (non-2xx `status`): Response body is read according to `Content-Type`, converted to
 *   {@link Problem}, and promise rejects:
 *   - `text/plain`: Response body as text in `report` field
 *   - JSON-based MIME types (e.g., `application/json`, `application/ld+json`, `application/problem+json`):
 *     Parsed JSON payload in `report` field
 *   - Other content types: `status` code and `statusText` only
 * - **Fetch exception occurs** (network errors, timeouts, CORS failures): Exception is converted to {@link Problem}
 *   with `status` 0 and promise rejects
 *
 * If response body parsing fails, promise rejects with {@link Problem} containing the original response `status`
 * and `statusText`.
 *
 * @param base The fetch function to wrap
 * @returns Fetch function whose promises reject with {@link Problem} for all error conditions
 */
export function createFetch(base: typeof fetch): typeof fetch {
	return (input: RequestInfo | URL, init?: RequestInit) => base(input, init)

		.catch(error => {

			throw immutable<Problem>({

				status: 0,
				detail: `fetch error <${error}>`

			});

		})

		.then(response => {

			if ( response.ok ) {

				return response;

			} else {

				const mime = response.headers.get("Content-Type");

				if ( mime?.match(/^text\/plain\b/i) ) {

					return response.text()

						.catch(_ => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText

							});

						})

						.then(value => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText,

								report: value

							});

						});

				} else if ( mime?.match(/[\/+]json\b/i) ) {

					return response.json()

						.catch(_ => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText

							});

						})

						.then(value => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText,

								report: value

							});

						});

				} else {

					throw immutable<Problem>({

						status: response.status,
						detail: response.statusText

					});

				}

			}

		});
}
