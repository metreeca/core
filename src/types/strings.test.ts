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
import { clip, dedent, escape, fill, glob, split, tidy, unescape, isWellFormed, toWellFormed } from "./strings.js";


describe("clip()", () => {

	describe("disabled clipping", () => {

		it("should return the string unaltered by default", async () => {

			expect(clip("one two")).toBe("one two");

		});

		it("should return the string unaltered on a non-positive length", async () => {

			expect(clip("one two", 0)).toBe("one two");
			expect(clip("one two", -1)).toBe("one two");

		});

	});

	describe("strings within the budget", () => {

		it("should return a shorter string unaltered", async () => {

			expect(clip("", 3)).toBe("");
			expect(clip("on", 3)).toBe("on");

		});

		it("should return an exactly fitting string unaltered", async () => {

			expect(clip("one", 3)).toBe("one");

		});

	});

	describe("overlong strings", () => {

		it("should replace the last retained code point with an ellipsis", async () => {

			expect(clip("one two", 4)).toBe("one…");
			expect(clip("uno€due", 4)).toBe("uno…");
			expect(clip("a very long value", 8)).toBe("a very …");

		});

		it("should return a bare ellipsis on a single-point budget", async () => {

			expect(clip("one", 1)).toBe("…");

		});

		it("should keep the result within the budget", async () => {

			const samples = ["", "one", "one two", "uno€due", "😀😀😀", "a😀bc", "a\uD800bc"];

			expect(samples.filter(sample => [...clip(sample, 4)].length > 4)).toEqual([]);

		});

	});

	describe("supplementary characters", () => {

		it("should count a surrogate pair as a single code point", async () => {

			expect(clip("😀😀", 2)).toBe("😀😀"); // 4 code units, 2 code points
			expect(clip("😀😀😀", 2)).toBe("😀…"); // the deciding code point sits beyond a 2×length code unit window

		});

		it("should keep surrogate pairs whole", async () => {

			expect(clip("a😀bc", 3)).toBe("a😀…");
			expect(isWellFormed(clip("a😀bc", 3))).toBe(true);

		});

	});

});

describe("tidy()", () => {

	describe("internal whitespace", () => {

		it("should collapse a run of whitespace to a single space", async () => {

			expect(tidy("one  two")).toBe("one two");
			expect(tidy("one \t \n two")).toBe("one two");

		});

		it("should leave a single space as it is", async () => {

			expect(tidy("one two three")).toBe("one two three");

		});

		it("should preserve non-whitespace content", async () => {

			expect(tidy("one-two_three")).toBe("one-two_three");

		});

	});

	describe("outer whitespace", () => {

		it("should drop leading and trailing whitespace", async () => {

			expect(tidy("  one two  ")).toBe("one two");
			expect(tidy("\n\tone two\n")).toBe("one two");

		});

		it("should return an empty string on blank input", async () => {

			expect(tidy("")).toBe("");
			expect(tidy("   \n\t ")).toBe("");

		});

	});

	describe("unicode whitespace", () => {

		it("should fold line terminators", async () => {

			expect(tidy("one\r\ntwo three")).toBe("one two three");

		});

		it("should fold the space separators of every script", async () => {

			const nbsp = String.fromCharCode(0x00A0); // no-break space
			const ideographic = String.fromCharCode(0x3000); // ideographic space

			expect(tidy(`one${nbsp}two${ideographic}three`)).toBe("one two three");

		});

		it("should fold the byte order mark", async () => {

			const bom = String.fromCharCode(0xFEFF);

			expect(tidy(`${bom}one${bom}two`)).toBe("one two");

		});

		it("should leave zero-width characters as they are", async () => {

			const zwsp = String.fromCharCode(0x200B); // carries no whitespace property

			expect(tidy(`one${zwsp}two`)).toBe(`one${zwsp}two`);

		});

	});

	describe("multiline", () => {

		it("should retain the line structure", async () => {

			expect(tidy("one\ntwo", true)).toBe("one\ntwo");

		});

		it("should tidy each line on its own", async () => {

			expect(tidy("  one   1  \n  two   2  ", true)).toBe("one 1\ntwo 2");

		});

		it("should normalise line terminators", async () => {

			expect(tidy("one\r\ntwo\rthree", true)).toBe("one\ntwo\nthree");

		});

		it("should drop blank lines", async () => {

			expect(tidy("one\n   \ntwo", true)).toBe("one\ntwo");
			expect(tidy("one\n\n\ntwo", true)).toBe("one\ntwo");

		});

		it("should drop leading and trailing blank lines", async () => {

			expect(tidy("\n \none\ntwo\n \n", true)).toBe("one\ntwo");

		});

		it("should return an empty string on blank input", async () => {

			expect(tidy("", true)).toBe("");
			expect(tidy("   \n\t \n  ", true)).toBe("");

		});

	});

});

