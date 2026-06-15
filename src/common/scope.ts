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
 * Provides {@link Scope}, a counter that hands out unique numeric variable ids and caches
 * them against caller-supplied keys compared by reference identity, so repeated lookups of the same
 * key resolve to the same id without a string proxy.
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
 * @module
 */

import { immutable } from "./deep.js";


/**
 * Identity-keyed variable allocation scope.
 *
 * Hands out unique sequential variable ids, caching each against an optional `key` matched
 * by `Map` key equality (`SameValueZero`). A keyed call returns the cached id on a repeat hit;
 * an unkeyed call always allocates a fresh anonymous id. Keyed and anonymous allocations share one
 * monotonic counter, so every id is unique within the scope.
 *
 * > [!IMPORTANT]
 * > Keys match by reference, not structure: two equal-looking object literals are distinct keys.
 * > This is what coordinates variable emission across **multi-pass** operations, where every pass
 * > that revisits the same node resolves to the same id. Callers wanting coordinated ids must thread
 * > the one node object through every pass, never rebuild an equal-looking key.
 */
export type Scope = {

	/**
	 * Allocates or retrieves the variable bound to `key`.
	 *
	 * @param key Cache key matched by reference identity; omit to allocate a fresh anonymous variable
	 *
	 * @returns The id cached for `key`, or a fresh id when `key` is omitted or not yet bound
	 */
	variable(key?: unknown): number;

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a new {@link Scope}.
 *
 * Variable ids start at `0` and increment monotonically, so all ids handed out by the scope are
 * pairwise distinct.
 *
 * @returns A fresh, immutable scope
 */
export function createScope(): Scope {

	const variables = new Map<unknown, number>();

	return immutable({

		variable(key) {

			return key === undefined
				? variables.set({}, variables.size).size-1
				: variables.get(key) ?? variables.set(key, variables.size).size-1;

		}

	});

}
