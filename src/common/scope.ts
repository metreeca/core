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
 * Identity-keyed variable allocation.
 *
 * Provides {@link Scope}, a counter that hands out unique sequential variable ids. Each id is cached
 * against a caller-supplied key, compared by reference identity, so repeated lookups of the same key
 * resolve to the same id without a string proxy.
 *
 * By default {@link createScope} hands out the raw numeric ids; given a mapper, it hands out values
 * derived from them.
 *
 * ```typescript
 * import { createScope } from '@metreeca/core/scope';
 *
 * const scope = createScope();
 * const node = {};
 *
 * scope.variable(node); // 0 (fresh id bound to node)
 * scope.variable(node); // 0 (cached hit on the same reference)
 * scope.variable({});   // 1 (distinct reference, fresh id)
 * scope.variable();     // 2 (anonymous, always fresh)
 * ```
 *
 * Passing a mapper derives a value from each id, caching it and returning it again for repeated keys:
 *
 * ```typescript
 * const vars = createScope(id => `?v${id}`);
 *
 * vars.variable(node); // "?v0"
 * vars.variable(node); // "?v0" (cached hit)
 * vars.variable();     // "?v1"
 * ```
 *
 * @module
 */

import { immutable } from "./deep.js";


/**
 * Identity-keyed variable allocation scope.
 *
 * Hands out unique sequential variable ids, each handed out as a value of type `T` derived from its
 * id and cached against an optional `key` matched by `Map` key equality (`SameValueZero`). A keyed
 * call returns the cached value on a repeat hit (the same reference when `T` is an object); an unkeyed
 * call always allocates a fresh anonymous id. Keyed and anonymous allocations share one monotonic
 * counter, so every id is unique within the scope.
 *
 * > [!IMPORTANT]
 * > Keys match by reference, not structure: two equal-looking object literals are distinct keys.
 * > This is what coordinates variable emission across **multi-pass** operations, where every pass
 * > that revisits the same node resolves to the same id. Callers wanting coordinated ids must thread
 * > the one node object through every pass, never rebuild an equal-looking key.
 *
 * @typeParam T The value handed out per allocation, derived from each numeric id; defaults to `number`
 */
export type Scope<T = number> = {

	/**
	 * Allocates or retrieves the variable bound to `key`.
	 *
	 * @param key Cache key matched by reference identity; omit to allocate a fresh anonymous variable
	 *
	 * @returns The value cached for `key`, allocated on first lookup and returned unchanged thereafter;
	 *          a freshly allocated value when `key` is omitted or not yet bound
	 */
	variable(key?: unknown): T;

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a new {@link Scope}.
 *
 * Variable ids start at `0` and increment monotonically, so all ids handed out by the scope are
 * pairwise distinct.
 *
 * @returns A fresh, immutable scope handing out numeric ids
 */
export function createScope(): Scope;

/**
 * Creates a new {@link Scope} with mapped variable values.
 *
 * Variable ids start at `0` and increment monotonically, so all ids handed out by the scope are
 * pairwise distinct; each id is passed through `mapper` to produce the value handed out by the scope.
 * `mapper` runs once per id and its result is cached, so a repeat keyed lookup returns the same value
 * (the same reference when `mapper` produces objects) without re-invoking it.
 *
 * @typeParam T The mapped variable value type
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

		const variables = new Map<unknown, T>();

		function store(key: unknown): T {

			const variable = mapper(variables.size);

			variables.set(key, variable);

			return variable;
		}

		return immutable({

			variable: (key?: unknown) => key === undefined
				? store({})
				: variables.get(key) ?? store(key)

		});

	}

}
