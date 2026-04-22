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
 * RFC 3987 resource identifiers.
 *
 * Provides types and functions for resource identifiers (IRIs), namespace factories,
 * and reference resolution.
 *
 * **Type Guards**
 *
 * ```typescript
 * import { isIRI } from "@metreeca/core/resource";
 *
 * const value = "http://example.org/resource";
 *
 * if (isIRI(value)) {
 *   // value is typed as IRI
 * }
 * ```
 *
 * **Identifier Factories**
 *
 * ```typescript
 * import { asIRI } from "@metreeca/core/resource";
 *
 * // Absolute identifiers
 *
 * const absolute = asIRI("http://example.org/resource", "absolute");
 *
 * // Relative references
 *
 * const relative = asIRI("../resource", "relative");
 *
 * // Root-relative (internal) paths
 *
 * const internal = asIRI("/resource", "internal");
 *
 * // Unicode in IRIs
 *
 * const unicode = asIRI("http://example.org/资源", "absolute");
 * ```
 *
 * **Nesting Checks**
 *
 * ```typescript
 * import { nests, asIRI } from "@metreeca/core/resource";
 *
 * nests("http://example.com/a/", "http://example.com/a/b");   // true
 * nests("http://example.com/a/", "http://example.com/a/");    // true (self-nesting)
 * nests("http://example.com/a/", "http://example.com/x/y");   // false
 * ```
 *
 * **Reference Operations**
 *
 * ```typescript
 * import { base, resolve, relativize, internalize, asIRI } from "@metreeca/core/resource";
 *
 * const iri = asIRI("http://example.com/a/b/c", "absolute");
 *
 * // Resolve relative references against base
 *
 * resolve(iri, asIRI("../d", "relative"));  // "http://example.com/a/d"
 * resolve(iri, asIRI("/d", "internal"));    // "http://example.com/d"
 *
 * // Convert absolute to root-relative (internal) path
 *
 * internalize(iri, asIRI("http://example.com/x/y", "absolute"));  // "/x/y"
 *
 * // Convert absolute to relative path
 *
 * relativize(iri, asIRI("http://example.com/a/d", "absolute"));   // "../d"
 *
 * // Extract the base identifier usable for reference resolution
 *
 * base(iri);                                                      // "http://example.com/"
 * base(asIRI("/a/b", "internal"));                                // undefined
 * ```
 *
 * **Namespace Objects**
 *
 * ```typescript
 * import { createNamespace } from "@metreeca/core/resource";
 *
 * // Closed namespace with predefined terms
 *
 * const rdfs = createNamespace("http://www.w3.org/2000/01/rdf-schema#", [
 *   "label",
 *   "comment"
 * ]);
 *
 * rdfs[""];           // IRI: "http://www.w3.org/2000/01/rdf-schema#"
 * rdfs.label;         // IRI: "http://www.w3.org/2000/01/rdf-schema#label"
 * rdfs["comment"];    // IRI: "http://www.w3.org/2000/01/rdf-schema#comment"
 * rdfs["seeAlso"];    // throws RangeError: unknown term
 *
 * // Open namespace for dynamic terms
 *
 * const ex = createNamespace("http://example.org/");
 *
 * ex[""];             // IRI: "http://example.org/"
 * ex["anything"];     // IRI: "http://example.org/anything"
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html RFC 3987 - Internationalized Resource Identifiers (IRIs)}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986 - Uniform Resource Identifiers (URIs)}
 */

import { error } from "../common/report.js";
import { isString } from "../index.js";


/**
 * Matches scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
 */
const SchemePattern = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Excluded characters per RFC 3987 § 2.2: control chars, whitespace, special chars
 */
const ExcludedPattern = /[\x00-\x1F\x7F-\x9F\s<>"{}|\\^`]/;

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
function normalize(value: unknown, variant: Variant): IRI | undefined {

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

	const isHierarchical = hasScheme && normalized.charAt(normalized.indexOf(":")+1) === "/";
	const isAbsolute = hasScheme && normalized.indexOf(":") < normalized.length-1;
	const isInternal = isAbsolute || normalized.startsWith("/");

	const valid = variant === "hierarchical" && isHierarchical
		|| variant === "absolute" && isAbsolute
		|| variant === "internal" && isInternal
		|| variant === "relative";

	return valid ? normalized : undefined;


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
 * Internationalized Resource Identifier (IRI) as defined by RFC 3987.
 *
 * An IRI is a sequence of characters that identifies an abstract or physical resource.
 * IRIs extend URIs (RFC 3986) by allowing Unicode characters beyond the ASCII subset.
 * Every valid URI is also a valid IRI.
 *
 * > [!WARNING]
 * > This is a type alias for documentation purposes only. Branding was considered but not adopted due to
 * > interoperability issues with tools relying on static code analysis. Values must be validated at runtime
 * > using {@link isIRI} or {@link asIRI}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986 - URI Generic Syntax}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html#section-2.2 RFC 3987 § 2.2 - IRI Syntax}
 */
