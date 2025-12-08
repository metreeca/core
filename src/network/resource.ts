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
 * **Resource Identifiers**
 *
 * Type guards:
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
 * Creating identifiers:
 *
 * ```typescript
 * import { uri, iri } from "@metreeca/core";
 *
 * // Absolute identifiers
 *
 * const absoluteURI = uri("http://example.org/resource");
 * const absoluteIRI = iri("http://example.org/resource");
 *
 * // Relative references
 *
 * const relativeURI = uri("../resource", { relative: true });
 * const relativeIRI = iri("../resource", { relative: true });
 *
 * // Unicode in IRIs (throws for URIs)
 *
 * const unicodeIRI = iri("http://example.org/资源");
 * ```
 *
 * Namespace factories:
 *
 * ```typescript
 * import { namespace } from "@metreeca/core";
 *
 * // Closed namespace with predefined terms
 *
 * const rdfs = namespace("http://www.w3.org/2000/01/rdf-schema#", [
 *   "label",
 *   "comment"
 * ]);
 *
 * rdfs.label;        // IRI: "http://www.w3.org/2000/01/rdf-schema#label"
 * rdfs("comment");   // IRI: "http://www.w3.org/2000/01/rdf-schema#comment"
 * rdfs("seeAlso");   // Throws RangeError: unknown term
 *
 * // Open namespace for dynamic terms
 *
 * const ex = namespace("http://example.org/");
 *
 * ex("anything");    // IRI: "http://example.org/anything"
 * ```
 *
 * **HTTP Error Handling**
 *
 * Structured error responses:
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
 * Wrapping fetch functions:
 *
 * ```typescript
 * import { fetcher } from "@metreeca/core";
 *
 * const guard = fetcher(fetch);
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
 * @see [RFC 3986 - Uniform Resource Identifiers (URIs)](https://www.rfc-editor.org/rfc/rfc3986.html)
 * @see [RFC 3987 - Internationalized Resource Identifiers (IRIs)](https://www.rfc-editor.org/rfc/rfc3987.html)
 * @see [RFC 7807 - Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
 */

import { isString, type Value } from "../common/json.js";
import { immutable } from "../common/nested.js";
import { error } from "../common/report.js";


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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Uniform Resource Identifier (URI) as defined by RFC 3986.
 *
 * A URI is a sequence of characters that identifies an abstract or physical resource using
 * only ASCII characters (U+0000-U+007F).
 *
 * @remarks
 *
 * This opaque type ensures that only validated URIs can be used where a URI is expected,
 * preventing raw strings from being passed directly without validation.
 *
 * The brand is a compile-time construct with no runtime overhead.
 *
 * Use {@link uri} to construct validated URIs or {@link isURI} as a type guard.
 *
 * @see [RFC 3986 - URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986.html)
 */
export type URI = string & {

	readonly __brand: unique symbol

}

/**
 * Internationalized Resource Identifier (IRI) as defined by RFC 3987.
 *
 * An IRI is a sequence of characters that identifies an abstract or physical resource, allowing
 * Unicode characters beyond the ASCII subset permitted in URIs.
 *
 * @remarks
 *
 * This opaque type ensures that only validated IRIs can be used where an IRI is expected,
 * preventing raw strings from being passed directly without validation.
 *
 * The brand is a compile-time construct with no runtime overhead.
 *
 * Use {@link iri} to construct validated IRIs or {@link isIRI} as a type guard.
 *
 * @see [RFC 3987 § 2.2 - IRI Syntax](https://www.rfc-editor.org/rfc/rfc3987.html#section-2.2)
 */
export type IRI = string & {

	readonly __brand: unique symbol

}


/**
 * Identifier variant.
 *
 * Specify a {@link URI} or {@link IRI} variant.
 */
export type Variant = {

	/**
	 * If `true`, relative reference variant; otherwise absolute variant (default: `false`)
	 */
	relative?: boolean

}


/**
 * Namespace factory function type for generating IRIs with a common base.
 *
 * A callable function that constructs IRIs by appending names to a namespace base IRI.
 * When created via {@link namespace} with predefined terms, the function is augmented
 * with typed properties for direct access to known terms.
 *
 * The function signature accepts a name parameter and returns the constructed {@link IRI}.
 *
 * @see {@link namespace} for creating namespace factories with typed term properties
 */
export type Namespace = ((name: string) => IRI)

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
 * @see [RFC 7807 - Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
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
 * @param value Value to validate as a URI
 * @param opts Variant options
 * @param opts.relative If `true`, accept relative URI references; otherwise require absolute URIs (default: `false`)
 *
 * @returns `true` if the value is a valid ASCII-only URI
 *
 * @see {@link URI}
 */
export function isURI(value: unknown, opts: Variant = {}): value is URI {
	return isIRI(value, opts) && ASCIIPattern.test(value as string);
}

/**
 * Creates a validated URI from a string.
 *
 * Validates URIs according to RFC 3986, restricting identifiers to ASCII characters only.
 *
 * @param value String to convert to a URI
 * @param opts Variant options
 * @param opts.relative If `true`, validate as relative URI reference; otherwise require absolute URI (default: `false`)
 *
 * @returns The validated URI
 *
 * @throws RangeError If the value is not a valid ASCII-only URI
 *
 * @see {@link isURI} for validation rules
 * @see {@link URI}
 */
export function uri(value: string, opts: Variant = {}): URI {

	if ( !isURI(value, opts) ) {
		throw new RangeError(`invalid ${opts.relative ? "relative" : "absolute"} URI <${value}>`);
	}

	return value;
}


/**
 * Checks if a value is a valid IRI.
 *
 * Validates IRIs according to RFC 3987 with the following rules:
 *
 * **Absolute IRIs**: Must contain a valid scheme (alpha followed by alphanumeric/+/./- characters)
 * followed by a colon and a non-empty scheme-specific part.
 *
 * **Relative IRI references**: Must not contain a scheme component (to avoid ambiguity with absolute IRIs).
 * Empty strings are accepted as valid relative references per RFC 3987.
 *
 * **Excluded characters** (per RFC 3987 § 2.2): Control characters (U+0000-U+001F, U+007F-U+009F),
 * whitespace, and `< > " { } | \ ^ `` ` (backtick)
 *
 * @param value Value to validate as an IRI
 * @param opts Variant options
 * @param opts.relative If `true`, accept relative IRI references; otherwise require absolute IRIs (default: `false`)
 *
 * @returns `true` if the value is a string conforming to IRI syntax rules (absolute or relative based on options)
 *
 * @remarks
 *
 * This function serves as a type guard, narrowing the type from `string` to {@link IRI}
 * when used in conditional checks.
 *
 * The validation is stricter than simple character exclusion but does not enforce complete RFC 3987
 * grammar (e.g., authority, path structure). This provides a balance between correctness and simplicity.
 *
 * @see {@link IRI}
 */
