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

import { describe, expect, it, vi } from "vitest";
import {
	createFetch,
	internalize,
	asIRI,
	isIRI,
	isURI,
	createNamespace,
	type Problem,
	relativize,
	resolve,
	asURI
} from "./resource.js";


const iris = {
	absolute: {
		valid: [
			"http://www.w3.org/2001/XMLSchema#integer",
			"https://example.com/datatype",
			"urn:example:datatype"
		],
		invalid: [
			{ value: "not-a-valid-iri", reason: "missing scheme" },
			{ value: "/relative/path", reason: "relative path" },
			{ value: "relative/path", reason: "relative path" },
			{ value: "http:", reason: "empty SSP" },
			{ value: "urn:", reason: "empty SSP" },
			{ value: "https:", reason: "empty SSP" },
			{ value: "http://example .com/path", reason: "whitespace in hostname" },
			{ value: "http://example.com/path with spaces", reason: "whitespace in path" },
			{ value: "http: //example.com", reason: "whitespace after colon" },
			{ value: "urn:example data", reason: "whitespace in URN" },
			{ value: "http://example.com/<tag>", reason: "angle bracket in path" },
			{ value: "http://example.com/path\"quoted", reason: "quote in path" },
			{ value: "http://example.com/{curly}", reason: "curly brace in path" },
			{ value: "http://example.com/pipe|here", reason: "pipe character in path" },
			{ value: "http://example.com/back\\slash", reason: "backslash in path" },
			{ value: "http://example.com/caret^here", reason: "caret in path" },
			{ value: "http://example.com/grave`here", reason: "backtick in path" }
		]
	},
	relative: {
		valid: [
			"path/to/resource",
			"../parent/resource",
			"current/resource",
			"/absolute/path",
			"resource",
			"path/with-dashes_underscores",
			"path?query=value",
			"path#fragment",
			"path?query=value#fragment",
			"http://example.com/absolute", // relative variant accepts absolute references
			"https://example.com",
			"urn:example:resource"
		],
		invalid: [
			{ value: "path with spaces", reason: "whitespace in path" },
			{ value: "path<tag>", reason: "angle bracket" },
			{ value: "path\"quoted", reason: "quote character" },
			{ value: "path{curly}", reason: "curly brace" },
			{ value: "path|pipe", reason: "pipe character" },
			{ value: "path\\backslash", reason: "backslash" },
			{ value: "path^caret", reason: "caret character" },
			{ value: "path`backtick", reason: "backtick character" }
		]
	}
};

