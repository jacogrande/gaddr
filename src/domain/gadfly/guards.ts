import type {
  GadflyAction,
  GadflyAnalyzeRequest,
  GadflyAnnotation,
  GadflyAnnotationStatus,
  GadflyCategory,
  GadflyDebugEvent,
  GadflyDroppedArtifact,
  GadflyPrompt,
  GadflyPromptKind,
  GadflyResearchResult,
  GadflyResearchSource,
  GadflyResearchTask,
  GadflyResearchTaskKind,
  GadflyResearchTaskStatus,
  GadflyResearchVerdict,
  GadflyRange,
  GadflySeverity,
} from "./types";
import {
  GADFLY_ANNOTATION_MANAGE_ACTIONS,
  GADFLY_ANNOTATION_STATUSES,
  GADFLY_CATEGORIES,
  GADFLY_PREFERENCE_MANAGE_ACTIONS,
  GADFLY_PROMPT_KINDS,
  GADFLY_PROMPT_MANAGE_ACTIONS,
  GADFLY_RESEARCH_MANAGE_ACTIONS,
  GADFLY_RESEARCH_TASK_KINDS,
  GADFLY_RESEARCH_TASK_STATUSES,
  GADFLY_RESEARCH_VERDICTS,
  GADFLY_SEVERITIES,
} from "./types";
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

const ISO_UTC_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?Z$/;

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

function parseStatus(
  value: unknown,
  fieldName: string,
): Result<GadflyAnnotationStatus, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError(`${fieldName} is invalid`, fieldName));
  }

  for (const status of GADFLY_ANNOTATION_STATUSES) {
    if (status === value) {
      return ok(status);
    }
  }

  return err(toValidationError(`${fieldName} is invalid`, fieldName));
}

function parsePromptKind(
  value: unknown,
  fieldName: string,
): Result<GadflyPromptKind, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError(`${fieldName} is invalid`, fieldName));
  }

  for (const kind of GADFLY_PROMPT_KINDS) {
    if (kind === value) {
      return ok(kind);
    }
  }

  return err(toValidationError(`${fieldName} is invalid`, fieldName));
}

function parseResearchTaskKind(
  value: unknown,
  fieldName: string,
): Result<GadflyResearchTaskKind, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError(`${fieldName} is invalid`, fieldName));
  }

  for (const kind of GADFLY_RESEARCH_TASK_KINDS) {
    if (kind === value) {
      return ok(kind);
    }
  }

  return err(toValidationError(`${fieldName} is invalid`, fieldName));
}

function parseResearchTaskStatus(
  value: unknown,
  fieldName: string,
): Result<GadflyResearchTaskStatus, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError(`${fieldName} is invalid`, fieldName));
  }

  for (const status of GADFLY_RESEARCH_TASK_STATUSES) {
    if (status === value) {
      return ok(status);
    }
  }

  return err(toValidationError(`${fieldName} is invalid`, fieldName));
}

function parseResearchVerdict(
  value: unknown,
  fieldName: string,
): Result<GadflyResearchVerdict, ValidationError> {
  if (typeof value !== "string") {
    return err(toValidationError(`${fieldName} is invalid`, fieldName));
  }

  for (const verdict of GADFLY_RESEARCH_VERDICTS) {
    if (verdict === value) {
      return ok(verdict);
    }
  }

  return err(toValidationError(`${fieldName} is invalid`, fieldName));
}

function isValidIsoDateTime(value: string): boolean {
  const match = ISO_UTC_DATETIME_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maxDayByMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maxDay = maxDayByMonth[month - 1];

  return maxDay !== undefined && day <= maxDay;
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

function validatePromptText(promptText: string): Result<string, GadflyDroppedArtifact> {
  const matchedPattern = firstGhostwritingPattern(promptText);
  if (!matchedPattern) {
    return ok(promptText);
  }

  return err({
    reason: "ghostwriting_pattern:prompt",
    artifactSnippet: promptText.slice(0, 160),
  });
}

function parsePromptRecord(value: unknown, fieldPrefix: string): Result<GadflyPrompt, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const kind = parsePromptKind(value["kind"], `${fieldPrefix}.kind`);
  if (!kind.ok) {
    return kind;
  }

  const text = value["text"];
  if (!isNonEmptyString(text)) {
    return err(toValidationError(`${fieldPrefix}.text is required`, `${fieldPrefix}.text`));
  }

  return ok({
    kind: kind.value,
    text: sanitizeText(text),
  });
}

