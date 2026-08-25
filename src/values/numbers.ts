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
 * General-purpose number operations.
 *
 * **Computing Over Either Numeric Type**
 *
 * Combine values without committing to `number` or to `bigint`, so that code handling both, like aggregates and
 * statistics, states an operation once and each call keeps the numeric type it was given:
 *
 * ```typescript
 * import { add, sub } from '@metreeca/core/numbers';
 *
 * add(1, 2);   // 3
 * sub(1n, 2n); // -1n
 * ```
 *
 * Operands are held to a single numeric type: JavaScript refuses to mix a `number` with a `bigint`, and a mixed pair
 * is reported rather than silently coerced.
 *
 * **Scaling Without Losing the Numeric Type**
 *
 * Scale by a plain factor, taking a fractional result where the scaled value is a `number` and an integral one where
 * it is a `bigint`, so that averages and shares stay in the type they were computed from:
 *
 * ```typescript
 * import { div, mul } from '@metreeca/core/numbers';
 *
 * mul(7, 0.5); // 3.5
 * div(7, 2);   // 3.5
 * div(7n, 2);  // 4n, as no fractional bigint can carry the remainder
 * ```
 *
 * `bigint` quotients are rounded to the nearest integer, halves away from zero, whatever the sign of the operands.
 * Scaling a `bigint` takes an integral factor, as a fractional one has no `bigint` counterpart.
 *
 * @module
 */


/**
 * Adds two numeric values.
 *
 * Both operands must share the same numeric type: a `number` mixed with a `bigint` is reported rather than silently
 * coerced. The shared type parameter rules out mixed operands at compile time, so a mixed pair is only reachable
 * where the type parameter widens to the whole numeric union.
 *
 * @typeParam V The numeric type shared by the operands and by the sum
 *
 * @param x The first addend
 * @param y The second addend
 *
 * @returns The sum of `x` and `y`, as a value of their shared numeric type
 *
 * @throws {TypeError} If one operand is a `number` and the other a `bigint`
 *
 * @internal
 */
export function add<V extends number | bigint>(x: V, y: V): V {

	// ;(cast) `+` adds numbers to numbers and bigints to bigints alike, but TypeScript doesn't type it over a numeric
	// type parameter; asserting `number` doesn't mask mixed operands, as `+` rejects them itself

	return (x as number)+(y as number) as V;

}

/**
 * Subtracts a numeric value from another.
 *
 * Both operands must share the same numeric type: a `number` mixed with a `bigint` is reported rather than silently
 * coerced. The shared type parameter rules out mixed operands at compile time, so a mixed pair is only reachable
 * where the type parameter widens to the whole numeric union.
 *
 * @typeParam V The numeric type shared by the operands and by the difference
 *
 * @param x The minuend
 * @param y The subtrahend
 *
 * @returns The difference between `x` and `y`, as a value of their shared numeric type
 *
 * @throws {TypeError} If one operand is a `number` and the other a `bigint`
 *
 * @internal
 */
export function sub<V extends number | bigint>(x: V, y: V): V {

	// ;(cast) `-` subtracts numbers from numbers and bigints from bigints alike, but TypeScript doesn't type it over a
	// numeric type parameter; asserting `number` doesn't mask mixed operands, as `-` rejects them itself

	return (x as number)-(y as number) as V;

}

/**
 * Multiplies a numeric value by a factor.
 *
 * The product keeps the numeric type of the multiplicand. A `number` multiplicand multiplies as an IEEE 754 double.
 * A `bigint` multiplicand yields an exact `bigint` product, whatever the magnitude of the operands.
 *
 * Multiplying a `bigint` requires a finite integral factor, as the factor is converted to a `bigint` first.
 *
 * @typeParam V The numeric type of the multiplicand and of the product
 *
 * @param x The multiplicand
 * @param y The factor
 *
 * @returns The product of `x` by `y`, as a value of the numeric type of `x`
 *
 * @throws {RangeError} If `x` is a `bigint` and `y` is not a finite integer
 *
 * @internal
 */
export function mul<V extends number | bigint>(x: V, y: number): V {

	// ;(cast) `*` multiplies numbers by numbers and bigints by bigints alike, but TypeScript doesn't type it over a
	// numeric type parameter; either way the product keeps the numeric type of the multiplicand, that is `V`

	if ( typeof x === "bigint" ) {

		return x*BigInt(y) as V;

	} else {

		return x*y as V;

	}

}

/**
 * Divides a numeric value by a divisor.
 *
 * The quotient keeps the numeric type of the dividend. A `number` dividend divides as an IEEE 754 double, yielding an
 * infinity on a zero divisor rather than reporting an error. A `bigint` dividend yields a `bigint` quotient: as no
 * fractional `bigint` can carry the remainder, the exact quotient is rounded to the nearest integer, halves away from
 * zero, whatever the sign of the operands.
 *
 * Dividing a `bigint` requires a finite integral divisor, as the divisor is converted to a `bigint` first, and a
 * non-zero one, as no `bigint` stands for an infinity.
 *
 * @typeParam V The numeric type of the dividend and of the quotient
 *
 * @param x The dividend
 * @param y The divisor
 *
 * @returns The quotient of `x` by `y`, as an IEEE 754 double for a `number` dividend, or rounded to the nearest
 *     integer, halves away from zero, for a `bigint` dividend
 *
 * @throws {RangeError} If `x` is a `bigint` and `y` is not a finite integer or is `0`
 *
 * @internal
 */
export function div<V extends number | bigint>(x: V, y: number): V {

	// ;(cast) `/` divides numbers by numbers and bigints by bigints alike, but TypeScript doesn't type it over a
	// numeric type parameter; either way the quotient keeps the numeric type of the dividend, that is `V`

	if ( typeof x === "bigint" ) {

		const divisor = BigInt(y);

		const quotient = x/divisor;
		const remainder = x%divisor;

		const negative = (x < 0n) !== (divisor < 0n); // sign of the exact quotient, also when truncated to 0n
		const residue = remainder < 0n ? -remainder : remainder; // distance from the truncated quotient
		const modulus = divisor < 0n ? -divisor : divisor; // distance between consecutive quotients

		const result = 2n*residue < modulus ? quotient
			: negative ? quotient-1n
				: quotient+1n;

		return result as V;

	} else {

		return x/y as V;

	}

}
