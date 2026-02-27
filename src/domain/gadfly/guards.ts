import type {
  GadflyAction,
  GadflyAnalyzeRequest,
  GadflyAnnotation,
  GadflyCategory,
  GadflyDroppedArtifact,
  GadflyRange,
  GadflySeverity,
} from "./types";
import { GADFLY_CATEGORIES, GADFLY_SEVERITIES } from "./types";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type { ValidationError } from "../types/errors";

const GHOSTWRITING_PATTERNS = [
  /\breplace\s+with\b/i,
  /\brewrite\s+as\b/i,
  /\bchange\s+to\b/i,
  /\bhere('?s| is)\s+(a\s+)?rewrite\b/i,
  /`[^`]{18,}`/i,
];

type InputRecord = Record<string, unknown>;

function isObject(value: unknown): value is InputRecord {
  return typeof value === "object" && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toValidationError(message: string, field: string): ValidationError {
  return {
    kind: "ValidationError",
    message,
    field,
  };
}

function parseRange(value: unknown, fieldPrefix: string): Result<GadflyRange, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const from = value["from"];
  const to = value["to"];

  if (!isFiniteInt(from)) {
    return err(toValidationError(`${fieldPrefix}.from must be an integer`, `${fieldPrefix}.from`));
  }

  if (!isFiniteInt(to)) {
    return err(toValidationError(`${fieldPrefix}.to must be an integer`, `${fieldPrefix}.to`));
  }

  if (from < 0 || to < 0 || to < from) {
    return err(toValidationError(`${fieldPrefix} has invalid bounds`, fieldPrefix));
  }

  return ok({ from, to });
}

function parseCategory(value: unknown): Result<GadflyCategory, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError("annotation.category is invalid", "annotation.category"));
  }

  for (const category of GADFLY_CATEGORIES) {
    if (category === value) {
      return ok(category);
    }
  }

  return err(toValidationError("annotation.category is invalid", "annotation.category"));
}

function parseSeverity(value: unknown): Result<GadflySeverity, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError("annotation.severity is invalid", "annotation.severity"));
  }

  for (const severity of GADFLY_SEVERITIES) {
    if (severity === value) {
      return ok(severity);
    }
  }

  return err(toValidationError("annotation.severity is invalid", "annotation.severity"));
}

function firstGhostwritingPattern(text: string): string | null {
  for (const pattern of GHOSTWRITING_PATTERNS) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }

  return null;
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validateAnnotationText(annotation: GadflyAnnotation): Result<GadflyAnnotation, GadflyDroppedArtifact> {
  const fields: Array<{ key: string; value: string }> = [
    { key: "explanation", value: annotation.explanation },
    { key: "rule", value: annotation.rule },
    { key: "question", value: annotation.question },
  ];

  for (const field of fields) {
    const matchedPattern = firstGhostwritingPattern(field.value);
    if (!matchedPattern) {
      continue;
    }

    return err({
      reason: `ghostwriting_pattern:${field.key}`,
      artifactSnippet: field.value.slice(0, 160),
    });
  }

  return ok(annotation);
}

function parseAnnotationRecord(value: unknown): Result<GadflyAnnotation, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError("annotation must be an object", "annotation"));
  }

  const id = value["id"];
  if (!isNonEmptyString(id)) {
    return err(toValidationError("annotation.id is required", "annotation.id"));
  }

  const anchorRaw = value["anchor"];
  if (!isObject(anchorRaw)) {
    return err(toValidationError("annotation.anchor must be an object", "annotation.anchor"));
  }

  const range = parseRange(anchorRaw, "annotation.anchor");
  if (!range.ok) {
    return range;
  }

  const quote = anchorRaw["quote"];
  if (!isNonEmptyString(quote)) {
    return err(toValidationError("annotation.anchor.quote is required", "annotation.anchor.quote"));
  }

  const category = parseCategory(value["category"]);
  if (!category.ok) {
    return category;
  }

  const severity = parseSeverity(value["severity"]);
  if (!severity.ok) {
    return severity;
  }

  const explanation = value["explanation"];
  const rule = value["rule"];
  const question = value["question"];

  if (!isNonEmptyString(explanation)) {
    return err(toValidationError("annotation.explanation is required", "annotation.explanation"));
  }

  if (!isNonEmptyString(rule)) {
    return err(toValidationError("annotation.rule is required", "annotation.rule"));
  }

  if (!isNonEmptyString(question)) {
    return err(toValidationError("annotation.question is required", "annotation.question"));
  }

  return ok({
    id,
    anchor: {
      from: range.value.from,
      to: range.value.to,
      quote: sanitizeText(quote),
    },
    category: category.value,
    severity: severity.value,
    explanation: sanitizeText(explanation),
    rule: sanitizeText(rule),
    question: sanitizeText(question),
  });
}

export function parseGadflyAnalyzeRequest(value: unknown): Result<GadflyAnalyzeRequest, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError("request body must be an object", "body"));
  }

  const noteId = value["noteId"];
  if (!isNonEmptyString(noteId)) {
    return err(toValidationError("noteId is required", "noteId"));
  }

  const docVersion = value["docVersion"];
  if (!isFiniteInt(docVersion) || docVersion < 0) {
    return err(toValidationError("docVersion must be a non-negative integer", "docVersion"));
  }

  const plainText = value["plainText"];
  if (typeof plainText !== "string") {
    return err(toValidationError("plainText must be a string", "plainText"));
  }

  const changedRangesRaw = value["changedRanges"];
  if (!isUnknownArray(changedRangesRaw) || changedRangesRaw.length === 0) {
    return err(toValidationError("changedRanges must be a non-empty array", "changedRanges"));
  }

  const changedRanges: GadflyRange[] = [];
  for (let index = 0; index < changedRangesRaw.length; index += 1) {
    const range = parseRange(changedRangesRaw[index], `changedRanges[${String(index)}]`);
    if (!range.ok) {
      return range;
    }

    changedRanges.push(range.value);
  }

  const contextWindowRaw = value["contextWindow"];
  if (!isUnknownArray(contextWindowRaw)) {
    return err(toValidationError("contextWindow must be an array", "contextWindow"));
  }

  const contextWindow: GadflyAnalyzeRequest["contextWindow"] = [];
  for (let index = 0; index < contextWindowRaw.length; index += 1) {
    const item = contextWindowRaw[index];
    if (!isObject(item)) {
      return err(toValidationError(`contextWindow[${String(index)}] must be an object`, `contextWindow[${String(index)}]`));
    }

    const range = parseRange(item, `contextWindow[${String(index)}]`);
    if (!range.ok) {
      return range;
    }

    const text = item["text"];
    if (typeof text !== "string") {
      return err(toValidationError(`contextWindow[${String(index)}].text must be a string`, `contextWindow[${String(index)}].text`));
    }

    contextWindow.push({
      from: range.value.from,
      to: range.value.to,
      text,
    });
  }

  return ok({
    noteId: noteId.trim(),
    docVersion,
    changedRanges,
    plainText,
    contextWindow,
  });
}

export function parseGadflyAction(value: unknown): Result<GadflyAction, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError("action must be an object", "action"));
  }

  const type = value["type"];
  if (type === "annotate") {
    const annotation = parseAnnotationRecord(value["annotation"]);
    if (!annotation.ok) {
      return annotation;
    }

    return ok({
      type: "annotate",
      annotation: annotation.value,
    });
  }

  if (type === "clear") {
    const annotationId = value["annotationId"];
    if (!isNonEmptyString(annotationId)) {
      return err(toValidationError("annotationId is required for clear actions", "annotationId"));
    }

    return ok({
      type: "clear",
      annotationId: annotationId.trim(),
    });
  }

  return err(toValidationError("action.type must be annotate or clear", "type"));
}

export function validateGadflyAction(action: GadflyAction): Result<GadflyAction, GadflyDroppedArtifact> {
  if (action.type === "clear") {
    return ok(action);
  }

  const annotationValidation = validateAnnotationText(action.annotation);
  if (!annotationValidation.ok) {
    return annotationValidation;
  }

  return ok(action);
}
