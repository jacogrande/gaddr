# Real-Time Collaborative Writing Coach

## Concept

As the user writes, the LLM collaborates in real time — researching both sides of claims, providing inline coaching comments on weak arguments, and surfacing evidence proactively. This creates a true Socratic back-and-forth rather than a request-response cycle.

## Architecture: Three Concurrent Pipelines

### Pipeline 1: Claim Detector (cheap, fast)

- **Trigger**: Debounced on every paragraph change (2–3s after typing stops)
- **Model**: Haiku 4.5 ($1/$5 per MTok) — extremely cheap
- **Job**: Extract claims from the current paragraph. Output: `{ claims: [{ text, type, confidence }] }`
- **Cost**: ~$0.001 per call (small input/output)
- **Purpose**: Triage layer — only fires the expensive pipelines when a new claim is detected

### Pipeline 2: Background Research (Sonnet + web_search)

- **Trigger**: When Claim Detector finds a new factual/empirical claim with confidence > 0.7
- **Model**: Sonnet 4.5 ($3/$15 per MTok) with `web_search_20250305` tool
- **Job**: Research both sides of the claim. Find supporting and opposing evidence.
- **Output**: `source_suggestion` events with stance labels ("supporting" | "opposing" | "nuancing")
- **Cost**: ~$0.02–0.05 per research call (web search adds latency but not much token cost)
- **Latency**: 3–8 seconds (acceptable since it runs in background)

### Pipeline 3: Coaching Comments (Sonnet)

- **Trigger**: When Claim Detector finds a weak argument pattern OR every ~30s during active writing
- **Model**: Sonnet 4.5 with prompt caching (90% discount on cached system prompt + essay context)
- **Job**: Review the latest changes and provide inline coaching comments
- **Output**: `inline_comment` events anchored to specific text spans
- **Cost**: ~$0.01–0.03 per call with caching
- **Key patterns detected**: unsupported claims, logical fallacies, missing counterarguments, vague language, evidence-claim mismatches

## Cost Model

### Per-Call Costs

| Pipeline | Model | Input tokens | Output tokens | Cost/call |
|---|---|---|---|---|
| Claim Detector | Haiku 4.5 | ~500 | ~200 | $0.0015 |
| Background Research | Sonnet 4.5 | ~2,000 | ~1,000 | $0.021 |
| Coaching Comments | Sonnet 4.5 (cached) | ~2,000 (90% cached) | ~500 | $0.008 |

### Per-Session Estimates (20-minute writing session)

| Scenario | Claim detections | Research calls | Coaching calls | Total cost |
|---|---|---|---|---|
| Conservative | 10 | 2 | 3 | ~$0.10 |
| Moderate | 20 | 5 | 6 | ~$0.20 |
| Aggressive | 30 | 8 | 10 | ~$0.35 |

### Monthly Projections

| DAU | Sessions/day | Monthly cost | Per-user/month |
|---|---|---|---|
| 100 | 200 | $600–1,100 | $6–11 |
| 1,000 | 2,000 | $6,000–11,000 | $6–11 |
| 10,000 | 20,000 | $60,000–110,000 | $6–11 |

At $15/month pricing, margins are healthy at ~30–60% even with aggressive usage.

## Industry Patterns (Research Summary)

### Cursor (AI Code Editor)
- **Speculative pre-computation**: starts generating before user explicitly requests
- **Shadow workspace**: runs analysis in background, presents results when ready
- **Tab-to-accept**: low-friction acceptance of suggestions
- **Multi-model cascade**: fast model for autocomplete, powerful model for complex edits

### GitHub Copilot
- **Debouncing**: waits 300–500ms after typing stops before sending request
- **HTTP/2 cancellation**: cancels in-flight requests when user types again
- **Context window management**: sends surrounding code + file context, not just cursor position
- **Streaming**: shows suggestions character-by-character for perceived speed

### Grammarly
- **Defer during typing**: pauses analysis while user is actively typing
- **Sentence-level analysis**: processes complete sentences, not fragments
- **Category routing**: different models for grammar, tone, clarity, engagement
- **Inline annotations**: non-intrusive underlines with hover-to-expand

