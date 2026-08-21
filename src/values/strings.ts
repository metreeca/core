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
 * General-purpose string operations.
 *
 * **Declaring Text and Markdown Content**
 *
 * Record whether a string carries markup, either as a type annotation on an API or as a template tag that also
 * realigns the literal:
 *
 * ```typescript
 * import { markdown, text, type Markdown, type Text } from '@metreeca/core/strings';
 *
 * function describe(label: Text, notes: Markdown): void { }
 *
 * describe(text`
 *     one
 *       two
 * `, markdown`
 *     # Title
 *
 *     Body
 * `);
 * ```
 *
 * **Clipping Text**
 *
 * Shorten a string to a budget of code points, leaving an ellipsis to report that content was dropped, so that a value
 * quoted in a log entry or a diagnostic message can't overrun it:
 *
 * ```typescript
 * import { clip } from '@metreeca/core/strings';
 *
 * clip("a very long value", 8); // "a very …"
 * ```
 *
 * **Tidying Whitespace**
 *
 * Collapse the whitespace of a string to single spaces and drop what sits at either end, either folding the whole
 * string to the single line a label or a message expects, or tidying each line on its own where the line structure
 * matters:
 *
 * ```typescript
 * import { tidy } from '@metreeca/core/strings';
 *
 * tidy(`
 *     one
 *       two
 * `);       // "one two"
 *
 * tidy(`
 *     one
 *       two
 * `, true); // "one\ntwo"
 * ```
 *
 * **Splitting Separated Values**
 *
 * Break a string into the values it lists, tidying the whitespace of each and dropping the empty ones stray
 * separators leave behind, taking the values to be separated by whitespace or by a separator of your own:
 *
 * ```typescript
 * import { split } from '@metreeca/core/strings';
 *
 * split("one  two\nthree");           // ["one", "two", "three"]
 * split("one, two  x ,, three", ","); // ["one", "two x", "three"]
 * ```
 *
 * **Filling Template Placeholders**
 *
 * Complete a template from values computed elsewhere, replacing each `{key}` placeholder with the value a record or a
 * lookup function assigns to its key, percent-encoding what must travel safely inside a URL and leaving `#`-marked
 * placeholders unfilled for a later pass:
 *
 * ```typescript
 * import { fill } from '@metreeca/core/strings';
 *
 * fill("hello {name}", { name: "world" });    // "hello world"
 * fill("/search?q=%{term}", { term: "a b" }); // "/search?q=a%20b"
 * fill("#{name}={name}", { name: "value" });  // "{name}=value"
 * ```
 *
 * **Dedenting Indented Text**
 *
 * Remove the leading whitespace shared by every non-blank line of a block of text, either as a plain function or as a
 * template tag:
 *
 * ```typescript
 * import { dedent } from '@metreeca/core/strings';
 *
 * dedent(`
 *     one
 *       two
 * `); // "one\n  two"
 *
 * dedent`
 *     one
 *       two
 * `; // "one\n  two"
 * ```
 *
 * **Escaping Text for String Literals**
 *
 * Rewrite as escapes the characters a JSON string literal may not carry, ready to sit between quotation marks, or
 * target a syntax of your own by supplying the pattern that selects the characters and the short forms it defines:
 *
 * ```typescript
 * import { escape } from '@metreeca/core/strings';
 *
 * escape("line\nbreak"); // the break is rewritten as a two-character escape
 * escape("a\uD800b");    // the isolated surrogate is rewritten as a four-digit escape
 *
 * escape("a😀b", /\P{ASCII}/gu);                         // the emoji takes the eight-digit form
 * escape("a<b", /[<>]/gu, { "<": "&lt;", ">": "&gt;" }); // the angle brackets take the supplied short forms
 * ```
 *
 * **Checking and Repairing UTF-16 Text**
 *
 * Report whether a string is well-formed UTF-16 text, free of the isolated surrogates that denote no Unicode
 * character, or replace those surrogates with the Unicode replacement character:
 *
 * ```typescript
 * import { isWellFormed, toWellFormed } from '@metreeca/core/strings';
 *
 * isWellFormed("a😀");     // true
 * isWellFormed("a\uD800"); // false
 *
 * toWellFormed("a\uD800"); // "a\uFFFD"
 * ```
 *
 * @module
 */