export function isIRI(value: unknown, opts: Variant = {}): value is IRI {

	const { relative } = opts;

	return isString(value) && !ExcludedPattern.test(value) && (relative

			// relative IRI reference: must not contain a scheme component

			? !SchemePattern.test(value)

			// absolute IRI: must contain scheme followed by non-empty scheme-specific part
			// the scheme pattern validates structure; we check SSP is non-empty separately

			: SchemePattern.test(value) && value.indexOf(":") < value.length-1

	);

}

/**
 * Creates a validated IRI from a string.
 *
 * @param value String to convert to an IRI
 * @param opts Variant options
 * @param opts.relative If `true`, validate as relative IRI reference; otherwise require absolute IRI (default: `false`)
 *
 * @returns The validated IRI
 *
 * @throws RangeError If the value is not a valid IRI according to the validation rules
 *
 * @see {@link isIRI} for validation rules
 */
export function iri(value: string, opts: Variant = {}): IRI {

	if ( !isIRI(value, opts) ) {
		throw new RangeError(`invalid ${opts.relative ? "relative" : "absolute"} IRI <${value}>`);
	}

	return value;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a namespace factory for generating IRIs with a common base.
 *
 * Returns a callable function that constructs IRIs by appending names to the base,
 * enhanced with typed properties for each predefined term. This enables both dynamic IRI creation
 * (`ns("custom")`) and type-safe access to known terms (`ns.label`).
 *
 * @typeParam T The readonly array type of term names, inferred as const
 *
 * @param base The base IRI to which names and terms are appended
 * @param terms Optional array of predefined term names to expose as typed properties
 *
 * @returns A callable function accepting a name parameter, augmented with IRI properties for each term
 *
 * @throws RangeError If the base or any term produces an invalid IRI during initialization.
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
export function namespace<const T extends readonly string[]>(base: IRI, terms?: T): Namespace & Terms<T> {

	const dictionary = Object.fromEntries((terms ?? []).map(term => [term, iri(base+term)])) as Terms<T>;

	const factory = terms && terms.length > 0

		// closed namespace: only allow predefined terms

		? (name: string): IRI => name in dictionary ? dictionary[name as T[number]]
			: error(new RangeError(`unknown term <${name}> in closed namespace <${base}>`))

		// open namespace: dynamically create IRIs

		: (name: string): IRI => iri(base+name);

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
export function fetcher(base: typeof fetch): typeof fetch {
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
