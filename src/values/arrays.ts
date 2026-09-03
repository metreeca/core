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
 * General-purpose array operations.
 *
 * **Normalising a Value to an Array**
 *
 * Coerce an optional, single or multi-valued input into an array for uniform iteration:
 *
 * ```typescript
 * import { some } from '@metreeca/core/arrays';
 *
 * some(undefined);           // []
 * some("x");                 // ["x"]
 * some(["x", "y"]);          // ["x", "y"]
 * some(new Set(["x", "y"])); // ["x", "y"]
 * ```
 *
 * **Retaining Unique Values**
 *
 * Keep the unique values of a collection, dropping later duplicates:
 *
 * ```typescript
 * import { unique } from '@metreeca/core/arrays';
 *
 * unique([1, 1, 2, 3, 3]);      // [1, 2, 3]
 * unique(new Set([1, 2]));      // [1, 2]
 * ```
 *
 * **Combining Collections**
 *
 * Merge several collections into their union or narrow them to their shared intersection, deduplicating either way:
 *
 * ```typescript
 * import { intersection, union } from '@metreeca/core/arrays';
 *
 * union([[1, 2], [2, 3]]);              // [1, 2, 3]
 * intersection([[1, 2, 3], [2, 3, 4]]); // [2, 3]
 * ```
 *
 * @module
 */


/**
 * Zero, one, or many values of type `T`.
 *
 * Widens a parameter to every shape a caller may have at hand: nothing (`undefined`), a lone value, or any
 * {@link Many collection} of values, leaving {@link some} to normalise the argument into an array.
 *
 * `T` itself may not be an object iterable: a `Set`, `Map`, typed array, array, or generator passed as a value is
 * indistinguishable from a collection of values and is read as the latter. Strings are exempt and stay singular.
 *
 * @typeParam T The type of the contained values
 */
export type Some<T> =
	| undefined
	| T
	| readonly T[] // redundant against Many<T>, but reports a mismatched array by element type, not iterator protocol
	| Many<T>;

/**
 * Zero or more values of type `T`.
 *
 * Widens a parameter to any iterable a caller may have at hand: an array, a `Set`, a `Map` view, a generator.
 *
 * @typeParam T The type of the contained values
 */
export type Many<T> = {

	[Symbol.iterator](): Iterator<T> // ;(structural) Iterable<T> breaks element inference when nested

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Normalises a {@link Some} value into an array.
 *
 * Coerces an optional or single-or-many value into a uniform array, so callers accepting flexible input can iterate
 * over the result without branching on its shape.
 *
 * @typeParam T The type of the contained values
 *
 * @param values The value to normalise: `undefined`, a single `T`, or a collection of `T` drawn from exactly once,
 *     so single-pass iterators are safe to pass
 *
 * @returns An array holding the given values: empty if `values` is `undefined`, a single-element array if `values` is a
 *     bare `T`, `values` itself if it is already an array, or its elements collected in iteration order otherwise
 */
export function some<T>(values: Some<T>): readonly T[] {

	return values === undefined ? []
		: Array.isArray(values) ? values
			: isMany(values) ? [...values]
				: [values as T]; // ;(cast) the residue of a union TS cannot narrow by excluding the collection arms


	function isMany(value: Some<T>): value is Many<T> {
		return value !== null
			&& typeof value === "object" // excludes strings, iterable but denoting a single value
			&& Symbol.iterator in value;
	}

}

/**
 * Retains the unique values of a collection.
 *
 * Keeps the first occurrence of each value, dropping later duplicates. Without a comparator, values are deduplicated by
 * identity the way a `Set` does (`SameValueZero`, so `NaN` collapses and `-0` equals `+0`) in a single pass; pass
 * `equal` to compare by a custom relation instead, at the cost of a scan over the earlier values for each value.
 *
 * @typeParam T The type of the contained values
 *
 * @param values The values to deduplicate; drawn from exactly once, so single-pass iterators are safe to pass
 * @param equal An optional custom equality function for comparing values; without it, values are compared by `Set`
 *     identity (`SameValueZero`)
 *
 * @returns A new array holding the first occurrence of each unique value from `values`, preserving their original
 *     order
 */
export function unique<T>(values: Iterable<T>, equal?: (x: T, y: T) => boolean): readonly T[] {

	if ( equal === undefined ) {

		return [...new Set(values)];

	} else {

		const array = [...values];

		return array.filter((value, index) =>
			array.findIndex(other => equal(value, other)) === index
		);

	}

}

/**
 * Combines collections into their set union.
 *
 * Flattens the given collections and keeps each distinct element once, in first-seen order, so several sources combine
 * into a single list without duplicates. Without a comparator, elements are compared by identity the way a `Set` does
 * (`SameValueZero`) in a single pass; pass `equal` to merge by a custom relation instead, at the cost of a scan over
 * the earlier elements for each element.
 *
 * @typeParam T The element type of the collections
 *
 * @param values The collections to combine; each is drawn from exactly once, so single-pass iterators are safe to pass
 * @param equal An optional custom equality function for comparing elements; without it, elements are compared by `Set`
 *     identity (`SameValueZero`)
 *
 * @returns A new array holding every distinct element drawn from `values`, in first-seen order
 *
 * @see {@link intersection} for the dual, keeping only the elements common to every collection
 */
export function union<T>(values: Iterable<Many<T>>, equal?: (x: T, y: T) => boolean): readonly T[] {

	return unique([...values].flatMap(collection => [...collection]), equal);

}

/**
 * Reduces collections to their set intersection.
 *
 * Keeps each element present in every one of the given collections, once, in the order it first appears in the first
 * collection, so several sources narrow to the elements they share without duplicates. Without a comparator, elements
 * are compared by identity the way a `Set` does (`SameValueZero`); pass `equal` to intersect by a custom relation
 * instead. Given no collections, the result is empty.
 *
 * @typeParam T The element type of the collections
 *
 * @param values The collections to intersect; each is drawn from at most once, so single-pass iterators are safe to
 *     pass
 * @param equal An optional custom equality function for comparing elements; without it, elements are compared by `Set`
 *     identity (`SameValueZero`)
 *
 * @returns A new array holding every element common to all of `values`, in the order they first appear in the first
 *     collection
 *
 * @see {@link union} for the dual, combining the elements of every collection
 */
export function intersection<T>(values: Iterable<Many<T>>, equal?: (x: T, y: T) => boolean): readonly T[] {

	const [first, ...rest] = values;

	if ( first === undefined ) {

		return [];

	} else if ( equal === undefined ) {

		return rest.reduce<readonly T[]>(
			(intersection, collection) => {

				if ( intersection.length === 0 ) { return intersection; } else {

					const values = new Set(collection);

					return intersection.filter(value => values.has(value));

				}

			},
			[...new Set(first)]
		);

	} else {

		return rest.reduce<readonly T[]>(
			(intersection, collection) => {

				if ( intersection.length === 0 ) { return intersection; } else {

					const values = [...collection];

					return intersection.filter(value => values.some(other => equal(value, other)));

				}

			},
			unique(first, equal)
		);

	}

}
