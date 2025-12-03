/*
 * Copyright © 2025 Metreeca srl
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
 * Metadata annotations.
 *
 * Provides type-safe facilities for attaching and retrieving metadata on objects and functions without affecting
 * enumeration or JSON serialization.
 *
 * **Usage**
 *
 * Attach metadata to an object:
 *
 * ```typescript
 * const data = { value: 42 };
 * const annotated = $(data, { source: "api", timestamp: Date.now() });
 * ```
 *
 * Retrieve metadata from an annotated object:
 *
 * ```typescript
 * const metadata = $(annotated);
 * console.log(metadata.source); // "api"
 * ```
 *
 * Metadata is stored using a symbol property, making it invisible to enumeration and JSON serialization:
 *
 * ```typescript
 * Object.keys(annotated);     // ["value"] - metadata hidden
 * JSON.stringify(annotated);  // {"value":42} - metadata not serialized
 * ```
 *
 * @module
 */


/**
 * Symbol used to store metadata on annotated objects.
 *
 * @remarks
 *
 * This symbol serves as the property key for storing metadata, ensuring metadata is hidden from object enumeration and
 * JSON serialization.
 */
export const Meta = Symbol("Meta");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A metadata annotated object.
 *
 * @remarks
 *
 * When you annotate an object using {@link $}, it returns the type `T & Meta<M>`, combining your original data type
 * with this metadata marker. TypeScript then ensures you can only retrieve metadata from annotated objects.
 *
 * @typeParam M The type of metadata attached to the object
 */
export type Meta<M> = {

	[Meta]: M;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves metadata from an annotated object.
 *
 * @typeParam T The type of the data object
 * @typeParam M The type of metadata attached to the data
 *
 * @param data The annotated object from which to retrieve metadata
 *
 * @returns The metadata previously attached to the object
 *
 * @throws Error if the object has no metadata attached
 */
export function $<T, M>(data: T & Meta<M>): M ;

/**
 * Attaches metadata to an object or function.
 *
 * @typeParam T The type of the data object
 * @typeParam M The type of metadata to attach
 *
 * @param data The object or function to annotate (must be extensible)
 * @param meta The metadata to attach
 *
 * @returns The same object, now branded with {@link Meta}<M> type
 *
 * @throws Error if the object already has metadata attached
 * @throws Error if unable to attach metadata (object is frozen, sealed, non-extensible, or a primitive)
 */
export function $<T, M>(data: T, meta: M): T & Meta<M> ;

/**
 * Manages metadata annotation on objects and functions.
 *
 * Provides a unified interface for attaching and retrieving metadata using symbol-based storage.
 */
export function $(data: unknown, meta?: unknown): any {

	const supported = data !== null && (typeof data === "object" || typeof data === "function");

	if ( arguments.length === 1 ) { // retrieve

		if ( !supported || !(Meta in data) ) {
			throw new Error("no attached metadata");
		}

		return (data as any)[Meta];

	} else { // attach

		if ( !supported ) {
			throw new Error("unable to attach metadata");
		}

		if ( Meta in data ) {
			throw new Error("metadata already attached");
		}

		try {

			(data as any)[Meta] = meta;

		} catch ( error ) {

			throw new Error("failed to attach metadata");

		}

		return data;
	}

}
