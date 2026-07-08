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
 * General-purpose functional combinators.
 *
 * Provides composable combinators for writing logic in a clean functional
 * style, letting a value be reshaped inline as a single expression, avoiding
 * intermediate variables and statement blocks.
 *
 * **Normalising a Value to an Array**
 *
 * Coerce an optional or single-or-many value into an array for uniform iteration:
 *
 * ```typescript
 * import { list } from '@metreeca/core/combo';
 *
 * const tags = list(input); // undefined -> [], "x" -> ["x"], ["x", "y"] -> ["x", "y"]
 * ```
 *
 * **Transforming a Value**
 *
 * Thread a value through a transformation as a single expression:
 *
 * ```typescript
 * import { map } from '@metreeca/core/combo';
 *
 * const label = map(user, ({ first, last }) => `${first} ${last}`.trim());
 * ```
 *
 * **Folding an Optional Value**
 *
 * Collapse the present and absent cases of an optional value into one result, or omit the fallback to map the present
 * case while preserving `undefined`:
 *
 * ```typescript
 * import { fold } from '@metreeca/core/combo';
 *
 * const label = fold(user, ({ first, last }) => `${first} ${last}`.trim(), () => "anonymous");
 * ```
 *
 * **Retaining Unique Values**
 *
 * Keep the unique values of an array, dropping later duplicates:
 *
 * ```typescript
 * import { unique } from '@metreeca/core/combo';
 *
 * unique([1, 1, 2, 3, 3]); // [1, 2, 3]
 * ```
 *
 * @module
 */

import { isFunction } from "../index.js";


/**
 * Zero, one, or many values of type `T`.
 *
 * Models a value that may be absent (`undefined`), singular (a bare `T`), or plural (a `T[]`), letting an API accept
 * flexible input that {@link list} normalises into an array.
 *
 * @typeParam T The type of the contained values
 */
export type Some<T> = undefined | T | readonly T[];


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Normalises a {@link Some} value into an array.
 *
 * Coerces an optional or single-or-many value into a uniform array, so callers accepting flexible input can iterate
 * over the result without branching on its shape.
 *
 * @typeParam T The type of the contained values
 *
 * @param values The value to normalise: `undefined`, a single `T`, or an array of `T`
 *
 * @returns An array holding the given values: empty if `values` is `undefined`, a single-element array if `values` is a
 *     bare `T`, or `values` itself if it is already an array
 */
export function list<T>(values: Some<T>): readonly T[] {
	return values === undefined ? [] : Array.isArray(values) ? values : [values as T];
}

/**
 * Applies a transformation to a value.
 *
 * Threads `value` through `mapper` and returns the result, so a transformation
 * can be applied inline as a single expression.
 *
 * @typeParam V The type of the input value
 * @typeParam R The type of the transformed result
 *
 * @param value The value to transform
 * @param mapper The transformation to apply to `value`
 *
 * @returns The result of applying `mapper` to `value`
 */
export function map<V, R>(value: V, mapper: (value: V) => R): R {
	return mapper(value);
}

/**
 * Maps an optional value, preserving undefined.
 *
 * Applies `some` to `value` if defined and returns its result; otherwise returns `undefined`, letting the absent case
 * propagate unchanged.
 *
 * @typeParam V The type of the present value
 * @typeParam R The type of the folded result
 *
 * @param value The optional value to fold
 * @param some The transformation to apply if `value` is defined
 *
 * @returns The result of `some` applied to `value` if defined; otherwise `undefined`
 */
export function fold<V, R>(value: undefined | V, some: (value: V) => R): undefined | R;

/**
 * Maps an optional value, falling back if it is undefined.
 *
 * Applies `some` to `value` if defined and returns its result; otherwise falls back to `none`, calling it if it is a
 * function or using it directly if it is a plain value.
 *
 * @typeParam V The type of the present value
 * @typeParam R The type of the folded result
 *
 * @param value The optional value to fold
 * @param some The transformation to apply if `value` is defined
 * @param none The fallback result if `value` is undefined, either a plain value or a function producing it
 *
 * @returns The result of `some` applied to `value` if defined; otherwise `none`, or its result if `none` is a function
 */
export function fold<V, R>(value: undefined | V, some: (value: V) => R, none: R | (() => R)): R;

export function fold<V, R>(value: undefined | V, some: (value: V) => R, none?: R | (() => R)): undefined | R {
	return value !== undefined ? some(value) : isFunction(none) ? none() : none;
}

/**
 * Retains the unique values of an array.
 *
 * Keeps the first occurrence of each value in iteration order, dropping any later value that compares equal to one
 * already kept according to `equal`, or to `Object.is` by default.
 *
 * @typeParam T The type of the array items
 *
 * @param values The array to reduce to its unique values
 * @param equal An optional custom equality function for comparing items; defaults to `Object.is`
 *
 * @returns A new array holding the first occurrence of each unique value from `values`, preserving their original
 *     order
 */
export function unique<T>(values: readonly T[], equal: (x: T, y: T) => boolean = Object.is): readonly T[] {
	return values.filter((value, index) => values.findIndex(other => equal(value, other)) === index);
}
