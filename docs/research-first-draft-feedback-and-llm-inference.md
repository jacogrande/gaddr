# First-Draft Feedback & Unique LLM Inference: A Research Report

**For:** gaddr — the freewrite → constellation review → final-draft platform
**Question:** What feedback is genuinely valuable on *first drafts* of essays, and what unique, high-value feedback can LLMs (as of July 2026) provide that would otherwise take a human editor a week or more?
**Date:** 2026-07-01
**Method:** Fan-out web research (5 angles, 26 sources fetched, 124 falsifiable claims extracted, 25 adversarially verified via 3-vote refutation; 2 claims killed). Every claim below carries a confidence tag. **[Verified 3-0]** means three independent skeptical reviewers failed to refute it against the primary source. **[Contextual]** means the source is real and quoted but the claim was not put through the adversarial gate in this pass — treat as directional, not load-bearing.

---

## TL;DR

1. **On a first draft, the feedback that matters is almost entirely *higher-order*** — thesis, argument, structure, evidence quality, and rhetorical fit — not surface copyediting. This is the settled consensus of composition research (Sommers 1980) and writing-center pedagogy (higher-order-concerns-before-lower-order-concerns), and it is corroborated by peer-review trials showing expert/statistical review most improves *methods, design, and clear reporting*, not polish. **[Verified 3-0]**

2. **Humans are demonstrably weak at exactly the labor-intensive checks that matter most.** In a 607-reviewer BMJ trial, reviewers caught only ~30% of deliberately inserted major errors; two reviewers on the same paper agree at only *r ≈ 0.34*; ~18% of statistical results are misreported and slip through; short training barely helps. The bottleneck is *exhaustive, consistent coverage* — precisely what a fatigued human can't sustain and a machine can. **[Verified 3-0]**

3. **The single week-plus task an LLM now compresses to seconds is systematic claim-to-evidence checking.** Two 2025–2026 results make this concrete: **RIGOURATE** (Jan 2026) turns "does the evidence actually support this claim, and how strongly?" into a *graded [0,1] over-claim score*, and **VeriFastScore** (EMNLP 2025) does single-pass claim decomposition + verification 6.6× faster and 39% cheaper on retrieval. **[Verified 3-0]**

4. **The sharpest opportunity is also the hardest open problem — and it is exactly gaddr's differentiator.** Checking that a citation *exists* is near-solved (structured, indexed, queryable). Checking that a real source *actually says what it's cited for* "remains far less tractable, and the gap between what verifiers can detect and what LLMs can produce is wide and probably widening." Commodity tools have not solved this. **[Verified 3-0]**

5. **The safest, best-supported product framing is LLM-as-questioner.** Static findings repurposed as *conversation starters that prompt reflection* map directly onto gaddr's "retrieve, structure, question, annotate — never ghostwrite" rule. **[Verified 3-0]**

---

# Part 1 — What expert humans critique on first drafts

## 1A. Composition professors & writing-center pedagogy

