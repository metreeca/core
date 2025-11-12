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
 * Logging framework providing a simplified facade over {@link https://logtape.org | LogTape}.
 *
 * Offers streamlined configuration and hierarchical logger management for TypeScript/JavaScript
 * applications with automatic module integration, path-based categorization, and zero-configuration
 * defaults for local code.
 *
 * Key capabilities:
 *
 * - Intuitive configuration API with sensible defaults
 * - Automatic logger setup for local codebase modules
 * - Hierarchical category derivation from `import.meta.url`
 * - Utility functions for message formatting, execution timing, and error handling
 *
 * @module
 */

export type { Config, Logger } from "@logtape/logtape";

export * from "./facade";
export * from "./utilities";
