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

import { describe, expect, it } from "vitest";
import {
	app,
	createNamespace,
	getIRIBase,
	getNamespaceBase,
	getNamespaceIRI,
	internalize,
	isIRI,
	isNestedIRI,
	relativize,
	resolve,
	type Variant
} from "./resource.js";


const iris = {
	hierarchical: {
		valid: [
			"http://example.com/path", // with authority
			"https://example.com/", // with authority, root path
			"app:/path", // no authority, root-relative path
			"app:/", // no authority, root path only
			"file:///path/to/file" // empty authority, root-relative path
		],
		invalid: [
			{ value: "urn:example:resource", reason: "opaque URI (no root-relative path)" },
			{ value: "mailto:user@example.com", reason: "opaque URI" },
			{ value: "app:path", reason: "no root-relative path (path-rootless)" },
			{ value: "/path", reason: "no scheme" },
			{ value: "path", reason: "relative reference" },
			{ value: "http://example.com/\uD800", reason: "isolated high surrogate" }
		]
	},
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
			{ value: "http://example.com/grave`here", reason: "backtick in path" },
			{ value: "http://example.com/\uD800", reason: "isolated high surrogate in path" },
			{ value: "urn:example:\uDC00", reason: "isolated low surrogate in SSP" }
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
			{ value: "path`backtick", reason: "backtick character" },
			{ value: "path/\uD800", reason: "isolated high surrogate" },
			{ value: "path/\uDE00\uD83D", reason: "reversed surrogate pair" }
		]
	}
};


