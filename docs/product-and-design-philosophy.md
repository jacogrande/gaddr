# Product & Design Philosophy

## 1) Purpose and north star

### 1.1 Mission

Help people become **better thinkers and writers** through consistent practice—by making it easier to draft, research, revise, and publish short arguments **without outsourcing authorship**.

### 1.2 North Star outcome

Users demonstrate **measurable writing + reasoning improvement** over time (not just more output). This aligns with product thinking that prioritizes **outcomes over outputs** in empowered product teams. ([Silicon Valley Product Group][1])

### 1.3 Product thesis

People don’t “buy writing.” They “hire” a product to make progress on a job-to-be-done: clarity, credibility, confidence, and habit. ([Christensen Institute][2])
Our product is hired when users want to:

- form a daily writing practice
- clarify their thinking under constraints
- strengthen arguments with evidence
- publish in a way that feels authentic and credible

---

## 2) The non-negotiables

### 2.1 The authorship rule (hard constraint)

**The assistant is not allowed to write any user prose.**
It may only provide:

- feedback (inline comments + issue list)
- questions (Socratic prompts)
- research (sources, quotes, evidence cards)
- argument analysis (claims, assumptions, counterclaims)
- checklists and “next actions”

**Why this is central:** the constraint creates differentiation and trust in a world where many writing assistants do composing/rewriting as a core feature. ([ICDST E-print Archive][3])

### 2.2 “Evidence over vibes”

We design for a culture where claims can be supported (or explicitly labeled as opinion). The UI must make attaching evidence easy and validating evidence relevance routine.

### 2.3 Respect users’ time and agency

We use habit mechanics to support learning—but we do not build addiction machines. We borrow from habit models while explicitly avoiding manipulative persuasive patterns and attention extraction. ([Nir and Far][4])

---

## 3) The product philosophy: a writing gym, not a writing machine

### 3.1 Practice > performance

Micro-essays are “reps,” not “final exams.” The system encourages:

- quick drafts
- frequent revision
- visible progress over weeks

This reflects the compounding nature of small daily habits. ([James Clear][5])

### 3.2 Coaching > generating

We intentionally position the LLM as:

- **coach** (diagnose issues, suggest actions)
- **sparring partner** (steelman opposing views)
- **research assistant** (source retrieval + evidence cards)

The system does not “fix” the essay. It **helps the user fix it**.

### 3.3 Constraints create craft

Creative constraints reduce friction and improve outcomes. We adopt “fixed time, variable scope” logic: decide the appetite first, then shape within it. ([Basecamp][6])
Examples:

- 10-minute sprint
- 300–600 word limit
- require 1 counterargument + response
- require 2 evidence cards

---

## 4) Product principles (what we optimize for)

### 4.1 Outcome-driven product development

We run the company like a learning system: build, measure, learn; validated learning matters. ([Goodreads][7])
Practical consequence: we won’t ship “cool features” unless they demonstrably improve:

- activation (first publish)
- weekly retention (return to write)
- revision rate (users apply feedback)
- argument quality behaviors (evidence + counterarguments)

### 4.2 Continuous discovery as a ritual

We maintain a tight loop between opportunities → solutions → experiments. Opportunity Solution Trees are the default tool for aligning discovery to outcomes. ([Product Talk][8])

### 4.3 Clarity is a product feature

If the user can’t understand what to do next, the product is broken. We take seriously the classic interaction design principles: discoverability, feedback, constraints, mapping, conceptual models. ([The BYU Design Review][9])

### 4.4 Usability isn’t optional

We adhere to broadly accepted usability heuristics (visibility of system status, user control, consistency, error prevention, recognition over recall, etc.). ([Nielsen Norman Group][10])

---

## 5) Experience design: the micro-essay loop

### 5.1 The core loop (the “rep”)

1. Choose prompt
2. Write thesis (1–2 sentences)
3. Draft micro-essay
4. Attach evidence cards (optional early, required by some tracks)
5. Run coach review → comments + rubric + questions
6. Revise → publish
7. Receive objections / peer feedback → revise again

We deliberately make revision a normal, celebrated part of the loop.

### 5.2 The 3 core screens (MVP)

- **Editor** (writing + comments + checklist)
- **Evidence Library** (research packets + evidence cards)
- **Publish Page** (readable essay + expandable evidence + objections)

### 5.3 “Design for the moment of doubt”

When users hesitate, we reduce friction using B=MAP (Behavior happens when Motivation, Ability, and Prompt converge). ([Fogg Behavior Model][11])