**The foundational finding: novices and experts mean different things by "revision."** Nancy Sommers' *Revision Strategies of Student Writers and Experienced Adult Writers* (College Composition and Communication 31:4, 1980, pp. 378–388) compared 20 freshmen against 20 experienced adult writers (editors, journalists, academics). Students conceived revision as **word-level substitution** — a thesaurus pass — while experienced writers revised **recursively, at the level of meaning and structure**, treating the draft as something to re-see rather than re-word. Sommers argued that dominant "linear" models of writing actively *reinforce* the students' impoverished, surface-bound conception. **[Verified 3-0]** — [ERIC EJ240356](https://eric.ed.gov/?id=EJ240356), [NCTE](https://publicationsncte.org/content/journals/10.58680/ccc198015930)

> **Product consequence:** the constellation review must *steer the writer toward the moves novices skip* — argument, structure, evidence — and resist becoming the copyedit pass novices instinctively gravitate to. If gaddr's review surfaces grammar first, it trains exactly the wrong revision reflex.

**Writing centers codified this into a triage order.** The **Higher-Order Concerns (HOC) before Lower-Order Concerns (LOC)** framework — traceable to Reigstad & McAndrew (1984) — is the operational spine of writing-center practice. Southwestern University's triage guide states it plainly: *"Higher order concerns typically involve larger, structural questions rather than stylistic, grammatical, or mechanical errors,"* and *"the most effective consultations begin with a focus on higher-level issues and then move on to lower-level concerns."* The four canonical HOC headings — **Thesis, Organization/Structure, Development/Evidence, Audience Awareness** — recur across UNC Charlotte, UTSA, UC Merced, Smith, SLCC, Colorado State, and Purdue OWL. **[Verified 3-0]** — [Southwestern](https://www.southwestern.edu/live/files/3233-higher-vs-lower-orderpdf)

**The single most automatable expert move: the reverse outline.** Reverse outlining reconstructs an outline *from* a finished draft — stripping away supporting prose to expose the paper's actual, as-written skeleton. UW–Madison's Writing Center defines it as a process *"whereby you take away all of the supporting writing and are left with a paper's main points or main ideas,"* yielding a *"bullet-point view of your paper's structure,"* and notes that *"experienced writers, especially when writing longer papers about a complex subject, need ways to test their drafts for the logical sequence of points."* Southwestern says asking a writer to reverse outline is *"always useful."* No source in an adversarial search disputed it. **[Verified 3-0]** — [UW–Madison](https://writing.wisc.edu/handbook/reverseoutlines/)

> **Product consequence:** reverse-outlining is a *structuring* task, not ghostwriting — and it's the clearest, most defensible thing the constellation view can do. Mapping "here is the argument your draft actually makes, paragraph by paragraph" lets the writer see gaps, non-sequiturs, and buried theses without a single sentence being rewritten for them.

**The pedagogy points at thinking, not correctness.** John Bean's *Engaging Ideas* (the standard faculty handbook for writing-across-the-curriculum) frames writing as a tool for critical thinking and inquiry, designing assignments around intellectual engagement rather than surface correctness — reinforcing that early-draft feedback should target *reasoning and argument*, the higher-order layer. **[Contextual]** — [Engaging Ideas](https://books.google.com/books/about/Engaging_Ideas.html?id=Xbgs9MvcsjsC)

## 1B. Academic peer reviewers & dissertation advisors

This literature is the most rigorously measured, and it delivers two complementary facts: **what review adds, and where it fails.**

**What expert review reliably adds is higher-order improvement — not polish.** Cobo et al. (2007, *PLoS ONE*), a prospective 2×2 factorial RCT at *Medicina Clínica*, found that adding a **statistical reviewer** improved reporting quality by **5.5 points on the Goodman Scale** (95% CI 4.3–6.7), with the largest gains in *quantitative methods* (ES 0.50), *clear reporting* (0.49), *study design* (0.41), and *multiple measures* (0.38). Mechanical **CONSORT/STARD checklists**, by contrast, produced a minimal, non-significant benefit. Separately, a before-after study of 446 manuscript–publication pairs (RIPR, 2019) found peer review increased *limitation-acknowledging* sentences by 1.39 on average (2.48 → 3.87, +56%); 31% of manuscripts that named zero limitations added at least one. **The value of expert review is in surfacing methods weaknesses and forcing self-acknowledged limits — questioning moves, not edits.** **[Verified 3-0]** — [Cobo et al.](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1824709/), [RIPR](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6745784/)

**Where human review fails is exhaustive, consistent error-detection.** Schroter et al. (2008, *J R Soc Med* 101(10):507–14) is a single-blind RCT of **607 BMJ reviewers** reviewing papers seeded with 9 major + 5 minor methodological errors. *"At baseline (Paper 1) reviewers found an average of 2.58 of the nine major errors"* — roughly **30%** — rising only to 2.71 and 3.0 on later papers. *"Short training packages have only a slight impact,"* with effects the authors called *"trivial"* and *"not worth the resources."* The 2023 Cochrane review (Willis et al., MR000056) confirms it: trained reviewers hit 3.25/9 vs 2.7/9 untrained. **[Verified 3-0]** — [Schroter et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC2586872/), [Cochrane](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.MR000056)

**And review is inconsistent.** Aczel et al., *The present and future of peer review* (PNAS, Feb 2025), reports the average correlation between two reviewers rating the same manuscript is *"just 0.34"* (Bornmann, Mutz & Daniel 2010 meta-analysis of ~48 studies), that *"major manuscript errors are often missed,"* and that *"18% of statistical results were found to be incorrectly reported"* (Bakker & Wicherts 2011; replicated by Nuijten et al. 2016). Jirschitzka et al. (2017, *Scientometrics*, 443 reviews) independently found inter-rater reliability *"rather poor,"* with no advantage for same-discipline reviewers. **[Verified 3-0]** — [PNAS](https://www.pnas.org/doi/10.1073/pnas.2401232121), [Scientometrics](https://link.springer.com/article/10.1007/s11192-017-2516-6)

> **Two claims were *refuted* in this pass and must not be asserted:** (1) that peer review does *not* reduce over-claiming (killed 1-2), and (2) — importantly — that reviewers *"focus on minor details rather than global assessment"* (killed 0-3). The supported story is that humans **miss errors and disagree with each other**, *not* that they fixate on trivia. Don't claim humans neglect the big picture; claim they can't cover it exhaustively or consistently.

## 1C. Newspaper, magazine & book editors

This thread is **[Contextual]** — the sources are real and quoted, but these claims did not pass the adversarial verification gate in this run. Treat as well-grounded craft knowledge, not verified fact, and re-source before using in anything load-bearing.

**Editing is a hierarchy, and early drafts belong to the top of it.** The trade distinguishes **developmental editing** (the idea, audience, overall structure, missing elements, idea-level inconsistencies), **line editing** (sentence/paragraph structure and meaning), and **copyediting** (grammar, spelling, consistency, some fact errors). Developmental editing is defined by *"diagnosing and fixing structural problems"* — the higher-order layer writers most need on a first draft (Scott Norton, *Developmental Editing*, Univ. of Chicago Press). **[Contextual]** — [Chicago](https://press.uchicago.edu/ucp/books/book/chicago/D/bo201563215.html), [Bernoff](https://bernoff.com/blog/how-a-developmental-edit-differs-from-a-copy-edit-or-line-edit-and-why-that-matters)

**Verification is the defining discipline, not an add-on.** Kovach & Rosenstiel's *The Elements of Journalism* holds that *"the discipline of verification is what separates journalism from entertainment, propaganda, fiction, or art."* **[Contextual]** — [Nieman Reports](https://niemanreports.org/the-essence-of-journalism-is-a-discipline-of-verifications/)

**The New Yorker method is the gold standard — and it is exactly the "does the source say this" check.** Checkers don't merely confirm names and dates; they *"take the piece apart claim-by-claim, and rebuild it against original sources,"* verifying the writer *read and represented each source accurately* — e.g., confirming that for a John McPhee piece, *"the USGS report that he read, he read correctly."* This is done manually, over days to weeks, by trained staff. **[Contextual]** — [Columbia Journalism Review](https://www.cjr.org/critical_eye/fact-checking_at_the_new_yorker.php)

> **This is the single most important bridge to Part 2.** The New Yorker's claim-by-claim source-representation check is precisely (a) the highest-integrity editorial move, (b) the one that takes a human a week, and (c) the one gaddr's constellation review aspires to automate. Part 2 shows it's also the hardest thing for an LLM to do well — which is what makes it defensible.

---

# Part 2 — Unique LLM feedback that's slow or impossible for humans

## The lineage: from atomic-fact scoring to graded over-claim detection

Modern claim-verification descends from a clean idea: **decompose a text into atomic claims, then check each against evidence.**

- **FActScore** (Min et al., 2023) splits a generation into context-independent atomic facts and scores the share supported by evidence; the atomic-fact method correlates with expert human annotation at *ρ ≈ 0.82*. **SAFE** and **LongFact** (DeepMind) extended this to long-form, using an LLM agent + search to adjudicate each fact. **[Contextual]** — [aman.ai primer](https://aman.ai/primers/ai/factuality-in-LLMs/)

- **RIGOURATE** (arXiv:2601.04350, Jan 2026) is the leap that matters for gaddr. It defines **"intra-paper overstatement detection"**: for each abstract/introduction claim, it retrieves the supporting text/figures/tables and assigns *"a continuous overstatement score in the range [0,1]"* — a **graded measure of over-claiming**, not a binary true/false. Its conclusion: *"claim-evidence alignment within a paper is a learnable and evaluable problem."* Even strong text-only models (DeepSeek-R1) are competitive because *"linguistic cues alone capture part of the signal."* This is the direct evidence that gaddr's core move — *map each claim to whether the draft's own evidence proportionally supports it* — is a real, scoreable ML task and an **annotation**, not ghostwriting. **[Verified 3-0]** — [RIGOURATE](https://arxiv.org/pdf/2601.04350)

- **VeriFastScore** (arXiv:2505.16973, EMNLP 2025 Findings) makes it *fast enough for interactive use*. A fine-tuned Llama-3.1-8B performs claim decomposition and verification in a **single pass**: *9.9× modeling speedup, 6.6× wall-clock speedup, 39% cheaper evidence retrieval.* But the authors document real failure modes: sentence-level (vs claim-specific) retrieval *"drops performance ~20%,"* the system gives *"no explicit rationales,"* and human eval found *"29% of examples had missed claims."* **[Verified 3-0]** — [VeriFastScore](https://arxiv.org/html/2505.16973v1), [ACL](https://aclanthology.org/2025.findings-emnlp.491)

> **Product consequence:** claim verification can run *off the keystroke path* affordably and at length — but the constellation review **must show provenance and rationale** (which the raw model omits) and **cannot be assumed to catch every claim**. This argues for human-in-the-loop *acceptance* of findings, never silent auto-annotation.

## The tractability asymmetry — gaddr's actual moat

The most strategically important finding in the entire report:

> *"Citation verification is among the easiest hallucination detection problems: the objects are discrete, the ground truth is well-defined for now, and the lookup infrastructure already exists. **The harder problem — detecting claims that misrepresent the content of real sources, or hallucinated assertions embedded in unstructured prose — remains far less tractable, and the gap between what verifiers can detect and what LLMs can produce is wide and probably widening.**"*
> — arXiv:2605.07723 (May 2026; authors incl. Paul Ginsparg, arXiv's founder; audited 111M references; covered by [Nature](https://www.nature.com/articles/d41586-026-01545-1)). **[Verified 3-0]** — [paper](https://arxiv.org/pdf/2605.07723)

Corroborating 2026 benchmarks show source-*support* accuracy collapsing under real-world complexity: **CiteAudit** reports GPT-5.2 F1 dropping **96% → 33%**; **DeepTRACE** finds citation accuracy in the **40–80%** range. So there are two very different tasks wearing the same name:

| Task | Tractability (2026) | Value on a first draft |
|---|---|---|
| Does this citation **exist**? | Near-solved — structured, indexed, queryable | Low–medium (catches fabrications) |
| Does the source **actually say** what it's cited for? | **Open problem, gap widening** | **Highest** (the New Yorker check) |

**gaddr's differentiator is the bottom-right cell.** It is simultaneously the most valuable editorial check and the one no commodity tool has solved — *provided* it ships with visible provenance and human confirmation, given the accuracy gap.

## Why this problem is worth solving now: the fabrication crisis

The demand side is exploding. The 111M-reference audit found a conservative **146,932 hallucinated (non-existent) citations in 2025 alone**, rising sharply after LLM adoption. Other 2026 work reports LLM-generated academic text containing **78–90% fabricated citations** in some settings, and **50+ citation hallucinations across 300 ICLR 2026 submissions**. **[Contextual, from primary preprints]** — [111M audit](https://arxiv.org/pdf/2605.07723), [ICLR fabrication figures](https://arxiv.org/html/2510.17853v4)

> **Product consequence:** the world is drowning in confidently-cited nonsense. A tool that reliably answers *"does your source actually support this?"* — on the writer's own draft, before it ships — is landing into a real and worsening need.

## The best-supported *shape* for the feedback: questioning, not answering

Kim, Laban, Chen & Arnold (arXiv:2504.08687, Apr 2025, cs.HC) propose that *"LLM-generated static feedback can be repurposed as conversation starters, allowing writers to seek clarification, request examples, and ask follow-up questions, thereby fostering deeper reflection on their writing."* This is an explicitly **questioning-oriented, non-ghostwriting** use of AI feedback — a near-exact match for gaddr's "retrieve, structure, question, annotate" rule and its constraint against replacing the writer's sentences. **[Verified 3-0]** — [paper](https://arxiv.org/pdf/2504.08687)

## The failure mode gaddr's constraint is designed against: homogenization

The strongest empirical warning about crossing into generation: co-writing argumentative essays with a **feedback-tuned model (InstructGPT)** produced a *statistically significant reduction in content diversity*, whereas co-writing with the **base GPT-3 did not*. The instruction-tuned model — the friendly, helpful one — is the one that flattens voice. **[Contextual]** — [Padmakumar & He, arXiv:2309.05196](https://arxiv.org/pdf/2309.05196)

> **Product consequence:** this is direct evidence *for* gaddr's core bet. The moment the AI writes prose, measured diversity of thought drops. Keeping AI on the retrieve/structure/question/annotate side of the line isn't just a brand promise — it's the empirically-supported way to avoid homogenizing the writer's voice. Other named failure modes — **sycophancy** and **hallucinated citations** — reinforce the same design: never let a finding auto-apply; always make the writer the one who accepts, rejects, or acts.

---

# Synthesis: the tractability × value map

The two parts converge on a single grid. The best features live where **high first-draft value** meets **LLM-automatable without ghostwriting**.

| Editor move | First-draft value | LLM-automatable? | Ghostwriting risk | gaddr verdict |
|---|---|---|---|---|
| **Reverse outline / argument-structure map** | High (HOC #1) | Yes — structuring | None | **Ship first.** Cheapest, safest, highest-legibility. |
| **Claim → evidence alignment / over-claim score** | High | Yes — RIGOURATE-style grading | Low (annotation) | **Core feature.** Show the score + the evidence span. |
| **"Does the source actually say this?"** | **Highest** | Hard but improving; the moat | Low (retrieval) | **Differentiator.** Ship with provenance + human accept. |
| **Citation-existence check** | Medium | Near-solved | None | **Table stakes.** Cheap safety net against fabrication. |
| **Surface omitted limitations / self-acknowledged weakness** | High (RIPR) | Yes — questioning | None | **Constellation "issues."** Frame as questions. |
| **Steelman strongest opposing sources** | High | Plausible; *unmeasured* (open question) | Medium if it drafts the counterargument | **Retrieve + summarize the source; let the writer author the rebuttal.** |
| **Consistency / contradiction detection across a long draft** | Medium–high | Yes — long-context | None | Good annotation candidate. |
| **Grammar / mechanics / style** | **Low on a first draft** | Trivially | N/A | **Keep OUT of the freewrite and constellation.** Save for the clean final surface, if at all. |

**The through-line:** every expert tradition studied — composition, peer review, journalism — prioritizes the *global* layer first and treats surface correctness as last. LLMs are strongest at exactly the exhaustive, consistent, retrieval-heavy version of that global work that humans do slowly and unreliably. The overlap is large, and it sits squarely inside gaddr's "no ghostwriting" line.

---

# Product implications for gaddr

1. **Order the constellation review like a writing-center consultation: HOC before LOC.** Lead with structure/argument/evidence findings; demote or omit surface notes. Surfacing grammar first trains the wrong revision reflex (Sommers). **[Verified 3-0]**

2. **Make the reverse outline a first-class, early artifact.** "Here is the argument your draft actually makes" is the cheapest high-value, zero-ghostwriting feature available and the most legible to a writer. **[Verified 3-0]**

3. **Build the claim → evidence layer as a *graded* annotation, not a verdict.** Follow RIGOURATE: attach an over-claim/support score *and the evidence span* to each load-bearing claim. Grading ("your evidence half-supports this") is more honest and more useful than a red/green stamp. **[Verified 3-0]**

4. **Treat "does the source actually say this" as the moat — and ship it defensively.** It's the highest-value citation check and an unsolved problem; the accuracy gap (CiteAudit 33%, DeepTRACE 40–80%) means it *must* show provenance and require human acceptance. Never auto-apply. **[Verified 3-0]**

5. **Frame findings as questions, not corrections.** The best-supported non-ghostwriting design is static findings → conversation starters that prompt the writer to reflect, clarify, and revise in their own words. This is also the annotation contract the product already commits to ("point, question, explain"). **[Verified 3-0]**

6. **Keep the AI's hands off prose — the homogenization evidence says the voice cost is real and measured.** The instruction-tuned, "helpful" model is the one that flattens diversity. gaddr's constraint is a feature, not a limitation. **[Contextual]**

7. **Everything stays off the keystroke path.** VeriFastScore shows claim-checking is now cheap enough to run asynchronously at length — which is exactly where gaddr's "typing latency is P0" rule wants it. **[Verified 3-0]**

---

# Caveats & limits of this research

- **Time-sensitivity.** The three core LLM-capability sources are recent preprints (RIGOURATE Jan 2026; VeriFastScore May 2025/EMNLP 2025; the citation-asymmetry paper May 2026). Capability figures move fast — re-check before any load-bearing decision.
- **Tractability ≠ solved reliability.** RIGOURATE's absolute agreement is only ~0.5 CCC; VeriFastScore's example-level correlation is r = 0.80 with ~29% claim omission; 2026 citation-support benchmarks land in the 33–80% range. These establish *direction and feasibility*, not production reliability. Provenance display + human acceptance are mandatory, not optional.
- **Domain-transfer risk.** The peer-review evidence (Schroter, Cobo, RIPR, PNAS, Scientometrics) is biomedical/statistical and, in one case, single-conference. Extending "what improves scientific manuscripts" to general essays and journalism is reasonable but not airtight. RIGOURATE/VeriFastScore were validated on scientific papers with structured methods sections; whether claim-to-evidence checking transfers to open-web-sourced general essays is an **open question**, not a settled result.
- **Part 1C (journalism) is under-verified.** Robust, adversarially-checked citations for lede/nut-graf structure, the New Yorker method, and developmental-vs-copy editing did *not* clear the verification gate here. They're quoted from real sources but marked **[Contextual]**; source them properly before publishing anything that leans on them.
- **Named failure modes are real but largely uncovered here.** Sycophancy, hallucinated citations, and voice homogenization are documented risks; only homogenization got a direct (contextual) citation in this pass.

## Claims that were *refuted* (kept for transparency)

- **"Peer review does not reduce over-claiming / increase hedging."** Killed 1-2. Do not assert.
- **"Reviewers focus on minor details rather than global assessment."** Killed 0-3. **Do not assert** — the evidence supports "humans miss errors and disagree," not "humans fixate on trivia."

## Open questions worth a follow-up pass

1. Does LLM claim-to-evidence verification (validated on structured scientific papers) transfer to **general essays and journalism**, where evidence is looser and sources are open-web?
2. What is the measured effect of **AI first-draft feedback vs instructor/human feedback** on revision quality and learning? The composition-classroom RCT evidence the brief asked for did not surface among verified claims — a real evidence gap.
3. How well can current systems **steelman the strongest opposing literature** and **surface the best source a writer missed** (literature-gap detection)? No verified benchmark quantified this — and it's a core gaddr feature currently flying blind.
4. What concrete guardrails (provenance requirements, acceptance gates, edit-distance limits) reliably keep questioning/annotation from sliding into ghostwriting or voice homogenization?

---

# Source list

**Confidence legend:** ✅ used in a **[Verified 3-0]** finding · ◐ **[Contextual]** (real, quoted, not adversarially gated this pass)

### Composition & writing-center pedagogy
- ✅ Sommers, *Revision Strategies of Student Writers and Experienced Adult Writers*, CCC 1980 — [ERIC EJ240356](https://eric.ed.gov/?id=EJ240356) · [NCTE](https://publicationsncte.org/content/journals/10.58680/ccc198015930) *(primary)*
- ✅ Southwestern University, *Writing Center Triage: Higher-Order vs Lower-Order Concerns* — [PDF](https://www.southwestern.edu/live/files/3233-higher-vs-lower-orderpdf) *(primary)*
- ✅ UW–Madison Writing Center, *Reverse Outlines* — [link](https://writing.wisc.edu/handbook/reverseoutlines/) *(primary)*
- ◐ SLCC Open English, *HOCs, LOCs, and MOCs* — [link](https://slcc.pressbooks.pub/openenglishatslcc/chapter/hocs-and-locs-and-even-some-mocs-using-order-of-concerns-to-draft-review-revise-be-graded-and-think/) *(secondary)*
- ◐ Bean, *Engaging Ideas* — [link](https://books.google.com/books/about/Engaging_Ideas.html?id=Xbgs9MvcsjsC) *(secondary)*

### Academic peer review
- ✅ Schroter et al. (2008), *What errors do peer reviewers detect…* J R Soc Med — [PMC2586872](https://pmc.ncbi.nlm.nih.gov/articles/PMC2586872/) · Cochrane [MR000056](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.MR000056) *(primary)*
- ✅ Aczel et al. (2025), *The present and future of peer review*, PNAS — [link](https://www.pnas.org/doi/10.1073/pnas.2401232121) *(primary)*
- ✅ Jirschitzka et al. (2017), *Scientometrics* — [link](https://link.springer.com/article/10.1007/s11192-017-2516-6) *(primary)*
- ✅ Cobo et al. (2007), statistical-reviewer RCT, PLoS ONE — [PMC1824709](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1824709/) *(primary)*
- ✅ RIPR before-after limitations study (2019) — [PMC6745784](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6745784/) *(primary)*

### Journalism & developmental editing *(contextual — verify before load-bearing use)*
- ◐ *Fact-checking at The New Yorker*, Columbia Journalism Review — [link](https://www.cjr.org/critical_eye/fact-checking_at_the_new_yorker.php)
- ◐ Kovach & Rosenstiel, *The Elements of Journalism* (via Nieman Reports) — [link](https://niemanreports.org/the-essence-of-journalism-is-a-discipline-of-verifications/)
- ◐ Scott Norton, *Developmental Editing*, Univ. of Chicago Press — [link](https://press.uchicago.edu/ucp/books/book/chicago/D/bo201563215.html)
- ◐ Bernoff, *How a developmental edit differs from a copy edit or line edit* — [link](https://bernoff.com/blog/how-a-developmental-edit-differs-from-a-copy-edit-or-line-edit-and-why-that-matters) *(blog)*

### LLM claim-verification, citation-grounding & failure modes
- ✅ RIGOURATE (Jan 2026), intra-paper overstatement detection — [arXiv:2601.04350](https://arxiv.org/pdf/2601.04350) *(primary)*
- ✅ VeriFastScore (EMNLP 2025) — [arXiv:2505.16973](https://arxiv.org/html/2505.16973v1) · [ACL](https://aclanthology.org/2025.findings-emnlp.491) *(primary)*
- ✅ *LLM hallucinations in the wild* (May 2026; Ginsparg et al.; 111M-reference audit) — [arXiv:2605.07723](https://arxiv.org/pdf/2605.07723) · [Nature coverage](https://www.nature.com/articles/d41586-026-01545-1) *(primary)*
- ✅ Kim, Laban, Chen & Arnold (Apr 2025), feedback-as-conversation-starters — [arXiv:2504.08687](https://arxiv.org/pdf/2504.08687) *(primary)*
- ◐ Padmakumar & He, *Does writing with language models reduce content diversity?* — [arXiv:2309.05196](https://arxiv.org/pdf/2309.05196) *(primary)*
- ◐ aman.ai, *Factuality in LLMs — FActScore, SAFE, LongFact* (survey primer) — [link](https://aman.ai/primers/ai/factuality-in-LLMs/) *(blog)*
- ◐ 2026 citation-support benchmarks (CiteAudit / DeepTRACE / ICLR fabrication figures) — [arXiv:2510.17853](https://arxiv.org/html/2510.17853v4) · [arXiv:2602.21045](https://arxiv.org/html/2602.21045v1) *(primary)*

### AI-feedback efficacy in the classroom
- ◐ *Formative feedback across sources: instructor, peer, and AI-generated feedback*, Reading and Writing (2026) — [link](https://link.springer.com/article/10.1007/s11145-026-10761-0) *(primary; not among verified claims — see open question #2)*

---

*Report generated via gaddr's deep-research harness: 5 search angles → 26 sources → 124 extracted claims → 25 adversarially verified (23 confirmed, 2 refuted). Verified findings survived three independent skeptical reviewers each. Contextual claims are real and quoted but did not pass that gate in this pass — re-verify before treating as load-bearing.*