export type IRI =
	| string


/**
 * Identifier variant per RFC 3986 §§ 4.2-4.3.
 *
 * - `"hierarchical"`: Absolute with hierarchical path (`http://example.org/path`, `app:/path`)
 * - `"absolute"`: Contains scheme (`http://example.org/path`, `urn:example:resource`)
 * - `"internal"`: Root-relative path starting with `/` (`/path`)
 * - `"relative"`: Reference without scheme (`../path`, `path`)
 *
 * @remarks
 *
 * - Variants form an inclusivity hierarchy: `hierarchical ⊂ absolute ⊂ internal ⊂ relative`
 *
 * - The `"hierarchical"` variant requires an absolute URI with a path starting with `/`;
 *   authority is optional per RFC 3986 § 3 `hier-part` grammar (`path-absolute` alternative);
 *   reference resolution is supported per RFC 3986 § 5.2.3
 *
 * - The `"internal"` variant is project-specific, not formally defined in RFC 3986
 *
 * - For non-hierarchical (opaque) URIs such as `urn:` or `mailto:`, reference operations adapt:
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
 * Object type for accessing IRIs within a common namespace.
 *
 * Provides IRI access via property lookup. The namespace IRI itself is available via the empty
 * string key (`ns[""]`), while terms are accessed as named properties (`ns.label` or `ns["label"]`).
 *
 * @typeParam T Predefined term names for closed namespace access
 *
 * @see {@link createNamespace} for creating namespace objects
 */
export type Namespace<T extends readonly string[] = []> =
	T extends readonly [] ? {

		readonly [""]: IRI
		readonly [term: string]: IRI

	} : {

		readonly [""]: IRI

	} & {

		readonly [K in T[number]]: IRI

	}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid IRI.
 *
 * Validates IRIs according to RFC 3987 with variant-specific rules:
 *
 * - `"hierarchical"`: Absolute with root-relative path (`scheme:/...`) — can be used as resolution base
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
 * @param variant The identifier variant to validate against (default: `"relative"`)
 *
 * @returns `true` if the value is a string conforming to IRI syntax rules for the specified variant; `false` otherwise
 *
 * @remarks
 *
 * This function serves as a type guard, narrowing the type from `string` to {@link IRI}
 * when used in conditional checks.
 *
 * @see {@link IRI}
 * @see {@link Variant}
 */
export function isIRI(value: unknown, variant: Variant = "relative"): value is IRI {

	return normalize(value, variant) !== undefined;

}

/**
 * Creates a validated IRI from a string.
 *
 * Validates IRIs according to RFC 3987, allowing Unicode characters.
 * For non-absolute variants, normalizes paths by removing `.` segments and resolving `..` segments.
 *
 * @param value The value to convert to an IRI
 * @param variant The identifier variant to validate against (default: `"relative"`)
 *
 * @returns The validated and normalized IRI
 *
 * @throws TypeError If the value is not a string
 * @throws RangeError If the value is not a valid IRI for the specified variant,
 *   or if `..` segments would climb above the root
 *
 * @see {@link isIRI} for validation rules
 * @see {@link IRI}
 * @see {@link Variant}
 */
export function asIRI(value: string, variant: Variant = "relative"): IRI {

	if ( !isString(value) ) {
		throw new TypeError("expected string");
	}

	return normalize(value, variant) ?? invalid(value, variant);

}


