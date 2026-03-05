import type {
  GadflyAction,
  GadflyAnalyzeRequest,
  GadflyDroppedArtifact,
  GadflyRange,
} from "./types";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import type { ValidationError } from "../types/errors";

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
      return err(
        toValidationError(
          `contextWindow[${String(index)}] must be an object`,
          `contextWindow[${String(index)}]`,
        ),
      );
    }

    const range = parseRange(item, `contextWindow[${String(index)}]`);
    if (!range.ok) {
      return range;
    }

    const text = item["text"];
    if (typeof text !== "string") {
      return err(
        toValidationError(
          `contextWindow[${String(index)}].text must be a string`,
          `contextWindow[${String(index)}].text`,
        ),
      );
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
  if (!isNonEmptyString(type)) {
    return err(toValidationError("action.type is required", "type"));
  }

  const action = value["action"];
  if (!isNonEmptyString(action)) {
    return err(toValidationError("action.action is required", "action"));
  }

  const payloadRaw = value["payload"];
  if (payloadRaw !== undefined && !isObject(payloadRaw)) {
    return err(toValidationError("action.payload must be an object", "payload"));
  }

  return ok({
    type: type.trim(),
    action: action.trim(),
    payload: payloadRaw,
  });
}

export function validateGadflyAction(action: GadflyAction): Result<GadflyAction, GadflyDroppedArtifact> {
  return ok(action);
}
