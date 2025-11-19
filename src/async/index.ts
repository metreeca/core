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
 * Composable primitives for asynchronous operations.
 *
 * Provides utilities for coordinating concurrent operations and managing execution flow.
 *
 * **Usage**
 *
 * ```typescript
 * import { sleep, Mutex, Throttle } from '@metreeca/core/async';
 *
 * // Simple delay
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
 *
 * // Prevent race conditions
 *
 * const mutex = Mutex();
 * let counter = 0;
 *
 * async function increment() {
 *   await mutex.execute(async () => {
 *     const current = counter;
 *     await sleep(10);              // Simulate async read
 *     counter = current + 1;        // Safe write - no race condition
 *   });
 * }
 *
 * // Rate limit API calls
 *
 * const throttle = Throttle({
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
 *
 * // Automatic retry with throttling
 *
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

export * from "./sleep";
export * from "./mutex";
export * from "./throttle";