### Google Smart Compose
- **Confidence threshold**: only shows suggestions above a confidence score
- **User behavior learning**: adapts trigger sensitivity based on acceptance rate
- **Minimal UI**: single-line gray text, Tab to accept

### Notion AI
- **Task-category routing**: different pipelines for different task types
- **Background processing**: summarization/analysis runs without blocking the editor
- **Progressive disclosure**: shows "AI is thinking..." then reveals results

## How It Strengthens the Authorship Constraint

This architecture actually **reinforces** the coaching-not-ghostwriting rule:

1. **Comments, not rewrites**: All Pipeline 3 output is inline comments — coaching the writer to improve, never replacing their prose
2. **Evidence, not arguments**: Pipeline 2 provides raw sources, not pre-written paragraphs. The writer decides how to use them
3. **Socratic by default**: The claim detector identifies what the writer is arguing, then the coaching pipeline asks questions about it ("What evidence supports this claim?" "Have you considered the counterargument?")
4. **Writer retains agency**: Unlike autocomplete (which writes for you), this system responds to what you've already written

## Implementation Sketch

### New Domain Types

```typescript
// domain/realtime/claim.ts
type DetectedClaim = {
  text: string;
  type: "factual" | "causal" | "evaluative" | "definitional";
  confidence: number;
  paragraphIndex: number;
};

type ClaimDetectionResult = {
  claims: readonly DetectedClaim[];
  paragraphHash: string; // dedup
};

// domain/realtime/pipeline.ts
type PipelineDecision =
  | { action: "skip"; reason: string }
  | { action: "research"; claims: DetectedClaim[] }
  | { action: "coach"; context: string };
```

### New Infrastructure

```
src/infra/llm/
  claim-detector.ts      # Haiku-based claim extraction
  realtime-coach.ts      # Sonnet-based coaching with prompt caching
  # assistant-adapter.ts  # Already handles research via web_search
```

### Client-Side Hook

```typescript
// use-realtime-coach.ts
function useRealtimeCoach(essayId: string, content: string) {
  // Debounced claim detection (2s after typing stops)
  // Triggers research/coaching pipelines based on detector output
  // Manages multiple in-flight requests with AbortController
  // Returns: { comments: InlineComment[], sources: SourceSuggestion[], isAnalyzing: boolean }
}
```

### New API Routes

```
POST /api/realtime/detect-claims  → Haiku claim extraction
POST /api/realtime/coach          → Sonnet coaching comments
POST /api/assistant               → Already handles research (reuse)
```

## Phased Rollout

### Phase 1: Claim Detector Only
- Add debounced claim detection as user types
- Display detected claims in a sidebar (no LLM coaching yet)
- Validate the debouncing UX and claim extraction quality
- Cost: ~$0.015/session (just Haiku calls)

### Phase 2: Proactive Coaching Comments
- When claim detector fires, also run coaching pipeline
- Inline comments appear in the editor margin
- User can dismiss or act on comments
- Cost: ~$0.08/session

### Phase 3: Background Research
- When claim detector finds factual claims, trigger research
- Evidence cards appear in the evidence library automatically
- Writer can link them to their claims
- Cost: ~$0.20/session

### Phase 4: Cascade Optimization
- Cache essay context aggressively (prompt caching)
- Skip re-analysis of unchanged paragraphs
- Adjust trigger sensitivity based on user behavior
- Target: 30% cost reduction

## Risks and Open Questions

1. **Distraction**: Real-time comments might disrupt flow. Mitigation: "focus mode" that batches comments, configurable trigger sensitivity
2. **Cost at scale**: $6–11/user/month is viable at $15 pricing but tight. Prompt caching and cascade routing are essential
3. **Latency**: Research pipeline takes 3–8s. Acceptable for background, but coaching comments should feel <2s
4. **Claim detection quality**: Haiku may miss subtle claims or over-trigger. Need evaluation dataset
5. **Rate limiting**: Anthropic API rate limits could throttle aggressive usage. Need queuing/backoff strategy
6. **Prompt caching availability**: 90% savings assumes cache hits. Cold starts (new essays, prompt changes) are expensive
