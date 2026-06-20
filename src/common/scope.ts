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
 * Identity-keyed value allocation.
 *
 * Provides {@link Scope}, a counter that hands out unique sequential ids. Each id is cached against a
 * caller-supplied key, compared by reference identity, so repeated lookups of the same key resolve to
 * the same value without a string proxy.
 *
 * By default {@link createScope} builds a scope handing out raw numeric ids; given a mapper, each id
 * is passed through it to produce the value returned instead.
 *
 * ```typescript
 * import { createScope } from '@metreeca/core/scope';
 *
 * const scope = createScope();
 * const node = {};
 *
 * scope.resolve(node); // 0 (fresh id bound to node)
 * scope.resolve(node); // 0 (cached hit on the same reference)
 * scope.resolve({});   // 1 (distinct reference, fresh id)
 * scope.resolve();     // 2 (anonymous, always fresh)
 * ```
 *
 * Passing a mapper derives a value from each id, caching it and returning it again for repeated keys:
 *
 * ```typescript
 * const labels = createScope(id => `?v${id}`);
 *
 * labels.resolve(node); // "?v0"
 * labels.resolve(node); // "?v0" (cached hit)
 * labels.resolve();     // "?v1"
 * ```
 *
 * @module
 */

import { immutable } from "./deep.js";


/**
 * Identity-keyed value allocation scope.
 *
 * Hands out unique sequential ids, each returned as a value of type `T` derived from it and cached
 * against an optional `key` matched by `Map` key equality (`SameValueZero`). A keyed call returns
 * the cached value on a repeat hit (the same reference when `T` is an object); an unkeyed call
 * always allocates a fresh anonymous id. Keyed and anonymous allocations share one monotonic
 * counter, so every id is unique within the scope.
 *
 * > [!IMPORTANT]
 * > Keys match by reference, not structure: two equal-looking object literals are distinct keys.
 * > This is what keeps values consistent across **multi-pass** operations: every pass that revisits
 * > the same node resolves to the same value. Callers wanting coordinated values must thread the one
 * > node object through every pass, never rebuild an equal-looking key.
 *
 * @typeParam T The value handed out per allocation, derived from each numeric id; defaults to `number`
 */
export type Scope<T = number> = {

	/**
	 * Resolves the value bound to `key`, allocating it on first lookup.
	 *
	 * @param key Cache key matched by reference identity; omit to allocate a fresh anonymous value
	 *
	 * @returns The value cached for `key`, allocated on first lookup and returned unchanged thereafter;
	 *          a freshly allocated value when `key` is omitted or not yet bound
	 */
	resolve(key?: unknown): T;

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a new {@link Scope}.
 *
 * Ids start at `0` and increment monotonically, so all ids the scope hands out are pairwise
 * distinct.
 *
 * @returns A fresh, immutable scope handing out numeric ids
 */
export function createScope(): Scope;

/**
 * Creates a new {@link Scope} with mapped values.
 *
 * Ids start at `0` and increment monotonically, so all ids the scope hands out are pairwise
 * distinct; each is passed through `mapper` to produce the value returned. `mapper` runs once per id
 * and its result is cached, so a repeat keyed lookup returns the same value (the same reference when
 * `mapper` produces objects) without re-invoking it.
 *
 * @typeParam T The mapped value type
 *
 * @param mapper Maps each monotonic id to the value handed out by the scope; invoked once per id
 *
 * @returns A fresh, immutable scope handing out mapped values
 */
export function createScope<T>(mapper: (index: number) => T): Scope<T>;

/**
 * Creates a new {@link Scope}, optionally mapping each allocated id.
 */
export function createScope<T>(mapper?: (index: number) => T): Scope<T> | Scope {

	return mapper
		? create(mapper)
		: create(index => index);


	function create<T>(mapper: (index: number) => T): Scope<T> {

		const cache = new Map<unknown, T>();

		function store(key: unknown): T {

			const value = mapper(cache.size);

			cache.set(key, value);

			return value;
		}

		return immutable({

			resolve: (key?: unknown) => key === undefined
				? store({})
				: cache.get(key) ?? store(key)

		});

	}

}