describe("split()", () => {

	describe("values", () => {

		it("should report the values sitting between the separators", async () => {

			expect(split("one,two,three", ",")).toEqual(["one", "two", "three"]);

		});

		it("should drop the whitespace surrounding each value", async () => {

			expect(split("  one  ,\ttwo\n", ",")).toEqual(["one", "two"]);

		});

		it("should collapse the whitespace within each value", async () => {

			expect(split("one  two,three \t four", ",")).toEqual(["one two", "three four"]);
			expect(split("one\ntwo,three", ",")).toEqual(["one two", "three"]);

		});

		it("should preserve the non-whitespace content of each value", async () => {

			expect(split("one-two_three,four", ",")).toEqual(["one-two_three", "four"]);

		});

		it("should report an unseparated string as a single value", async () => {

			expect(split("  one two  ", ",")).toEqual(["one two"]);

		});

	});

	describe("empty values", () => {

		it("should drop leading and trailing separators", async () => {

			expect(split(",one,two,", ",")).toEqual(["one", "two"]);

		});

		it("should drop repeated separators", async () => {

			expect(split("one,,,two", ",")).toEqual(["one", "two"]);

		});

		it("should drop blank values", async () => {

			expect(split("one, ,two", ",")).toEqual(["one", "two"]);

		});

		it("should return an empty array on blank input", async () => {

			expect(split("")).toEqual([]);
			expect(split("   \n\t ")).toEqual([]);
			expect(split(" , , ", ",")).toEqual([]);

		});

	});

	describe("separators", () => {

		it("should default to a run of whitespace", async () => {

			expect(split("one two")).toEqual(["one", "two"]);
			expect(split("  one \t two \n three  ")).toEqual(["one", "two", "three"]);

		});

		it("should match a string separator literally", async () => {

			expect(split("one.two", ".")).toEqual(["one", "two"]); // `.` as a pattern would match every character

		});

		it("should match a pattern separator", async () => {

			expect(split("one; two,three", /[;,]/u)).toEqual(["one", "two", "three"]);

		});

		it("should retain what a capturing pattern captures", async () => {

			expect(split("one1two", /(\d)/u)).toEqual(["one", "1", "two"]);

		});

	});

	describe("unicode whitespace", () => {

		it("should fold the space separators of every script", async () => {

			const nbsp = String.fromCharCode(0x00A0); // no-break space
			const ideographic = String.fromCharCode(0x3000); // ideographic space

			expect(split(`${nbsp}one${nbsp}1${nbsp},${ideographic}two${ideographic}2${ideographic}`, ",")).toEqual([
				"one 1", "two 2"
			]);

		});

		it("should break at the space separators of every script", async () => {

			const nbsp = String.fromCharCode(0x00A0); // no-break space
			const ideographic = String.fromCharCode(0x3000); // ideographic space

			expect(split(`one${nbsp}two${ideographic}three`)).toEqual(["one", "two", "three"]);

		});

	});

});

