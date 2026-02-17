import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import type { TipTapDoc } from "../../domain/essay/essay";
import type { PersistenceError } from "../../domain/types/errors";
import type { Result } from "../../domain/types/result";
import { err, ok } from "../../domain/types/result";

const extensions = [StarterKit.configure({ heading: { levels: [2, 3] } })];

export function renderEssayHtml(
  doc: TipTapDoc,
): Result<string, PersistenceError> {
  try {
    return ok(generateHTML(doc as Parameters<typeof generateHTML>[0], extensions));
  } catch (cause: unknown) {
    return err({
      kind: "PersistenceError",
      message: "Failed to render essay content",
      cause,
    });
  }
}