/**
 * Checks if a parent identifier nests a child identifier.
 *
 * Returns `true` if `child`'s path is equal to or extends `parent`'s path at a segment boundary,
 * meaning `parent` is a path prefix of `child` when compared segment by segment.
 *
 * Both identifiers must be absolute hierarchical (scheme + root-relative path); returns `false` for
 * opaque, internal, or relative references. Query strings and fragments are ignored — only the path
 * component is compared.
 *
 * A parent always nests itself (`nests(x, x)` is `true`).
 * Segment-boundary matching prevents false positives (e.g., `/a/b` does not nest `/a/bc`).
 *
 * @param parent The potential parent identifier
 * @param child The potential child identifier
 *
 * @returns `true` if `parent` nests `child`; `false` otherwise
 *
 * @throws RangeError If either argument is not a valid identifier
 */
export function nests(parent: string | IRI, child: string | IRI): boolean {

	const normalizedParent = normalize(parent, "hierarchical");
	const normalizedChild = normalize(child, "hierarchical");

	if ( normalizedParent === undefined || normalizedChild === undefined ) {

		return false;

	} else if ( normalizedParent === normalizedChild ) {

		return true;

	} else {

		const parentURL = new URL(normalizedParent);
		const childURL = new URL(normalizedChild);

		if ( parentURL.origin === childURL.origin ) {

			const parentPath = parentURL.pathname.endsWith("/") ? parentURL.pathname : `${parentURL.pathname}/`;
			const childPath = childURL.pathname.endsWith("/") ? childURL.pathname : `${childURL.pathname}/`;

			return childPath.startsWith(parentPath);

		} else {

			return false;

		}

	}

}


/**
 * Extracts the base identifier from a hierarchical identifier.
 *
 * Returns the scheme and authority components (the "origin" per RFC 6454) followed by a trailing slash,
 * suitable for use as a base identifier in reference resolution. Path, query, and fragment components
 * are discarded.
 *
 * - **With authority** (for example, `http://example.org/a/b?q#f`): returns `scheme://authority/`
 * - **Without authority** (for example, `app:/a/b`): returns `scheme:/`
 * - **Empty authority** (for example, `file:///a/b`): returns `scheme:///`
 *
 * @param iri The hierarchical identifier to extract the base from
 *
 * @returns The base as a hierarchical identifier terminated by a trailing slash, or `undefined` if `iri` is not
 *   a valid hierarchical identifier (opaque URIs, internal paths, or relative references)
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc6454#section-4 RFC 6454 § 4 - Origin of a URI}
 */
