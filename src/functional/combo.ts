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
 * a single expression, avoiding intermediate variables and statement blocks. A shared vocabulary of function types
 * declares the role each function an API accepts is expected to play, keeping signatures uniform across modules.
 *
 * **Declaring Function Roles**
 *
 * Describe the functions an API accepts by role, rather than by repeating inline signatures:
 *
 * ```typescript
 * import { type Operator, type Predicate } from '@metreeca/core/combo';
 *
 * declare function clean<V>(values: readonly V[], keep: Predicate<V>, patch: Operator<V>): V[];
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
 * **Composing Operators**
 *
 * Assemble a chain of same-type transformations into a single reusable operator:
 *
 * ```typescript
 * import { pipe } from '@metreeca/core/combo';
 *
 * const normalize = pipe<string>(s => s.trim(), s => s.toLowerCase());
 * ```
 *
 * @module
 */

import { isFunction } from "../index.js";


/**
 * A value or a function returning a value.
 *
 * Defers computation to the point of use, while still accepting a plain value when one is readily available.
 *
 * @typeParam V The type of the supplied value
 */
export type Supplier<V> = V | (() => V);

/**
 * A function reporting whether a value satisfies a condition.
 *
 * @typeParam V The type of the tested value
 */
export type Predicate<V> = (value: V) => boolean;

/**
 * A function mapping a value to a value of the same type.
 *
 * Chains with other operators through {@link pipe} into a single reusable transformation.
 *
 * @typeParam V The type of the transformed value
 */
export type Operator<V> = (value: V) => V;

/**
 * A function combining two values of the same type into one.
 *
 * @typeParam V The type of the combined values
 */
export type Combiner<V> = (x: V, y: V) => V;

/**
 * A function mapping a value to a result of a possibly different type.
 *
 * @typeParam V The type of the input value
 * @typeParam R The type of the mapped result
 */
export type Mapper<V, R> = (value: V) => R;

/**
 * A function accepting a value without returning a result.
 *
 * @typeParam V The type of the consumed value
 */
export type Consumer<V> = (value: V) => void;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
export function map<V, R>(value: V, mapper: Mapper<V, R>): R {

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
export function fold<V, R>(value: undefined | V, some: Mapper<V, R>): undefined | R;

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
export function fold<V, R>(value: undefined | V, some: Mapper<V, R>, none: Supplier<R>): R;

/**
 * Maps an optional value, with an optional fallback for the undefined case.
 */
export function fold<V, R>(value: undefined | V, some: Mapper<V, R>, none?: Supplier<R>): undefined | R {

	return value !== undefined ? some(value) : isFunction(none) ? none() : none;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Composes operators into a single operator.
 *
 * Applies `operators` in sequence, feeding each with the result of the previous one, so a chain of transformations can
 * be assembled once and reused as a single {@link Operator}.
 *
 * @typeParam V The type of the transformed value
 *
 * @param operators The operators to apply in sequence
 *
 * @returns An operator applying `operators` in sequence to its argument, returning it unchanged if `operators` is empty
 */
export function pipe<V>(...operators: readonly Operator<V>[]): Operator<V> {

	return value => operators.reduce((current, operator) => operator(current), value);

}