describe("fill()", () => {

	describe("placeholders", () => {

		it("should return a template naming no variable unchanged", async () => {

			expect(fill("name:text", { name: "value" })).toBe("name:text");

		});

		it("should replace a placeholder with the value of the variable it names", async () => {

			expect(fill("head name:{name} tail", { name: "value" })).toBe("head name:value tail");

		});

		it("should replace every placeholder of a template", async () => {

			expect(fill("head x:{x} y:{y} tail", { x: "1", y: "2" })).toBe("head x:1 y:2 tail");

		});

		it("should replace repeated placeholders naming the same variable", async () => {

			expect(fill("{name}={name}", { name: "value" })).toBe("value=value");

		});

		it("should replace a placeholder naming an empty variable with nothing", async () => {

			expect(fill("head name:{name} tail", { name: "" })).toBe("head name: tail");

		});

	});

	describe("modifiers", () => {

		it("should url-encode a value marked with %", async () => {

			expect(fill("http://{name}.com/?%{name}", { name: "a+b" })).toBe("http://a+b.com/?a%2Bb");

		});

		it("should encode the characters a query gives a meaning to", async () => {

			expect(fill("%{name}", { name: "a b+c/d?e&f=g#h" })).toBe("a%20b%2Bc%2Fd%3Fe%26f%3Dg%23h");

		});

		it("should encode every character but the unreserved ones", async () => {

			expect(fill("%{name}", { name: "!'()*" })).toBe("%21%27%28%29%2A"); // encodeURIComponent() leaves these
			expect(fill("%{name}", { name: "aZ0-._~" })).toBe("aZ0-._~");

		});

		it("should preserve a placeholder marked with #", async () => {

			expect(fill("#{name}={name}", { name: "value" })).toBe("{name}=value");

		});

	});

	describe("resolvers", () => {

		it("should take values from a resolver function", async () => {

			expect(fill("head x:{x} y:{y} tail", name => name === "x" ? "1" : "2")).toBe("head x:1 y:2 tail");

		});

	});

	describe("undefined variables", () => {

		it("should report a variable the record leaves out", async () => {

			expect(() => fill("head name:{name} tail", { none: "value" })).toThrow(ReferenceError);

		});

		it("should report a variable the resolver leaves out", async () => {

			expect(() => fill("head name:{name} tail", () => undefined)).toThrow(ReferenceError);

		});

	});

});

describe("dedent()", () => {

	describe("plain text", () => {

		it("should remove the margin shared by all lines", async () => {

			expect(dedent("    one")).toBe("one");
			expect(dedent("    one\n    two")).toBe("one\ntwo");

		});

		it("should preserve relative indentation", async () => {

			expect(dedent("    one\n      two")).toBe("one\n  two");

		});

		it("should leave text without a shared margin unchanged", async () => {

			expect(dedent("one\n  two")).toBe("one\n  two");

		});

		it("should ignore blank lines when computing the margin", async () => {

			expect(dedent("    one\n\n    two")).toBe("one\n\ntwo");
			expect(dedent("    one\n  \n    two")).toBe("one\n\ntwo");

		});

		it("should drop leading and trailing blank lines", async () => {

			expect(dedent("\n  \n    one\n\n    ")).toBe("one");

		});

		it("should preserve trailing whitespace on content lines", async () => {

			expect(dedent("    one  \n    two\t")).toBe("one  \ntwo\t");

		});

		it("should normalise line terminators", async () => {

			expect(dedent("    one\r\n    two\r    three")).toBe("one\ntwo\nthree");

		});

		it("should compare margins as character sequences", async () => {

			expect(dedent("\tone\n    two")).toBe("\tone\n    two");

		});

		it("should return an empty string for blank text", async () => {

			expect(dedent("")).toBe("");
			expect(dedent("   \n\t\n")).toBe("");

		});

	});

	describe("template", () => {

		it("should dedent a literal without interpolations", async () => {

			expect(dedent`
				one
				  two
			`).toBe("one\n  two");

		});

		it("should splice interpolated values", async () => {

			const value = "two";

			expect(dedent`    one ${value} three`).toBe("one two three");

		});

		it("should convert interpolated values as the template literal would", async () => {

			expect(dedent`    ${1} ${true} ${null} ${undefined} ${[1, 2]}`).toBe("1 true null undefined 1,2");

		});

		it("should splice values before computing the margin", async () => {

			const value = "flush\nleft";

			expect(dedent`    one ${value}`).toBe("    one flush\nleft");

		});

		it("should return the same result as a plain call on the same literal", async () => {

			const value = "two\n    three";
			const expected = "one two\nthree";

			expect(dedent`    one ${value}`).toBe(expected);
			expect(dedent(`    one ${value}`)).toBe(expected);

		});

	});

});

