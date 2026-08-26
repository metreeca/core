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
 * Asynchronous coordination primitives.
 *
 * Provides types and utilities for coordinating concurrent operations and managing execution flow.
 *
 * **Possibly Asynchronous Values**
 *
 * Accept values supplied either directly or as promises:
 *
 * ```typescript
 * import type { Awaitable } from '@metreeca/core/async';
 *
 * async function label<T>(value: Awaitable<T>): Promise<string> {
 *   return String(await value); // Handles plain values and promises alike
 * }
 * ```
 *
 * **Asynchronous Delays**
 *
 * Pause execution for a specified duration:
 *
 * ```typescript
 * import { sleep } from '@metreeca/core/async';
 *
 * async function retry(task: () => Promise<void>) {
 *   for (let i = 0; i < 3; i++) {
 *     try {
 *       await task();
 *       break;
 *     } catch (error) {
 *       await sleep(1000 * Math.pow(2, i)); // Exponential backoff: 1s, 2s, 4s
 *     }
 *   }
 * }
 * ```
 *
 * **Mutual Exclusion**
 *
 * Prevent race conditions in concurrent operations:
 *
 * ```typescript
 * import { createMutex, sleep } from '@metreeca/core/async';
 *
 * const mutex = createMutex();
 * let counter = 0;
 *
 * async function increment() {
 *   await mutex.execute(async () => {
 *     const current = counter;
 *     await sleep(10);              // Simulate async read
 *     counter = current + 1;        // Safe write - no race condition
 *   });
 * }
 * ```
 *
 * **Adaptive Rate Limiting**
 *
 * Control execution rate with automatic backoff:
 *
 * ```typescript
 * import { createThrottle } from '@metreeca/core/async';
 *
 * const throttle = createThrottle({
 *   minimum: 100,   // At least 100ms between requests
 *   backoff: 2.0,   // Double delay on failure
 *   recover: 0.5    // Halve delay on success
 * });
 *
 * async function fetchData(url: string) {
 *   await throttle.queue(true);
 *   try {
 *     const response = await fetch(url);
 *     await throttle.adapt(true);  // Success - speed up
 *     return response;
 *   } catch (error) {
 *     await throttle.adapt(false); // Failure - slow down
 *     throw error;
 *   }
 * }
 * ```
 *
 * **Automatic Retry Logic**
 *
 * Combine throttling with intelligent retry behaviour:
 *
 * ```typescript
 * const result = await throttle.retry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     attempts: 5,
 *     recover: (error) => {
 *       // Retry on network errors, skip on 4xx client errors
 *       if (error instanceof TypeError) return 0; // Use default backoff
 *       if (error.status >= 500) return 1000;     // Retry after 1s
 *       return undefined;                         // Don't retry
 *     }
 *   }
 * );
 * ```
 *
 * @module
 */


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A possibly asynchronous value.
 *
 * A value supplied either directly or as a promise, so that consumers await it uniformly without forcing every
 * provider to be asynchronous; any thenable is accepted, not just a native `Promise`.
 *
 * @typeParam T The type of the supplied value
 */
export type Awaitable<T> = T | PromiseLike<T>


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export * from "./sleep.js";
export * from "./mutex.js";
export * from "./throttle.js";