function parseResearchSourceRecord(
  value: unknown,
  fieldPrefix: string,
): Result<GadflyResearchSource, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const title = value["title"];
  if (!isNonEmptyString(title)) {
    return err(toValidationError(`${fieldPrefix}.title is required`, `${fieldPrefix}.title`));
  }

  const url = value["url"];
  if (!isNonEmptyString(url)) {
    return err(toValidationError(`${fieldPrefix}.url is required`, `${fieldPrefix}.url`));
  }

  try {
    const parsedUrl = new URL(url.trim());
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return err(toValidationError(`${fieldPrefix}.url must be http(s)`, `${fieldPrefix}.url`));
    }

    const pageAge = value["pageAge"];
    if (pageAge !== undefined && pageAge !== null && typeof pageAge !== "string") {
      return err(toValidationError(`${fieldPrefix}.pageAge is invalid`, `${fieldPrefix}.pageAge`));
    }

    return ok({
      title: sanitizeText(title),
      url: parsedUrl.toString(),
      domain: parsedUrl.hostname,
      pageAge: typeof pageAge === "string" ? sanitizeText(pageAge) : null,
    });
  } catch {
    return err(toValidationError(`${fieldPrefix}.url is invalid`, `${fieldPrefix}.url`));
  }
}

function parseResearchResultRecord(
  value: unknown,
  fieldPrefix: string,
): Result<GadflyResearchResult, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const verdict = parseResearchVerdict(value["verdict"], `${fieldPrefix}.verdict`);
  if (!verdict.ok) {
    return verdict;
  }

  const findingsRaw = value["findings"];
  if (!isUnknownArray(findingsRaw) || findingsRaw.length === 0) {
    return err(toValidationError(`${fieldPrefix}.findings must be a non-empty array`, `${fieldPrefix}.findings`));
  }

  const findings: string[] = [];
  for (let index = 0; index < findingsRaw.length; index += 1) {
    const finding = findingsRaw[index];
    if (!isNonEmptyString(finding)) {
      return err(
        toValidationError(
          `${fieldPrefix}.findings[${String(index)}] is required`,
          `${fieldPrefix}.findings[${String(index)}]`,
        ),
      );
    }

    findings.push(sanitizeText(finding));
  }

  const sourcesRaw = value["sources"];
  if (!isUnknownArray(sourcesRaw) || sourcesRaw.length === 0) {
    return err(toValidationError(`${fieldPrefix}.sources must be a non-empty array`, `${fieldPrefix}.sources`));
  }

  const sources: GadflyResearchSource[] = [];
  for (let index = 0; index < sourcesRaw.length; index += 1) {
    const source = parseResearchSourceRecord(sourcesRaw[index], `${fieldPrefix}.sources[${String(index)}]`);
    if (!source.ok) {
      return source;
    }

    sources.push(source.value);
  }

  return ok({
    verdict: verdict.value,
    findings,
    sources,
  });
}

function parseResearchTaskRecord(
  value: unknown,
  fieldPrefix: string,
): Result<GadflyResearchTask, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const id = value["id"];
  if (!isNonEmptyString(id)) {
    return err(toValidationError(`${fieldPrefix}.id is required`, `${fieldPrefix}.id`));
  }

  const kind = parseResearchTaskKind(value["kind"], `${fieldPrefix}.kind`);
  if (!kind.ok) {
    return kind;
  }

  const question = value["question"];
  if (!isNonEmptyString(question)) {
    return err(toValidationError(`${fieldPrefix}.question is required`, `${fieldPrefix}.question`));
  }

  const rawStatus = value["status"];
  const status =
    rawStatus === undefined
      ? ok<GadflyResearchTaskStatus>("pending")
      : parseResearchTaskStatus(rawStatus, `${fieldPrefix}.status`);
  if (!status.ok) {
    return status;
  }

  const resultRaw = value["result"];
  const result =
    resultRaw === undefined || resultRaw === null
      ? ok<GadflyResearchResult | null>(null)
      : parseResearchResultRecord(resultRaw, `${fieldPrefix}.result`);
  if (!result.ok) {
    return result;
  }

  return ok({
    id: id.trim(),
    kind: kind.value,
    question: sanitizeText(question),
    status: result.value ? "completed" : status.value,
    result: result.value,
  });
}

