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
 * Composable comparison functions.
 *
 * Provides ready-made comparators, factories deriving them from keys or locales, and combinators that reverse, extend
 * or chain them. Factories and combinators return a {@link Comparator}, so results compose freely and plug into
 * {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort | Array.sort()}.
 *
 * **Basic Sorting**
 *
 * Sort arrays using ascending or descending order:
 *
 * ```typescript
 * import { ascending, descending } from '@metreeca/core/order';
 *
 * const numbers = [3, 1, 4, 1, 5];
 * numbers.sort(ascending);  // [1, 1, 3, 4, 5]
 * numbers.sort(descending); // [5, 4, 3, 1, 1]
 * ```
 *
 * **Sorting by Property**
 *
 * Extract and compare specific properties from objects:
 *
 * ```typescript
 * import { by, descending } from '@metreeca/core/order';
 *
 * const users = [
 *   { name: 'Bob', age: 25 },
 *   { name: 'Alice', age: 30 }
 * ];
 *
 * users.sort(by(user => user.name));            // Sort by name ascending
 * users.sort(by(user => user.age, descending)); // Sort by age descending
 * ```
 *
 * **Sorting by Locale**
 *
 * Order strings according to the collation rules of a locale:
 *
 * ```typescript
 * import { by, locale } from '@metreeca/core/order';
 *
 * const users = [
 *   { name: 'Émile' },
 *   { name: 'adam' }
 * ];
 *
 * users.sort(by(user => user.name, locale())); // Sort by name with the runtime locale
 * ```
 *
 * **Handling Nullish Values**
 *
 * Place `null` and `undefined` keys first or last. `Array.prototype.sort` moves undefined array elements to the end
 * without ever consulting the comparator, so the placement of undefined values holds for keys extracted with `by`:
 *
 * ```typescript
 * import { by, nullish, defined, ascending } from '@metreeca/core/order';
 *
 * const items = [{ rank: 3 }, { rank: null }, { rank: 1 }, { rank: undefined }, { rank: 2 }];
 *
 * items.sort(by(item => item.rank, nullish(ascending))); // ranks: undefined, null, 1, 2, 3
 * items.sort(by(item => item.rank, defined(ascending))); // ranks: 1, 2, 3, null, undefined
 * ```
 *
 * **Reversing Order**
 *
 * Invert an existing comparator:
 *
 * ```typescript
 * import { reverse, ascending } from '@metreeca/core/order';
 *
 * const numbers = [3, 1, 4, 1, 5];
 * numbers.sort(reverse(ascending)); // [5, 4, 3, 1, 1]
 * ```
 *
 * **Combining Multiple Criteria**
 *
 * Sort by multiple properties with priority order:
 *
 * ```typescript
 * import { by, compound } from '@metreeca/core/order';
 *
 * const data = [
 *   { category: 'B', priority: 2 },
 *   { category: 'A', priority: 1 },
 *   { category: 'A', priority: 3 }
 * ];
 *
 * data.sort(compound(
 *   by(item => item.category),    // First by category
 *   by(item => item.priority)     // Then by priority
 * ));
 * ```
 *
 * @module
 *
 * @groupDescription Comparators
 *
 * Ready-made comparison functions for the natural ordering of values.
 *
 * @groupDescription Factories
 *
 * Functions that create new comparators tailored to a specific ordering criterion.
 *
 * @groupDescription Combinators
 *
 * Functions that modify or combine existing comparators.
 */

import type { Nullable } from "../index.js";


/**
 * Comparison function.
 *
 * Orders pairs of values for sorting and other comparator-based operations. The result is negative if `a` precedes
 * `b`, positive if `a` follows `b`, and zero if the two values are equivalent and their relative order is irrelevant.
 *
 * @typeParam V The type of values to compare
 */