- If ability is low → simplify (templates, checklists, examples)
- If motivation is low → remind purpose (streak, identity, small wins)
- If prompt is missing → nudge (daily prompt, scheduled sprint)

---

## 6) The assistant interface: how we make “no ghostwriting” real

### 6.1 Output types (strict)

The assistant can return **only structured coaching artifacts**:

- Inline comment: _problem → why it matters → question(s) → suggested action(s)_
- Issue list: prioritized, tagged, severity levels
- Rubric: scores + reasons + next steps
- Argument map: thesis, claims, assumptions, counterclaims (structure only)
- Research packet: sources + quote snippets + caveats + “how this supports/complicates claim”

### 6.2 Anti-patterns we reject

- “Here’s a rewritten paragraph you can paste”
- “Here’s a better version of your essay”
- “I’ll draft the intro for you”
- any UI affordance that makes it easy to swap in AI-written prose

### 6.3 What “helpful” looks like (tone + pedagogy)

- Socratic and specific (“What do you mean by X?” “What evidence would change your mind?”)
- Not prescriptive: it points out issues and options, but the user chooses the voice and wording
- Always explain why an issue matters (teach the principle)

---

## 7) Research and evidence: design for credibility

### 7.1 Evidence cards (first-class objects)

Every evidence card contains:

- Source link + title
- Quote snippet (what supports the claim)
- Summary (in user’s words encouraged, assistant can propose)
- Caveats / limitations
- “Supports / complicates / contradicts” tag
- Suggested claim connections (user decides)

### 7.2 “Citation mismatch” is a core check

If a claim is not supported by the attached evidence, the system flags it. This builds reader trust and trains better reasoning habits.

---

## 8) Argumentation and critical thinking: make structure visible

### 8.1 Argument map view

We give users a structural lens:

- thesis
- claims
- evidence links
- assumptions
- counterarguments and responses

The goal is to reduce “invisible logic” and make revision targeted.

### 8.2 Steelman by default

A strong product norm: address the best opposing view, not the weakest. The assistant helps surface credible counterarguments and questions, but does not write the response.

---

## 9) Gamification: ethics-first, mastery-oriented

### 9.1 The model: habit loops without harm

We acknowledge common habit frameworks (trigger → action → reward → investment). ([Nir and Far][4])
But we also take seriously critiques of persuasive tech harms and design for “time well spent,” avoiding exploitative engagement mechanics. ([Center for Humane Technology][12])

### 9.2 What we reward (and what we don’t)

Reward **learning behaviors**:

- revising after feedback
- adding evidence
- addressing counterarguments
- clarity improvements (measured)

We do **not** reward:

- rage-bait engagement
- pure volume (word count)
- endless scrolling
- variable rewards that encourage compulsive checking

### 9.3 Game design principles

- Make progress legible (skill meters, “issues resolved,” streak integrity)
- Encourage short sprints and stopping points (healthy endings)
- Celebrate revision as mastery

---

## 10) Community and publishing: constructive disagreement as a feature

### 10.1 Objections, not pile-ons

We structure community interaction to be anchored and actionable:

- Objections attach to a specific claim
- Readers can propose what evidence would change their mind
- Authors earn credit for revising in response

### 10.2 Moderation philosophy

- Protect constructive discourse and the author’s dignity
- Reduce incentives for harassment
- Make reporting and enforcement transparent

---

## 11) Accessibility, inclusivity, and global readiness

### 11.1 Accessibility baseline

We follow established usability heuristics (consistency, error prevention, clear system feedback). ([Nielsen Norman Group][10])
Practical requirements:

- keyboard-first flows in editor/comments
- color contrast sufficient for issues states
- screen reader support for comment anchors
- “reduce motion” support for gamification UI

### 11.2 Inclusivity in coaching

The assistant should:

- ask for intended audience/tone
- avoid shaming language
- provide culturally neutral guidance when possible
- offer alternatives for neurodivergent writing workflows (checklists, smaller steps)

---

## 12) Measurement philosophy: learning is the product

### 12.1 Core metrics (aligned to outcomes)

- Activation: publish first micro-essay (24h / 7d)
- Retention: weekly active writers; streak continuation
- Improvement: rubric score deltas over time; issue-type resolution trends
- Integrity: evidence attachment rates; citation mismatch rate
- Community health: constructive objection rate; report rate

### 12.2 How we experiment

We run experiments to produce validated learning. ([Goodreads][7])
We use opportunity solution trees to keep experiments tied to outcomes. ([Product Talk][8])

---

## 13) Team operating model: how we build the product