function parseDebugEventRecord(
  value: unknown,
  fieldPrefix: string,
): Result<GadflyDebugEvent, ValidationError> {
  if (!isObject(value)) {
    return err(toValidationError(`${fieldPrefix} must be an object`, fieldPrefix));
  }

  const eventName = value["eventName"];
  if (!isNonEmptyString(eventName)) {
    return err(toValidationError(`${fieldPrefix}.eventName is required`, `${fieldPrefix}.eventName`));
  }

  const detail = value["detail"];
  if (!isNonEmptyString(detail)) {
    return err(toValidationError(`${fieldPrefix}.detail is required`, `${fieldPrefix}.detail`));
  }

  return ok({
    eventName: sanitizeText(eventName),
    detail: sanitizeText(detail),
  });
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

  const rawStatus = value["status"];
  const status = rawStatus === undefined ? ok<GadflyAnnotationStatus>("active") : parseStatus(rawStatus, "annotation.status");
  if (!status.ok) {
    return status;
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

  const promptsRaw = value["prompts"];
  const prompts: GadflyPrompt[] = [];
  if (promptsRaw !== undefined) {
    if (!isUnknownArray(promptsRaw)) {
      return err(toValidationError("annotation.prompts must be an array", "annotation.prompts"));
    }

    for (let index = 0; index < promptsRaw.length; index += 1) {
      const prompt = parsePromptRecord(promptsRaw[index], `annotation.prompts[${String(index)}]`);
      if (!prompt.ok) {
        return prompt;
      }

      prompts.push(prompt.value);
    }
  }

  const researchRaw = value["research"];
  let research: GadflyAnnotation["research"] = {
    needsFactCheck: false,
    factCheckNote: null,
    tasks: [],
  };

  if (researchRaw !== undefined) {
    if (!isObject(researchRaw)) {
      return err(toValidationError("annotation.research must be an object", "annotation.research"));
    }

    const needsFactCheckRaw = researchRaw["needsFactCheck"];
    const needsFactCheck =
      needsFactCheckRaw === undefined ? false : typeof needsFactCheckRaw === "boolean" ? needsFactCheckRaw : null;
    if (needsFactCheck === null) {
      return err(
        toValidationError(
          "annotation.research.needsFactCheck must be a boolean",
          "annotation.research.needsFactCheck",
        ),
      );
    }

    const factCheckNoteRaw = researchRaw["factCheckNote"];
    if (
      factCheckNoteRaw !== undefined &&
      factCheckNoteRaw !== null &&
      !isNonEmptyString(factCheckNoteRaw)
    ) {
      return err(
        toValidationError(
          "annotation.research.factCheckNote is invalid",
          "annotation.research.factCheckNote",
        ),
      );
    }

    const tasksRaw = researchRaw["tasks"];
    const tasks: GadflyResearchTask[] = [];
    if (tasksRaw !== undefined) {
      if (!isUnknownArray(tasksRaw)) {
        return err(toValidationError("annotation.research.tasks must be an array", "annotation.research.tasks"));
      }

      for (let index = 0; index < tasksRaw.length; index += 1) {
        const task = parseResearchTaskRecord(tasksRaw[index], `annotation.research.tasks[${String(index)}]`);
        if (!task.ok) {
          return task;
        }

        tasks.push(task.value);
      }
    }

    research = {
      needsFactCheck,
      factCheckNote: isNonEmptyString(factCheckNoteRaw) ? sanitizeText(factCheckNoteRaw) : null,
      tasks,
    };
  }

  const snoozedUntilRaw = value["snoozedUntil"];
  let snoozedUntil: string | null = null;
  if (snoozedUntilRaw !== undefined && snoozedUntilRaw !== null) {
    if (typeof snoozedUntilRaw !== "string" || !isValidIsoDateTime(snoozedUntilRaw)) {
      return err(toValidationError("annotation.snoozedUntil is invalid", "annotation.snoozedUntil"));
    }

    snoozedUntil = snoozedUntilRaw;
  }

  const isPinnedRaw = value["isPinned"];
  const isPinned = isPinnedRaw === undefined ? false : typeof isPinnedRaw === "boolean" ? isPinnedRaw : null;
  if (isPinned === null) {
    return err(toValidationError("annotation.isPinned must be a boolean", "annotation.isPinned"));
  }

  const linkedAnnotationIdsRaw = value["linkedAnnotationIds"];
  const linkedAnnotationIds: string[] = [];
  if (linkedAnnotationIdsRaw !== undefined) {
    if (!isUnknownArray(linkedAnnotationIdsRaw)) {
      return err(
        toValidationError("annotation.linkedAnnotationIds must be an array", "annotation.linkedAnnotationIds"),
      );
    }

    for (let index = 0; index < linkedAnnotationIdsRaw.length; index += 1) {
      const linkedId = linkedAnnotationIdsRaw[index];
      if (!isNonEmptyString(linkedId)) {
        return err(
          toValidationError(
            `annotation.linkedAnnotationIds[${String(index)}] is required`,
            `annotation.linkedAnnotationIds[${String(index)}]`,
          ),
        );
      }

      linkedAnnotationIds.push(linkedId.trim());
    }
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
    status: status.value,
    explanation: sanitizeText(explanation),
    rule: sanitizeText(rule),
    question: sanitizeText(question),
    prompts,
    research,
    snoozedUntil,
    isPinned,
    linkedAnnotationIds,
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
  if (type === "annotation.manage") {
    const action = value["action"];
    if (typeof action !== "string") {
      return err(toValidationError("annotation.manage.action is required", "action"));
    }

    const isSupportedAction = GADFLY_ANNOTATION_MANAGE_ACTIONS.some((supportedAction) => supportedAction === action);
    if (!isSupportedAction) {
      return err(toValidationError("annotation.manage.action is invalid", "action"));
    }

    if (action === "annotate" || action === "update_annotation") {
      const annotation = parseAnnotationRecord(value["annotation"]);
      if (!annotation.ok) {
        return annotation;
      }

      return ok({
        type: "annotation.manage",
        action,
        annotation: annotation.value,
      });
    }

    if (action === "clear") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required for clear actions", "annotationId"));
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
      });
    }

    if (action === "clear_in_range") {
      const range = parseRange(value["range"], "range");
      if (!range.ok) {
        return range;
      }

      return ok({
        type: "annotation.manage",
        action,
        range: range.value,
      });
    }

    if (action === "clear_by_category") {
      const category = parseCategory(value["category"]);
      if (!category.ok) {
        return err(toValidationError("category is invalid for clear_by_category", "category"));
      }

      return ok({
        type: "annotation.manage",
        action,
        category: category.value,
      });
    }

    if (action === "set_severity") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required for set_severity", "annotationId"));
      }

      const severity = parseSeverity(value["severity"]);
      if (!severity.ok) {
        return err(toValidationError("severity is invalid for set_severity", "severity"));
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
        severity: severity.value,
      });
    }

    if (action === "set_status") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required for set_status", "annotationId"));
      }

      const status = parseStatus(value["status"], "status");
      if (!status.ok) {
        return status;
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
        status: status.value,
      });
    }

    if (action === "snooze_until") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required for snooze_until", "annotationId"));
      }

      const until = value["until"];
      if (!isNonEmptyString(until) || !isValidIsoDateTime(until)) {
        return err(toValidationError("until is required for snooze_until", "until"));
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
        until: until.trim(),
      });
    }

    if (action === "unsnooze" || action === "pin_annotation" || action === "unpin_annotation") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required", "annotationId"));
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
      });
    }

    if (action === "link_annotations") {
      const annotationId = value["annotationId"];
      if (!isNonEmptyString(annotationId)) {
        return err(toValidationError("annotationId is required for link_annotations", "annotationId"));
      }

      const relatedRaw = value["relatedAnnotationIds"];
      if (!isUnknownArray(relatedRaw) || relatedRaw.length === 0) {
        return err(
          toValidationError("relatedAnnotationIds must be a non-empty array", "relatedAnnotationIds"),
        );
      }

      const relatedAnnotationIds: string[] = [];
      for (let index = 0; index < relatedRaw.length; index += 1) {
        const relatedId = relatedRaw[index];
        if (!isNonEmptyString(relatedId)) {
          return err(
            toValidationError(
              `relatedAnnotationIds[${String(index)}] is required`,
              `relatedAnnotationIds[${String(index)}]`,
            ),
          );
        }

        relatedAnnotationIds.push(relatedId.trim());
      }

      return ok({
        type: "annotation.manage",
        action,
        annotationId: annotationId.trim(),
        relatedAnnotationIds,
      });
    }
  }

  if (type === "prompt.manage") {
    const action = value["action"];
    if (typeof action !== "string") {
      return err(toValidationError("prompt.manage.action is required", "action"));
    }

    const isSupportedAction = GADFLY_PROMPT_MANAGE_ACTIONS.some((supportedAction) => supportedAction === action);
    if (!isSupportedAction) {
      return err(toValidationError("prompt.manage.action is invalid", "action"));
    }

    const annotationId = value["annotationId"];
    if (!isNonEmptyString(annotationId)) {
      return err(toValidationError("annotationId is required for prompt.manage", "annotationId"));
    }

    const prompt = value["prompt"];
    if (!isNonEmptyString(prompt)) {
      return err(toValidationError("prompt is required for prompt.manage", "prompt"));
    }

    switch (action) {
      case "ask_followup_question":
      case "add_clarity_prompt":
      case "add_structure_prompt":
      case "add_evidence_prompt":
      case "add_counterpoint_prompt":
      case "add_tone_consistency_prompt":
        return ok({
          type: "prompt.manage",
          action,
          annotationId: annotationId.trim(),
          prompt: sanitizeText(prompt),
        });
      default:
        return err(toValidationError("prompt.manage.action is invalid", "action"));
    }
  }

  if (type === "research.manage") {
    const action = value["action"];
    if (typeof action !== "string") {
      return err(toValidationError("research.manage.action is required", "action"));
    }

    const isSupportedAction = GADFLY_RESEARCH_MANAGE_ACTIONS.some((supportedAction) => supportedAction === action);
    if (!isSupportedAction) {
      return err(toValidationError("research.manage.action is invalid", "action"));
    }

    const annotationId = value["annotationId"];
    if (!isNonEmptyString(annotationId)) {
      return err(toValidationError("annotationId is required for research.manage", "annotationId"));
    }

    if (action === "flag_fact_check_needed") {
      const note = value["note"];
      if (!isNonEmptyString(note)) {
        return err(toValidationError("note is required for flag_fact_check_needed", "note"));
      }

      return ok({
        type: "research.manage",
        action,
        annotationId: annotationId.trim(),
        note: sanitizeText(note),
      });
    }

    if (action === "create_research_task") {
      const task = parseResearchTaskRecord(value["task"], "task");
      if (!task.ok) {
        return task;
      }

      return ok({
        type: "research.manage",
        action,
        annotationId: annotationId.trim(),
        task: {
          id: task.value.id,
          kind: task.value.kind,
          question: task.value.question,
        },
      });
    }

    if (action === "attach_research_result") {
      const taskId = value["taskId"];
      if (!isNonEmptyString(taskId)) {
        return err(toValidationError("taskId is required for attach_research_result", "taskId"));
      }

      const result = parseResearchResultRecord(value["result"], "result");
      if (!result.ok) {
        return result;
      }

      return ok({
        type: "research.manage",
        action,
        annotationId: annotationId.trim(),
        taskId: taskId.trim(),
        result: result.value,
      });
    }
  }

  if (type === "preference.manage") {
    const action = value["action"];
    if (typeof action !== "string") {
      return err(toValidationError("preference.manage.action is required", "action"));
    }

    const isSupportedAction = GADFLY_PREFERENCE_MANAGE_ACTIONS.some(
      (supportedAction) => supportedAction === action,
    );
    if (!isSupportedAction) {
      return err(toValidationError("preference.manage.action is invalid", "action"));
    }

    if (action === "mute_category" || action === "unmute_category") {
      const category = parseCategory(value["category"]);
      if (!category.ok) {
        return err(toValidationError("category is invalid", "category"));
      }

      return ok({
        type: "preference.manage",
        action,
        category: category.value,
      });
    }

    if (action === "set_learning_goal") {
      const goal = value["goal"];
      if (!isNonEmptyString(goal)) {
        return err(toValidationError("goal is required for set_learning_goal", "goal"));
      }

      return ok({
        type: "preference.manage",
        action,
        goal: sanitizeText(goal),
      });
    }

    return ok({
      type: "preference.manage",
      action: "clear_learning_goal",
    });
  }

  if (type === "debug.emit") {
    const action = value["action"];
    if (action !== "emit_debug_event") {
      return err(toValidationError("debug.emit.action is invalid", "action"));
    }

    const event = parseDebugEventRecord(value["event"], "event");
    if (!event.ok) {
      return event;
    }

    return ok({
      type: "debug.emit",
      action,
      event: event.value,
    });
  }

  // Legacy action format fallback kept for compatibility with stale model outputs.
  if (type === "annotate") {
    const annotation = parseAnnotationRecord(value["annotation"]);
    if (!annotation.ok) {
      return annotation;
    }

    return ok({
      type: "annotation.manage",
      action: "annotate",
      annotation: annotation.value,
    });
  }

  if (type === "clear") {
    const annotationId = value["annotationId"];
    if (!isNonEmptyString(annotationId)) {
      return err(toValidationError("annotationId is required for clear actions", "annotationId"));
    }

    return ok({
      type: "annotation.manage",
      action: "clear",
      annotationId: annotationId.trim(),
    });
  }

  return err(
    toValidationError(
      "action.type must be annotation.manage, prompt.manage, or research.manage",
      "type",
    ),
  );
}