import { error, isFunction, isString } from "../index.js";


/**
 * Inclusive upper bound of the Unicode Basic Multilingual Plane.
 *
 * Separates plane 0, whose code points a single UTF-16 code unit represents, from the supplementary planes, whose
 * code points UTF-16 represents as a surrogate pair.
 *
 * @see {@link https://www.unicode.org/glossary/#basic_multilingual_plane Unicode Glossary - Basic Multilingual Plane}
 */
const BMPMax = 0xFFFF;

/**
 * Maps characters to their two-character escape.
 *
 * Covers every character RFC 8259 gives a short form to, bar the solidus, whose escape is optional and whose plain
 * form is legible; anything else the default {@link escape} pattern selects takes a four-digit sequence.
 */
const JSONEscapes = Object.freeze({
	"\"": "\\\"",
	"\\": "\\\\",
	"\b": "\\b",
	"\f": "\\f",
	"\n": "\\n",
	"\r": "\\r",
	"\t": "\\t"
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Plain text.
 *
 * Human-readable content with no embedded markup, to be presented as written.
 *
 * @see {@link text} for the tag marking a template literal as plain text
 */
export type Text = string;

/**
 * Markdown text.
 *
 * Human-readable content marked up with CommonMark syntax, to be rendered before presentation.
 *
 * @see {@link markdown} for the tag marking a template literal as markdown
 * @see {@link https://spec.commonmark.org/ CommonMark Specification}
 */
export type Markdown = string;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Value lookup by key.
 *
 * Supplies the value a key stands for, either as a record listing the values or as a function computing them on
 * demand. A record leaving a key out and a function returning `undefined` for it alike leave the key unresolved, and
 * what that means is left to the operation taking the lookup.
 */
export type Resolver =
	| { readonly [key: string]: string }
	| ((key: string) => undefined | string);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Tags a template literal as {@link Text} content.
 *
 * Marks the literal as plain text, recording at the definition site that its content carries no markup.
 *
 * The literal is realigned as {@link dedent} does, so text laid out to match the indentation of the surrounding code
 * reads as if written flush left.
 *
 * @param template The literal sections of the text content
 * @param values The values interpolated between the literal sections
 *
 * @returns The assembled template with the line terminators normalised, the outer blank lines dropped and the shared
 *     leading whitespace removed from every line
 *
 * @see {@link markdown} for the companion tag marking marked-up content
 */
export function text(template: TemplateStringsArray, ...values: unknown[]): Text {
	return dedent(template, ...values);
}

/**
 * Tags a template literal as {@link Markdown} content.
 *
 * Marks the literal as markdown, so that editors and other tools handle it accordingly.
 *
 * The literal is realigned as {@link dedent} does, so markdown laid out to match the indentation of the surrounding
 * code retains the block structure CommonMark infers from leading whitespace.
 *
 * @param template The literal sections of the markdown content
 * @param values The values interpolated between the literal sections
 *
 * @returns The assembled template with the line terminators normalised, the outer blank lines dropped and the shared
 *     leading whitespace removed from every line
 *
 * @see {@link text} for the companion tag marking unmarked content
 * @see {@link https://spec.commonmark.org/ CommonMark Specification}
 */
export function markdown(template: TemplateStringsArray, ...values: unknown[]): Markdown {
	return dedent(template, ...values);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Clips a string to a code point budget.
 *
 * Shortens overlong content, replacing the last retained code point with a `…` HORIZONTAL ELLIPSIS, so the result
 * stays within the budget and reports visibly that content was dropped; the ellipsis is itself counted, so a budget
 * of `1` leaves nothing but the ellipsis.
 *
 * Length is counted in code points rather than UTF-16 code units, so supplementary characters are kept whole and
 * never split into isolated surrogates.
 *
 * > [!NOTE]
 * > Code points are not glyphs: a grapheme cluster the cut falls inside, an emoji sequence or a base character
 * > followed by combining marks among them, is split, and the retained prefix renders on its own.
 *
 * @param string The string to clip
 * @param length The maximum length of the result in code points; `0` or a negative value disables clipping; defaults
 *     to `0`
 *
 * @returns `string` unaltered if clipping is disabled or `string` counts no more than `length` code points; otherwise
 *     its first `length-1` code points followed by an ellipsis
 *
 * @see {@link escape} for the companion rewriting, surfacing the invisible characters of the clipped content
 * @see {@link https://www.unicode.org/glossary/#code_point Unicode Glossary - Code Point}
 * @see {@link https://www.unicode.org/glossary/#grapheme_cluster Unicode Glossary - Grapheme Cluster}
 */
export function clip(string: string, length: number = 0): string {

	if ( length <= 0 || string.length <= length ) { // code unit count upper-bounds the code point count

		return string;

	} else {

		const points = [...string.slice(0, 2*(length+1))]; // a code point spans at most 2 code units

		return points.length > length ? `${points.slice(0, length-1).join("")}…` : string;

	}

}

/**
 * Tidies the whitespace of a string.
 *
 * Replaces every run of whitespace with a single `U+0020` SPACE and drops the runs at either end, so that content
 * padded for alignment, or laid out across several lines, reads as the evenly spaced text a label, a message or an
 * attribute value expects; everything else is preserved.
 *
 * Whitespace is the set ECMAScript recognises: the ASCII blanks and line terminators, the no-break space, the Unicode
 * space separators and the byte order mark.
 *
 * **Single-line tidying — `tidy(string)`**
 *
 * Folds the line terminators along with the rest, so that however the content was laid out the result is one line,
 * ready for a slot that admits no line breaks.
 *
 * **Multiline tidying — `tidy(string, true)`**
 *
 * Retains the line structure, for content whose lines carry meaning, tidying each line on its own and reporting only
 * the ones left with content:
 *
 * - Line terminators (`\r\n`, `\r`, `\n`) are normalised to `\n`
 * - Every line is tidied in isolation, losing its own runs and margins
 * - Blank lines are dropped, wherever they occur
 *
 * > [!NOTE]
 * > Zero-width characters, the `U+200B` ZERO WIDTH SPACE among them, carry no whitespace property and are left as
 * > they are, so a string that reads as tidied may still hold invisible content.
 *
 * @param string The string to tidy
 * @param multiline If `true`, retains the line structure, tidying each line on its own; if `false`, folds the string
 *     to a single line; defaults to `false`
 *
 * @returns A copy of `string` with every run of whitespace replaced by a single space and the outer whitespace
 *     dropped, taken as a whole or, if `multiline`, line by line, with the line terminators normalised and the blank
 *     lines dropped
 *
 * @see {@link https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-white-space ECMA-262 -
 *     White Space}
 */
export function tidy(string: string, multiline: boolean = false): string {

	if ( multiline ) {

		return string
			.split(/\r\n|\r|\n/u) // split at eol
			.map(line => line.replace(/\s+/gu, " ").trim()) // tidy each line on its own
			.filter(line => line) // drop blank lines
			.join("\n");

	} else {

		return string.replace(/\s+/gu, " ").trim();

	}

}

/**
 * Splits a string into tidied, non-empty values.
 *
 * Breaks a string at every separator match and reports the values sitting between the matches, each tidied as
 * {@link tidy} does and the empty ones dropped, so that a list written for a human reader, with the spacing and the
 * stray separators that entails, is read as the values it names.
 *
 * By default, values are taken to be separated by whitespace, breaking at the blanks and the line terminators alike,
 * however many of them the layout inserted, so that a bare call reads a list carrying no separator of its own; supply
 * a separator to read a list that marks its values some other way, a comma among them.
 *
 * Whitespace is the set ECMAScript recognises: the ASCII blanks and line terminators, the no-break space, the Unicode
 * space separators and the byte order mark.
 *
 * > [!NOTE]
 * > A string separator is matched literally, so characters a pattern would read as syntax need no escaping; a pattern
 * > carrying capture groups contributes what it captures to the result, as `String.prototype.split` does.
 *
 * @param string The string to split
 * @param separator The separator the values are broken at, either as a literal string or as a pattern; defaults to
 *     `/\s+/u`, a run of whitespace
 *
 * @returns A new array holding the values `string` names, in order, each with every run of whitespace replaced by a
 *     single space and the outer whitespace dropped, the empty ones left out; empty if `string` names no value
 *
 * @see {@link tidy} for the whitespace pass each value is put through
 * @see {@link https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.split ECMA-262 -
 *     String.prototype.split()}
 */
export function split(string: string, separator: string | RegExp = /\s+/u): readonly string[] {

	return string
		.split(separator)
		.map(value => value.replace(/\s+/gu, " ").trim())
		.filter(value => value !== "");

}

/**
 * Fills the placeholders of a template string.
 *
 * Replaces every `{key}` placeholder with the value `variables` maps the key to, leaving the rest of the template as
 * it stands, so that a string written with the shape of its result is completed from values computed elsewhere.
 *
 * A modifier before the opening brace states how a placeholder is filled:
 *
 * - `{key}` is replaced with the value
 * - `%{key}` is replaced with the URL-encoded value
 * - `#{key}` is preserved as `{key}`, not replaced
 *
 * URL-encoding percent-encodes every character but the unreserved ones, that is the ASCII letters, the decimal digits
 * and `-._~`, so an encoded value is safe at any position of a URL, the query and the fragment included.
 *
 * Keys are made of word characters, that is the ASCII letters, the decimal digits and the underscore; braces enclosing
 * anything else are content and are left as they stand.
 *
 * @param string The template to fill
 * @param variables The {@link Resolver} supplying the value each placeholder key stands for
 *
 * @returns A copy of `string` with every placeholder replaced by the value `variables` maps its key to, percent-encoded
 *     where the placeholder is marked with `%`, and every `#`-marked placeholder left unfilled and stripped of its
 *     modifier
 *
 * @throws {ReferenceError} If `variables` maps no value to the key of a placeholder to be filled
 * @throws {URIError} If a value to be percent-encoded carries an isolated surrogate, which denotes no character and
 *     has no UTF-8 representation
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc3986#section-2.3 RFC 3986 - Unreserved Characters}
 */
export function fill(string: string, variables: Resolver): string {

	const mapper = isFunction(variables) ? variables : (key: string) => variables[key];

	return string.replace(/([%#])?\{(\w+)\}/gu, (placeholder, modifier, key) => {

		if ( modifier === "#" ) {

			return placeholder.slice(1); // the escaped placeholder, stripped of its modifier

		} else {

			const value = mapper(key);

			return value === undefined ? error(new ReferenceError(`undefined variable <${key}>`))
				: modifier === "%" ? encode(value)
					: value;

		}

	});


	function encode(value: string): string {
		return encodeURIComponent(value) // leaves the sub-delimiters a URI syntax may give a meaning to
			.replace(/[!'()*]/gu, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
	}

}


/**
 * Removes the common indentation from a block of text.
 *
 * Strips the longest leading whitespace sequence shared by all non-blank lines, so text laid out to match the
 * indentation of the surrounding code reads as if written flush left:
 *
 * - Line terminators (`\r\n`, `\r`, `\n`) are normalised to `\n`
 * - Blank lines are emitted empty and take no part in the shared sequence
 * - Leading and trailing blank lines are dropped
 * - Everything else is preserved, trailing whitespace on content lines included
 *
 * Text whose lines share no leading whitespace keeps its indentation, aside from these normalisations.
 *
 * > [!NOTE]
 * > Margins are compared as character sequences rather than as visual widths, so a tab never matches a run of spaces,
 * > even where the two render to the same width.
 *
 * @param string The indented string to realign
 *
 * @returns A copy of `string` with the line terminators normalised, the outer blank lines dropped and the shared
 *     leading whitespace removed from every line
 */
export function dedent(string: string): string;

/**
 * Removes the common indentation from a template literal.
 *
 * Assembles the template exactly as the literal itself would, converting interpolated values to strings and splicing
 * them into the literal sections, then strips the shared margin from the result under the same rules as the plain text
 * form. Since values are spliced in before the margin is computed, multi-line values take part in the computation like
 * any other text and a value whose continuation lines are flush left suppresses the dedent; a tagged call and a plain
 * call on the same literal therefore return the same result.
 *
 * @param template The literal sections of the template
 * @param values The values interpolated between the literal sections
 *
 * @returns The assembled template with the line terminators normalised, the outer blank lines dropped and the shared
 *     leading whitespace removed from every line
 *
 * @see {@link text} and {@link markdown} for tags that dedent while declaring the content type
 */
export function dedent(template: TemplateStringsArray, ...values: readonly unknown[]): string;

/**
 * Removes the common indentation from a block of text or a template literal.
 */
export function dedent(string: string | TemplateStringsArray, ...values: readonly unknown[]): string {

	const text = isString(string) ? string
		: String.raw({ raw: string }, ...values); // joins the escape-resolved pieces, as a plain template does

	const lines = text
		.split(/\r\n|\r|\n/u) // split at eol
		.map(line => /^\s*$/u.test(line) ? "" : line); // clean blank lines

	const prefix = lines
		.filter(line => line !== "") // ignore blank lines
		.map(line => /^\s*/u.exec(line)?.[0] ?? "") // extract leading spaces
		.reduce<undefined | string>(
			(x, y) => x === undefined ? y : x.slice(
				0, [...x].filter((_, n) => x.slice(0, n+1) === y.slice(0, n+1)).length
			),
			undefined
		);

	const indent = prefix?.length ?? 0;

	return lines
		.map(line => line.slice(indent))
		.join("\n")
		.replace(/^\n+|\n+$/gu, ""); // strip leading/trailing lines

}


/**
 * Escapes a string as string literal content.
 *
 * Rewrites every selected character as the escape assigned to it, or, failing that, with the upper-case `\uXXXX` /
 * `\UXXXXXXXX` convention shared by many plain-text syntaxes; everything else is left as it is.
 *
 * **JSON escaping — `escape(string)`**
 *
 * Escapes exactly what a JSON string may not carry as it is: the quotation mark, the reverse solidus and the C0
 * control characters, seven of which take a two-character form (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`), plus
 * isolated surrogates, which denote no character. Non-ASCII text and paired surrogates are left as they are, as JSON
 * admits them; escaping isolated surrogates leaves the result well-formed UTF-16 text, so it survives encoding to
 * UTF-8 and reads back through a JSON parser as the string it was built from, ill-formed halves included.
 *
 * **Custom escaping — `escape(string, pattern, escapes?)`**
 *
 * Targets a syntax of the caller's choosing: `pattern` widens or narrows the selection, for instance to escape every
 * non-ASCII character or the characters that syntax reserves, and `escapes` supplies the short forms it defines, as a
 * {@link Resolver} listing them or computing them on demand. Selected supplementary code points draw on the
 * eight-digit `\UXXXXXXXX` form.
 *
 * **Irregular matches**
 *
 * `pattern` is expected to select one character at a time; a match spanning more or less than one is still handled,
 * rather than rejected, but only on the terms the numeric form allows:
 *
 * - `escapes` is consulted with the whole match, so a short form may be assigned to a multi-character match and is
 *   emitted as it stands
 * - failing that, the match is spelled from its first code point alone and the rest of it is dropped, as a numeric
 *   escape denotes a single code point and nothing in the syntax carries the remainder
 * - a zero-width match, which selects no character at all, is spelled as the escape of `U+FFFD` REPLACEMENT CHARACTER,
 *   the stand-in {@link toWellFormed} likewise substitutes for text that denotes no character
 *
 * @param string The string to escape
 * @param pattern The pattern selecting the characters to escape; must be global and is expected to match single
 *     characters; defaults to the JSON set
 * @param escapes The lookup supplying the escapes selected characters take in preference to the numeric form;
 *     defaults to the two-character JSON escapes
 *
 * @returns A copy of `string` with every character `pattern` selects replaced by the escape `escapes` assigns it, or
 *     by its numeric escape where `escapes` assigns none, a match spanning several characters contributing the escape
 *     of its first code point alone
 *
 * @throws {TypeError} If `pattern` doesn't carry the `g` flag
 *
 * @see {@link clip} for the companion length budget, shortening overlong content before escaping
 * @see {@link https://www.rfc-editor.org/rfc/rfc8259#section-7 RFC 8259 - Strings}
 */
export function escape(
	string: string,
	pattern: RegExp = /[\\"\x00-\x1f\uD800-\uDFFF]/gu, // unicode matching leaves well-formed pairs unmatched
	escapes: Resolver = JSONEscapes
): string {

	if ( !pattern.global ) {
		throw new TypeError(`expected global pattern <${pattern}>`);
	}

	const mapper = isFunction(escapes) ? escapes : (c: string) => escapes[c];

	return string.replace(pattern, c => {

		const code = c.codePointAt(0) ?? 0xFFFD; // a zero-width match denotes no character

		return mapper(c) ?? (code > BMPMax
				? `\\U${hex(code, 8)}`
				: `\\u${hex(code, 4)}`
		);

	});


	function hex(code: number, digits: number = 0): string {
		return code.toString(16).toUpperCase().padStart(digits, "0");
	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks whether a string is well-formed UTF-16 text.
 *
 * Strings are sequences of UTF-16 code units, and nothing prevents one from carrying a surrogate that is not part of a
 * pair; a string holding such an isolated surrogate denotes no Unicode text and has no UTF-8 representation, so
 * operations that must produce bytes, `TextEncoder.encode` and `encodeURI` among them, either replace it with the
 * replacement character or throw.
 *
 * > [!NOTE]
 * > Stands in for `String.prototype.isWellFormed`, standardised in ECMAScript 2024 and declared by TypeScript at the
 * > `ES2024` lib level: this package compiles at `ES2022`, where the native method runs on every supported engine
 * > but remains invisible to the type checker. Will give way to the native method once the compilation target moves
 * > to `ES2024`.
 *
 * @param string The string to test
 *
 * @returns true if `string` carries no isolated surrogate, that is if every high surrogate is followed by a low
 *     surrogate and every low surrogate preceded by a high one; false otherwise
 *
 * @see {@link toWellFormed} for the matching repair, replacing every isolated surrogate with `U+FFFD`
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed MDN
 *     - String.prototype.isWellFormed()}
 * @see {@link https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.iswellformed ECMA-262 -
 *     String.prototype.isWellFormed()}
 * @see {@link https://www.unicode.org/glossary/#well_formed Unicode Glossary - Well-Formed}
 */
export function isWellFormed(string: string): boolean {

	return !/\p{Surrogate}/u.test(string); // unicode matching folds a well-formed pair into a single code point

}

/**
 * Converts a string to well-formed UTF-16 text.
 *
 * Replaces every isolated surrogate with `U+FFFD` REPLACEMENT CHARACTER, so that the result denotes Unicode text and
 * survives encoding to UTF-8; a string that is already well-formed is returned unaltered. Sanitising before an
 * operation that must produce bytes turns a hard failure into a visible substitution the caller controls.
 *
 * > [!NOTE]
 * > Stands in for `String.prototype.toWellFormed`, standardised in ECMAScript 2024 and declared by TypeScript at the
 * > `ES2024` lib level: this package compiles at `ES2022`, where the native method runs on every supported engine
 * > but remains invisible to the type checker. Will give way to the native method once the compilation target moves
 * > to `ES2024`.
 *
 * @param string The string to convert
 *
 * @returns A copy of `string` with every isolated surrogate replaced by `U+FFFD`, leaving paired surrogates and all
 *     other code points untouched
 *
 * @see {@link isWellFormed} for the matching test, reporting whether a conversion would alter the string
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed MDN
 *     - String.prototype.toWellFormed()}
 * @see {@link https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.towellformed ECMA-262 -
 *     String.prototype.toWellFormed()}
 * @see {@link https://www.unicode.org/glossary/#replacement_character Unicode Glossary - Replacement Character}
 */
export function toWellFormed(string: string): string {

	return string.replace(/\p{Surrogate}/gu, "\uFFFD"); // unicode matching leaves well-formed pairs unmatched

}