const uris = {
	absolute: {
		valid: [
			"http://www.w3.org/2001/XMLSchema#integer",
			"https://example.com/datatype",
			"urn:example:datatype"
		],
		invalid: [
			{ value: "not-a-valid-uri", reason: "missing scheme" },
			{ value: "/relative/path", reason: "relative path" },
			{ value: "http:", reason: "empty SSP" },
			{ value: "http://example.com/资源", reason: "Unicode characters" },
			{ value: "http://example.com/café", reason: "Unicode characters" },
			{ value: "http://example.com/path with spaces", reason: "whitespace in path" }
		]
	},
	relative: {
		valid: [
			"path/to/resource",
			"../parent/resource",
			"current/resource",
			"/absolute/path",
			"resource",
			"path?query=value",
			"path#fragment",
			"http://example.com/absolute" // relative variant accepts absolute references
		],
		invalid: [
			{ value: "path/资源", reason: "Unicode characters" },
			{ value: "path/café", reason: "Unicode characters" },
			{ value: "path with spaces", reason: "whitespace in path" }
		]
	}
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("isURI", () => {

	it("should return true for valid absolute ASCII-only URIs", () => {
		uris.absolute.valid.forEach(value => {
			expect(isURI(value, "absolute")).toBe(true);
		});
	});

	it("should return false for invalid absolute URIs", () => {
		uris.absolute.invalid.forEach(({ value }) => {
			expect(isURI(value, "absolute")).toBe(false);
		});
	});

	it("should return false for URIs with Unicode characters", () => {
		expect(isURI("http://example.com/资源", "absolute")).toBe(false);
		expect(isURI("http://example.com/café", "absolute")).toBe(false);
		expect(isURI("urn:example:数据", "absolute")).toBe(false);
	});

	it("should return true for valid relative ASCII-only URIs with relative variant", () => {
		uris.relative.valid.forEach(value => {
			expect(isURI(value, "relative")).toBe(true);
		});
	});

	it("should return false for invalid relative URIs with relative variant", () => {
		uris.relative.invalid.forEach(({ value }) => {
			expect(isURI(value, "relative")).toBe(false);
		});
	});

	it("should return false for non-absolute URIs with absolute variant", () => {
		// Only test paths without scheme - absolute URIs are valid with "absolute" variant
		const relativePaths = uris.relative.valid.filter(v => !v.includes("://"));
		relativePaths.forEach(value => {
			expect(isURI(value, "absolute")).toBe(false);
		});
	});

	it("should return true for ASCII URIs that are also valid IRIs", () => {
		uris.absolute.valid.forEach(value => {
			expect(isURI(value, "absolute")).toBe(true);
			expect(isIRI(value, "absolute")).toBe(true);
		});
	});

});

describe("isIRI()", () => {

	it("should return true for valid absolute IRIs", () => {
		iris.absolute.valid.forEach(value => {
			expect(isIRI(value, "absolute")).toBe(true);
		});
	});

	it("should return false for invalid absolute IRIs", () => {
		iris.absolute.invalid.forEach(({ value }) => {
			expect(isIRI(value, "absolute")).toBe(false);
		});
	});

	it("should return true for valid relative IRIs with relative variant", () => {
		iris.relative.valid.forEach(value => {
			expect(isIRI(value, "relative")).toBe(true);
		});
	});

	it("should return false for invalid relative IRIs with relative variant", () => {
		iris.relative.invalid.forEach(({ value }) => {
			expect(isIRI(value, "relative")).toBe(false);
		});
	});

	it("should return false for non-absolute IRIs with absolute variant", () => {
		// Only test paths without scheme - absolute URIs are valid with "absolute" variant
		const relativePaths = iris.relative.valid.filter(v => !v.includes("://") && !v.startsWith("urn:"));
		relativePaths.forEach(value => {
			expect(isIRI(value, "absolute")).toBe(false);
		});
	});

});


describe("asURI()", () => {

	it("should create branded URI from valid absolute ASCII-only strings", () => {
		uris.absolute.valid.forEach(value => {
			expect(() => asURI(value, "absolute")).not.toThrow();
			const result = asURI(value, "absolute");
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid absolute URIs", () => {
		uris.absolute.invalid.forEach(({ value }) => {
			expect(() => asURI(value, "absolute")).toThrow(RangeError);
		});
	});

	it("should throw RangeError for URIs with Unicode characters", () => {
		expect(() => asURI("http://example.com/资源", "absolute")).toThrow(RangeError);
		expect(() => asURI("http://example.com/café", "absolute")).toThrow(RangeError);
		expect(() => asURI("urn:example:数据", "absolute")).toThrow(RangeError);
	});

	it("should create branded URI from valid relative ASCII-only strings with relative variant", () => {
		uris.relative.valid.forEach(value => {
			expect(() => asURI(value, "relative")).not.toThrow();
			const result = asURI(value, "relative");
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid relative URIs with relative variant", () => {
		uris.relative.invalid.forEach(({ value }) => {
			expect(() => asURI(value, "relative")).toThrow(RangeError);
		});
	});

	it("should throw RangeError for non-absolute URIs with absolute variant", () => {
		// Only test actual relative paths (no scheme) - absolute URIs are valid with "absolute" variant
		const relativePaths = uris.relative.valid.filter(v => !v.includes("://"));
		relativePaths.forEach(value => {
			expect(() => asURI(value, "absolute")).toThrow(RangeError);
		});
	});

	it("should normalize paths by removing . and resolving .. segments", () => {
		expect(asURI("/a/./b/../c", "internal")).toBe("/a/c");
	});

	it("should preserve . and .. in relative paths for later resolution", () => {
		expect(asURI("./path", "relative")).toBe("./path");
		expect(asURI("a/./b", "relative")).toBe("a/./b");
		expect(asURI("a/../b", "relative")).toBe("a/../b");
		expect(asURI("a/b/../c", "relative")).toBe("a/b/../c");
	});

	it("should clip excessive .. segments at root", () => {
		expect(asURI("/../path", "internal")).toBe("/path");
		expect(asURI("/a/../../path", "internal")).toBe("/path");
		expect(asURI("http://example.com/../path", "absolute")).toBe("http://example.com/path");
		expect(asURI("http://example.com/a/../../path", "absolute")).toBe("http://example.com/path");
	});

	it("should preserve leading .. in relative paths for later resolution", () => {
		expect(asURI("../path", "relative")).toBe("../path");
		expect(asURI("../../path", "relative")).toBe("../../path");
		expect(asURI("../a/../b", "relative")).toBe("../a/../b");
	});

	it("should throw TypeError for non-string values", async () => {
		expect(() => asURI(null as unknown as string)).toThrow(TypeError);
		expect(() => asURI(undefined as unknown as string)).toThrow(TypeError);
		expect(() => asURI(123 as unknown as string)).toThrow(TypeError);
		expect(() => asURI({} as unknown as string)).toThrow(TypeError);
		expect(() => asURI([] as unknown as string)).toThrow(TypeError);
	});

});


describe("isIRI", () => {

	it("should return true for valid absolute IRIs", () => {
		iris.absolute.valid.forEach(value => {
			expect(isIRI(value)).toBe(true);
		});
	});

	it("should return false for invalid absolute IRIs", () => {
		iris.absolute.invalid.forEach(({ value }) => {
			expect(isIRI(value)).toBe(false);
		});
	});

	it("should return true for valid relative IRIs with relative variant", () => {
		iris.relative.valid.forEach(value => {
			expect(isIRI(value, "relative")).toBe(true);
		});
	});

	it("should return false for invalid relative IRIs with relative variant", () => {
		iris.relative.invalid.forEach(({ value }) => {
			expect(isIRI(value, "relative")).toBe(false);
		});
	});

	it("should return false for non-absolute IRIs without relative option", () => {
		// Only test paths without scheme - absolute URIs are valid with default "absolute" variant
		const relativePaths = iris.relative.valid.filter(v => !v.includes("://") && !v.startsWith("urn:"));
		relativePaths.forEach(value => {
			expect(isIRI(value)).toBe(false);
		});
	});

});

describe("iri", () => {

	it("should create branded IRI from valid absolute strings", () => {
		iris.absolute.valid.forEach(value => {
			expect(() => asIRI(value, "absolute")).not.toThrow();
			const result = asIRI(value, "absolute");
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid absolute IRIs", () => {
		iris.absolute.invalid.forEach(({ value }) => {
			expect(() => asIRI(value, "absolute")).toThrow(RangeError);
		});
	});

	it("should create branded IRI from valid relative strings with relative variant", () => {
		iris.relative.valid.forEach(value => {
			expect(() => asIRI(value, "relative")).not.toThrow();
			const result = asIRI(value, "relative");
			expect(typeof result).toBe("string");
		});
	});

	it("should throw RangeError for invalid relative IRIs with relative variant", () => {
		iris.relative.invalid.forEach(({ value }) => {
			expect(() => asIRI(value, "relative")).toThrow(RangeError);
		});
	});

	it("should throw RangeError for non-absolute IRIs with absolute variant", () => {
		// Only test actual relative paths (no scheme) - absolute URIs are valid with "absolute" variant
		const relativePaths = iris.relative.valid.filter(v => !v.includes("://") && !v.startsWith("urn:"));
		relativePaths.forEach(value => {
			expect(() => asIRI(value, "absolute")).toThrow(RangeError);
		});
	});

	it("should normalize paths by removing . and resolving .. segments", () => {
		expect(asIRI("/a/./b/../c", "internal")).toBe("/a/c");
	});

	it("should preserve . and .. in relative paths for later resolution", () => {
		expect(asIRI("./path", "relative")).toBe("./path");
		expect(asIRI("a/./b", "relative")).toBe("a/./b");
		expect(asIRI("a/../b", "relative")).toBe("a/../b");
		expect(asIRI("a/b/../c", "relative")).toBe("a/b/../c");
	});

	it("should clip excessive .. segments at root", () => {
		expect(asIRI("/../path", "internal")).toBe("/path");
		expect(asIRI("/a/../../path", "internal")).toBe("/path");
		expect(asIRI("http://example.com/../path", "absolute")).toBe("http://example.com/path");
		expect(asIRI("http://example.com/a/../../path", "absolute")).toBe("http://example.com/path");
	});

	it("should preserve leading .. in relative paths for later resolution", () => {
		expect(asIRI("../path", "relative")).toBe("../path");
		expect(asIRI("../../path", "relative")).toBe("../../path");
		expect(asIRI("../a/../b", "relative")).toBe("../a/../b");
	});

	it("should throw TypeError for non-string values", async () => {
		expect(() => asIRI(null as unknown as string)).toThrow(TypeError);
		expect(() => asIRI(undefined as unknown as string)).toThrow(TypeError);
		expect(() => asIRI(123 as unknown as string)).toThrow(TypeError);
		expect(() => asIRI({} as unknown as string)).toThrow(TypeError);
		expect(() => asIRI([] as unknown as string)).toThrow(TypeError);
	});

});


describe("resolve()", () => {

	describe("hierarchical URIs", () => {

		// RFC 3986 § 5.4 reference resolution examples

		const base = asURI("http://example.com/a/b/c");

		it("should resolve relative path against base", () => {
			expect(resolve(base, asURI("d", "relative"))).toBe("http://example.com/a/b/d");
			expect(resolve(base, asURI("d/e", "relative"))).toBe("http://example.com/a/b/d/e");
		});

		it("should resolve root-relative path against base", () => {
			expect(resolve(base, asURI("/d", "internal"))).toBe("http://example.com/d");
			expect(resolve(base, asURI("/d/e", "internal"))).toBe("http://example.com/d/e");
		});

		it("should resolve empty reference to base", () => {
			expect(resolve(base, asURI("", "relative"))).toBe("http://example.com/a/b/c");
		});

		it("should resolve fragment-only reference", () => {
			expect(resolve(base, asURI("#frag", "relative"))).toBe("http://example.com/a/b/c#frag");
		});

		it("should resolve query-only reference", () => {
			expect(resolve(base, asURI("?query", "relative"))).toBe("http://example.com/a/b/c?query");
		});

		it("should handle dot segments (. and ..)", () => {
			expect(resolve(base, asURI("./d", "relative"))).toBe("http://example.com/a/b/d");
			expect(resolve(base, asURI("../d", "relative"))).toBe("http://example.com/a/d");
			expect(resolve(base, asURI("../../d", "relative"))).toBe("http://example.com/d");
		});

		it("should clip excessive .. segments at root", () => {
			expect(resolve(base, asURI("../../../d", "relative"))).toBe("http://example.com/d");
			expect(resolve(base, asURI("../../../../d", "relative"))).toBe("http://example.com/d");
		});

		it("should preserve absolute reference with scheme", () => {
			expect(resolve(base, asURI("https://other.com/path"))).toBe("https://other.com/path");
		});

	});

	describe("opaque URIs", () => {

		it("should preserve absolute reference with scheme", () => {
			expect(resolve(asURI("urn:example:base"), asURI("urn:example:other"))).toBe("urn:example:other");
		});

		it("should throw for relative reference (no standard resolution)", () => {
			expect(() => resolve(asURI("urn:example:base"), asURI("relative", "relative"))).toThrow(RangeError);
			expect(() => resolve(asURI("urn:example:base"), asURI("../path", "relative"))).toThrow(RangeError);
		});

	});

	describe("normalization", () => {

		it("should normalize . segments in resolved path", () => {
			expect(resolve(asURI("http://example.com/a/b/"), asURI("./c", "relative"))).toBe("http://example.com/a/b/c");
			expect(resolve(asURI("http://example.com/a/b/"), asURI("./c/./d", "relative"))).toBe("http://example.com/a/b/c/d");
		});

		it("should normalize .. segments in resolved path", () => {
			expect(resolve(asURI("http://example.com/a/b/c"), asURI("../d", "relative"))).toBe("http://example.com/a/d");
			expect(resolve(asURI("http://example.com/a/b/c"), asURI("../../d", "relative"))).toBe("http://example.com/d");
		});

		it("should normalize mixed . and .. segments", () => {
			expect(resolve(asURI("http://example.com/a/b/c"), asURI("./d/../e", "relative"))).toBe("http://example.com/a/b/e");
			expect(resolve(asURI("http://example.com/a/b/c"), asURI("./../d", "relative"))).toBe("http://example.com/a/d");
		});

	});

});

describe("internalize()", () => {

	describe("hierarchical URIs", () => {

		const base = asURI("http://example.com/a/b/c");

		it("should extract root-relative path", () => {
			expect(internalize(base, asURI("http://example.com/x/y"))).toBe("/x/y");
			expect(internalize(base, asURI("http://example.com/"))).toBe("/");
		});

		it("should preserve query component", () => {
			expect(internalize(base, asURI("http://example.com/path?query=value"))).toBe("/path?query=value");
		});

		it("should preserve fragment component", () => {
			expect(internalize(base, asURI("http://example.com/path#frag"))).toBe("/path#frag");
			expect(internalize(base, asURI("http://example.com/path?query#frag"))).toBe("/path?query#frag");
		});

		it("should return reference unchanged if different authority", () => {
			expect(internalize(base, asURI("http://other.com/path"))).toBe("http://other.com/path");
			expect(internalize(base, asURI("https://example.com/path"))).toBe("https://example.com/path");
		});

		it("should normalize . segments in internalized path", () => {
			expect(internalize(base, asURI("http://example.com/x/./y"))).toBe("/x/y");
			expect(internalize(base, asURI("http://example.com/./x/./y"))).toBe("/x/y");
		});

		it("should normalize .. segments in internalized path", () => {
			expect(internalize(base, asURI("http://example.com/x/y/../z"))).toBe("/x/z");
			expect(internalize(base, asURI("http://example.com/x/y/z/../../w"))).toBe("/x/w");
		});

	});

	describe("opaque URIs", () => {

		it("should extract scheme-specific part for same scheme", () => {
			const base = asURI("urn:example:base");
			expect(internalize(base, asURI("urn:example:other"))).toBe("example:other");
		});

		it("should return reference unchanged if different scheme", () => {
			const base = asURI("urn:example:base");
			expect(internalize(base, asURI("mailto:user@example.com"))).toBe("mailto:user@example.com");
		});

	});

});

describe("relativize()", () => {

	describe("hierarchical URIs", () => {

		const base = asURI("http://example.com/a/b/c");

		it("should return relative path for same-directory reference", () => {
			expect(relativize(base, asURI("http://example.com/a/b/d"))).toBe("d");
			expect(relativize(base, asURI("http://example.com/a/b/d/e"))).toBe("d/e");
		});

		it("should return parent-relative path (..) for ancestor", () => {
			expect(relativize(base, asURI("http://example.com/a/d"))).toBe("../d");
			expect(relativize(base, asURI("http://example.com/d"))).toBe("../../d");
		});

		it("should return reference unchanged if different scheme", () => {
			expect(relativize(base, asURI("https://example.com/a/b/d"))).toBe("https://example.com/a/b/d");
		});

		it("should return reference unchanged if different authority", () => {
			expect(relativize(base, asURI("http://other.com/a/b/d"))).toBe("http://other.com/a/b/d");
		});

		it("should handle query and fragment components", () => {
			expect(relativize(base, asURI("http://example.com/a/b/d?query"))).toBe("d?query");
			expect(relativize(base, asURI("http://example.com/a/b/d#frag"))).toBe("d#frag");
			expect(relativize(base, asURI("http://example.com/a/b/d?query#frag"))).toBe("d?query#frag");
		});

		it("should normalize . segments in relativized path", () => {
			expect(relativize(base, asURI("http://example.com/a/b/./d"))).toBe("d");
			expect(relativize(base, asURI("http://example.com/a/./b/d"))).toBe("d");
		});

		it("should normalize .. segments in relativized path", () => {
			expect(relativize(base, asURI("http://example.com/a/b/c/../d"))).toBe("d");
			expect(relativize(base, asURI("http://example.com/a/b/../c/d"))).toBe("../c/d");
		});

	});

	describe("opaque URIs", () => {

		it("should return scheme-specific part if same scheme", () => {
			const base = asURI("urn:example:base");
			expect(relativize(base, asURI("urn:example:other"))).toBe("example:other");
		});

		it("should return reference unchanged if different scheme", () => {
			const base = asURI("urn:example:base");
			expect(relativize(base, asURI("mailto:user@example.com"))).toBe("mailto:user@example.com");
		});

	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("namespace", () => {

	const base = asIRI("http://www.w3.org/2000/01/rdf-schema#");

	describe("open namespace (no terms)", () => {

		it("should create namespace factory with dynamic term generation", async () => {
			const ns = createNamespace(base);
			expect(typeof ns).toBe("function");
		});

		it("should return namespace IRI when called without arguments", async () => {
			const ns = createNamespace(base);
			expect(ns()).toBe(base);
			expect(isIRI(ns())).toBe(true);
		});

		it("should generate IRIs dynamically for any term", async () => {
			const ns = createNamespace(base);
			const label = ns("label");
			const comment = ns("comment");

			expect(label).toBe(`${base}label`);
			expect(comment).toBe(`${base}comment`);
			expect(isIRI(label)).toBe(true);
			expect(isIRI(comment)).toBe(true);
		});

		it("should validate generated IRIs", () => {
			const ns = createNamespace(base);
			expect(() => ns("valid-term")).not.toThrow();
			expect(() => ns("invalid term")).toThrow(RangeError);
		});

	});

	describe("closed namespace (with terms)", () => {

		it("should create namespace factory with typed term properties", async () => {
			const ns = createNamespace(base, ["label", "comment"]);
			expect(typeof ns).toBe("function");
			expect(isIRI(ns.label)).toBe(true);
			expect(isIRI(ns.comment)).toBe(true);
		});

		it("should return namespace IRI when called without arguments", async () => {
			const ns = createNamespace(base, ["label", "comment"] as const);
			expect(ns()).toBe(base);
			expect(isIRI(ns())).toBe(true);
		});

		it("should provide access to predefined terms via properties", async () => {
			const ns = createNamespace(base, ["label", "comment"] as const);
			expect(ns.label).toBe(`${base}label`);
			expect(ns.comment).toBe(`${base}comment`);
		});

		it("should provide access to predefined terms via function call", () => {
			const ns = createNamespace(base, ["label", "comment"] as const);
			expect(ns("label")).toBe(ns.label);
			expect(ns("comment")).toBe(ns.comment);
		});

		it("should throw RangeError for undefined terms", () => {
			const ns = createNamespace(base, ["label", "comment"] as const);
			expect(() => ns("seeAlso")).toThrow(RangeError);
		});

	});

	describe("edge cases", () => {

		it("should handle empty terms array as open namespace", () => {
			const ns = createNamespace(base, []);
			expect(() => ns("anyTerm")).not.toThrow();
			expect(ns("label")).toBe(`${base}label`);
		});

		it("should handle namespace with single term", () => {
			const ns = createNamespace(base, ["label"] as const);
			expect(ns.label).toBe(`${base}label`);
			expect(() => ns("comment")).toThrow(RangeError);
		});

	});

});

describe("fetcher()", () => {

	describe("successful responses", () => {

		it("should resolve with response when response.ok is true", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: "OK"
			} as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			const result = await guard("https://api.example.com/data");

			expect(result).toBe(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/data", undefined);
		});

		it("should pass through init parameter to base fetch", async () => {
			const mockResponse = { ok: true, status: 200 } as Response;
			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
			await guard("https://api.example.com/data", init);

			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/data", init);
		});

	});

	describe("fetch exceptions", () => {

		it("should reject with Problem status 0 when fetch throws", async () => {
			const mockFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("Network error"));
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 0,
					detail: "fetch error <Error: Network error>"
				});
		});

		it("should handle TypeError from fetch (e.g., CORS)", async () => {
			const mockFetch = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 0,
					detail: "fetch error <TypeError: Failed to fetch>"
				});
		});

	});

	describe("non-ok responses with text/plain", () => {

		it("should reject with Problem containing text report", async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: {
					get: vi.fn().mockReturnValue("text/plain")
				},
				text: vi.fn().mockResolvedValue("Resource not found")
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/missing"))
				.rejects
				.toMatchObject({
					status: 404,
					detail: "Not Found",
					report: "Resource not found"
				});
		});

		it("should handle text/plain with charset", async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: "Bad Request",
				headers: {
					get: vi.fn().mockReturnValue("text/plain; charset=utf-8")
				},
				text: vi.fn().mockResolvedValue("Invalid request parameters")
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 400,
					report: "Invalid request parameters"
				});
		});

		it("should reject without report if text parsing fails", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: {
					get: vi.fn().mockReturnValue("text/plain")
				},
				text: vi.fn().mockRejectedValue(new Error("Parse error"))
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 500,
					detail: "Internal Server Error"
				});

			const error: Problem = await guard("https://api.example.com/data").catch((e: unknown) => e as Problem);
			expect(error.report).toBeUndefined();
		});

	});

	describe("non-ok responses with JSON content types", () => {

		it("should reject with Problem containing JSON report for application/json", async () => {
			const reportData = { timestamp: "2025-12-07T10:00:00Z", errors: ["field1", "field2"] };
			const mockResponse = {
				ok: false,
				status: 422,
				statusText: "Unprocessable Entity",
				headers: {
					get: vi.fn().mockReturnValue("application/json")
				},
				json: vi.fn().mockResolvedValue(reportData)
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 422,
					detail: "Unprocessable Entity",
					report: reportData
				});
		});

		it("should handle application/problem+json", async () => {
			const reportData = { type: "validation-error", fields: ["email"] };
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: "Bad Request",
				headers: {
					get: vi.fn().mockReturnValue("application/problem+json")
				},
				json: vi.fn().mockResolvedValue(reportData)
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 400,
					report: reportData
				});
		});

		it("should handle application/ld+json", async () => {
			const reportData = { "@context": "http://schema.org", "@type": "Error" };
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: {
					get: vi.fn().mockReturnValue("application/ld+json")
				},
				json: vi.fn().mockResolvedValue(reportData)
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 500,
					report: reportData
				});
		});

		it("should handle JSON with charset", async () => {
			const reportData = { error: "unauthorized" };
			const mockResponse = {
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				headers: {
					get: vi.fn().mockReturnValue("application/json; charset=utf-8")
				},
				json: vi.fn().mockResolvedValue(reportData)
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 401,
					report: reportData
				});
		});

		it("should reject without report if JSON parsing fails", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: {
					get: vi.fn().mockReturnValue("application/json")
				},
				json: vi.fn().mockRejectedValue(new Error("Invalid JSON"))
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 500,
					detail: "Internal Server Error"
				});

			const error: Problem = await guard("https://api.example.com/data").catch((e: unknown) => e as Problem);
			expect(error.report).toBeUndefined();
		});

	});

	describe("non-ok responses with other content types", () => {

		it("should reject with Problem without report for text/html", async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: {
					get: vi.fn().mockReturnValue("text/html")
				}
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 404,
					detail: "Not Found"
				});

			const error: Problem = await guard("https://api.example.com/data").catch((e: unknown) => e as Problem);
			expect(error.report).toBeUndefined();
		});

		it("should reject with Problem without report for application/xml", async () => {
			const mockResponse = {
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				headers: {
					get: vi.fn().mockReturnValue("application/xml")
				}
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 503,
					detail: "Service Unavailable"
				});

			const error: Problem = await guard("https://api.example.com/data").catch((e: unknown) => e as Problem);
			expect(error.report).toBeUndefined();
		});

		it("should reject with Problem without report when Content-Type is null", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: {
					get: vi.fn().mockReturnValue(null)
				}
			} as unknown as Response;

			const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
			const guard = createFetch(mockFetch);

			await expect(guard("https://api.example.com/data"))
				.rejects
				.toMatchObject({
					status: 500,
					detail: "Internal Server Error"
				});

			const error: Problem = await guard("https://api.example.com/data").catch((e: unknown) => e as Problem);
			expect(error.report).toBeUndefined();
		});

	});

});
