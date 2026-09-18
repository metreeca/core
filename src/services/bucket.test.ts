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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryBucket } from "./bucket.js";


function source(...chunks: readonly string[]): ReadableStream<Uint8Array<ArrayBuffer>> {

	const encoder = new TextEncoder();

	return new ReadableStream({

		start(controller) {

			chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));

			controller.close();

		}

	});
}

async function target(value: ReadableStream<Uint8Array<ArrayBuffer>> | undefined): Promise<string | undefined> {
	return value === undefined ? undefined : new Response(value).text();
}


describe("createMemoryBucket()", () => {

	it("should return an immutable bucket", async () => {
		expect(Object.isFrozen(createMemoryBucket())).toBe(true);
	});


	describe("get", () => {

		it("should report an unknown key as absent", async () => {
			expect(await createMemoryBucket().get("unknown")).toBeUndefined();
		});

		it("should retrieve a stored value", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("value"));

			expect(await target(await bucket.get("key"))).toBe("value");

		});

		it("should retrieve an empty stored value", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source());

			expect(await target(await bucket.get("key"))).toBe("");

		});

		it("should open a fresh stream on every call", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("value"));

			expect([await target(await bucket.get("key")), await target(await bucket.get("key"))])
				.toEqual(["value", "value"]);

		});

		it("should retrieve values independently per key", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("one", source("first"));
			await bucket.put("two", source("second"));

			expect([await target(await bucket.get("one")), await target(await bucket.get("two"))])
				.toEqual(["first", "second"]);

		});

		it("should retrieve values independently per bucket", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("value"));

			expect(await createMemoryBucket().get("key")).toBeUndefined();

		});

	});

	describe("put", () => {

		it("should store a value drained from every chunk of the source stream", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("one", "two", "three"));

			expect(await target(await bucket.get("key"))).toBe("onetwothree");

		});

		it("should replace an existing value", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("stale"));
			await bucket.put("key", source("fresh"));

			expect(await target(await bucket.get("key"))).toBe("fresh");

		});

	});

	describe("delete", () => {

		it("should remove a stored value", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("value"));
			await bucket.delete("key");

			expect(await bucket.get("key")).toBeUndefined();

		});

		it("should succeed on an unknown key", async () => {
			await expect(createMemoryBucket().delete("unknown")).resolves.toBeUndefined();
		});

		it("should remove values independently per key", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("one", source("first"));
			await bucket.put("two", source("second"));
			await bucket.delete("one");

			expect(await target(await bucket.get("two"))).toBe("second");

		});

	});

	describe("expiry", () => {

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});


		it("should retain every value with no time to live", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(1_000_000);

			expect(await target(await bucket.get("key"))).toBe("value");

		});

		it("should retain every value with a non-positive time to live", async () => {

			const bucket = createMemoryBucket({ ttl: 0 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(1_000_000);

			expect(await target(await bucket.get("key"))).toBe("value");

		});

		it("should retain a value until its time to live elapses since its last use", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(99);

			expect(await target(await bucket.get("key"))).toBe("value");

		});

		it("should drop a value once its time to live elapses since its last use", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(100);

			expect(await bucket.get("key")).toBeUndefined();

		});

		it("should measure the time to live independently per key", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("one", source("first"));

			vi.advanceTimersByTime(50);

			await bucket.put("two", source("second"));

			vi.advanceTimersByTime(50);

			expect([await bucket.get("one"), await target(await bucket.get("two"))])
				.toEqual([undefined, "second"]);

		});

		it("should refresh the time to live on retrieval", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(50);

			await bucket.get("key");

			vi.advanceTimersByTime(99);

			expect(await target(await bucket.get("key"))).toBe("value");

		});

		it("should drop a value once its time to live elapses since a retrieval", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(50);

			await bucket.get("key");

			vi.advanceTimersByTime(100);

			expect(await bucket.get("key")).toBeUndefined();

		});

		it("should refresh the time to live on replacement", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("stale"));

			vi.advanceTimersByTime(50);

			await bucket.put("key", source("fresh"));

			vi.advanceTimersByTime(50);

			expect(await target(await bucket.get("key"))).toBe("fresh");

		});

		it("should retain a value used within its time to live", async () => {

			const bucket = createMemoryBucket({ ttl: 100 });

			await bucket.put("key", source("value"));

			vi.advanceTimersByTime(50);

			await bucket.get("key");

			vi.advanceTimersByTime(50);

			await bucket.get("key");

			vi.advanceTimersByTime(50);

			expect(await target(await bucket.get("key"))).toBe("value");

		});

	});

	describe("retention", () => {

		it("should retain every value with no byte budget", async () => {

			const bucket = createMemoryBucket();

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));
			await bucket.put("three", source("cccc"));

			expect(await target(await bucket.get("one"))).toBe("aaaa");

		});

		it("should retain every value with a non-positive byte budget", async () => {

			const bucket = createMemoryBucket({ bytes: 0 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));

			expect(await target(await bucket.get("one"))).toBe("aaaa");

		});

		it("should drop the least recently used value beyond the byte budget", async () => {

			const bucket = createMemoryBucket({ bytes: 8 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));
			await bucket.put("three", source("cccc"));

			expect([await bucket.get("one"), await target(await bucket.get("two"))])
				.toEqual([undefined, "bbbb"]);

		});

		it("should drop a value exceeding the byte budget on its own", async () => {

			const bucket = createMemoryBucket({ bytes: 2 });

			await bucket.put("one", source("aaaa"));

			expect(await bucket.get("one")).toBeUndefined();

		});

		it("should refresh recency on retrieval", async () => {

			const bucket = createMemoryBucket({ bytes: 8 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));
			await bucket.get("one");
			await bucket.put("three", source("cccc"));

			expect([await target(await bucket.get("one")), await bucket.get("two")])
				.toEqual(["aaaa", undefined]);

		});

		it("should refresh recency on replacement", async () => {

			const bucket = createMemoryBucket({ bytes: 8 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));
			await bucket.put("one", source("dddd"));
			await bucket.put("three", source("cccc"));

			expect([await target(await bucket.get("one")), await bucket.get("two")])
				.toEqual(["dddd", undefined]);

		});

		it("should charge a replaced value once against the byte budget", async () => {

			const bucket = createMemoryBucket({ bytes: 8 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("one", source("bbbb"));
			await bucket.put("two", source("cccc"));

			expect([await target(await bucket.get("one")), await target(await bucket.get("two"))])
				.toEqual(["bbbb", "cccc"]);

		});

		it("should reclaim room on removal", async () => {

			const bucket = createMemoryBucket({ bytes: 8 });

			await bucket.put("one", source("aaaa"));
			await bucket.put("two", source("bbbb"));
			await bucket.delete("two");
			await bucket.put("three", source("cccc"));

			expect([await target(await bucket.get("one")), await target(await bucket.get("three"))])
				.toEqual(["aaaa", "cccc"]);

		});

	});

});
