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
 * Provides composable combinators for writing logic in a clean functional style, letting a value be reshaped inline as
 * a single expression, avoiding intermediate variables and statement blocks.
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
 * @module
 */

import { isFunction } from "../index.js";


/**
 * Applies a transformation to a value.
 *
 * Threads `value` through `mapper` and returns the result, so a transformation can be applied inline as a single
 * expression.
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