### 13.1 Empowered product trio

We organize around empowered teams accountable for outcomes, not task output. ([Silicon Valley Product Group][1])
Default working unit: PM + Design + Engineering as a trio for discovery and delivery.

### 13.2 Shaping and appetites

We use shaping principles: set boundaries first, shape solutions to fit an appetite. ([Basecamp][13])
This keeps scope under control and encourages creative constraints.

### 13.3 Quality bar for shipping

- Every feature must reduce friction in the writing loop, increase clarity, or improve learning outcomes
- If a feature increases engagement but reduces user well-being or trust, it doesn’t ship

---

## 14) Design decisions that flow directly from the philosophy

### 14.1 The assistant uses comments, not edits

Because authorship is sacred, the UI centers:

- comment pins
- issue lists
- “resolve” flows
- revision tracking

### 14.2 “Evidence objects” are central

Because credibility is the goal, research isn’t a side panel—it’s a pillar:

- evidence library
- attach evidence to claims
- show evidence in the published reader view

### 14.3 Publishing is designed to reward revision

Because learning > performance, the publishing page supports:

- version history
- “what changed” reflection (optional)
- objections that prompt thoughtful updates

---

## 15) Appendix: The guiding heuristics we explicitly adopt

### A) Interaction design fundamentals

- Discoverability, signifiers, constraints, feedback, conceptual models ([The BYU Design Review][9])

### B) Usability heuristics

- Nielsen’s 10 heuristics (visibility of system status, user control, consistency, error prevention, recognition over recall, etc.) ([Nielsen Norman Group][10])

### C) Behavior & habit support (with ethical constraints)

- Fogg Behavior Model (Motivation + Ability + Prompt) ([Fogg Behavior Model][11])
- Hook model components (trigger, action, variable reward, investment) — used carefully ([Nir and Far][4])
- Humane tech perspective on persuasive technology harms ([Center for Humane Technology][12])
- Atomic Habits: compounding effect of daily habits and identity formation ([James Clear][5])

### D) Product discovery & strategy hygiene

- Opportunity Solution Trees as alignment mechanism ([Product Talk][8])
- Validated learning and build-measure-learn mindset ([Goodreads][7])
- Jobs-to-be-done framing (“hire” products to make progress) ([Christensen Institute][2])

---

If you want, I can turn this philosophy into **(1) a concrete design system spec** (components + interaction rules for comments/evidence/objections) and **(2) a “Coach Rubric v1”** with exact issue types, severity levels, and examples of compliant assistant comments (no prose, only prompts/actions).

[1]: https://www.svpg.com/empowered-product-teams/?utm_source=chatgpt.com "Empowered Product Teams"
[2]: https://www.christenseninstitute.org/theory/jobs-to-be-done/?utm_source=chatgpt.com "Jobs to Be Done Theory"
[3]: https://dl.icdst.org/pdfs/files4/4bb8d08a9b309df7d86e62ec4056ceef.pdf?utm_source=chatgpt.com "The Design of Everyday Things"
[4]: https://www.nirandfar.com/how-to-manufacture-desire/?utm_source=chatgpt.com "The Hooked Model: How to Manufacture Desire in 4 Steps"
[5]: https://jamesclear.com/quote/atomic-habits?utm_source=chatgpt.com "Atomic Habits quotes"
[6]: https://basecamp.com/shapeup/1.2-chapter-03?utm_source=chatgpt.com "Set Boundaries | Shape Up"
[7]: https://www.goodreads.com/quotes/7211891-validated-learning-is-the-process-of-demonstrating-empirically-that-a?utm_source=chatgpt.com "Quote by Eric Ries: “Validated learning is the process of ..."
[8]: https://www.producttalk.org/opportunity-solution-trees/?utm_source=chatgpt.com "Opportunity Solution Trees: Visualize Your Discovery to Stay ..."
[9]: https://www.designreview.byu.edu/collections/exploring-the-design-of-everyday-things?utm_source=chatgpt.com "Exploring “The Design of Everyday Things”"
[10]: https://www.nngroup.com/articles/ten-usability-heuristics/?utm_source=chatgpt.com "10 Usability Heuristics for User Interface Design"
[11]: https://www.behaviormodel.org/?utm_source=chatgpt.com "Fogg Behavior Model - BJ Fogg"
[12]: https://www.humanetech.com/youth/persuasive-technology?utm_source=chatgpt.com "Persuasive Technology"
[13]: https://basecamp.com/shapeup/1.1-chapter-02?utm_source=chatgpt.com "Principles of Shaping | Shape Up"
