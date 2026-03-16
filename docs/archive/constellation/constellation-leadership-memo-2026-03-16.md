# Constellation Leadership Memo

Date: 2026-03-16

Audience: product, design, and engineering leadership

## Summary

Constellation is a strong product idea with strategic value, but the current draft is not ready to represent the company’s quality bar.

The concept is differentiated: protect the user’s freewrite, then transition into a theme-first review surface that helps them inspect arguments, counterarguments, evidence gaps, and sources before revising. That is a credible, premium workflow.

The current implementation does not yet deliver that promise. It reads more like a generic node-canvas prototype than a trustworthy editorial product. The main risk is not visual roughness. It is credibility. The interface implies analytical confidence, provenance, and semantic precision that the current system does not actually support end to end.

## Why This Matters

Constellation is not a peripheral feature. It is potentially the clearest expression of what makes Gadfly distinct:

- protected composition instead of interruption-heavy AI writing
- theme-first critique instead of chat-first summarization
- revision guidance instead of ghostwriting

If this surface feels generic, speculative, or hard to trust, it weakens the broader product story. If it feels precise, grounded, and editorially useful, it can become a signature experience.

## Current Risks

### 1. Trust risk

The board currently presents polished thematic analysis while still relying heavily on mock themes and mock source structures. That creates a mismatch between what the UI implies and what the system actually knows.

### 2. Product posture risk

The current interaction model uses a draggable graph canvas with pan/zoom controls and minimap behavior. That makes the experience feel like a prototype whiteboard rather than a guided review workflow.

### 3. Workflow risk

Focus mode is currently an inspector, not a revision tool. Users can inspect theme content, but they cannot easily turn that inspection into action in the draft.

### 4. Perception risk

The visual language is too small, too uniform, and too quiet for a core product moment. It does not yet communicate editorial seriousness or high-trust AI assistance.

## Leadership Recommendation

Do not treat the current Constellation draft as a polish problem. Treat it as a product-definition problem that now needs a proper redesign pass before broader rollout.

The recommendation is to preserve the core concept and redesign the surface around four requirements:

1. Every visible insight must be traceable to real draft spans, real annotations, or real research artifacts.
2. The overview must prioritize revision decisions, not canvas exploration.
3. Theme focus must become a working revision state with direct draft handoff.
4. The visual system must feel like a premium editorial instrument, not a graph demo.

## Proposed Direction

Constellation should become a three-part workflow:

1. `Review ready`
After a sprint ends, the system signals that review is available without forcing a transition immediately.

2. `Overview`
The user sees the draft at the center, 4 to 6 high-signal themes around it, the top revision pressure clearly labeled, and compact evidence/counterargument status at a glance.

3. `Theme focus`
Selecting a theme opens a structured revision workspace that keeps the draft, the critique, and the provenance visible together.

## Near-Term Priorities

### Priority 1: fix credibility

- remove mock themes and mock sources from the visible product
- show confidence and provenance explicitly
- only render claims the system can explain

### Priority 2: fix product posture

- remove default dragging and minimap
- replace generic graph affordances with review-specific controls
- re-center the experience on “what should I revise next?”

### Priority 3: fix flow

- redesign focus mode as a revision workspace
- add node-to-draft anchor navigation
- preserve context when moving between review and draft

### Priority 4: raise the visual bar

- increase type scale and card density
- strengthen hierarchy for challenge, gap, question, and source states
- remove prototype-feeling UI chrome

## Decision Ask

Approve Constellation as a strategic workflow worth investing in, but reset the current draft from “prototype to polish” to “prototype to redesign.”

The right next move is not incremental styling. It is a focused redesign brief that aligns product, design, and engineering on:

- the final interaction model
- the trust model
- the revision workflow
- the visual posture expected of a company-facing flagship feature
