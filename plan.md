# Phase 2 Coaching Notes — Code Review

## Review Date
2026-02-18

## Checks Run
- bun test test/unit/coaching/ test/unit/claims/ test/contract/coaching-parsing.test.ts → 59 pass, 0 fail
- bun run typecheck → clean (no errors)
- bun run lint → 4 pre-existing errors in test/e2e/visual-screenshots.spec.ts (unrelated); new code is clean
- bun run knip → clean (no dead exports)

---

## Summary
Phase 2 implements proactive coaching notes cleanly. The domain/infra/app layer split is respected,
all domain code is pure, tests are thorough, and the cascade trigger (claims → coaching) works
correctly. Five issues warrant attention: one HIGH (missing unmount cleanup in useCoachingNotes),
one HIGH (stale-closure eslint-disable-next-line), two MEDIUMs (essay text unbounded, notesByClaim
key lookup is case-sensitive), and several LOWs.

---

## Findings

### HIGH-1
File: src/app/(protected)/editor/use-coaching-notes.ts
Lines: all (missing useEffect return)
Issue: useCoachingNotes has no unmount cleanup. If the component unmounts during an in-flight request,
abortRef.current is never called — the fetch will resolve against a dead component, and the state
setters will fire into the void (harmless but wasteful). In contrast, useClaimDetector (line 87–91)
correctly returns a cleanup function from useEffect.
Fix: Add a cleanup useEffect:
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

---

### HIGH-2
File: src/app/(protected)/editor/[id]/essay-editor.tsx
Lines: 106–111
Issue: The coaching cascade useEffect suppresses the exhaustive-deps lint rule. The deps array is
[claimDetector.status, claimDetector.claims] but the body also reads isDraft, currentDoc, and
coaching.requestCoaching. The eslint-disable is intentional (to avoid re-triggering on every
keystroke), but isDraft is a primitive (boolean) and safe to include. If isDraft flips to false
(user publishes mid-session), the check inside the effect guards correctly, but the suppression
masks this. The real risk is currentDoc: extractEssayText(currentDoc) reads the *current* value of
the doc when claims arrive, which is the correct doc version since it's always up-to-date in state.
This is a legitimate intentional pattern, but the suppression comment should be more precise.
Suggestion: Replace the blanket suppression with a targeted comment explaining *why* coaching and
currentDoc are excluded — the claim text was already extracted when detection fired, so the doc
snapshot at coaching time is intentionally the current one, not the detection-time snapshot.

---

### MEDIUM-1
File: src/domain/coaching/schemas.ts and src/app/api/coaching/generate/route.ts
Lines: schemas.ts:20, route.ts:26
Issue: essayText is validated only with z.string().min(1) — there is no upper bound. A malicious
(or buggy) client could POST several hundred KB of text. The existing claim detection schema has the
same gap, so this is consistent, but the coaching route is new and an opportunity to close it.
Domain constraint: essays are capped at 800 words (~5 KB). A reasonable server-side max would be
z.string().min(1).max(10000) characters.
Suggestion: Add .max(10000) to both essayText fields in CoachingRequestApiSchema and
ClaimDetectRequestSchema, or validate against WORD_COUNT_LIMIT in the pipeline function.

---

### MEDIUM-2
File: src/app/(protected)/editor/[id]/assistant-panel.tsx
Lines: 480–488 (notesByClaim), 556
Issue: The notesByClaim Map is keyed on note.claimQuotedText (the exact string from the LLM), and
looked up by claim.quotedText (the exact string from the claim detector). These must match exactly
for notes to appear. The prompt instructs the model to copy verbatim, and validateCoachingResult
filters notes whose claimQuotedText doesn't match (case-insensitive normalization). However, the
passing of notes to ClaimView uses a case-sensitive Map lookup, so if the LLM returns
"global temperatures have risen" and the claim has "Global temperatures have risen", the note
silently disappears from the UI even though it passed the domain validation filter. The domain
filter normalizes for *filtering* but stores the original-case string — so the Map lookup can miss.
Suggestion: Either (a) normalize claimQuotedText in validateCoachingResult to match the original
claim's casing, or (b) build the notesByClaim Map with normalized keys and look up with
note.claimQuotedText.trim().toLowerCase(). Option (b) matches the dedup pattern already in place.

