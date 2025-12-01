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

import { describe, expect, it } from "vitest";
import { iri, isIRI, isURI, namespace, uri } from "./network.js";


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
			"./current/resource",
			"/absolute/path",
			"resource",
			"path/with-dashes_underscores",
			"path?query=value",
			"path#fragment",
			"path?query=value#fragment"
		],
		invalid: [
			{ value: "http://example.com/absolute", reason: "absolute IRI with scheme" },
			{ value: "https://example.com", reason: "absolute IRI with scheme" },
			{ value: "urn:example:resource", reason: "URN with scheme" },
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
			"./current/resource",
			"/absolute/path",
			"resource",
			"path?query=value",
			"path#fragment"
		],
		invalid: [
			{ value: "http://example.com/absolute", reason: "absolute URI with scheme" },
			{ value: "path/资源", reason: "Unicode characters" },
			{ value: "path/café", reason: "Unicode characters" },
			{ value: "path with spaces", reason: "whitespace in path" }
		]
	}
};


describe("isURI", () => {

	it("should return true for valid absolute ASCII-only URIs", () => {
		uris.absolute.valid.forEach(value => {
			expect(isURI(value)).toBe(true);
		});
	});

	it("should return false for invalid absolute URIs", () => {
		uris.absolute.invalid.forEach(({ value }) => {
			expect(isURI(value)).toBe(false);
		});
	});

	it("should return false for URIs with Unicode characters", () => {
		expect(isURI("http://example.com/资源")).toBe(false);
		expect(isURI("http://example.com/café")).toBe(false);
		expect(isURI("urn:example:数据")).toBe(false);
	});

	it("should return true for valid relative ASCII-only URIs with relative option", () => {
		uris.relative.valid.forEach(value => {
			expect(isURI(value, { relative: true })).toBe(true);
		});
	});

	it("should return false for invalid relative URIs with relative option", () => {
		uris.relative.invalid.forEach(({ value }) => {
			expect(isURI(value, { relative: true })).toBe(false);
		});
	});

	it("should return false for relative URIs without relative option", () => {
		uris.relative.valid.forEach(value => {
			expect(isURI(value)).toBe(false);
		});
	});

	it("should return true for ASCII URIs that are also valid IRIs", () => {
		uris.absolute.valid.forEach(value => {
			expect(isURI(value)).toBe(true);
			expect(isIRI(value)).toBe(true);
		});
	});

});

describe("uri", () => {

	it("should create branded URI from valid absolute ASCII-only strings", () => {
		uris.absolute.valid.forEach(value => {
			expect(() => uri(value)).not.toThrow();
			const result = uri(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid absolute URIs", () => {
		uris.absolute.invalid.forEach(({ value }) => {
			expect(() => uri(value)).toThrow(RangeError);
		});
	});

	it("should throw RangeError for URIs with Unicode characters", () => {
		expect(() => uri("http://example.com/资源")).toThrow(RangeError);
		expect(() => uri("http://example.com/café")).toThrow(RangeError);
		expect(() => uri("urn:example:数据")).toThrow(RangeError);
	});

	it("should create branded URI from valid relative ASCII-only strings with relative option", () => {
		uris.relative.valid.forEach(value => {
			expect(() => uri(value, { relative: true })).not.toThrow();
			const result = uri(value, { relative: true });
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid relative URIs with relative option", () => {
		uris.relative.invalid.forEach(({ value }) => {
			expect(() => uri(value, { relative: true })).toThrow(RangeError);
		});
	});

	it("should throw RangeError for relative URIs without relative option", () => {
		uris.relative.valid.forEach(value => {
			expect(() => uri(value)).toThrow(RangeError);
		});
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

	it("should return true for valid relative IRIs with relative option", () => {
		iris.relative.valid.forEach(value => {
			expect(isIRI(value, { relative: true })).toBe(true);
		});
	});

	it("should return false for invalid relative IRIs with relative option", () => {
		iris.relative.invalid.forEach(({ value }) => {
			expect(isIRI(value, { relative: true })).toBe(false);
		});
	});

	it("should return false for relative IRIs without relative option", () => {
		iris.relative.valid.forEach(value => {
			expect(isIRI(value)).toBe(false);
		});
	});

});

describe("iri", () => {

	it("should create branded IRI from valid absolute strings", () => {
		iris.absolute.valid.forEach(value => {
			expect(() => iri(value)).not.toThrow();
			const result = iri(value);
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid absolute IRIs", () => {
		iris.absolute.invalid.forEach(({ value }) => {
			expect(() => iri(value)).toThrow(RangeError);
		});
	});

	it("should create branded IRI from valid relative strings with relative option", () => {
		iris.relative.valid.forEach(value => {
			expect(() => iri(value, { relative: true })).not.toThrow();
			const result = iri(value, { relative: true });
			expect(typeof result).toBe("string");
			expect(result).toBe(value);
		});
	});

	it("should throw RangeError for invalid relative IRIs with relative option", () => {
		iris.relative.invalid.forEach(({ value }) => {
			expect(() => iri(value, { relative: true })).toThrow(RangeError);
		});
	});

	it("should throw RangeError for relative IRIs without relative option", () => {
		iris.relative.valid.forEach(value => {
			expect(() => iri(value)).toThrow(RangeError);
		});
	});

});

describe("namespace", () => {

	const base = iri("http://www.w3.org/2000/01/rdf-schema#");

	describe("open namespace (no terms)", () => {

		it("should create namespace factory with dynamic term generation", () => {
			const ns = namespace(base);
			expect(typeof ns).toBe("function");
		});

		it("should generate IRIs dynamically for any term", () => {
			const ns = namespace(base);
			const label = ns("label");
			const comment = ns("comment");

			expect(label).toBe(`${base}label`);
			expect(comment).toBe(`${base}comment`);
			expect(isIRI(label)).toBe(true);
			expect(isIRI(comment)).toBe(true);
		});

		it("should validate generated IRIs", () => {
			const ns = namespace(base);
			expect(() => ns("valid-term")).not.toThrow();
			expect(() => ns("invalid term")).toThrow(RangeError);
		});

	});

	describe("closed namespace (with terms)", () => {

		it("should create namespace factory with typed term properties", () => {
			const ns = namespace(base, ["label", "comment"]);
			expect(typeof ns).toBe("function");
			expect(isIRI(ns.label)).toBe(true);
			expect(isIRI(ns.comment)).toBe(true);
		});

		it("should provide access to predefined terms via properties", () => {
			const ns = namespace(base, ["label", "comment"] as const);
			expect(ns.label).toBe(`${base}label`);
			expect(ns.comment).toBe(`${base}comment`);
		});

		it("should provide access to predefined terms via function call", () => {
			const ns = namespace(base, ["label", "comment"] as const);
			expect(ns("label")).toBe(ns.label);
			expect(ns("comment")).toBe(ns.comment);
		});

		it("should throw RangeError for undefined terms", () => {
			const ns = namespace(base, ["label", "comment"] as const);
			expect(() => ns("seeAlso")).toThrow(RangeError);
		});

	});

	describe("edge cases", () => {

		it("should handle empty terms array as open namespace", () => {
			const ns = namespace(base, []);
			expect(() => ns("anyTerm")).not.toThrow();
			expect(ns("label")).toBe(`${base}label`);
		});

		it("should handle namespace with single term", () => {
			const ns = namespace(base, ["label"] as const);
			expect(ns.label).toBe(`${base}label`);
			expect(() => ns("comment")).toThrow(RangeError);
		});

	});

});