describe("IRI", () => {

	describe("isIRI()", () => {

		describe("hierarchical variant", () => {

			it("should return true for absolute IRIs with root-relative path", async () => {
				iris.hierarchical.valid.forEach(value => {
					expect(isIRI(value, "hierarchical")).toBe(true);
				});
			});

			it("should return true for absolute hierarchical IRIs with authority", async () => {
				const hierarchicalWithAuthority = iris.absolute.valid.filter(v => v.includes("://"));
				hierarchicalWithAuthority.forEach(value => {
					expect(isIRI(value, "hierarchical")).toBe(true);
				});
			});

			it("should return false for opaque URIs and relative references", async () => {
				iris.hierarchical.invalid.forEach(({ value }) => {
					expect(isIRI(value, "hierarchical")).toBe(false);
				});
			});

		});

		describe("absolute variant", () => {

			it("should return true for valid absolute IRIs", async () => {
				iris.absolute.valid.forEach(value => {
					expect(isIRI(value)).toBe(true);
				});
			});

			it("should return false for invalid absolute IRIs", async () => {
				iris.absolute.invalid.forEach(({ value }) => {
					expect(isIRI(value, "absolute")).toBe(false);
				});
			});

		});

		describe("relative variant", () => {

			it("should return true for valid relative IRIs", async () => {
				iris.relative.valid.forEach(value => {
					expect(isIRI(value, "relative")).toBe(true);
				});
			});

			it("should return false for invalid relative IRIs", async () => {
				iris.relative.invalid.forEach(({ value }) => {
					expect(isIRI(value, "relative")).toBe(false);
				});
			});

		});

		describe("variant hierarchy", () => {

			it("should validate hierarchical IRIs as absolute", async () => {
				iris.hierarchical.valid.forEach(value => {
					expect(isIRI(value, "absolute")).toBe(true);
				});
			});

			it("should return false for non-absolute IRIs with absolute variant", async () => {
				const relativePaths = iris.relative.valid.filter(v => !v.includes("://") && !v.startsWith("urn:"));
				relativePaths.forEach(value => {
					expect(isIRI(value, "absolute")).toBe(false);
				});
			});

		});

	});

	describe("isNestedIRI()", () => {

		describe("same-origin hierarchical URIs", () => {

			it("should return true when parent equals child", async () => {
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/b")).toBeTruthy();
				expect(isNestedIRI("http://example.com/", "http://example.com/")).toBeTruthy();
				expect(isNestedIRI("http://example.com/a", "http://example.com/a")).toBeTruthy();
			});

			it("should return true when child extends parent path", async () => {
				expect(isNestedIRI("http://example.com/a", "http://example.com/a/b")).toBeTruthy();
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/b/c")).toBeTruthy();
				expect(isNestedIRI("http://example.com/", "http://example.com/a/b")).toBeTruthy();
			});

			it("should return false when child path is not under parent", async () => {
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a")).toBeFalsy();
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/c")).toBeFalsy();
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/c")).toBeFalsy();
			});

			it("should require segment boundary match", async () => {
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/bc")).toBeFalsy();
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/bcd")).toBeFalsy();
				expect(isNestedIRI("http://example.com/ab", "http://example.com/abc")).toBeFalsy();
			});

		});

		describe("query strings and fragments", () => {

			it("should ignore query strings on parent", async () => {
				expect(isNestedIRI("http://example.com/a?q=1", "http://example.com/a/b")).toBeTruthy();
			});

			it("should ignore query strings on child", async () => {
				expect(isNestedIRI("http://example.com/a", "http://example.com/a/b?q=1")).toBeTruthy();
			});

			it("should ignore fragments on parent", async () => {
				expect(isNestedIRI("http://example.com/a#frag", "http://example.com/a/b")).toBeTruthy();
			});

			it("should ignore fragments on child", async () => {
				expect(isNestedIRI("http://example.com/a", "http://example.com/a/b#frag")).toBeTruthy();
			});

			it("should ignore query strings and fragments on both", async () => {
				expect(isNestedIRI("http://example.com/a?q=1#f1", "http://example.com/a/b?q=2#f2")).toBeTruthy();
			});

		});

		describe("different origins", () => {

			it("should return false for different schemes", async () => {
				expect(isNestedIRI("http://example.com/a", "https://example.com/a/b")).toBeFalsy();
			});

			it("should return false for different authorities", async () => {
				expect(isNestedIRI("http://example.com/a", "http://other.com/a/b")).toBeFalsy();
			});

			it("should return false for different ports", async () => {
				expect(isNestedIRI("http://example.com/a", "http://example.com:8080/a/b")).toBeFalsy();
			});

		});

		describe("non-hierarchical identifiers", () => {

			it("should return false for opaque URIs", async () => {
				expect(isNestedIRI("urn:example:a", "urn:example:a:b")).toBeFalsy();
				expect(isNestedIRI("mailto:user@example.com", "mailto:user@example.com")).toBeFalsy();
			});

			it("should return false for internal references", async () => {
				expect(isNestedIRI("/a/b", "/a/b/c")).toBeFalsy();
			});

			it("should return false for relative references", async () => {
				expect(isNestedIRI("a/b", "a/b/c")).toBeFalsy();
			});

		});

		describe("path normalization", () => {

			it("should normalize dot segments before comparison", async () => {
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/b/./c")).toBeTruthy();
				expect(isNestedIRI("http://example.com/a/./b", "http://example.com/a/b/c")).toBeTruthy();
			});

			it("should normalize double-dot segments before comparison", async () => {
				expect(isNestedIRI("http://example.com/a/b", "http://example.com/a/b/c/../d")).toBeTruthy();
				expect(isNestedIRI("http://example.com/a/b/../c", "http://example.com/a/c/d")).toBeTruthy();
			});

		});

	});


	describe("getIRIBase()", () => {

		describe("hierarchical URIs with authority", () => {

			it("should extract base with trailing slash", async () => {
				expect(getIRIBase("http://example.com/path")).toBe("http://example.com/");
				expect(getIRIBase("https://example.com/a/b/c")).toBe("https://example.com/");
			});

			it("should preserve port", async () => {
				expect(getIRIBase("http://example.com:8080/path")).toBe("http://example.com:8080/");
			});

			it("should strip query and fragment", async () => {
				expect(getIRIBase("http://example.com/path?q=1")).toBe("http://example.com/");
				expect(getIRIBase("http://example.com/path#frag")).toBe("http://example.com/");
				expect(getIRIBase("http://example.com/path?q=1#frag")).toBe("http://example.com/");
			});

			it("should return the base unchanged when IRI is already the base", async () => {
				expect(getIRIBase("http://example.com/")).toBe("http://example.com/");
				expect(getIRIBase("https://example.com/")).toBe("https://example.com/");
			});

		});

		describe("hierarchical URIs without authority", () => {

			it("should return scheme with trailing slash", async () => {
				expect(getIRIBase("app:/path")).toBe("app:/");
				expect(getIRIBase("app:/a/b/c")).toBe("app:/");
			});

			it("should return the base unchanged for scheme:/ alone", async () => {
				expect(getIRIBase("app:/")).toBe("app:/");
			});

		});

		describe("hierarchical URIs with empty authority", () => {

			it("should preserve empty authority with trailing slash", async () => {
				expect(getIRIBase("file:///path/to/file")).toBe("file:///");
			});

		});

		describe("invalid inputs", () => {

			it("should return undefined for opaque URIs", async () => {
				expect(getIRIBase("urn:example:resource")).toBeUndefined();
				expect(getIRIBase("mailto:user@example.com")).toBeUndefined();
			});

			it("should return undefined for internal references", async () => {
				expect(getIRIBase("/a/b")).toBeUndefined();
			});

			it("should return undefined for relative references", async () => {
				expect(getIRIBase("../path")).toBeUndefined();
				expect(getIRIBase("path")).toBeUndefined();
			});

			it("should return undefined for non-hierarchical absolute references without root-relative path", async () => {
				expect(getIRIBase("app:path")).toBeUndefined();
			});

		});

		describe("usability as base", () => {

			it("should return a value usable as a base for resolve", async () => {
				const iri = getIRIBase("http://example.com/a/b/c");
				expect(resolve(iri!, "x/y")).toBe("http://example.com/x/y");
			});

			it("should return a valid hierarchical IRI", async () => {
				expect(isIRI(getIRIBase("http://example.com/a/b/c"), "hierarchical")).toBe(true);
				expect(isIRI(getIRIBase("app:/a/b"), "hierarchical")).toBe(true);
				expect(isIRI(getIRIBase("file:///a/b"), "hierarchical")).toBe(true);
			});

		});

	});


	describe("resolve()", () => {

		describe("hierarchical URIs with authority", () => {

			// RFC 3986 § 5.4 reference resolution examples

			const base = "http://example.com/a/b/c";

			it("should resolve relative path against base", async () => {
				expect(resolve(base, "d")).toBe("http://example.com/a/b/d");
				expect(resolve(base, "d/e")).toBe("http://example.com/a/b/d/e");
			});

			it("should resolve root-relative path against base", async () => {
				expect(resolve(base, "/d")).toBe("http://example.com/d");
				expect(resolve(base, "/d/e")).toBe("http://example.com/d/e");
			});

			it("should resolve empty reference to base", async () => {
				expect(resolve(base, "")).toBe("http://example.com/a/b/c");
			});

			it("should resolve fragment-only reference", async () => {
				expect(resolve(base, "#frag")).toBe("http://example.com/a/b/c#frag");
			});

			it("should resolve query-only reference", async () => {
				expect(resolve(base, "?query")).toBe("http://example.com/a/b/c?query");
			});

			it("should handle dot segments (. and ..)", async () => {
				expect(resolve(base, "./d")).toBe("http://example.com/a/b/d");
				expect(resolve(base, "../d")).toBe("http://example.com/a/d");
				expect(resolve(base, "../../d")).toBe("http://example.com/d");
			});

			it("should clip excessive .. segments at root", async () => {
				expect(resolve(base, "../../../d")).toBe("http://example.com/d");
				expect(resolve(base, "../../../../d")).toBe("http://example.com/d");
			});

			it("should preserve absolute reference with scheme", async () => {
				expect(resolve(base, "https://other.com/path")).toBe("https://other.com/path");
			});

		});

		describe("hierarchical URIs without authority", () => {

			// RFC 3986 § 5.2.3 — resolution works for authority-less hierarchical URIs

			const base = "app:/a/b/c";

			it("should resolve relative path against base", async () => {
				expect(resolve(base, "d")).toBe("app:/a/b/d");
				expect(resolve(base, "d/e")).toBe("app:/a/b/d/e");
			});

			it("should resolve root-relative path against base", async () => {
				expect(resolve(base, "/d")).toBe("app:/d");
				expect(resolve(base, "/d/e")).toBe("app:/d/e");
			});

			it("should resolve empty reference to base", async () => {
				expect(resolve(base, "")).toBe("app:/a/b/c");
			});

			it("should resolve fragment-only reference", async () => {
				expect(resolve(base, "#frag")).toBe("app:/a/b/c#frag");
			});

			it("should resolve query-only reference", async () => {
				expect(resolve(base, "?query")).toBe("app:/a/b/c?query");
			});

			it("should handle dot segments (. and ..)", async () => {
				expect(resolve(base, "./d")).toBe("app:/a/b/d");
				expect(resolve(base, "../d")).toBe("app:/a/d");
				expect(resolve(base, "../../d")).toBe("app:/d");
			});

			it("should clip excessive .. segments at root", async () => {
				expect(resolve(base, "../../../d")).toBe("app:/d");
				expect(resolve(base, "../../../../d")).toBe("app:/d");
			});

		});

		describe("opaque URIs", () => {

			it("should preserve absolute reference with scheme", () => {
				expect(resolve("urn:example:base", "urn:example:other")).toBe("urn:example:other");
			});

			it("should throw for relative reference (no standard resolution)", () => {
				expect(() => resolve("urn:example:base", "relative")).toThrow(RangeError);
				expect(() => resolve("urn:example:base", "../path")).toThrow(RangeError);
			});

		});

		describe("normalization", () => {

			it("should normalize . segments in resolved path", () => {
				expect(resolve("http://example.com/a/b/", "./c")).toBe("http://example.com/a/b/c");
				expect(resolve("http://example.com/a/b/", "./c/./d")).toBe("http://example.com/a/b/c/d");
			});

			it("should normalize .. segments in resolved path", () => {
				expect(resolve("http://example.com/a/b/c", "../d")).toBe("http://example.com/a/d");
				expect(resolve("http://example.com/a/b/c", "../../d")).toBe("http://example.com/d");
			});

			it("should normalize mixed . and .. segments", () => {
				expect(resolve("http://example.com/a/b/c", "./d/../e")).toBe("http://example.com/a/b/e");
				expect(resolve("http://example.com/a/b/c", "./../d")).toBe("http://example.com/a/d");
			});

		});

	});

	describe("internalize()", () => {

		describe("hierarchical URIs", () => {

			const base = "http://example.com/a/b/c";

			it("should extract root-relative path", () => {
				expect(internalize(base, "http://example.com/x/y")).toBe("/x/y");
				expect(internalize(base, "http://example.com/")).toBe("/");
			});

			it("should preserve query component", () => {
				expect(internalize(base, "http://example.com/path?query=value")).toBe("/path?query=value");
			});

			it("should preserve fragment component", () => {
				expect(internalize(base, "http://example.com/path#frag")).toBe("/path#frag");
				expect(internalize(base, "http://example.com/path?query#frag")).toBe("/path?query#frag");
			});

			it("should return reference unchanged if different authority", () => {
				expect(internalize(base, "http://other.com/path")).toBe("http://other.com/path");
				expect(internalize(base, "https://example.com/path")).toBe("https://example.com/path");
			});

			it("should normalize . segments in internalized path", () => {
				expect(internalize(base, "http://example.com/x/./y")).toBe("/x/y");
				expect(internalize(base, "http://example.com/./x/./y")).toBe("/x/y");
			});

			it("should normalize .. segments in internalized path", () => {
				expect(internalize(base, "http://example.com/x/y/../z")).toBe("/x/z");
				expect(internalize(base, "http://example.com/x/y/z/../../w")).toBe("/x/w");
			});

		});

		describe("opaque URIs", () => {

			it("should extract scheme-specific part for same scheme", () => {
				const base = "urn:example:base";
				expect(internalize(base, "urn:example:other")).toBe("example:other");
			});

			it("should return reference unchanged if different scheme", () => {
				const base = "urn:example:base";
				expect(internalize(base, "mailto:user@example.com")).toBe("mailto:user@example.com");
			});

		});

	});

	describe("relativize()", () => {

		describe("hierarchical URIs", () => {

			const base = "http://example.com/a/b/c";

			it("should return relative path for same-directory reference", () => {
				expect(relativize(base, "http://example.com/a/b/d")).toBe("d");
				expect(relativize(base, "http://example.com/a/b/d/e")).toBe("d/e");
			});

			it("should return parent-relative path (..) for ancestor", () => {
				expect(relativize(base, "http://example.com/a/d")).toBe("../d");
				expect(relativize(base, "http://example.com/d")).toBe("../../d");
			});

			it("should return reference unchanged if different scheme", () => {
				expect(relativize(base, "https://example.com/a/b/d")).toBe("https://example.com/a/b/d");
			});

			it("should return reference unchanged if different authority", () => {
				expect(relativize(base, "http://other.com/a/b/d")).toBe("http://other.com/a/b/d");
			});

			it("should handle query and fragment components", () => {
				expect(relativize(base, "http://example.com/a/b/d?query")).toBe("d?query");
				expect(relativize(base, "http://example.com/a/b/d#frag")).toBe("d#frag");
				expect(relativize(base, "http://example.com/a/b/d?query#frag")).toBe("d?query#frag");
			});

			it("should normalize . segments in relativized path", () => {
				expect(relativize(base, "http://example.com/a/b/./d")).toBe("d");
				expect(relativize(base, "http://example.com/a/./b/d")).toBe("d");
			});

			it("should normalize .. segments in relativized path", () => {
				expect(relativize(base, "http://example.com/a/b/c/../d")).toBe("d");
				expect(relativize(base, "http://example.com/a/b/../c/d")).toBe("../c/d");
			});

		});

		describe("opaque URIs", () => {

			it("should return scheme-specific part if same scheme", () => {
				const base = "urn:example:base";
				expect(relativize(base, "urn:example:other")).toBe("example:other");
			});

			it("should return reference unchanged if different scheme", () => {
				const base = "urn:example:base";
				expect(relativize(base, "mailto:user@example.com")).toBe("mailto:user@example.com");
			});

		});

	});


	describe("well-formedness", () => {

		const malformed = [
			{ text: "\uD800", reason: "isolated high surrogate" },
			{ text: "\uDC00", reason: "isolated low surrogate" },
			{ text: "\uDE00\uD83D", reason: "reversed surrogate pair" }
		];

		const references: { variant: Variant, reference: (text: string) => string }[] = [
			{ variant: "hierarchical", reference: text => `http://example.com/${text}` },
			{ variant: "absolute", reference: text => `urn:example:${text}` },
			{ variant: "internal", reference: text => `/path/${text}` },
			{ variant: "relative", reference: text => `path/${text}` }
		];

		it("should reject isolated surrogates in every variant", async () => {
			malformed.forEach(({ text }) => {
				references.forEach(({ variant, reference }) => {
					expect(isIRI(reference(text), variant)).toBe(false);
				});
			});
		});

		it("should accept supplementary characters in every variant", async () => {
			references.forEach(({ variant, reference }) => {
				expect(isIRI(reference("😀"), variant)).toBe(true);
			});
		});

		it("should reject isolated surrogates in reference operations", async () => {
			const base = "http://example.com/a/b";
			malformed.forEach(({ text }) => {
				expect(() => resolve(base, `x/${text}`)).toThrow(RangeError);
				expect(() => internalize(base, `http://example.com/${text}`)).toThrow(RangeError);
				expect(() => relativize(base, `http://example.com/${text}`)).toThrow(RangeError);
				expect(() => resolve(`http://example.com/${text}`, "x")).toThrow(RangeError);
			});
		});

		it("should report isolated surrogates as not nesting", async () => {
			malformed.forEach(({ text }) => {
				expect(isNestedIRI("http://example.com/", `http://example.com/${text}`)).toBe(false);
				expect(isNestedIRI(`http://example.com/${text}`, `http://example.com/${text}`)).toBe(false);
			});
		});

		it("should reject isolated surrogates in namespace IRIs", async () => {
			malformed.forEach(({ text }) => {
				expect(() => createNamespace(`http://example.com/${text}#`)).toThrow(RangeError);
			});
		});

	});

});

