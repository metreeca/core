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
 * Composable value validators.
 *
 * Provides composable validators for declaring value constraints. Checks nest to mirror the shape of the data
 * and apply as a single expression, so no traversal or branching need be written by hand. A run reports every
 * violation the value incurs at once, as a {@link Trace} keyed to mirror the value itself, diagnosing a failure in
 * full rather than one error at a time.
 *
 * **Constraining Numbers**
 *
 * Restrict numbers to integral values:
 *
 * ```typescript
 * import { integer } from '@metreeca/core/trace';
 *
 * integer(); // no fractional part
 * ```
 *
 * **Constraining Strings**
 *
 * Restrict strings by length, pattern, or whitespace:
 *
 * ```typescript
 * import { length, normalised, pattern } from '@metreeca/core/trace';
 *
 * length(1, 100); // between 1 and 100 characters
 * pattern(/^\p{Lu}/u); // matching the pattern
 * normalised(); // no leading, trailing, or repeated whitespace
 * normalised(true); // as above, but admitting newlines
 * ```
 *
 * **Constraining Literals**
 *
 * Restrict numbers and strings alike, each compared by its own natural ordering:
 *
 * ```typescript
 * import { domain, gt, gte, lt, lte } from '@metreeca/core/trace';
 *
 * gt(0); // greater than 0, comparing numbers by magnitude
 * gte(0); // greater than or equal to 0
 * lt("m"); // less than "m", comparing strings lexicographically
 * lte("m"); // less than or equal to "m"
 *
 * domain(["draft", "review", "final"]); // one of the admitted values
 * ```
 *
 * **Constraining Arrays**
 *
 * Restrict the array and its items in one call:
 *
 * ```typescript
 * import { all, array, length, size, values } from '@metreeca/core/trace';
 *
 * array(length(1, 100)); // every element within bounds
 * array([length(1, 10), length(1, 100)]); // positional tuple template, matched in length
 *
 * array(length(1, 100), all(size(1, 10), values(["en"]))); // elements, plus cardinality and membership
 * ```
 *
 * **Constraining Objects**
 *
 * Restrict the object and its entries in one call:
 *
 * ```typescript
 * import { test, all, entry, keys, length, object, pass, pattern, size } from '@metreeca/core/trace';
 * import { key } from '@metreeca/core';
 *
 * object(entry([undefined, length(0, 100)])); // every entry, constrained by value
 * object(entry([pattern(/^[^_]/u)])); // every entry, constrained by key
 * object({ label: length(1, 100), notes: length(0, 1000) }); // closed: unnamed properties rejected
 * object({ label: length(1, 100), [key]: pass }); // open: unnamed properties admitted unconstrained
 *
 * object({ id: length(1, 50) }, // properties, plus constraints spanning them
 *     all(
 *         size(1, 10), // between 1 and 10 properties
 *         keys(["id"]), // required property names
 *         test(record => !("id" in record && "code" in record) || ["mutually exclusive"])
 *     )
 * );
 * ```
 *
 * **Constraining Other Values**
 *
 * Adapt an arbitrary predicate to cover whatever the built-in vocabulary doesn't, reporting either a fixed message or
 * one computed from the rejected value; reject outright to close a branch reached only by values already known to be
 * illegal:
 *
 * ```typescript
 * import { test, fail } from '@metreeca/core/trace';
 *
 * test(value => value.length % 2 === 0 || ["expected an even number of characters"]);
 * test(value => value % 3 === 0 || [`expected a multiple of 3, found <${value}>`]);
 *
 * fail(["unexpected value"]); // reject anything, reporting a fixed message
 * fail(value => [`unexpected <${value}>`]); // as above, but computing the message
 * ```
 *
 * **Combining Validators**
 *
 * Assemble validators into compound checks, bottoming out in {@link pass}, the constant admitting anything:
 *
 * ```typescript
 * import {
 *     all, any, fail, gte, integer, length, nullable, one, optional, pass, pattern, required, type
 * } from '@metreeca/core/trace';
 * import { isString } from '@metreeca/core';
 *
 * pass; // accept anything: neutral to all(), absorbing to any()
 *
 * all(integer(), gte(0)); // every validator must pass
 * any(length(3, 3), length(5, 5)); // at least one must pass
 * one(pattern(/^\d+$/u), pattern(/^[a-z]+$/u)); // exactly one must pass
 *
 * required(length(1, 100)); // rejected when absent
 * optional(length(1, 100)); // unconstrained when absent
 * nullable(length(1, 100)); // unconstrained when null
 * optional(nullable(length(1, 100))); // unconstrained when either
 *
 * type(isString, length(1, 100)); // strings within bounds, anything else rejected as a non-string
 *
 * type(isString, // as above, wording the rejection explicitly
 *     length(1, 100),
 *     fail(value => [`expected a string, found <${typeof value}>`])
 * );
 * ```
 *
 * Validators key the violations they report by the part of the value incurring them, so a nested check already yields
 * a navigable report; name a violation of your own by prefixing the message handed to {@link fail} or {@link test}
 * with a facet of its own, in braces.
 *
 * Every validator slot is {@link Modal}, so a check may be switched off inline with a guard expression, without
 * rebuilding the surrounding composition conditionally:
 *
 * ```typescript
 * all(
 *     strict && integer(),
 *     bounded && gte(0)
 * );
 * ```
 *
 * **Composing Complex Validators**
 *
 * Nest the above into a deep check, end to end: literal, array, and object constraints combined under a single
 * validator, applied to a value, and reported to callers as a {@link TraceError}:
 *
 * ```typescript
 * import {
 *     all, array, fail, gte, length, normalised, object, optional, pass, size, TraceError, type
 * } from '@metreeca/core/trace';
 * import { isNumber, isString, key } from '@metreeca/core';
 *
 * const validateProduct = object({
 *
 *     label: type(isString, all(length(1, 100), normalised())),
 *     price: type(isNumber, gte(0)),
 *     notes: optional(type(isString, normalised(true))),
 *
 *     tags: array( // multi-valued, reporting non-qualifying elements explicitly
 *         type(isString, length(1, 25), fail(["expected a string"])),
 *         size(0, 10)
 *     ),
 *
 *     [key]: pass // admit unnamed properties
 *
 * });
 *
 * const trace = validateProduct(product);
 *
 * if ( trace !== undefined ) { throw new TraceError("malformed product", trace); }
 * ```
 *
 * A failing run reports every violated constraint at once, keyed by property and by element position, each message
 * naming the constraint that incurred it:
 *
 * ```json
 * [
 *   {
 *     "label": ["{length} expected string length less than or equal to <100>"],
 *     "tags": [{ "2": ["{length} expected string length less than or equal to <25>"] }]
 *   }
 * ]
 * ```
 *
 * @module
 */

