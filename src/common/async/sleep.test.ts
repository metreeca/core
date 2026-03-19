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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sleep } from "./sleep.js";

describe("sleep()", () => {

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should resolve after the specified delay", async () => {
		const promise = sleep(50);
		await vi.advanceTimersByTimeAsync(50);
		await promise;
	});

	it("should resolve immediately for zero delay", async () => {
		const promise = sleep(0);
		await vi.advanceTimersByTimeAsync(0);
		await promise;
	});

	it("should resolve immediately for negative delay", async () => {
		const promise = sleep(-100);
		await vi.advanceTimersByTimeAsync(0);
		await promise;
	});

	it("should return a promise that resolves to void", async () => {
		const promise = sleep(10);
		await vi.advanceTimersByTimeAsync(10);
		const result = await promise;
		expect(result).toBeUndefined();
	});

	it("should handle multiple concurrent sleep calls", async () => {
		const promise = Promise.all([
			sleep(30),
			sleep(30),
			sleep(30)
		]);

		// All should complete at the same time (not sequentially)
		await vi.advanceTimersByTimeAsync(30);
		await promise;
	});

	it("should work with different delay values in sequence", async () => {

		const p1 = sleep(20);
		await vi.advanceTimersByTimeAsync(20);
		await p1;

		const p2 = sleep(30);
		await vi.advanceTimersByTimeAsync(30);
		await p2;

		const p3 = sleep(0);
		await vi.advanceTimersByTimeAsync(0);
		await p3;

	});

	it("should allow promise chaining", async () => {
		let executed = false;

		const promise = sleep(10).then(() => {
			executed = true;
		});

		await vi.advanceTimersByTimeAsync(10);
		await promise;

		expect(executed).toBe(true);
	});

	it("should work with async/await in complex scenarios", async () => {
		const results: string[] = [];

		const task = async (id: string, delay: number) => {
			results.push(`${id}-start`);
			await sleep(delay);
			results.push(`${id}-end`);
		};

		const promise = Promise.all([
			task("a", 30),
			task("b", 10),
			task("c", 20)
		]);

		await vi.runAllTimersAsync();
		await promise;

		// All starts should happen before any ends
		expect(results.slice(0, 3)).toEqual(["a-start", "b-start", "c-start"]);
		// Ends should be in order of completion (shortest delay first)
		expect(results.slice(3)).toEqual(["b-end", "c-end", "a-end"]);
	});

	it("should handle very short delays", async () => {
		const promise = sleep(1);
		await vi.advanceTimersByTimeAsync(1);
		await promise;
	});

	it("should not block the event loop for zero/negative delays", async () => {
		let otherTaskExecuted = false;

		// Schedule a microtask
		Promise.resolve().then(() => {
			otherTaskExecuted = true;
		});

		const promise = sleep(0);
		await vi.advanceTimersByTimeAsync(0);
		await promise;

		// After awaiting sleep(0), microtasks should have been processed
		expect(otherTaskExecuted).toBe(true);
	});

});
