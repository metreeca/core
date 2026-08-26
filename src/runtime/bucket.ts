/*
 * Copyright © 2026 Metreeca srl
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
 * Bulk content storage.
 *
 * Provides {@link Bucket}, a keyed blob store holding opaque byte values under opaque string keys, so that bulk
 * content lives wherever a consumer needs it, whether in memory, on the file system or in a remote service, behind a
 * single contract.
 *
 * Values are stored, retrieved and removed one key at a time, streaming content in and out as a whole:
 *
 * ```typescript
 * import { createMemoryBucket } from '@metreeca/core/bucket';
 *
 * const bucket = createMemoryBucket();
 *
 * await bucket.put("report.csv", file.stream());
 *
 * const report = await bucket.get("report.csv"); // a fresh stream, or undefined if the key is unknown
 *
 * await bucket.delete("report.csv");
 * ```
 *
 * @module
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream MDN - ReadableStream}
 */

import { immutable } from "../values/structures.js";


/**
 * Keyed blob store.
 *
 * Holds opaque byte values under opaque string keys. Values are written and read as a whole, as key-addressed byte
 * stores provide no in-place update, and are addressed one key at a time, as they provide no enumeration. A stored
 * value is retained until removed, unless the implementation states a retention policy of its own.
 *
 * > [!NOTE]
 * >
 * > The contract is deliberately kept close to the cloud object storage APIs, so that an implementation over a
 * > service such as Amazon S3, Google Cloud Storage or Cloudflare R2 is a thin adapter over its client.
 */
export type Bucket = {

	/**
	 * Retrieves a value.
	 *
	 * A key is reported as absent whether it was never stored, was removed or was dropped by the bucket under its own
	 * retention policy, so a caller must be ready for a stored value to be gone on a later lookup.
	 *
	 * @param key The key of the value to be retrieved
	 *
	 * @returns A promise resolving to a stream over the value stored under `key`, or to `undefined` if the bucket
	 *     holds none; a fresh stream is opened on every call, as a stream is consumed once
	 */
	get(key: string): Promise<ReadableStream<Uint8Array<ArrayBuffer>> | undefined>;

	/**
	 * Stores a value.
	 *
	 * Replaces whatever is stored under `key`, as key-addressed byte stores provide no in-place update, so a caller
	 * is free to store a key without first removing it.
	 *
	 * @param key The key the value is to be stored under
	 * @param value A stream over the value to be stored, consumed to completion before the promise settles
	 *
	 * @returns A promise resolving when `value` is stored
	 */
	put(key: string, value: ReadableStream<Uint8Array<ArrayBuffer>>): Promise<void>;

	/**
	 * Removes a value.
	 *
	 * States an outcome rather than a change: removing a key the bucket doesn't hold succeeds without doing anything,
	 * so a caller is free to remove a key without first checking for it.
	 *
	 * @param key The key of the value to be removed
	 *
	 * @returns A promise resolving when no value is stored under `key`
	 */
	delete(key: string): Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates an in-memory bucket.
 *
 * The generated {@link Bucket} holds values in the process heap, so that content is kept with no external service and
 * no setup, at the price of being confined to the process and lost when it exits. A stream handed to `put` is drained
 * into a private buffer, over which `get` opens a fresh stream on every call, so retained content counts in full
 * against the heap budget of the process and never shares storage with the bytes a caller streams in or out.
 *
 * Called with no options, the bucket retains every value for the life of the process; given a time to live, values
 * left unused for longer are dropped; given a byte budget, values beyond it are dropped in least recently used order:
 *
 * ```typescript
 * const cache = createMemoryBucket({ ttl: 60_000, bytes: 1_000_000 });
 * ```
 *
 * Every `get` and `put` counts as a use, restarting the time to live of the value and making it the most recently
 * used one, so a value is dropped only once left untouched for a whole time to live, or once every other retained
 * value has been used more recently. Expiry is checked on access rather than on a timer, so an expired value is never
 * handed out and stops counting against the byte budget on the next `get` or `put`, whatever key it addresses;
 * removing a value likewise frees its share of the budget.
 *
 * @param options The bucket options, all optional: with none given, values are retained for the life of the process
 * @param options.ttl The number of milliseconds a value is retained for after its last use, dropping it once they
 *     elapse; a value less than or equal to `0` retains values indefinitely, as the default does
 * @param options.bytes The total number of value bytes to be retained, dropping the least recently used values beyond
 *     that, a value exceeding the budget on its own included; a value less than or equal to `0` leaves the bucket
 *     unbounded, as the default does
 *
 * @returns A fresh, immutable {@link Bucket} holding values in memory
 */
export function createMemoryBucket({

	ttl,
	bytes

}: {

	readonly ttl?: number;
	readonly bytes?: number;

} = {}): Bucket {

	type Entry = {

		readonly used: number; // the timestamp of the last use of the value (ms since epoch)
		readonly data: Uint8Array<ArrayBuffer>;

	};

	const budget = bytes ?? 0; // a non-positive budget leaves the bucket unbounded
	const lease = ttl ?? 0; // a non-positive time to live retains values indefinitely

	const values = new Map<string, Entry>(); // insertion order doubles as recency order


	return immutable({

		async get(key: string): Promise<ReadableStream<Uint8Array<ArrayBuffer>> | undefined> {

			purge();

			const entry = values.get(key);

			if ( entry === undefined ) {

				return undefined;

			} else {

				values.delete(key); // reinsert as most recently used
				values.set(key, { data: entry.data, used: Date.now() });

				return stream(entry.data);

			}
		},

		async put(key: string, value: ReadableStream<Uint8Array<ArrayBuffer>>): Promise<void> {

			const content = await drain(value);

			values.delete(key); // reinsert as most recently used
			values.set(key, { data: content, used: Date.now() });

			evict();

		},

		async delete(key: string): Promise<void> {
			values.delete(key);
		}

	});


	function expired({ used }: Entry): boolean {
		return lease > 0 && Date.now()-used >= lease;
	}

	function purge(): void { // drop expired values, oldest first, stopping at the first live one

		for (const [key, entry] of values) { // scan in LRU order, where use timestamps increase

			if ( expired(entry) ) {

				values.delete(key);

			} else {

				return;

			}

		}

	}

	function evict(): void {

		purge(); // free the room held by expired values before charging live ones against the budget

		if ( budget > 0 ) {

			let retained = 0; // bytes retained by the values scanned so far

			for (const [key, { data }] of Array.from(values.entries()).reverse()) { // scan in MRU order

				retained += data.byteLength;

				if ( retained > budget ) {
					values.delete(key);
				}

			}

		}

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function stream(value: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {

	return new ReadableStream({

		start(controller) {

			controller.enqueue(new Uint8Array(value)); // hand out a copy, shielding stored content from the consumer
			controller.close();

		}

	});

}

async function drain(value: ReadableStream<Uint8Array<ArrayBuffer>>): Promise<Uint8Array<ArrayBuffer>> {

	return new Uint8Array(await new Response(value).arrayBuffer());

}