import { clip, escape } from "../values/strings.js";
import { type Guard, isFunction, isNumber, isString, key, lazy } from "../index.js";
import { fold } from "./combo.js";


const QuoteLength = 10;
const QuotePattern = /["\\\p{Cc}\p{Zl}\p{Zp}\uD800-\uDFFF]|[^\P{Cf}\u200D]|[^\P{Zs} ]/gu;

const TypeLabels: Record<string, string> = {
	Null: "null",
	Boolean: "boolean",
	Number: "number",
	String: "string",
	Array: "array",
	Object: "object"
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A validator accepting any value.
 */
export const pass: Validator<unknown> = () => undefined;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validation trace.
 *
 * Lists every violation incurred at a position, so a value breaking several constraints is diagnosed in full in one
 * read rather than one error per run. Each item takes either of two forms:
 *
 * - **a message** — an atomic violation, as self-contained human-readable text; the validators of this module prefix
 *   theirs with the constraint facet incurring it, in braces (`"{integer} expected integral value"`);
 * - **a record** — sub-traces grouped by key, nesting to mirror the shape of the value and bottoming out in messages;
 *   a key reporting no violation is dropped rather than mapped to an empty trace.
 *
 * The keyed form addresses the parts of a compound value: {@link array} keys element violations by decimal position
 * (`"2"`), {@link object} and {@link entry} key them by property name (`"label"`), so a report is navigated the way the
 * value it describes is. Key a trace of your own by any convention that navigates the value as usefully.
 *
 * A trace handed back by this module always carries a violation, at every level: an empty list, an empty record, and a
 * branch left empty are all reported as `undefined` instead.
 */
export type Trace = ReadonlyArray<
	| string
	| { readonly [key: string]: Trace }
>;

/**
 * Error carrying a structured validation {@link Trace}.
 *
 * Extends `RangeError` with the reported {@link Trace} as a typed `cause`, so a caller handling the error works with
 * the violations directly rather than testing a {@link Trace} for success first, and includes a pretty-printed copy of
 * the report in the message for visibility in stack traces and test output.
 */
export class TraceError extends RangeError {

	override readonly cause: Trace;

	constructor(message: string, cause: Trace) {

		super(`${message} <${JSON.stringify(cause, undefined, 2)}>`, { cause });

		this.cause = cause;

	}

}


/**
 * Value validator.
 *
 * Maps a value to the {@link Trace} possibly reporting the violations it incurs.
 *
 * @typeParam T The type of the validated value
 */
export type Validator<T> =
	(value: T) => undefined | Trace;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Optional validator.
 *
 * Admits `undefined` and `false` in place of a validator, so a check may be switched off inline with a guard
 * expression (`enabled && check()`) rather than by rebuilding the surrounding composition conditionally. A validator
 * left out this way is ignored and never contributes to the reported trace.
 *
 * @typeParam T The type admitted when the validator is present
 */
export type Modal<T> =
	undefined | false | T;

/**
 * Named entries with an optional wildcard entry.
 *
 * Maps names to values, optionally including a value under the {@link key} symbol, mirroring the open template accepted
 * by the `isObject` guard of `@metreeca/core`. The wildcard entry covers whatever the named entries leave out:
 * {@link object} applies it to every property its template does not name explicitly.
 *
 * @typeParam T The type of the mapped values
 */
export type Keyed<T> = {
	readonly [name: string]: T;
	readonly [key]?: T;
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Constrains numbers to integral values.
 *
 * @returns A validator reporting a violation if the value has a fractional part
 */
export function integer(): Validator<number> {

	const fractional = ["{integer} expected integral value"];

	return value => Number.isInteger(value) ? undefined : fractional;

}


/**
 * Constrains string length.
 *
 * Bounds are inclusive; an `undefined` bound leaves the corresponding end unconstrained.
 *
 * @param min The minimum accepted length, or `undefined` for no lower bound
 * @param max The maximum accepted length, or `undefined` for no upper bound
 *
 * @returns A validator reporting a violation if the value length falls outside the bounds
 */
export function length(min: undefined | number, max: undefined | number): Validator<string> {

	if ( min !== undefined && max !== undefined ) {

		const below = [`{length} expected string length greater than or equal to <${min}>`];
		const above = [`{length} expected string length less than or equal to <${max}>`];

		return value => value.length < min ? below : value.length > max ? above : undefined;

	} else if ( min !== undefined ) {

		const below = [`{length} expected string length greater than or equal to <${min}>`];

		return value => value.length < min ? below : undefined;

	} else if ( max !== undefined ) {

		const above = [`{length} expected string length less than or equal to <${max}>`];

		return value => value.length > max ? above : undefined;

	} else {

		return pass;

	}

}

/**
 * Constrains strings to a pattern.
 *
 * String patterns are read as regular expression sources and compiled with default flags; pass a `RegExp` instead to
 * choose the flags, `u` among them. Matching is unanchored, so a pattern constrains the whole value only if it is
 * anchored explicitly.
 *
 * @param pattern The pattern the value must match, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value does not match `pattern`
 */
export function pattern(pattern: undefined | string | RegExp): Validator<string> {

	const regex = fold(pattern, pattern => isString(pattern) ? new RegExp(pattern) : pattern);

	if ( regex !== undefined ) {

		const mismatched = [`{pattern} expected string matching </${regex.source}/${regex.flags}>`];

		return value => regex.test(value) ? undefined : mismatched;

	} else {

		return pass;

	}

}

/**
 * Constrains strings to normalised whitespace.
 *
 * Rejects leading and trailing whitespace and admits internal whitespace only as single spaces; blank strings fail by
 * consequence rather than by a rule of their own. In multiline mode, single and double newlines are admitted as well,
 * and nothing else.
 *
 * @param multiline Whether to admit newlines as paragraph and line separators
 *
 * @returns A validator reporting a violation if the value carries non-normalised whitespace
 */
export function normalised(multiline: boolean = false): Validator<string> {

	const regex = multiline
		? /^\S+(?:(?: |\n\n?)\S+)*$/
		: /^\S+(?: \S+)*$/;

	const denormalised = ["{normalised} expected normalised string"];

	return value => regex.test(value) ? undefined : denormalised;

}


/**
 * Constrains numbers to an exclusive lower bound.
 *
 * @param limit The exclusive lower bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is not greater than `limit`
 */
export function gt(limit: undefined | number): Validator<number>;

/**
 * Constrains strings to an exclusive lower bound.
 *
 * Strings compare lexicographically.
 *
 * @param limit The exclusive lower bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is not greater than `limit`
 */
export function gt(limit: undefined | string): Validator<string>;

/**
 * Constrains numbers and strings to an exclusive lower bound.
 */
export function gt(limit: unknown): Validator<never> {

	if ( isNumber(limit) ) {

		const below = [`{gt} expected value greater than <${limit}>`];

		return (value: number) => value > limit ? undefined : below;

	} else if ( isString(limit) ) {

		const below = [`{gt} expected value greater than <${format(limit)}>`];

		return (value: string) => value > limit ? undefined : below;

	} else {

		return pass;

	}

}

/**
 * Constrains numbers to an inclusive lower bound.
 *
 * @param limit The inclusive lower bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is less than `limit`
 */
export function gte(limit: undefined | number): Validator<number>;

/**
 * Constrains strings to an inclusive lower bound.
 *
 * Strings compare lexicographically.
 *
 * @param limit The inclusive lower bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is less than `limit`
 */
export function gte(limit: undefined | string): Validator<string>;

/**
 * Constrains numbers and strings to an inclusive lower bound.
 */
export function gte(limit: unknown): Validator<never> {

	if ( isNumber(limit) ) {

		const below = [`{gte} expected value greater than or equal to <${limit}>`];

		return (value: number) => value >= limit ? undefined : below;

	} else if ( isString(limit) ) {

		const below = [`{gte} expected value greater than or equal to <${format(limit)}>`];

		return (value: string) => value >= limit ? undefined : below;

	} else {

		return pass;

	}

}

/**
 * Constrains numbers to an exclusive upper bound.
 *
 * @param limit The exclusive upper bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is not less than `limit`
 */
export function lt(limit: undefined | number): Validator<number>;

/**
 * Constrains strings to an exclusive upper bound.
 *
 * Strings compare lexicographically.
 *
 * @param limit The exclusive upper bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is not less than `limit`
 */
export function lt(limit: undefined | string): Validator<string>;

/**
 * Constrains numbers and strings to an exclusive upper bound.
 */
export function lt(limit: unknown): Validator<never> {

	if ( isNumber(limit) ) {

		const above = [`{lt} expected value less than <${limit}>`];

		return (value: number) => value < limit ? undefined : above;

	} else if ( isString(limit) ) {

		const above = [`{lt} expected value less than <${format(limit)}>`];

		return (value: string) => value < limit ? undefined : above;

	} else {

		return pass;

	}

}

/**
 * Constrains numbers to an inclusive upper bound.
 *
 * @param limit The inclusive upper bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is greater than `limit`
 */
export function lte(limit: undefined | number): Validator<number>;

/**
 * Constrains strings to an inclusive upper bound.
 *
 * Strings compare lexicographically.
 *
 * @param limit The inclusive upper bound, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is greater than `limit`
 */
export function lte(limit: undefined | string): Validator<string>;

/**
 * Constrains numbers and strings to an inclusive upper bound.
 */
export function lte(limit: unknown): Validator<never> {

	if ( isNumber(limit) ) {

		const above = [`{lte} expected value less than or equal to <${limit}>`];

		return (value: number) => value <= limit ? undefined : above;

	} else if ( isString(limit) ) {

		const above = [`{lte} expected value less than or equal to <${format(limit)}>`];

		return (value: string) => value <= limit ? undefined : above;

	} else {

		return pass;

	}

}


/**
 * Constrains numbers to an enumerated domain.
 *
 * Checks the value against the admitted set.
 *
 * @param values The admitted values, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is outside `values`
 */
export function domain(values: undefined | readonly number[]): Validator<number>;

/**
 * Constrains strings to an enumerated domain.
 *
 * Checks the value against the admitted set.
 *
 * @param values The admitted values, or `undefined` to accept any value
 *
 * @returns A validator reporting a violation if the value is outside `values`
 */
export function domain(values: undefined | readonly string[]): Validator<string>;

/**
 * Constrains numbers and strings to an enumerated domain.
 */
export function domain(values: undefined | readonly (number | string)[]): Validator<never> {

	if ( values !== undefined ) {

		const admitted = new Set<unknown>(values);

		const outside = lazy(() => [
			`{domain} expected value in [${values.map(format).join(", ")}]`
		]);

		return value => admitted.has(value) ? undefined : outside();

	} else {

		return pass;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Constrains an array.
 *
 * Applies element-wise constraints in either of the two modes of the `isArray` guard of `@metreeca/core`:
 *
 * - **element validator** — a single validator applied to every element in turn;
 * - **tuple template** — an array of validators applied positionally, requiring the array to match it in length.
 *
 * Element violations are reported keyed by element position (`"2"`). A second validator constrains the array as a
 * whole, covering cardinality, membership, and the like, so both levels are stated in one call. Whole-array violations
 * lead the report as bare messages, ahead of the record keying the element ones.
 *
 * @typeParam T The element type of the array
 *
 * @param elements The element validator or positional tuple template; omitted or disabled validators accept the
 *     corresponding elements
 * @param array The validator applied to the array as a whole; omit or disable to constrain the elements alone
 *
 * @returns A validator reporting the violations the array incurs, element-wise and as a whole
 */
export function array<T>(
	elements: Modal<Validator<T>> | readonly Modal<Validator<T>>[],
	array?: Modal<Validator<readonly T[]>>
): Validator<readonly T[]> {

	const $array = array || pass;

	if ( isFunction(elements) ) {

		const $elements = elements || pass;

		return values => merge(
			$array(values),
			...values.map((value, index) => fold($elements(value), trace => [{ [`${index}`]: trace }]))
		);

	} else if ( elements ) {

		const $elements = elements.map(element => element || pass);

		const mismatched: Trace = [`{size} expected <${$elements.length}> elements`];

		return values => merge(
			$array(values),
			...($elements.length === values.length
				? values.map((value, index) => fold($elements[index](value), trace => [{ [`${index}`]: trace }]))
				: [mismatched])
		);

	} else {

		return $array;

	}

}

/**
 * Constrains an object.
 *
 * Applies property-wise constraints in either of the two modes of the `isObject` guard of `@metreeca/core`:
 *
 * - **entry validator** — a single validator applied to every property as a `[name, value]` pair, so it may constrain
 *   property names as well as their values;
 * - **record template** — a {@link Keyed} record of entries applied by property name, each validator seeing only
 *   the value, the name being already fixed by the key it is filed under.
 *
 * Templates are closed by default: properties not named by the template are rejected. Including a {@link key} wildcard
 * entry opens the template, applying its validator to every property not explicitly named, {@link pass} to admit them
 * unconstrained.
 *
 * Property violations are reported keyed by property name, the wildcard ones under the name of the property they were
 * reported for. A second validator constrains the record as a whole, covering constraints spanning several properties,
 * so both levels are stated in one call. Whole-record violations lead the
 * report as bare messages, ahead of the record keying the property ones.
 *
 * @typeParam T The type of the property values
 *
 * @param entries The `[name, value]` entry validator or the property template; omitted or disabled validators accept
 *     the corresponding properties
 * @param whole The validator applied to the record as a whole; omit or disable to constrain the properties alone
 *
 * @returns A validator reporting the violations the object incurs, property-wise and as a whole
 */
export function object<T>(
	entries: Modal<Validator<readonly [string, T]>> | Keyed<Modal<Validator<T>>>,
	whole?: Modal<Validator<Record<string, T>>>
): Validator<Record<string, T>> {

	const $object = whole || pass;

	if ( isFunction(entries) ) {

		return record => merge(
			$object(record),
			...Object.entries(record).map(([name, value]) => entries([name, value]))
		);

	} else if ( entries ) {

		const $entries = Object.fromEntries(
			Object.keys(entries).map(name => [name, entries[name] || pass])
		);

		const $wildcard = key in entries
			? entries[key] || pass
			: fail(["{object} unexpected property"]);

		return record => merge(
			$object(record),

			...[...new Set([...Object.keys($entries), ...Object.keys(record)])].map(name =>
				fold((name in $entries ? $entries[name] : $wildcard)(record[name]), trace => [{ [name]: trace }])
			)
		);

	} else {

		return $object;

	}

}


/**
 * Constrains an entry.
 *
 * Applies a positional template to a key/value pair, either half omitted or disabled to leave it unconstrained. The
 * two halves are typed independently, so a heterogeneous pair is constrained without widening.
 *
 * Violations are reported under the entry key, whichever half incurs them, those of the two halves accumulating side by
 * side.
 *
 * Instantiated at `[string, T]`, this is the entry validator accepted by the entry mode of {@link object}: drop either
 * half to constrain property names alone or property values alone, the report landing under the property name exactly
 * where a template-keyed one would.
 *
 * @typeParam K The type of the entry key
 * @typeParam V The type of the entry value
 *
 * @param entry The key and value validators as a positional pair: the first constrains the entry key, the second the
 *     entry value; an omitted or disabled half accepts the corresponding position
 *
 * @returns A validator reporting the violations the entry incurs, keyed by its key
 */
export function entry<K, V>(
	[key, value]: readonly [Modal<Validator<K>>?, Modal<Validator<V>>?]
): Validator<readonly [K, V]> {

	const $key = key || pass;
	const $value = value || pass;

	return ([k, v]) => fold(merge($key(k), $value(v)),
		faults => [{ [`${k}`]: faults }]
	);

}

/**
 * Constrains the size of an array or object.
 *
 * Counts the elements of an array or the properties of an object, so cardinality is stated the same way for either.
 * Bounds are inclusive; an `undefined` bound leaves the corresponding end unconstrained.
 *
 * @param min The minimum accepted number of elements or properties, or `undefined` for no lower bound
 * @param max The maximum accepted number of elements or properties, or `undefined` for no upper bound
 *
 * @returns A validator reporting a violation if the count falls outside the bounds
 */
export function size(
	min: undefined | number,
	max: undefined | number
): Validator<readonly unknown[] | Record<string, unknown>> {

	if ( min !== undefined && max !== undefined ) {

		const below = [`{size} expected size greater than or equal to <${min}>`];
		const above = [`{size} expected size less than or equal to <${max}>`];

		return value => {

			const count = extent(value);

			return count < min ? below : count > max ? above : undefined;

		};

	} else if ( min !== undefined ) {

		const below = [`{size} expected size greater than or equal to <${min}>`];

		return value => extent(value) < min ? below : undefined;

	} else if ( max !== undefined ) {

		const above = [`{size} expected size less than or equal to <${max}>`];

		return value => extent(value) > max ? above : undefined;

	} else {

		return pass;

	}

	function extent(value: readonly unknown[] | Record<string, unknown>): number {
		return Array.isArray(value) ? value.length : Object.keys(value).length;
	}

}

/**
 * Requires keys to be present in an array or object.
 *
 * Checks the array indices or the object property names as a whole for the presence of each required key, so
 * membership is stated the same way for either: numeric keys address array positions, string keys object properties.
 *
 * Each missing key is reported under a key of its own, so a violation lands where the absent element or property would
 * have been.
 *
 * @typeParam K The type of the required keys
 *
 * @param keys The keys the array or object must contain, or `undefined` to accept either unconditionally
 *
 * @returns A validator reporting a violation for each required key missing
 */
export function keys<K extends number | string>(
	keys: undefined | readonly K[]
): Validator<readonly unknown[] | Record<string, unknown>> {

	if ( keys !== undefined && keys.length > 0 ) {

		const required = [...new Set(keys.map(key => `${key}`))];

		return value => {

			const present = new Set(Array.isArray(value) ? value.map((_, index) => `${index}`) : Object.keys(value));
			const missing = required.filter(key => !present.has(key));

			return missing.length === 0 ? undefined : [Object.fromEntries(
				missing.map(key => [key, ["{keys} missing required key"]])
			)];

		};

	} else {

		return pass;

	}

}

/**
 * Requires values to be present in an array or object.
 *
 * Checks the array elements or the object property values as a whole for the presence of each required value, so
 * membership is stated the same way for either.
 *
 * Every missing value is reported together in a single message.
 *
 * @typeParam V The type of the required values
 *
 * @param values The values the array or object must contain, or `undefined` to accept either unconditionally
 *
 * @returns A validator reporting a violation listing every required value missing
 */
export function values<V extends number | string>(
	values: undefined | readonly V[]
): Validator<readonly unknown[] | Record<string, unknown>> {

	if ( values !== undefined && values.length > 0 ) {

		const required = [...new Set(values)];

		return value => {

			const present = new Set<unknown>(Array.isArray(value) ? value : Object.values(value));
			const missing = required.filter(value => !present.has(value));

			return missing.length === 0 ? undefined : [
				`{values} missing values [${missing.map(format).join(", ")}]`
			];

		};

	} else {

		return pass;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Constrains a value with a custom predicate that words its own violation.
 *
 * Adapts an arbitrary check into a validator, folding the verdict and its message into one predicate: it returns `true`
 * when the value passes, or the {@link Trace} describing the violation when it fails. Prefixing the message with a
 * facet of its own, in braces, names the violation the way a built-in constraint names its own.
 *
 * @typeParam T The type of the tested value
 *
 * @param predicate The predicate the value must satisfy, returning `true` on success or the {@link Trace} wording the
 *     violation on failure
 *
 * @returns A validator reporting the {@link Trace} returned by `predicate` when the value does not satisfy it
 */
export function test<T>(predicate: (value: T) => true | Trace): Validator<T> {

	return value => {

		const trace = predicate(value);

		return trace === true ? undefined : trace;

	};

}

/**
 * Rejects every value.
 *
 * Reports the given violation whatever the value, closing a branch reached only by values already known to be illegal,
 * for instance the `unknown` branch of a {@link type} split.
 *
 * The violation is stated either outright or as a function computing it from the rejected value; a computed trace is
 * built only if a value is actually rejected, so wording that inspects the value costs nothing on the passing path.
 *
 * @typeParam T The type of the rejected value
 *
 * @param trace The {@link Trace} wording the violation, or a function computing it from the rejected value
 *
 * @returns A validator reporting a violation for every value
 */
export function fail<T>(trace: Trace | ((value: T) => Trace)): Validator<T> {

	return isFunction(trace) ? trace : () => trace;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Requires a value to be present.
 *
 * Rejects `undefined` outright, delegating anything else to the wrapped validator, so a mandatory property is reported
 * as missing rather than passing unchecked.
 *
 * This is the only constraint that reports an absent value as missing: the value-domain validators assume a value to
 * inspect, and a {@link type} guard hands a missing one to its `unknown` branch, which reports it as a type mismatch
 * rather than as absent. Wrap the value-domain constraints of a mandatory property in this check to have absence
 * reported.
 *
 * @typeParam T The type of the present value
 *
 * @param validator The validator applied to a present value, omitted or disabled to accept any value
 *
 * @returns A validator reporting a violation if the value is absent, and the violations it incurs otherwise
 */
export function required<T>(validator: Modal<Validator<T>>): Validator<undefined | T> {

	const $validator = validator || pass;

	return value => value !== undefined ? $validator(value) : ["{required} missing required value"];

}

/**
 * Makes a validator tolerant of absent values.
 *
 * Accepts `undefined` unconditionally, delegating anything else to the wrapped validator, so an optional property is
 * constrained only when actually present.
 *
 * @typeParam T The type of the present value
 *
 * @param validator The validator applied to present values, omitted or disabled to accept any value
 *
 * @returns A validator reporting the violations a present value incurs
 */
export function optional<T>(validator: Modal<Validator<T>>): Validator<undefined | T> {

	const $validator = validator || pass;

	return value => value === undefined ? undefined : $validator(value);

}

/**
 * Makes a validator tolerant of null values.
 *
 * Accepts `null` unconditionally, delegating anything else to the wrapped validator, so an explicitly emptied property
 * is constrained only when actually filled.
 *
 * @typeParam T The type of the present value
 *
 * @param validator The validator applied to present values, omitted or disabled to accept any value
 *
 * @returns A validator reporting the violations a present value incurs
 */
export function nullable<T>(validator: Modal<Validator<T>>): Validator<null | T> {

	const $validator = validator || pass;

	return value => value === null ? undefined : $validator(value);

}


/**
 * Requires every validator to pass.
 *
 * Applies all validators and reports the violations of each, so a single run surfaces every constraint a value breaks
 * rather than stopping at the first.
 *
 * Reports are merged in flat: messages accumulate side by side, whichever validator contributed them, and sub-traces
 * reported against the same key accumulate under it in turn. A violation reported more than once is retained once.
 *
 * @typeParam T The type of the validated value
 *
 * @param validators The validators to apply; omitted or disabled validators are ignored
 *
 * @returns A validator reporting the combined violations of every enabled validator
 */
export function all<T>(...validators: readonly Modal<Validator<T>>[]): Validator<T> {

	const $validators = validators.filter(validator => !!validator);

	return value => merge(...$validators.map(validator => validator(value)));

}

/**
 * Requires at least one validator to pass.
 *
 * Reports a violation only if every validator fails, as a bare message. The reports of the individual alternatives are
 * not surfaced: a failed alternative is a reading the value did not take, not a part of it a report could key against.
 *
 * @typeParam T The type of the validated value
 *
 * @param validators The alternative validators; omitted or disabled validators are ignored
 *
 * @returns A validator reporting a violation if no enabled validator passes
 */
export function any<T>(...validators: readonly Modal<Validator<T>>[]): Validator<T> {

	const $validators = validators.filter(validator => !!validator);

	return value => $validators.some(validator => merge(validator(value)) === undefined) ? undefined
		: ["{any} matched no alternative"];

}

/**
 * Requires exactly one validator to pass.
 *
 * Rejects ambiguity as well as absence: matching no validator is unsatisfiable, matching several is ambiguous, and
 * both are reported as a bare message telling the two apart.
 *
 * @typeParam T The type of the validated value
 *
 * @param validators The mutually exclusive validators; omitted or disabled validators are ignored
 *
 * @returns A validator reporting a violation unless exactly one enabled validator passes
 */
export function one<T>(...validators: readonly Modal<Validator<T>>[]): Validator<T> {

	const $validators = validators.filter(validator => !!validator);

	return value => {

		const matched = $validators.filter(validator => merge(validator(value)) === undefined);

		return matched.length === 1 ? undefined
			: matched.length === 0 ? ["{one} matched no alternative"]
				: ["{one} matched more than one alternative"];

	};

}


/**
 * Constrains a value by type.
 *
 * Branches on a type guard, handing a matching value to `matched` and anything else to `unknown`. This narrows the
 * value type for the constraints that assume it, while keeping a dedicated branch for values that fail to qualify in
 * the first place.
 *
 * `unknown` is a full validator applied to the non-matching value, free to accept it or report against it. Its default
 * rejects the value, naming the expected type read off the guard name when it follows the conventional `isX` form of
 * the `@metreeca/core` guards, for instance `isString` reporting `{type} expected <string> value`; a guard named
 * otherwise, an anonymous one among them, is reported against generically.
 *
 * @typeParam T The type recognised by `guard`
 *
 * @param guard The type guard selecting the branch
 * @param matched The validator applied to a matching value, omitted to accept it unconstrained
 * @param unknown The validator applied to a value failing `guard`, omitted to reject it naming the expected type
 *
 * @returns A validator reporting the violations a matching value incurs, and whatever `unknown` reports for anything
 *     else
 */
export function type<T>(guard: Guard<T>, matched?: Validator<T>, unknown?: Validator<unknown>): Validator<unknown> {

	const $matched = matched ?? pass;

	const $unknown = unknown ?? fail(fold(/^is(\p{Lu}\p{L}*)$/u.exec(guard.name) ?? undefined,
		([, type]) => [`{type} expected <${TypeLabels[type] ?? type}> value`],
		["{type} unexpected value type"]
	));

	return value => guard(value) ? $matched(value) : $unknown(value);

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Merges the violations reported against one position.
 *
 * Canonicalises the result: unique messages first, then a single record gathering under each key the sub-traces
 * reported against it, recursively. Whatever the merge leaves empty collapses to `undefined`, so an empty list, an
 * empty record, and a branch pruned down to either all state success.
 *
 * @param traces The traces to merge; the ones reporting no violation contribute nothing
 *
 * @returns The merged trace, or `undefined` if no trace reports a violation
 */
function merge(...traces: readonly (undefined | Trace)[]): undefined | Trace {

	const items = traces.filter(trace => trace !== undefined).flat();

	const messages = [...new Set(items.filter(isString))];
	const entries = items.flatMap(item => isString(item) ? [] : Object.entries(item));

	const grouped = [...new Set(entries.map(([name]) => name))].reduce((groups, name) => fold(
		merge(...entries.filter(([key]) => key === name).map(([, trace]) => trace)),
		trace => ({ ...groups, [name]: trace }),
		groups
	), {});

	const trace = [...messages, ...(Object.keys(grouped).length > 0 ? [grouped] : [])];

	return trace.length === 0 ? undefined : trace;

}

/**
 * Formats a value for embedding in a violation message.
 *
 * Formats numbers with US locale conventions (`en-US`); reports strings between quotation marks, shortened to a fixed
 * budget of code points and with every character with no visible glyph replaced by an escape, so that a violation
 * message states the offending value unambiguously without letting overlong or invisible content overrun it.
 *
 * @param value The value to report
 *
 * @returns The locale-formatted number or the shortened and quoted string literal
 */
function format(value: number | string): string {

	return isNumber(value)
		? value.toLocaleString("en-US")
		: `"${escape(clip(value, QuoteLength), QuotePattern)}"`;

}
