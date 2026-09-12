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
 * Provides types and functions for validating resource identifiers (IRIs), checking nesting relationships, resolving
 * and rewriting references, creating and inspecting namespace objects, and minting IRIs for application-local
 * resources through the predefined {@link app} namespace.
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
 *
 * // Variant-specific checks
 *
 * isIRI("http://example.org/resource", "absolute");   // true
 * isIRI("/resource", "internal");                     // true
 * isIRI("../resource", "relative");                   // true
 * isIRI("http://example.org/资源", "absolute");        // true (Unicode allowed)
 * ```
 *
 * **Nesting Checks**
 *
 * ```typescript
 * import { isNestedIRI } from "@metreeca/core/resource";
 *
 * isNestedIRI("http://example.com/a/", "http://example.com/a/b");   // true
 * isNestedIRI("http://example.com/a/", "http://example.com/a/");    // true (self-nesting)
 * isNestedIRI("http://example.com/a/", "http://example.com/x/y");   // false
 * ```
 *
 * **Reference Operations**
 *
 * ```typescript
 * import { getIRIBase, internalize, relativize, resolve } from "@metreeca/core/resource";
 *
 * const iri = "http://example.com/a/b/c";
 *
 * // Resolve relative references against base
 *
 * resolve(iri, "../d");                        // "http://example.com/a/d"
 * resolve(iri, "/d");                          // "http://example.com/d"
 *
 * // Convert absolute to root-relative (internal) path
 *
 * internalize(iri, "http://example.com/x/y");  // "/x/y"
 *
 * // Convert absolute to relative path
 *
 * relativize(iri, "http://example.com/a/d");   // "../d"
 *
 * // Extract the base identifier usable for reference resolution
 *
 * getIRIBase(iri);                             // "http://example.com/"
 * getIRIBase("/a/b");                          // undefined
 * ```
 *
 * **Namespace Objects**
 *
 * ```typescript
 * import { app, createNamespace, getNamespaceBase, getNamespaceIRI } from "@metreeca/core/resource";
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
 * // Namespace accessors
 *
 * getNamespaceIRI(rdfs);   // IRI: "http://www.w3.org/2000/01/rdf-schema#"
 * getNamespaceBase(rdfs);  // IRI: "http://www.w3.org/"
 *
 * // Open namespace for dynamic terms
 *
 * const ex = createNamespace("http://example.org/");
 *
 * ex[""];             // IRI: "http://example.org/"
 * ex["anything"];     // IRI: "http://example.org/anything"
 *
 * // Predefined open namespace for application-local resources
 *
 * app[""];            // IRI: "app:/#"
 * app.label;          // IRI: "app:/#label"
 * ```
 *
 * @module
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html RFC 3987 - Internationalized Resource Identifiers (IRIs)}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986 - Uniform Resource Identifiers (URIs)}
 */

import { error, isString } from "../index.js";


/**
 * Matches scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
 */
const SchemePattern = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Excluded characters per RFC 3987 § 2.2: control chars, whitespace, special chars, isolated surrogates
 *
 * The `ucschar` production skips the surrogate block U+D800-U+DFFF, so no conforming IRI holds one; under unicode
 * matching a well-formed pair folds into the single supplementary code point it denotes, leaving the surrogate range
 * to match unpaired code units only.
 */
const ExcludedPattern = /[\x00-\x1F\x7F-\x9F\s<>"{}|\\^`\uD800-\uDFFF]/u;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Application namespace.
 *
 * An open {@link Namespace} rooted at the synthetic `app:/` origin, minting absolute IRIs for resources that are local
 * to a single application and have no deployment origin of their own. Terms are appended to the fragment component,
 * so generated IRIs are `"hierarchical"` identifiers sharing the `app:/` base.
 *
 * Lacking an authority component, `app:` IRIs are reported as root-relative paths by {@link internalize} and
 * {@link relativize}, rather than as the path-relative references authority-backed schemes such as `http:` yield.
 *
 * @example
 *
 * ```typescript
 * app[""];                              // IRI: "app:/#"
 * app.label;                            // IRI: "app:/#label"
 *
 * getIRIBase(app.label);                // "app:/"
 * resolve(app[""], "x/y");              // "app:/x/y"
 * relativize("app:/a/b", "app:/a/c");   // "/a/c" (root-relative, not "c")
 * ```
 */