describe("escape()", () => {

	describe("unescaped characters", () => {

		it("should leave printable text as it is", async () => {
			expect(escape("")).toBe("");
			expect(escape("plain text")).toBe("plain text");
			expect(escape("uno€due")).toBe("uno€due"); // JSON carries non-ASCII characters unescaped
		});

		it("should leave the solidus as it is", async () => {
			expect(escape("a/b")).toBe("a/b"); // the two-character escape is optional
		});

		it("should leave characters outside the C0 range as they are", async () => {

			const del = String.fromCharCode(0x7F); // delete
			const control = String.fromCharCode(0x9F); // C1 control
			const separators = String.fromCharCode(0x2028, 0x2029); // line and paragraph separators

			expect(escape(`a${del}b`)).toBe(`a${del}b`);
			expect(escape(`a${control}b`)).toBe(`a${control}b`);
			expect(escape(separators)).toBe(separators);

		});

		it("should leave paired surrogates as they are", async () => {
			expect(escape("one😀two")).toBe("one😀two");
		});

	});

	describe("escape sequences", () => {

		it("should escape the quotation mark and the reverse solidus", async () => {
			expect(escape("\"")).toBe("\\\"");
			expect(escape("\\")).toBe("\\\\");
		});

		it("should escape control characters with a two-character form", async () => {
			expect(escape("\b\f\n\r\t")).toBe("\\b\\f\\n\\r\\t");
		});

		it("should escape the remaining control characters as four-digit escapes", async () => {
			expect(escape(String.fromCharCode(0x00))).toBe("\\u0000"); // first C0 control
			expect(escape(String.fromCharCode(0x0B))).toBe("\\u000B"); // vertical tab, with no two-character form
			expect(escape(String.fromCharCode(0x1F))).toBe("\\u001F"); // last C0 control
		});

		it("should escape isolated surrogates as four-digit escapes", async () => {
			expect(escape("\uD83D")).toBe("\\uD83D");
			expect(escape("\uDE00")).toBe("\\uDE00");
			expect(escape("\uDE00\uD83D")).toBe("\\uDE00\\uD83D"); // reversed pair
			expect(escape("a\uD800😀\uDFFFb")).toBe("a\\uD800😀\\uDFFFb"); // paired surrogates left alone
		});

	});

	describe("custom patterns", () => {

		it("should escape the characters the pattern selects", async () => {
			expect(escape("a<b>c", /[<>]/gu)).toBe("a\\u003Cb\\u003Ec");
		});

		it("should leave the characters the pattern ignores as they are", async () => {
			expect(escape("a\"b\\c", /x/gu)).toBe("a\"b\\c"); // selecting the JSON set is the pattern's call
		});

		it("should keep the default two-character escapes", async () => {
			expect(escape("a\nb", /\s/gu)).toBe("a\\nb");
			expect(escape("a\"b", /["\\]/gu)).toBe("a\\\"b");
		});

		it("should escape selected supplementary code points as eight-digit escapes", async () => {
			expect(escape("a😀b", /\P{ASCII}/gu)).toBe("a\\U0001F600b");
			expect(escape("uno€due", /\P{ASCII}/gu)).toBe("uno\\u20ACdue"); // BMP code points keep the four-digit form
		});

		it("should escape selected code points at the plane boundaries", async () => {
			expect(escape(String.fromCharCode(0xFFFF), /\P{ASCII}/gu)).toBe("\\uFFFF"); // last BMP code point
			expect(escape(String.fromCodePoint(0x10000), /\P{ASCII}/gu)).toBe("\\U00010000"); // first supplementary
			expect(escape(String.fromCodePoint(0x10FFFF), /\P{ASCII}/gu)).toBe("\\U0010FFFF"); // last code point
		});

	});

	describe("custom escapes", () => {

		it("should take escapes from the given map", async () => {
			expect(escape("a<b>c", /[<>]/gu, { "<": "\\<", ">": "\\>" })).toBe("a\\<b\\>c");
		});

		it("should take escapes from the given mapper", async () => {
			expect(escape("a<b>c", /[<>]/gu, c => c === "<" ? "\\<" : "\\>")).toBe("a\\<b\\>c");
		});

		it("should spell characters the escapes don't cover numerically", async () => {
			expect(escape("a\nb", /\s/gu, {})).toBe("a\\u000Ab");
			expect(escape("a\nb", /\s/gu, () => undefined)).toBe("a\\u000Ab");
			expect(escape("a<b>c", /[<>]/gu, { "<": "\\<" })).toBe("a\\<b\\u003Ec");
			expect(escape("a<b>c", /[<>]/gu, c => c === "<" ? "\\<" : undefined)).toBe("a\\<b\\u003Ec");
		});

	});

	describe("irregular matches", () => {

		it("should escape a multi-character match from its first code point", async () => {
			expect(escape("abc", /ab/gu)).toBe("\\u0061c"); // the rest of the match is dropped
			expect(escape("a😀b", /😀b/gu)).toBe("a\\U0001F600"); // the leading code point is taken whole
		});

		it("should take the escapes assigned to a multi-character match", async () => {
			expect(escape("abc", /ab/gu, { "ab": "<AB>" })).toBe("<AB>c"); // escapes are keyed by the whole match
		});

		it("should escape a zero-width match as the replacement character", async () => {
			expect(escape("ab", /(?:)/gu)).toBe("\\uFFFDa\\uFFFDb\\uFFFD"); // an empty match denotes no character
		});

	});

	describe("validation", () => {

		it("should throw on a pattern that is not global", async () => {
			expect(() => escape("a<b>c", /[<>]/u)).toThrow(TypeError); // a sticky or plain pattern escapes one match
		});

	});

	describe("conformance", () => {

		it("should read back through a JSON parser", async () => {

			const samples = [
				"", "plain text", "uno€due", "one😀two",
				"\"\\/\b\f\n\r\t",
				String.fromCharCode(0x00, 0x1F, 0x7F, 0x2028),
				"a\uD800b\uDE00c"
			];

			expect(samples.map(sample => JSON.parse(`"${escape(sample)}"`))).toEqual(samples);

		});

		it("should return well-formed text", async () => {
			expect(isWellFormed(escape("a\uD800b\uDE00c"))).toBe(true);
		});

	});

});

describe("unescape()", () => {

	describe("unescaped text", () => {

		it("should leave text carrying no escape as it is", async () => {
			expect(unescape("")).toBe("");
			expect(unescape("plain text")).toBe("plain text");
			expect(unescape("uno€due")).toBe("uno€due");
			expect(unescape("one😀two")).toBe("one😀two");
		});

		it("should leave the solidus as it is", async () => {
			expect(unescape("a/b")).toBe("a/b");
		});

	});

	describe("escape sequences", () => {

		it("should read the quotation mark and the reverse solidus", async () => {
			expect(unescape("\\\"")).toBe("\"");
			expect(unescape("\\\\")).toBe("\\");
		});

		it("should read the two-character control escapes", async () => {
			expect(unescape("\\b\\f\\n\\r\\t")).toBe("\b\f\n\r\t");
		});

		it("should read the optional solidus escape", async () => {
			expect(unescape("a\\/b")).toBe("a/b"); // assigned no short form, recovered as plain text
		});

		it("should read four-digit escapes", async () => {
			expect(unescape("\\u0000")).toBe(String.fromCharCode(0x00)); // first C0 control
			expect(unescape("a\\u000Bb")).toBe(`a${ String.fromCharCode(0x0B) }b`); // vertical tab
			expect(unescape("\\uFFFF")).toBe(String.fromCharCode(0xFFFF)); // last BMP code point
		});

		it("should read eight-digit escapes", async () => {
			expect(unescape("a\\U0001F600b")).toBe("a😀b");
			expect(unescape("\\U00010000")).toBe(String.fromCodePoint(0x10000)); // first supplementary
			expect(unescape("\\U0010FFFF")).toBe(String.fromCodePoint(0x10FFFF)); // last code point
		});

		it("should read hexadecimal digits in either case", async () => {
			expect(unescape("\\u20ac")).toBe("€");
			expect(unescape("\\U0001f600")).toBe("😀");
		});

		it("should tell the four-digit and the eight-digit forms apart", async () => {
			expect(unescape("\\u0001f600")).toBe(`${ String.fromCharCode(0x01) }f600`); // the short form takes four
		});

		it("should read an escaped surrogate pair as a single character", async () => {
			expect(unescape("\\uD83D\\uDE00")).toBe("😀");
		});

		it("should read escaped isolated surrogates as they stand", async () => {
			expect(unescape("\\uD800")).toBe(String.fromCharCode(0xD800));
			expect(unescape("a\\uDE00\\uD83Db")).toBe(`a${ String.fromCharCode(0xDE00, 0xD83D) }b`); // reversed pair
		});

		it("should read one escape at a time", async () => {
			expect(unescape("\\\\n")).toBe("\\n"); // the recovered reverse solidus doesn't escape again
			expect(unescape("\\\\u0041")).toBe("\\u0041");
		});

	});

	describe("unaccounted sequences", () => {

		it("should read an unassigned escape as the character it introduces", async () => {
			expect(unescape("\\x")).toBe("x");
			expect(unescape("a\\qb")).toBe("aqb");
			expect(unescape("\\ ")).toBe(" ");
			expect(unescape("a\\😀b")).toBe("a😀b"); // a supplementary code point is introduced whole
		});

		it("should read an incomplete numeric escape as plain text", async () => {
			expect(unescape("\\u12")).toBe("u12");
			expect(unescape("\\U0001F6")).toBe("U0001F6");
		});

		it("should read a numeric escape outside the Unicode range as the replacement character", async () => {
			expect(unescape("\\U00110000")).toBe(String.fromCharCode(0xFFFD)); // past the last code point
		});

		it("should leave a trailing reverse solidus as it is", async () => {
			expect(unescape("a\\")).toBe("a\\"); // nothing left to escape
		});

	});

	describe("custom patterns", () => {

		it("should read the sequences the pattern selects", async () => {
			expect(unescape("a\\<b\\>c", /\\[<>]/gu)).toBe("a<b>c");
		});

		it("should leave the sequences the pattern ignores as they are", async () => {
			expect(unescape("a\\<b\\nc", /\\[<>]/gu)).toBe("a<b\\nc");
		});

		it("should leave a selected sequence carrying no reverse solidus as it is", async () => {
			expect(unescape("a&lt;b&gt;c", /&\w+;/gu, { "&lt;": "<" })).toBe("a<b&gt;c");
		});

	});

	describe("custom escapes", () => {

		it("should take characters from the given map", async () => {
			expect(unescape("a\\<b\\>c", /\\[<>]/gu, { "\\<": "<", "\\>": ">" })).toBe("a<b>c");
		});

		it("should take characters from the given mapper", async () => {
			expect(unescape("a\\<b\\>c", /\\[<>]/gu, s => s === "\\<" ? "<" : ">")).toBe("a<b>c");
		});

		it("should read sequences the escapes don't cover from the numeric or the plain form", async () => {
			expect(unescape("a\\u0041b", /\\u[0-9A-Fa-f]{4}/gu, {})).toBe("aAb");
			expect(unescape("a\\nb", /\\[\s\S]/gu, {})).toBe("anb"); // the default short forms are replaced
			expect(unescape("a\\nb", /\\[\s\S]/gu, () => undefined)).toBe("anb");
		});

	});

	describe("irregular matches", () => {

		it("should leave a zero-width match as it is", async () => {
			expect(unescape("ab", /(?:)/gu)).toBe("ab"); // an empty match introduces no character
		});

	});

	describe("validation", () => {

		it("should throw on a pattern that is not global", async () => {
			expect(() => unescape("a\\<b", /\\[<>]/u)).toThrow(TypeError);
		});

	});

	describe("conformance", () => {

		it("should agree with a JSON parser", async () => {

			const samples = [
				"", "plain text", "uno€due", "one😀two",
				"\\\"\\\\\\/\\b\\f\\n\\r\\t",
				"\\u0000\\u001F\\uFFFF",
				"\\uD83D\\uDE00"
			];

			expect(samples.map(sample => unescape(sample)))
				.toEqual(samples.map(sample => JSON.parse(`"${ sample }"`)));

		});

		it("should read back escaped text", async () => {

			const samples = [
				"", "plain text", "uno€due", "one😀two",
				"\"\\/\b\f\n\r\t",
				String.fromCharCode(0x00, 0x1F, 0x7F, 0x2028),
				`a${ String.fromCharCode(0xD800) }b${ String.fromCharCode(0xDE00) }c`
			];

			expect(samples.map(sample => unescape(escape(sample)))).toEqual(samples);

		});

	});

});

describe("glob()", () => {

	describe("literal patterns", () => {

		it("should match a wildcard-free pattern as it stands", async () => {
			expect(glob("a/b.txt").test("a/b.txt")).toBeTruthy();
			expect(glob("a/b.txt").test("a/bXtxt")).toBeFalsy();
		});

		it("should match the whole string", async () => {
			expect(glob("a/b.txt").test("xa/b.txt")).toBeFalsy();
			expect(glob("a/b.txt").test("a/b.txtx")).toBeFalsy();
		});

		it("should match an empty pattern against the empty string alone", async () => {
			expect(glob("").test("")).toBeTruthy();
			expect(glob("").test("a")).toBeFalsy();
		});

	});

	describe("wildcards", () => {

		it("should match any run of characters within a segment on a single star", async () => {
			expect(glob("*.txt").test("one.txt")).toBeTruthy();
			expect(glob("*.txt").test(".txt")).toBeTruthy(); // an empty run is a run
			expect(glob("a/*/c").test("a/b/c")).toBeTruthy();
		});

		it("should stop a single star at segment boundaries", async () => {
			expect(glob("*.txt").test("a/one.txt")).toBeFalsy();
			expect(glob("a/*/c").test("a/b/x/c")).toBeFalsy();
		});

		it("should match any run of characters across segments on a double star", async () => {
			expect(glob("**/c").test("a/b/c")).toBeTruthy();
			expect(glob("**/c").test("/c")).toBeTruthy(); // an empty run is a run
			expect(glob("a/**").test("a/b/c")).toBeTruthy();
		});

		it("should match line terminators on a double star", async () => {
			expect(glob("**").test("a\nb")).toBeTruthy();
		});

		it("should match a single character within a segment on a question mark", async () => {
			expect(glob("a?c").test("abc")).toBeTruthy();
			expect(glob("?").test("😀")).toBeTruthy(); // a supplementary code point is one character
		});

		it("should stop a question mark at segment boundaries", async () => {
			expect(glob("?").test("/")).toBeFalsy();
			expect(glob("?").test("ab")).toBeFalsy();
		});

	});

	describe("metacharacters", () => {

		it("should match regular expression metacharacters literally", async () => {
			expect(glob("a.b").test("a.b")).toBeTruthy();
			expect(glob("a.b").test("axb")).toBeFalsy();
			expect(glob("a+b").test("a+b")).toBeTruthy();
			expect(glob("a+b").test("aab")).toBeFalsy();
			expect(glob("(a|b)").test("(a|b)")).toBeTruthy();
			expect(glob("(a|b)").test("a")).toBeFalsy();
			expect(glob("[abc]").test("[abc]")).toBeTruthy();
			expect(glob("[abc]").test("a")).toBeFalsy();
			expect(glob("a{1,2}").test("a{1,2}")).toBeTruthy();
			expect(glob("a{1,2}").test("aa")).toBeFalsy();
			expect(glob("^a$").test("^a$")).toBeTruthy();
			expect(glob("a\\b").test("a\\b")).toBeTruthy();
		});

	});

});

describe("isWellFormed()", () => {

	it("should accept text without surrogates", async () => {

		expect(isWellFormed("")).toBe(true);
		expect(isWellFormed("one")).toBe(true);
		expect(isWellFormed("uno€due")).toBe(true);

	});

	it("should accept paired surrogates", async () => {

		expect(isWellFormed("😀")).toBe(true);
		expect(isWellFormed("one😀two")).toBe(true);
		expect(isWellFormed("😀😀")).toBe(true);

	});

	it("should reject isolated high surrogates", async () => {

		expect(isWellFormed("\uD83D")).toBe(false);
		expect(isWellFormed("one\uD83Dtwo")).toBe(false);
		expect(isWellFormed("😀".charAt(0))).toBe(false); // leading half of a pair

	});

	it("should reject isolated low surrogates", async () => {

		expect(isWellFormed("\uDE00")).toBe(false);
		expect(isWellFormed("one\uDE00two")).toBe(false);
		expect(isWellFormed("😀".charAt(1))).toBe(false); // trailing half of a pair

	});

	it("should reject reversed surrogate pairs", async () => {

		expect(isWellFormed("\uDE00\uD83D")).toBe(false);

	});

});

describe("toWellFormed()", () => {

	it("should leave well-formed text unaltered", async () => {

		expect(toWellFormed("")).toBe("");
		expect(toWellFormed("uno€due")).toBe("uno€due");
		expect(toWellFormed("one😀two")).toBe("one😀two");

	});

	it("should replace isolated high surrogates", async () => {

		expect(toWellFormed("\uD83D")).toBe("\uFFFD");
		expect(toWellFormed("one\uD83Dtwo")).toBe("one\uFFFDtwo");

	});

	it("should replace isolated low surrogates", async () => {

		expect(toWellFormed("\uDE00")).toBe("\uFFFD");
		expect(toWellFormed("one\uDE00two")).toBe("one\uFFFDtwo");

	});

	it("should replace each surrogate of a reversed pair", async () => {

		expect(toWellFormed("\uDE00\uD83D")).toBe("\uFFFD\uFFFD");

	});

	it("should preserve paired surrogates while replacing isolated ones", async () => {

		expect(toWellFormed("\uD800😀\uDFFF")).toBe("\uFFFD😀\uFFFD");

	});

	it("should return well-formed text", async () => {

		expect(isWellFormed(toWellFormed("a\uD800b\uDE00c"))).toBe(true);

	});

});
