# Golden freewrite corpus

The shared evaluation corpus for the spark and constellation quality lanes
(constellation plan §7 / §8 step 0.5; spark plan §7). Every offline quality
instrument reads from here: rubric scoring, first-attempt-yield measurement,
the lens/star diversity spread (the homogenization early warning), and
prompt-tune verification before any version ships.

## Provenance — read before trusting a result

**These drafts are synthetic.** Authored 2026-07-23 in freewrite register as a
bootstrap, because the corpus can never come from usage: the content posture
(constellation plan D11, `docs/infra.md` §7.4) keeps writer drafts off our
servers entirely, so there is no exhaust to mine — by design.

What synthetic drafts are valid for: yield and reject-reason measurement,
grounding-match behavior, lens/objection diversity spread, latency and cost
profiling, prompt A/Bs.

What they are weaker for: any judgment of the form *"do the stars match what
the writer would name?"* or *"does this land for the person who wrote it?"* —
there is no writer. Augment with **donated real freewrites** as they arrive:
explicit consent, PII stripped, added as ordinary corpus files with
`provenance: donated` in the frontmatter. Aim to retire synthetic anchors as
donated ones accumulate.

## Structure

One file per draft, frontmatter + body:

```
---
id: corpus-01
topic: ai-bubble-keynes
domain: economics
register: mixed        # fluent | mixed | fragmented
length: medium         # short (~90–160w) | medium (~250–420w) | long (~600–800w)
intent: testing        # dominant PositionIntent: asserting | testing | wondering
diversity_anchor: true # one of the four fixed topics for N-run spread checks
provenance: synthetic  # synthetic | donated
---
<the freewrite, verbatim — no headings, no cleanup>
```

## The four diversity anchors

Fixed topics for the N-runs-per-topic spread check ("3–4 fixed topics × N runs
— star/lens/objection spread"): `ai-bubble-keynes`, `craftsmanship-repair`,
`city-noise-quiet`, `attention-reading`. Do not rewrite the anchor drafts; the
check depends on the inputs staying fixed across time and prompt versions.

## Running it

`bun scripts/spark-smoke.ts --corpus` runs every draft through the live spark
stage once and prints per-draft yield plus the corpus-wide lens histogram.
Registers and lengths are deliberately spread — including four genuinely
fragmented drafts (the Journey C graceful-degradation cases) — so a yield
number from this corpus means something about real freewriting, not about
clean essays.
