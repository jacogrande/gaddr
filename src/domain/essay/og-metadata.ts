// OG metadata extraction — pure domain logic

import type { TipTapDoc } from "./essay";
import { extractEssayText } from "./operations";

const OG_DESCRIPTION_MAX = 200;

export function extractOgDescription(doc: TipTapDoc): string {
  const text = extractEssayText(doc);
  if (text.length === 0) return "";
  if (text.length <= OG_DESCRIPTION_MAX) return text;

  // Truncate at word boundary
  const truncated = text.slice(0, OG_DESCRIPTION_MAX);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace === -1) return `${truncated}...`;
  return `${truncated.slice(0, lastSpace)}...`;
}