---

### LOW-1
File: src/infra/llm/fixture-coaching-adapter.ts
Lines: 30–33
Issue: The fixture adapter uses setTimeout(150ms) to simulate latency. This is fine for E2E, but
the delay is hardcoded with no comment explaining the intent. The fixture claim detection adapter
should be checked for consistency.
Suggestion: Extract to a constant (FIXTURE_LATENCY_MS = 150) or add a comment.

---

### LOW-2
File: src/domain/coaching/pipeline.ts
Lines: 10, 44–68 (MAX_COACHING_NOTES = 5)
Issue: The prompt says "Return 1-5 notes total" and the pipeline enforces MAX_COACHING_NOTES = 5.
These are in sync — good. However, prepareCoachingRequest does not enforce any max on the number
of claims sent to the LLM. If the claim detector surfaces 10 claims (MAX_CLAIMS = 10) and all are
sent to the coaching adapter, the prompt context grows. This isn't a bug but could be noted.
Suggestion: Consider capping claims sent to the coaching adapter at, say, 5 (the same as the
max notes), to keep the prompt focused and reduce token spend.

---

### LOW-3
File: src/app/(protected)/editor/[id]/assistant-panel.tsx
Lines: 239–246
Issue: CoachingNoteView keys are index-based (`note-${i}`). If notes are dismissed and the array
shrinks, React will reuse the same index for a different note, potentially causing stale animation
or keying bugs. Since CoachingNote objects don't have stable IDs, consider keying on
coachingNoteKey(note) (the normalized text+category string) instead.

---

### LOW-4
File: src/infra/llm/coaching-adapter.ts
Lines: 27
Issue: max_tokens is set to 1024. With up to 10 claims × 2-sentence notes ≈ ~500 tokens of output,
1024 is probably fine. The claim detection adapter uses 2048 — the comment there explains the
generous headroom. A brief comment here would help future readers understand the sizing rationale.

---

### LOW-5
File: src/app/(protected)/editor/use-coaching-notes.ts
Lines: 57–59
Issue: dismissedKeysRef is cleared on every successful requestCoaching call. This means if a user
dismisses a note and then the coaching refires with the same essay text, the note won't come back
(because lastCoachedTextRef guards against re-requesting). But if the essay text changes (which is
what triggers a new coaching run), dismissed notes from the prior session are cleared, which is the
intended behavior per the comment. This logic is correct, but it's subtle — a test covering this
scenario would be valuable.

---

## Positive Observations
- Domain purity is perfect: coaching.ts, port.ts, and pipeline.ts have no framework imports, no
  throw statements, no Date/Math.random/fetch/console calls. All return Result<T,E>.
- The cascade design (claims done → trigger coaching) is clean and correctly guarded with isDraft.
- validateCoachingResult provides meaningful defense-in-depth: it re-filters after the LLM responds,
  so even if the model hallucinates a claim reference, it is silently dropped.
- coachingNoteKey is exported and reused in the client hook for dismiss logic — consistent dedup key
  across layers.
- The fixture adapter's FIXTURE_RESULT uses the exact quotedTexts from the fixture claim adapter,
  so E2E tests will see populated coaching notes without any coordination risk.
- Route handler pattern is identical to the claims route: auth check, ownership check, LLM call,
  error reporting. Clean and predictable.
- Test coverage is solid: pipeline.test.ts covers all filter/dedup/cap edge cases. The contract test
  covers the full pipeline from raw LLM text to validated domain objects.
- TypeScript passes clean. Knip reports no dead exports.

## Questions
- Is there a plan to add an integration/E2E test verifying that coaching notes appear in the
  assistant panel after claim detection? The fixture adapter setup would support this.
- For the notesByClaim key mismatch (MEDIUM-2): was the intent to rely entirely on
  validateCoachingResult to guarantee exact string matches, making the Map lookup safe? If so, the
  domain filter should normalize claimQuotedText to the original claim's casing before returning.