export const app = createNamespace("app:/#");


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
 * > using {@link isIRI}.
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
 * - `"internal"`: Root-relative path starting with a single `/` (`/path`)
 * - `"relative"`: Reference without scheme or authority (`../path`, `path`)
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
 * - No variant admits an authority supplied by a reference: references opening with `//` (network-path references per
 *   RFC 3986 § 4.2) are rejected whatever the variant
 *
 * - For non-hierarchical (opaque) URIs such as `urn:` or `mailto:`, reference operations adapt:
 *   - {@link resolve}: Throws `RangeError` for relative references (no standard resolution)
 *   - {@link internalize}: Returns scheme-specific part if schemes match
 *   - {@link relativize}: Returns scheme-specific part if schemes match
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-4.2 RFC 3986 § 4.2 - Relative Reference}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-4.3 RFC 3986 § 4.3 - Absolute URI}
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
 * @see {@link getNamespaceIRI} for retrieving the namespace IRI
 * @see {@link getNamespaceBase} for retrieving the base identifier of the namespace IRI
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
 * Paths are normalized per RFC 3986 § 5.2.4, which clips `..` segments climbing above the root rather than rejecting
 * them, so `/a/../../x` is accepted wherever the `/x` it denotes is. References opening with `//` name an authority
 * (RFC 3986 § 4.2) and are rejected whatever the variant, as no variant admits an authority supplied by a reference.
 *
 * **Excluded characters** (per RFC 3987 § 2.2): Control characters (U+0000-U+001F, U+007F-U+009F),
 * whitespace, and `< > " { } | \ ^ `` ` (backtick)
 *
 * **Ill-formed text**: Strings carrying an isolated UTF-16 surrogate are rejected in every variant: the `ucschar`
 * production of RFC 3987 § 2.2 skips the surrogate block U+D800-U+DFFF, so no conforming IRI holds one, and encoding
 * such a string to UTF-8, as percent-encoding requires, would substitute `U+FFFD` REPLACEMENT CHARACTER for the
 * surrogate, yielding a different identifier
 *
 * @param value The value to validate as an IRI
 * @param variant The identifier variant to validate against (default: `"relative"`)
 *
 * @returns `true` if the value is a well-formed string conforming to IRI syntax rules for the specified variant;
 *   `false` otherwise
 *
 * @remarks
 *
 * This function serves as a type guard, narrowing the type from `string` to {@link IRI}
 * when used in conditional checks.
 *
 * @see {@link IRI}
 * @see {@link Variant}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3987.html#section-2.2 RFC 3987 § 2.2 - IRI Syntax}
 */
export function isIRI(value: unknown, variant: Variant = "relative"): value is IRI {

	return normalize(value, variant) !== undefined;

}

/**
 * Checks if a parent identifier nests a child identifier.
 *
 * Nesting holds if the path of `child` is equal to or extends the path of `parent` at a segment boundary, that is if
 * `parent` is a path prefix of `child` when compared segment by segment: a parent always nests itself
 * (`isNestedIRI(x, x)` is true), while segment-boundary matching prevents false positives (`/a/b` doesn't nest
 * `/a/bc`).
 *
 * Nesting is defined only for absolute hierarchical identifiers, that is a scheme followed by a root-relative path;
 * opaque, internal, and relative references are reported as not nesting, as are strings carrying an isolated UTF-16
 * surrogate. Query strings and fragments are ignored: only the path component is compared.
 *
 * @param parent The potential parent identifier
 * @param child The potential child identifier
 *
 * @returns true if `parent` and `child` are both valid `"hierarchical"` identifiers sharing scheme and authority and
 *   `parent` nests `child`; false otherwise
 *
 * @see {@link Variant}
 */