export type Comparator<V> = {

	(a: V, b: V): number

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Compares values in ascending order.
 *
 * Null and undefined values are treated as less than any other value.
 * When both values are null or undefined, they are considered equal.
 *
 * @group Comparators
 *
 * @param a First value to compare
 * @param b Second value to compare
 *
 * @returns Negative if `a < b`, positive if `a > b`, zero if equal
 *
 * @remarks
 *
 * When comparing incompatible types (e.g., numbers with strings), JavaScript's comparison
 * operators perform type coercion which may produce unexpected results. Incomparable values
 * are treated as equal. Use with homogeneous collections for predictable sorting.
 */
export function ascending<V>(a: V, b: V): number {

	const na = a === undefined || a === null;
	const nb = b === undefined || b === null;

	return na && nb ? 0 : na ? -1 : nb ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Compares values in descending order.
 *
 * Null and undefined values are treated as less than any other value.
 * When both values are null or undefined, they are considered equal.
 *
 * @group Comparators
 *
 * @param a First value to compare
 * @param b Second value to compare
 *
 * @returns Positive if `a < b`, negative if `a > b`, zero if equal
 *
 * @remarks
 *
 * When comparing incompatible types (e.g., numbers with strings), JavaScript's comparison
 * operators perform type coercion which may produce unexpected results. Incomparable values
 * are treated as equal. Use with homogeneous collections for predictable sorting.
 */
export function descending<V>(a: V, b: V): number {

	const na = a === undefined || a === null;
	const nb = b === undefined || b === null;

	return na && nb ? 0 : na ? -1 : nb ? 1 : a < b ? 1 : a > b ? -1 : 0;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a comparator that compares values by a selected key.
 *
 * Values are ordered by a key taken from each of them, such as a property, and keys are ordered by `comparator`.
 *
 * @group Factories
 *
 * @typeParam V The type of values to compare
 * @typeParam K The type of keys to compare
 *
 * @param selector Function that extracts the comparison key from a value
 * @param comparator Comparator to apply to the extracted keys (defaults to {@link ascending})
 *
 * @returns A comparator ordering values by their selected keys
 */
export function by<V, K>(selector: (value: V) => K, comparator: Comparator<K> = ascending): Comparator<V> {
	return (a, b) => comparator(selector(a), selector(b));
}

/**
 * Creates a comparator that orders strings according to locale-sensitive collation rules.
 *
 * Null and undefined values are treated as less than any string and equal to each other, as in {@link ascending}.
 *
 * @group Factories
 *
 * @param locales Locales whose collation rules apply (defaults to the runtime locale)
 * @param options Collation options, such as case sensitivity or numeric ordering of digit sequences
 *
 * @returns A comparator ordering strings by the collation rules of `locales`
 *
 * @remarks
 *
 * Each call prepares the collation rules anew, at a noticeable cost. The returned comparator is meant to be created
 * once and reused: created inside another comparator or a loop, it pays that cost again at every comparison.
 */
export function locale(locales?: Intl.LocalesArgument, options?: Intl.CollatorOptions): Comparator<Nullable<string>> {

	const collator = new Intl.Collator(locales, options);

	return (a, b) => {

		const na = a === undefined || a === null;
		const nb = b === undefined || b === null;

		return na && nb ? 0 : na ? -1 : nb ? 1 : collator.compare(a, b);
	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps a comparator to sort null and undefined values first.
 *
 * Null values are treated as less than any other value, and undefined values as less than null ones. All other values
 * are ordered by `comparator`, so it can safely assume that neither of its arguments is ever null or undefined.
 *
 * @group Combinators
 *
 * @typeParam V The type of values to compare (may include null/undefined)
 *
 * @param comparator Comparator for non-nullish values
 *
 * @returns A comparator placing undefined and then null values first
 */
export function nullish<V>(comparator: Comparator<NonNullable<V>>): Comparator<V> {
	return (a, b) => {

		const na = a === undefined || a === null;
		const nb = b === undefined || b === null;

		return na && nb ? (a === b ? 0 : a === undefined ? -1 : 1)
			: na ? -1
				: nb ? 1
					: comparator(a as NonNullable<V>, b as NonNullable<V>);
	};
}

/**
 * Wraps a comparator to sort null and undefined values last.
 *
 * Null values are treated as greater than any other value, and undefined values as greater than null ones. All other
 * values are ordered by `comparator`, so it can safely assume that neither of its arguments is ever null or undefined.
 *
 * @group Combinators
 *
 * @typeParam V The type of values to compare (may include null/undefined)
 *
 * @param comparator Comparator for non-nullish values
 *
 * @returns A comparator placing null and then undefined values last
 */
export function defined<V>(comparator: Comparator<NonNullable<V>>): Comparator<V> {
	return (a, b) => {

		const da = a !== undefined && a !== null;
		const db = b !== undefined && b !== null;

		return da && db ? comparator(a as NonNullable<V>, b as NonNullable<V>)
			: da ? -1
				: db ? 1
					: a === b ? 0 : a === undefined ? 1 : -1;
	};
}

/**
 * Reverses the order of a comparator.
 *
 * The reversal applies to every value, so null and undefined values placed first by `comparator` are placed last,
 * and the reverse. Wrapping the reversed comparator in {@link nullish} or {@link defined} keeps them at a fixed end.
 *
 * @group Combinators
 *
 * @typeParam V The type of values to compare
 *
 * @param comparator Comparator to reverse
 *
 * @returns A comparator producing the opposite ordering
 */
export function reverse<V>(comparator: Comparator<V>): Comparator<V> {
	return (a, b) => -comparator(a, b);
}

/**
 * Combines multiple comparators into a single comparator.
 *
 * Values are ordered by the first comparator, and ties are broken by the following ones in priority order. Values
 * tied under every comparator are equivalent, and so are all values if no comparator is provided.
 *
 * @group Combinators
 *
 * @typeParam V The type of values to compare
 *
 * @param comparators Comparators to apply, from highest to lowest priority
 *
 * @returns A comparator ordering values by the first comparator that tells them apart
 */
export function compound<V>(...comparators: readonly Comparator<V>[]): Comparator<V> {
	return (a, b) => comparators.reduce(
		(order, comparator) => order !== 0 ? order : comparator(a, b),
		0
	);
}