describe("Namespace", () => {

	describe("createNamespace", () => {

		const base = "http://www.w3.org/2000/01/rdf-schema#";

		describe("open namespace (no terms)", () => {

			it("should create namespace object", async () => {
				const ns = createNamespace(base);
				expect(typeof ns).toBe("object");
			});

			it("should return namespace IRI via empty string key", async () => {
				const ns = createNamespace(base);
				expect(ns[""]).toBe(base);
				expect(isIRI(ns[""])).toBe(true);
			});

			it("should generate IRIs dynamically for any term", async () => {
				const ns = createNamespace(base);
				const label = ns["label"];
				const comment = ns["comment"];

				expect(label).toBe(`${base}label`);
				expect(comment).toBe(`${base}comment`);
				expect(isIRI(label)).toBe(true);
				expect(isIRI(comment)).toBe(true);
			});

			it("should validate generated IRIs", async () => {
				const ns = createNamespace(base);
				expect(ns["valid-term"]).toBe(`${base}valid-term`);
				expect(() => ns["invalid term"]).toThrow(RangeError);
			});

		});

		describe("closed namespace (with terms)", () => {

			it("should create namespace object with typed term properties", async () => {
				const ns = createNamespace(base, ["label", "comment"]);
				expect(typeof ns).toBe("object");
				expect(isIRI(ns.label)).toBe(true);
				expect(isIRI(ns.comment)).toBe(true);
			});

			it("should return namespace IRI via empty string key", async () => {
				const ns = createNamespace(base, ["label", "comment"] as const);
				expect(ns[""]).toBe(base);
				expect(isIRI(ns[""])).toBe(true);
			});

			it("should provide access to predefined terms via properties", async () => {
				const ns = createNamespace(base, ["label", "comment"] as const);
				expect(ns.label).toBe(`${base}label`);
				expect(ns.comment).toBe(`${base}comment`);
			});

			it("should provide access to predefined terms via bracket notation", async () => {
				const ns = createNamespace(base, ["label", "comment"] as const);
				expect(ns["label"]).toBe(ns.label);
				expect(ns["comment"]).toBe(ns.comment);
			});

			it("should throw RangeError for undefined terms", async () => {
				const ns = createNamespace(base, ["label", "comment"] as const);
				expect(() => (ns as any)["seeAlso"]).toThrow(RangeError);
			});

		});

		describe("namespace validation", () => {

			it("should reject non-absolute namespace IRI", async () => {
				expect(() => createNamespace("not-absolute")).toThrow(RangeError);
				expect(() => createNamespace("/root-relative")).toThrow(RangeError);
				expect(() => createNamespace("../relative")).toThrow(RangeError);
			});

			it("should reject non-absolute namespace IRI with terms", async () => {
				expect(() => createNamespace("not-absolute", ["term"])).toThrow(RangeError);
				expect(() => createNamespace("/root-relative", ["term"])).toThrow(RangeError);
			});

			it("should accept absolute namespace IRI", async () => {
				expect(() => createNamespace("http://example.org/")).not.toThrow();
				expect(() => createNamespace("urn:example:")).not.toThrow();
			});

		});

		describe("edge cases", () => {

			it("should handle empty terms array as open namespace", async () => {
				const ns = createNamespace(base, []);
				expect((ns as any)["label"]).toBe(`${base}label`);
			});

			it("should handle namespace with single term", async () => {
				const ns = createNamespace(base, ["label"] as const);
				expect(ns.label).toBe(`${base}label`);
				expect(() => (ns as any)["comment"]).toThrow(RangeError);
			});

			it("should handle 'name' term without throwing", async () => {
				const ns = createNamespace(base, ["name"] as const);
				expect(ns.name).toBe(`${base}name`);
				expect(ns["name"]).toBe(`${base}name`);
			});

			it("should handle 'length' term without throwing", async () => {
				const ns = createNamespace(base, ["length"] as const);
				expect(ns.length).toBe(`${base}length`);
				expect(ns["length"]).toBe(`${base}length`);
			});

			it("should handle 'caller' term without throwing", async () => {
				const ns = createNamespace(base, ["caller"] as const);
				expect(ns.caller).toBe(`${base}caller`);
				expect(ns["caller"]).toBe(`${base}caller`);
			});

		});

	});

	describe("getNamespaceIRI()", () => {

		it("should return the IRI of an open namespace", async () => {
			expect(getNamespaceIRI(createNamespace("http://example.org/ns#"))).toBe("http://example.org/ns#");
		});

		it("should return the IRI of a closed namespace", async () => {
			expect(getNamespaceIRI(createNamespace("http://example.org/ns#", ["label"]))).toBe("http://example.org/ns#");
		});

		it("should return the IRI of an opaque namespace", async () => {
			expect(getNamespaceIRI(createNamespace("urn:example:"))).toBe("urn:example:");
		});

		it("should return the IRI of the app namespace", async () => {
			expect(getNamespaceIRI(app)).toBe("app:/#");
		});

	});

	describe("getNamespaceBase()", () => {

		it("should return the base of a namespace with authority", async () => {
			expect(getNamespaceBase(createNamespace("http://example.org/a/ns#"))).toBe("http://example.org/");
		});

		it("should return the base of a namespace without authority", async () => {
			expect(getNamespaceBase(app)).toBe("app:/");
		});

		it("should return the base of a closed namespace", async () => {
			expect(getNamespaceBase(createNamespace("http://example.org/a/ns#", ["label"]))).toBe("http://example.org/");
		});

		it("should return undefined for an opaque namespace", async () => {
			expect(getNamespaceBase(createNamespace("urn:example:"))).toBeUndefined();
		});

		it("should return a base usable for resolving namespace terms", async () => {
			const namespaceBase = getNamespaceBase(createNamespace("http://example.org/a/ns#")) ?? "";

			expect(isIRI(namespaceBase, "hierarchical")).toBe(true);
			expect(resolve(namespaceBase, "b/c")).toBe("http://example.org/b/c");
		});

	});

});
