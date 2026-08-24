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

import { isError } from "../../index.js";
import { immutable } from "../../values/structures.js";
import type { Middleware, Problem } from "./index.js";


/**
 * Creates a middleware admitting only 2xx responses, reporting failures as {@link Problem | problems}.
 *
 * Decorates a {@link Fetch} implementation with one reporting every failure as a single structured exception, so that
 * callers await a usable response rather than inspecting `response.ok` at each call site:
 *
 * - **Response is `ok`** (2xx `status`): the promise resolves with the response unchanged
 * - **Response is not `ok`** (non-2xx `status`): the promise rejects with a {@link Problem} carrying the response
 *   `status` and its `statusText` as `detail`, plus the body as `report` when the `Content-Type` allows it to be read:
 *   - `text/plain`: the body as text
 *   - JSON-based media types, for example `application/json`, `application/ld+json` or `application/problem+json`: the
 *     parsed JSON payload
 *   - other media types, or a body that fails to parse: no `report`
 * - **The wrapped implementation rejects with an `Error`** (network failures, timeouts, CORS denials): the promise
 *   rejects with a {@link Problem} carrying `status` 0 and a rendering of the error as `detail`
 * - **The wrapped implementation rejects with any other value** (typically a {@link Problem} raised by an inner
 *   layer): the value is relayed unchanged
 *
 * Problems reported by this middleware are {@link immutable}, so a handler may pass one on without guarding against
 * later mutation.
 *
 * > [!NOTE]
 * > The middleware is idempotent: applying it more than once to the same chain is harmless, as a {@link Problem}
 * > raised by an inner layer is relayed unchanged rather than reported again as a transport failure.
 *
 * @returns A {@link Middleware} wrapping a {@link Fetch} implementation with one reporting every failed exchange as an
 *     immutable {@link Problem}
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9110#section-15.3 RFC 9110 § 15.3 - Successful 2xx}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9457 RFC 9457 - Problem Details for HTTP APIs}
 *
 * @group Middlewares
 */
export function success(): Middleware {

	return fetch => (input, init) => fetch(input, init)

		.catch(error => { // relay problems raised by an inner layer, converting only genuine transport failures

			if ( isError(error) ) {

				throw immutable<Problem>({

					status: 0,
					detail: `fetch error <${error}>`

				});

			} else {

				throw error;

			}

		})

		.then(response => {

			if ( response.ok ) {

				return response;

			} else {

				const mime = response.headers.get("Content-Type");

				if ( mime?.match(/^text\/plain\b/i) ) {

					return response.text()

						.catch(_ => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText

							});

						})

						.then(value => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText,

								report: value

							});

						});

				} else if ( mime?.match(/[\/+]json\b/i) ) {

					return response.json()

						.catch(_ => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText

							});

						})

						.then(value => {

							throw immutable<Problem>({

								status: response.status,
								detail: response.statusText,

								report: value

							});

						});

				} else {

					throw immutable<Problem>({

						status: response.status,
						detail: response.statusText

					});

				}

			}

		});

}
