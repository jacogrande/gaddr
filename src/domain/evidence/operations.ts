// Pure evidence operations — no framework imports, no throw

import type { EvidenceCard, Stance } from "./evidence-card";
import { STANCES } from "./evidence-card";
import type { ClaimEvidenceLink } from "./claim-evidence-link";
import type { EvidenceCardId, ClaimEvidenceLinkId, EssayId } from "../types/branded";
import type { UserId } from "../types/branded";
import type { ValidationError } from "../types/errors";
import type { Result } from "../types/result";
import { ok, err } from "../types/result";
import { isSafeUrl } from "../types/url";

export const MAX_SOURCE_TITLE_LENGTH = 300;
export const MAX_QUOTE_LENGTH = 2000;
export const MAX_SUMMARY_LENGTH = 2000;
export const MAX_CAVEATS_LENGTH = 1000;
export const MAX_CLAIM_TEXT_LENGTH = 1000;

function validationErr(
  message: string,
  field: string,
): Result<never, ValidationError> {
  return err({ kind: "ValidationError", message, field });
}

function isValidStance(value: string): value is Stance {
  return STANCES.some((s) => s === value);
}

export function createEvidenceCard(params: {
  id: EvidenceCardId;
  userId: UserId;
  sourceUrl: string;
  sourceTitle: string;
  quoteSnippet: string | null;
  userSummary: string | null;
  caveats: string | null;
  stance: string;
  now: Date;
}): Result<EvidenceCard, ValidationError> {
  if (!isSafeUrl(params.sourceUrl)) {
    return validationErr(
      "Source URL must start with http:// or https://",
      "sourceUrl",
    );
  }

  const title = params.sourceTitle.trim();
  if (title.length === 0) {
    return validationErr("Source title is required", "sourceTitle");
  }
  if (title.length > MAX_SOURCE_TITLE_LENGTH) {
    return validationErr(
      `Source title must be ${String(MAX_SOURCE_TITLE_LENGTH)} characters or fewer`,
      "sourceTitle",
    );
  }

  const quote = params.quoteSnippet?.trim() || null;
  const summary = params.userSummary?.trim() || null;

  if (!quote && !summary) {
    return validationErr(
      "At least one of quote or summary is required",
      "quoteSnippet",
    );
  }

  if (quote && quote.length > MAX_QUOTE_LENGTH) {
    return validationErr(
      `Quote must be ${String(MAX_QUOTE_LENGTH)} characters or fewer`,
      "quoteSnippet",
    );
  }

  if (summary && summary.length > MAX_SUMMARY_LENGTH) {
    return validationErr(
      `Summary must be ${String(MAX_SUMMARY_LENGTH)} characters or fewer`,
      "userSummary",
    );
  }

  const caveats = params.caveats?.trim() || null;
  if (caveats && caveats.length > MAX_CAVEATS_LENGTH) {
    return validationErr(
      `Caveats must be ${String(MAX_CAVEATS_LENGTH)} characters or fewer`,
      "caveats",
    );
  }

  if (!isValidStance(params.stance)) {
    return validationErr(
      `Stance must be one of: ${STANCES.join(", ")}`,
      "stance",
    );
  }

  return ok({
    id: params.id,
    userId: params.userId,
    sourceUrl: params.sourceUrl,
    sourceTitle: title,
    quoteSnippet: quote,
    userSummary: summary,
    caveats,
    stance: params.stance,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

export function updateEvidenceCard(
  card: EvidenceCard,
  update: {
    sourceUrl?: string;
    sourceTitle?: string;
    quoteSnippet?: string | null;
    userSummary?: string | null;
    caveats?: string | null;
    stance?: string;
    now: Date;
  },
): Result<EvidenceCard, ValidationError> {
  const sourceUrl = update.sourceUrl ?? card.sourceUrl;
  if (!isSafeUrl(sourceUrl)) {
    return validationErr(
      "Source URL must start with http:// or https://",
      "sourceUrl",
    );
  }

  const title = (update.sourceTitle ?? card.sourceTitle).trim();
  if (title.length === 0) {
    return validationErr("Source title is required", "sourceTitle");
  }
  if (title.length > MAX_SOURCE_TITLE_LENGTH) {
    return validationErr(
      `Source title must be ${String(MAX_SOURCE_TITLE_LENGTH)} characters or fewer`,
      "sourceTitle",
    );
  }

  const quote =
    update.quoteSnippet !== undefined
      ? (update.quoteSnippet?.trim() || null)
      : card.quoteSnippet;
  const summary =
    update.userSummary !== undefined
      ? (update.userSummary?.trim() || null)
      : card.userSummary;

  if (!quote && !summary) {
    return validationErr(
      "At least one of quote or summary is required",
      "quoteSnippet",
    );
  }

  if (quote && quote.length > MAX_QUOTE_LENGTH) {
    return validationErr(
      `Quote must be ${String(MAX_QUOTE_LENGTH)} characters or fewer`,
      "quoteSnippet",
    );
  }

  if (summary && summary.length > MAX_SUMMARY_LENGTH) {
    return validationErr(
      `Summary must be ${String(MAX_SUMMARY_LENGTH)} characters or fewer`,
      "userSummary",
    );
  }

  const caveats =
    update.caveats !== undefined
      ? (update.caveats?.trim() || null)
      : card.caveats;
  if (caveats && caveats.length > MAX_CAVEATS_LENGTH) {
    return validationErr(
      `Caveats must be ${String(MAX_CAVEATS_LENGTH)} characters or fewer`,
      "caveats",
    );
  }

  const stance = update.stance ?? card.stance;
  if (!isValidStance(stance)) {
    return validationErr(
      `Stance must be one of: ${STANCES.join(", ")}`,
      "stance",
    );
  }

  return ok({
    ...card,
    sourceUrl,
    sourceTitle: title,
    quoteSnippet: quote,
    userSummary: summary,
    caveats,
    stance,
    updatedAt: update.now,
  });
}

export function createClaimEvidenceLink(params: {
  id: ClaimEvidenceLinkId;
  essayId: EssayId;
  evidenceCardId: EvidenceCardId;
  userId: UserId;
  claimText: string;
  anchorBlockIndex: number;
  now: Date;
}): Result<ClaimEvidenceLink, ValidationError> {
  const text = params.claimText.trim();
  if (text.length === 0) {
    return validationErr("Claim text is required", "claimText");
  }
  if (text.length > MAX_CLAIM_TEXT_LENGTH) {
    return validationErr(
      `Claim text must be ${String(MAX_CLAIM_TEXT_LENGTH)} characters or fewer`,
      "claimText",
    );
  }

  if (params.anchorBlockIndex < 0) {
    return validationErr(
      "Anchor block index must be non-negative",
      "anchorBlockIndex",
    );
  }
  if (!Number.isInteger(params.anchorBlockIndex)) {
    return validationErr(
      "Anchor block index must be an integer",
      "anchorBlockIndex",
    );
  }

  return ok({
    id: params.id,
    essayId: params.essayId,
    evidenceCardId: params.evidenceCardId,
    userId: params.userId,
    claimText: text,
    anchorBlockIndex: params.anchorBlockIndex,
    createdAt: params.now,
  });
}