function validateTextForGhostwriting(text: string): Result<string, GadflyDroppedArtifact> {
  return validatePromptText(text);
}

export function validateGadflyAction(action: GadflyAction): Result<GadflyAction, GadflyDroppedArtifact> {
  if (action.type === "preference.manage") {
    if (action.action === "set_learning_goal") {
      const goalValidation = validateTextForGhostwriting(action.goal);
      if (!goalValidation.ok) {
        return goalValidation;
      }
    }

    return ok(action);
  }

  if (action.type === "debug.emit") {
    const detailValidation = validateTextForGhostwriting(action.event.detail);
    if (!detailValidation.ok) {
      return detailValidation;
    }

    return ok(action);
  }

  if (action.type === "prompt.manage") {
    const promptValidation = validatePromptText(action.prompt);
    if (!promptValidation.ok) {
      return promptValidation;
    }

    return ok(action);
  }

  if (action.type === "research.manage") {
    if (action.action === "flag_fact_check_needed") {
      const noteValidation = validatePromptText(action.note);
      if (!noteValidation.ok) {
        return noteValidation;
      }
    }

    if (action.action === "create_research_task") {
      const questionValidation = validatePromptText(action.task.question);
      if (!questionValidation.ok) {
        return questionValidation;
      }
    }

    if (action.action === "attach_research_result") {
      for (const finding of action.result.findings) {
        const findingValidation = validatePromptText(finding);
        if (!findingValidation.ok) {
          return findingValidation;
        }
      }
    }

    return ok(action);
  }

  if (action.action === "annotate" || action.action === "update_annotation") {
    const annotationValidation = validateAnnotationText(action.annotation);
    if (!annotationValidation.ok) {
      return annotationValidation;
    }

    for (const prompt of action.annotation.prompts) {
      const promptValidation = validatePromptText(prompt.text);
      if (!promptValidation.ok) {
        return promptValidation;
      }
    }

    if (action.annotation.research.factCheckNote) {
      const factCheckValidation = validatePromptText(action.annotation.research.factCheckNote);
      if (!factCheckValidation.ok) {
        return factCheckValidation;
      }
    }

    for (const task of action.annotation.research.tasks) {
      const questionValidation = validatePromptText(task.question);
      if (!questionValidation.ok) {
        return questionValidation;
      }

      if (!task.result) {
        continue;
      }

      for (const finding of task.result.findings) {
        const findingValidation = validatePromptText(finding);
        if (!findingValidation.ok) {
          return findingValidation;
        }
      }
    }
  }

  return ok(action);
}
