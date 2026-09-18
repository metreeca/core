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
 * XSD 1.1 datatype identifiers.
 *
 * Provides the {@link xsd} namespace object exposing well-known XML Schema 1.1 datatype IRIs as a closed
 * {@link Namespace}.
 *
 * ```typescript
 * import { xsd } from "@metreeca/core/datatype";
 *
 * // Predefined closed namespace for well-known XSD 1.1 datatypes
 *
 * xsd[""];            // IRI: "http://www.w3.org/2001/XMLSchema#"
 * xsd.string;         // IRI: "http://www.w3.org/2001/XMLSchema#string"
 * xsd.dateTime;       // IRI: "http://www.w3.org/2001/XMLSchema#dateTime"
 * ```
 *
 * @module
 *
 * @see {@link https://www.w3.org/TR/xmlschema11-2/ W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes}
 */

import { createNamespace, type IRI, type Namespace } from "./resource.js";


/**
 * XSD datatype namespace.
 *
 * A closed {@link Namespace} of well-known XML Schema datatype IRIs, covering `boolean`, the complete numeric
 * family, `string`, `anyURI`, the complete date/time family, and the binary datatypes.
 *
 * > [!NOTE]
 * > String-derived and qualified-name datatypes are not included: they carry XML-document semantics
 * > (whitespace facets, namespace-scoped resolution) of little use as standalone datatype identifiers.
 *
 * @see {@link https://www.w3.org/TR/xmlschema11-2/ W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes}
 */
export const xsd = createNamespace("http://www.w3.org/2001/XMLSchema#", [

	"boolean",

	"byte",
	"short",
	"int",
	"long",
	"float",
	"double",
	"integer",
	"decimal",

	"unsignedByte",
	"unsignedInt",
	"unsignedShort",
	"unsignedLong",

	"negativeInteger",
	"positiveInteger",
	"nonPositiveInteger",
	"nonNegativeInteger",

	"string",
	"anyURI",

	"gYear",
	"gYearMonth",
	"gMonth",
	"gMonthDay",
	"gDay",

	"date",
	"time",
	"dateTime",
	"dateTimeStamp",

	"duration",
	"yearMonthDuration",
	"dayTimeDuration",

	"hexBinary",
	"base64Binary"

]);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * XSD numeric datatype IRIs recognised by {@link isNumeric}.
 */
const Numeric: ReadonlySet<IRI> = new Set([

	xsd.double,
	xsd.byte,
	xsd.short,
	xsd.int,
	xsd.long,
	xsd.float,
	xsd.integer,
	xsd.decimal,

	xsd.unsignedByte,
	xsd.unsignedShort,
	xsd.unsignedInt,
	xsd.unsignedLong,

	xsd.negativeInteger,
	xsd.positiveInteger,
	xsd.nonPositiveInteger,
	xsd.nonNegativeInteger

]);

/**
 * XSD date/time datatype IRIs recognised by {@link isTemporal}.
 */
const Temporal: ReadonlySet<IRI> = new Set([

	xsd.gYear,
	xsd.gYearMonth,
	xsd.gMonth,
	xsd.gMonthDay,
	xsd.gDay,

	xsd.date,
	xsd.time,
	xsd.dateTime,
	xsd.dateTimeStamp,

	xsd.duration,
	xsd.yearMonthDuration,
	xsd.dayTimeDuration

]);

/**
 * XSD binary datatype IRIs recognised by {@link isBinary}.
 */
const Binary: ReadonlySet<IRI> = new Set([

	xsd.hexBinary,
	xsd.base64Binary

]);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks whether a datatype is an XSD numeric datatype.
 *
 * Recognises the integer, decimal, and floating-point datatypes of {@link xsd}, including their signed, unsigned, and
 * bounded derivations.
 *
 * @param datatype The datatype to check
 *
 * @returns true if `datatype` is one of the XSD numeric datatypes; false otherwise
 *
 * @see {@link xsd}
 */
export function isNumeric(datatype: IRI) {
	return Numeric.has(datatype);
}

/**
 * Checks whether a datatype is an XSD temporal datatype.
 *
 * Recognises the Gregorian, date, time, timestamp, and duration datatypes of {@link xsd}.
 *
 * @param datatype The datatype to check
 *
 * @returns true if `datatype` is one of the XSD temporal datatypes; false otherwise
 *
 * @see {@link xsd}
 */
export function isTemporal(datatype: IRI) {
	return Temporal.has(datatype);
}

/**
 * Checks whether a datatype is an XSD binary datatype.
 *
 * Recognises the `hexBinary` and `base64Binary` datatypes of {@link xsd}.
 *
 * @param datatype The datatype to check
 *
 * @returns true if `datatype` is one of the XSD binary datatypes; false otherwise
 *
 * @see {@link xsd}
 */
export function isBinary(datatype: IRI) {
	return Binary.has(datatype);
}