export function isNestedIRI(parent: string | IRI, child: string | IRI): boolean {

	const normalizedParent = normalize(parent, "hierarchical");
	const normalizedChild = normalize(child, "hierarchical");

	if ( normalizedParent === undefined || normalizedChild === undefined ) {

		return false;

	} else if ( normalizedParent === normalizedChild ) {

		return true;

	} else {

		const parentURL = new URL(normalizedParent);
		const childURL = new URL(normalizedChild);

		if ( sameOrigin(parentURL, childURL) ) {

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
 * Returns the scheme and authority components followed by a trailing slash, suitable for use as a base identifier in
 * reference resolution. Path, query, and fragment components are discarded.
 *
 * - **With authority** (for example, `http://example.org/a/b?q#f`): returns `scheme://authority/`
 * - **Without authority** (for example, `app:/a/b`): returns `scheme:/`
 * - **Empty authority** (for example, `file:///a/b`): returns `scheme:///`
 *
 * @param iri The hierarchical identifier to extract the base from
 *
 * @returns The base as a hierarchical identifier terminated by a trailing slash, or `undefined` if `iri` is not
 *   a valid hierarchical identifier (opaque URIs, internal paths, relative references, or strings carrying an
 *   isolated UTF-16 surrogate)
 *
 * @see {@link resolve} for resolving references against a base identifier
 * @see {@link getNamespaceBase} for extracting the base identifier of a {@link Namespace}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-5.1 RFC 3986 § 5.1 - Establishing a Base URI}
 */
export function getIRIBase(iri: string | IRI): undefined | IRI {

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
 * Resolution never escapes the root of `base`: `..` segments climbing above it are clipped as prescribed by the
 * RFC 3986 § 5.4.2 abnormal examples, so the resolved identifier always carries the scheme and authority of `base`.
 *
 * @remarks
 *
 * While RFC 3986 § 5 defines a path-merging algorithm that technically applies to all URI schemes, opaque identifiers
 * lack the hierarchical path such merging operates on, leaving relative resolution semantically undefined: a relative
 * reference against an opaque base is rejected outright, rather than resolved to an identifier its scheme gives no
 * meaning to.
 *
 * @param base The absolute base identifier to resolve against
 * @param reference The reference to resolve
 *
 * @returns The resolved absolute identifier
 *
 * @throws {@link !RangeError RangeError} If `base` is not a valid absolute identifier or `reference` is not a valid
 *   relative reference, for instance because it carries an isolated UTF-16 surrogate or opens with `//`
 * @throws {@link !RangeError RangeError} If a relative reference cannot be resolved against an opaque base
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-5 RFC 3986 § 5 - Reference Resolution}
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-5.4.2 RFC 3986 § 5.4.2 - Abnormal Examples}
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
 * @returns A root-relative reference if `reference` shares scheme and authority with `base`, or the normalized
 *   absolute reference otherwise
 *
 * @throws {@link !RangeError RangeError} If `base` is not a valid absolute identifier or `reference` is not a valid
 *   relative reference, for instance because it carries an isolated UTF-16 surrogate or opens with `//`
 */
export function internalize(base: string | IRI, reference: string | IRI): IRI {

	const normalizedBase = normalize(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);
	const referenceURL = merge(baseURL, normalizedReference);

	return sameOrigin(baseURL, referenceURL)

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
 * - **Authority-less hierarchical identifiers** (`app:/…`, `file:///…`): Returns the root-relative path
 * - **Opaque identifiers**: Returns the scheme-specific part if schemes match
 *
 * The returned reference always resolves back to `reference` under RFC 3986 § 5 and under any conforming URL parser:
 * a first segment carrying a colon is prefixed with a `./` dot segment so it cannot read as a scheme, and where an
 * empty first segment would read as an authority the absolute reference is returned instead. Callers may therefore
 * resolve the result against `base` without further escaping.
 *
 * @param base The absolute base identifier
 * @param reference The reference to relativize
 *
 * @returns A relative reference from `base` to `reference`, or the normalized absolute reference if not relativizable
 *
 * @throws {@link !RangeError RangeError} If `base` is not a valid absolute identifier or `reference` is not a valid
 *   relative reference, for instance because it carries an isolated UTF-16 surrogate or opens with `//`
 */
export function relativize(base: string | IRI, reference: string | IRI): IRI {

	const normalizedBase = normalize(base, "absolute") ?? invalid(base, "absolute");
	const normalizedReference = normalize(reference, "relative") ?? invalid(reference, "relative");

	const baseURL = new URL(normalizedBase);
	const referenceURL = merge(baseURL, normalizedReference);

	return !sameOrigin(baseURL, referenceURL) ? absolute()
		: baseURL.host === "" ? internal()
			: relative();


	// different origin: return absolute reference (already normalized by URL API)

	function absolute(): IRI {

		return referenceURL.href;

	}

	// authority-less bases: return the root-relative path, as no path-relative reference could restore the authority

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

		// RFC 3986 § 4.2 — an empty first segment would read as an authority, a colon in the first segment as a
		// scheme. Where no dot segment can disambiguate, fall back to the absolute reference.

		return relativePath.startsWith("/") ? absolute()
			: /^[^/]*:/.test(relativePath) ? `./${relativePath}${referenceURL.search}${referenceURL.hash}`
				: relativePath+referenceURL.search+referenceURL.hash;

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
 * @throws {@link !RangeError RangeError} If the namespace is not a valid absolute IRI, for instance because it
 *   carries an isolated UTF-16 surrogate, or if any term produces an invalid IRI during initialisation. For open
 *   namespaces, also throws when accessing a term that produces an invalid IRI. For closed namespaces, also throws
 *   when accessing an unknown term name.
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
 *
 * @see {@link getNamespaceIRI} for retrieving the namespace IRI
 * @see {@link getNamespaceBase} for retrieving the base identifier of the namespace IRI
 */
export function createNamespace<const T extends readonly string[]>(namespace: string | IRI, terms?: T): Namespace<T> {

	const ns = asIRI(namespace, "absolute"); // validate namespace eagerly

	const dictionary = Object.assign(Object.create(null), Object.fromEntries([
		["", ns],
		...(terms ?? []).map(term => [term, asIRI(ns+term, "absolute")])
	]));

	return Object.freeze(new Proxy(dictionary, {

		get(target, key) {
			return !isString(key) ? undefined
				: key in target ? target[key]
					: terms && terms.length > 0 ? error(new RangeError(`unknown term <${key}> in namespace <${ns}>`))
						: asIRI(ns+key, "absolute");
		}

	})) as Namespace<T>;


	function asIRI(value: string, variant: Variant = "relative"): IRI {

		if ( !isString(value) ) {
			throw new TypeError("expected string");
		}

		return normalize(value, variant) ?? invalid(value, variant);

	}

}


/**
 * Retrieves the IRI of a namespace.
 *
 * Reports the absolute IRI the namespace was created with, that is the IRI term names are appended to, providing a
 * named alternative to the empty string key (`namespace[""]`).
 *
 * @param namespace The namespace to retrieve the IRI from
 *
 * @returns The absolute IRI of `namespace`
 *
 * @example
 *
 * ```typescript
 * getNamespaceIRI(app);                              // "app:/#"
 * getNamespaceIRI(createNamespace("urn:example:"));  // "urn:example:"
 * ```
 *
 * @see {@link Namespace}
 * @see {@link createNamespace}
 * @see {@link getNamespaceBase}
 */
export function getNamespaceIRI(namespace: Namespace): IRI {
	return namespace[""];
}

/**
 * Retrieves the base identifier of a namespace.
 *
 * Extracts the scheme and authority components of the namespace IRI, as reported by {@link getIRIBase}, providing an
 * identifier suitable for resolving references against the IRIs minted by the namespace.
 *
 * @param namespace The namespace to retrieve the base identifier from
 *
 * @returns The base identifier of the IRI of `namespace`, terminated by a trailing slash, or `undefined` if the
 *   namespace IRI is opaque, that is not a hierarchical identifier (for example, `urn:example:`)
 *
 * @example
 *
 * ```typescript
 * getNamespaceBase(app);                              // "app:/"
 * getNamespaceBase(createNamespace("urn:example:"));  // undefined
 * ```
 *
 * @see {@link Namespace}
 * @see {@link createNamespace}
 * @see {@link getNamespaceIRI}
 * @see {@link getIRIBase}
 */
export function getNamespaceBase(namespace: Namespace): undefined | IRI {
	return getIRIBase(namespace[""]);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validates and normalizes a reference.
 *
 * Performs syntax validation (string type, excluded characters, isolated surrogates, network-path references), path
 * normalization per RFC 3986 § 5.2.4 (Remove Dot Segments), and variant-specific validation.
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

	// network-path references (RFC 3986 § 4.2) name an authority no variant admits: rejected rather than silently
	// stripped of it

	const hasAuthority = validSyntax && !hasScheme && value.startsWith("//");

	// path normalization (URL API silently clips excessive `..` at root)

	const normalized = !validSyntax || hasAuthority ? undefined
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
 * Checks if two identifiers share scheme and authority.
 *
 * Compares the authority components directly rather than through `URL.origin`, which RFC 6454 § 4 serializes as the
 * opaque string `"null"` for every scheme outside the WHATWG special set: identifiers differing only by authority
 * would otherwise compare as same-origin under schemes such as `app:` and `file:`.
 *
 * @param base The base URL
 * @param reference The reference URL
 *
 * @returns `true` if `base` and `reference` share scheme and authority; `false` otherwise
 */
function sameOrigin(base: URL, reference: URL): boolean {
	return base.protocol === reference.protocol && base.host === reference.host;
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