export function base(iri: string | IRI): undefined | IRI {

	const normalized = normalize(iri, "hierarchical");

	if ( normalized === undefined ) { return undefined; } else {

		const { protocol, host } = new URL(normalized);

		const hasAuthority = normalized.charAt(normalized.indexOf(":")+2) === "/";

		return hasAuthority
			? `${protocol}//${host}/`
			: `${protocol}/`;

	}
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
 * lack a hierarchical path structure, making relative resolution semantically undefined in practice. The WHATWG
 * URL Standard follows RFC 6454, which assigns opaque origins (serialized as the string `"null"`) to such URIs,
 * explicitly preventing same-origin comparisons and relative resolution.
 *
 * This implementation aligns with WHATWG/URL API behavior by rejecting relative references against opaque bases,
 * providing clearer error semantics than the underlying URL API.
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
export function resolve(base: string | IRI, reference: string | IRI): IRI {

	const normalizedBase = normalize(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);

	const opaqueBase = !baseURL.pathname.startsWith("/");
	const relativeReference = !SchemePattern.test(normalizedReference);

	return opaqueBase && relativeReference
		? error(new RangeError(
			`cannot resolve relative <${normalizedReference}> against non-hierarchical <${normalizedBase}>`
		))
		: merge(baseURL, normalizedReference).href;

}

/**
 * Extracts a root-relative reference.
 *
 * - **Hierarchical identifiers**: Returns the root-relative path (starting with `/`) if scheme and authority match
 * - **Opaque identifiers**: Returns the scheme-specific part if schemes match
 *
 * @param base The absolute base identifier providing the scheme and authority context
 * @param reference The reference to internalize
 *
 * @returns A root-relative reference if same origin, or the normalized absolute reference otherwise
 *
 * @throws RangeError If the resolved path contains tree-climbing segments that would go above the root
 */
export function internalize(base: string | IRI, reference: string | IRI): IRI {

	const normalizedBase = normalize(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);
	const referenceURL = merge(baseURL, normalizedReference);

	// for opaque URIs (origin === "null"), compare protocols instead

	const sameOrigin = baseURL.origin !== "null"
		? baseURL.origin === referenceURL.origin
		: baseURL.protocol === referenceURL.protocol;

	return sameOrigin

		// same origin: return root-relative path (already normalized by URL API)

		? referenceURL.pathname+referenceURL.search+referenceURL.hash

		// different origin: return absolute reference (already normalized by URL API)

		: referenceURL.href;

}

/**
 * Creates a relative reference from base to reference.
 *
 * - **Hierarchical identifiers**: Computes the shortest path-relative reference that, when resolved against `base`,
 *   yields `reference`
 * - **Opaque identifiers**: Returns the scheme-specific part if schemes match
 *
 * @param base The absolute base identifier
 * @param reference The reference to relativize
 *
 * @returns A relative reference from `base` to `reference`, or the normalized absolute reference if not relativizable
 *
 * @throws RangeError If the resolved path contains tree-climbing segments that would go above the root
 */
export function relativize(base: string | IRI, reference: string | IRI): IRI {

	const normalizedBase = normalize(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize(reference, "relative") ?? invalid(reference, "relative");

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

	function absolute(): IRI {

		return referenceURL.href;

	}

	// opaque URIs: return scheme-specific part (not a hierarchical path)

	function internal(): IRI {

		return referenceURL.pathname+referenceURL.search+referenceURL.hash;

	}

	// hierarchical URIs: compute relative path

	function relative(): IRI {

		const baseParts = baseURL.pathname.split("/").slice(0, -1); // directory segments
		const refParts = referenceURL.pathname.split("/");

		const commonLength = baseParts.reduce(
			(len, seg, i) => len < i || seg !== refParts[i] ? len : len+1,
			0
		);

		const upSegments = baseParts.slice(commonLength).map(() => "..");
		const downSegments = refParts.slice(commonLength);
		const relativePath = [...upSegments, ...downSegments].join("/") || ".";

		return relativePath+referenceURL.search+referenceURL.hash;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates an immutable {@link Namespace} object for generating and accessing IRIs from a common base.
 *
 * @typeParam T Predefined term names, inferred from the `terms` argument
 *
 * @param namespace The absolute base IRI to which terms are appended
 * @param terms Optional array of predefined term names to restrict access to
 *
 * @returns An immutable {@link Namespace} object with typed term properties
 *
 * @throws {RangeError} If the namespace is not a valid absolute IRI, or if any term produces an invalid IRI
 *   during initialisation. For open namespaces, also throws when accessing a term that produces an invalid IRI.
 *   For closed namespaces, also throws when accessing an unknown term name.
 *
 * @remarks
 *
 * **Open namespaces** (no terms provided): Accept any term name dynamically, constructing IRIs on demand.
 *
 * **Closed namespaces** (terms provided): Restrict access to predefined terms only, throwing errors
 * for unknown term names.
 *
 * > [!WARNING]
 * > Accessing an unknown term on a closed namespace throws a `RangeError` at runtime,
 * > even though TypeScript's type system may not flag the access at compile time (e.g., when using
 * > bracket notation with a dynamic key).
 */
export function createNamespace<const T extends readonly string[]>(namespace: string | IRI, terms?: T): Namespace<T> {

	const ns = asIRI(namespace, "absolute"); // validate namespace eagerly

	const dictionary = Object.assign(Object.create(null), Object.fromEntries([
		["", ns],
		...(terms ?? []).map(term => [term, asIRI(ns+term, "absolute")])
	]));

	return Object.freeze(new Proxy(dictionary, {

		get(target, property) {
			return !isString(property) ? undefined
				: property in target ? target[property]
					: terms && terms.length > 0 ? error(new RangeError(`unknown term <${property}> in closed namespace <${ns}>`))
						: asIRI(ns+property, "absolute");
		}

	})) as Namespace<T>;

}
