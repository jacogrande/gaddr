# Constellation Map — Design Research & Content-Separation Recommendations

A survey of prior art and a recommendation for how gaddr's constellation review should visually and structurally separate its four content types: rational critique, steelman support + evidence, counterargument + evidence, and style improvements.

This is research grounded in working tools, not a mockup. The goal is to give the build an informed design target instead of freestyling from scratch.

## 1. What the constellation actually has to carry

Per `docs/product-and-design-philosophy.md` and `docs/architecture.md`, the constellation must present:

1. **Rational critique** — premise A doesn't entail conclusion B, questionable warrant, equivocation, unsupported leap.
2. **Steelman support** — source-backed evidence and citations that strengthen the writer's claim, including the strongest reasonable version of the writer's own argument.
3. **Counterargument** — steelmanned opposing positions, ideally with their own citations.
4. **Style / language improvement** — heuristic writing feedback (clarity, voice, tightening).

And overlaid on all four, three orthogonal attributes the domain already insists on:

- **Source-backed vs. model-inferred vs. heuristic** (see architecture §6.5)
- **Confidence / severity**
- **Anchor: which claim or passage in the draft triggered this finding**

That is effectively a 4 × 3 × anchor matrix on every node. Any design that tries to flatten all those signals onto a single visual channel (e.g. just color) will fail. The research below converges on a small number of battle-tested separation strategies.

## 2. Prior art: what has been built and what we can steal

### 2.1 Argument-mapping tools

The closest relatives to what gaddr is trying to do.

- **Kialo / Kialo Edu** — the most widely adopted argument-map system today. Nests pro/con branches under a thesis. Uses two dominant colors (green for pro, red for con), but critically also uses *position* (pro on one side, con on the other) and *nesting depth* to encode structure. Color alone would be insufficient; it's reinforced by layout and text. ([Kialo Edu research page](https://www.kialo-edu.com/research))
- **Rationale** — pedagogically oriented, treats an argument as a tree: claim → reasons → objections → rebuttals to objections. Each level of the tree has a distinct indent and icon. Fits the Toulmin framing tightly. ([Pressbooks chapter on Rationale](https://ecampusontario.pressbooks.pub/criticalthinking1234/chapter/introduction/))
- **Debategraph** — web-based collaborative idea visualization, used by policy bodies. Proves that dense argumentation *can* be graph-first if node-types are typographically distinct and the graph supports multiple views (tree, map, outline). ([Argument map — Wikipedia](https://en.wikipedia.org/wiki/Argument_map))
- **IBIS / Compendium / dialogue mapping** — the canonical three-element grammar: **Issue (question), Idea/Position (proposal), Argument (pro or con)**. Compendium represents each type as a *distinctly shaped icon*: question mark, lightbulb, plus/minus. This is the most important design finding in the whole literature: **shape carries type, color carries stance**. ([IBIS — Wikipedia](https://en.wikipedia.org/wiki/Issue-based_information_system), [Compendium — Wikipedia](https://en.wikipedia.org/wiki/Compendium_(software)))

Key takeaway: every serious argument-mapping tool encodes type redundantly across at least two visual channels (shape + color, or icon + position). None rely on color alone.

### 2.2 Toulmin model — the canonical frame for rational critique

Toulmin decomposes an argument into **Claim, Grounds (data), Warrant, Backing, Qualifier, Rebuttal**. ([Purdue OWL — Toulmin Argument](https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html), [UWSP Toulmin diagram](https://www3.uwsp.edu/cols-ap/wact/Documents/WACT%20Conference%202010/Davidson%20Toulmin%20Diagram.pdf))

Most argument-mapping tools inherit Toulmin's grammar even when they don't name it. The practical implication for gaddr: our "rational critique" bucket is not one thing — it's a set of sub-types:

- missing / weak **grounds** (unsupported claim)
- broken **warrant** (premise A doesn't get you to B)
- missing **qualifier** (overstated claim)
- unaddressed **rebuttal** (obvious counterexample not considered)

These aren't just different severities. They're structurally different failures. A good UI should let the reader see which *kind* of reasoning failure a critique is. This is the single biggest missing signal in most AI-writing-feedback tools on the market today.

### 2.3 Knowledge-graph PKM (Obsidian, Roam, Logseq)

Not directly an argument tool, but the graph-view conventions are worth borrowing.

- Obsidian uses **node color to encode tag/category** and **node size to encode degree** (how connected it is). It also supports group filters — you can toggle whole categories on/off. ([Obsidian vs Logseq etc — Nodus Labs](https://support.noduslabs.com/hc/en-us/articles/6490899641234-Obsidian-vs-Roam-Research-vs-LogSeq-vs-RemNote))
- Roam encodes references at *block level*, not page level, so the graph shows fine-grained connections. The lesson is not to go that deep — it's that anchoring finding-level precision (this sentence, this claim) matters more than finding-level breadth (this paragraph, this section).
- All three tools suffer from "hairball" problems once the graph gets big. Gaddr's advantage is that each constellation run has a bounded set of findings (maybe 10–40), so the hairball failure mode is avoidable — but only if layout is deterministic and semantic, not force-directed.

### 2.4 Spatial canvas tools (Heptabase, Scrintal, Kosmik, Muse)

These are the closest aesthetic cousins to gaddr's always-on canvas. Shared conventions:

- **Cards, not nodes.** Each idea is a first-class rectangular card with a title, body, and sometimes a source. Much more information-dense than a graph node.
- **Arrows are meaningful but sparse.** Heptabase is criticized for "meaningless arrows you have to drag yourself"; Scrintal uses fewer, typed connections. ([Kosmik blog — Heptabase alternatives](https://www.kosmik.app/blog/heptabase-alternatives), [Scrintal — Heptabase alternative](https://scrintal.com/comparisons/heptabase-alternative))
- **Zoom is narrative.** Heptabase in particular uses zoom-in to enter a detail view and zoom-out to see the constellation of cards around it.

Takeaway: findings should be cards with real metadata visible, not just dots on a graph. Edges should be rare and typed (support / challenge / anchor) — not decorative.

### 2.5 Annotation-style peer review (Hypothesis, PubPeer)

Opposite of the spatial canvas: findings live *inline* in the margin of the text, anchored to the exact span. ([Hypothesis — transparent peer review](https://web.hypothes.is/blog/transparent-peer-review/), [Eos — annotation tool for peer review](https://eos.org/editors-vox/annotation-tool-facilitates-peer-review))

- Hypothesis organizes annotations by reviewer, editor, author, and importance — i.e. **facet filtering**, not spatial layout.
- PubPeer orders comments chronologically with embedded links. Flat, but trustworthy.
- GitHub PR review adds **batched reviews with an overall verdict** (APPROVE / REQUEST_CHANGES / COMMENT) and **resolvable threads**. ([GitHub — about pull request reviews](https://docs.github.com/articles/about-pull-request-reviews))

The interesting design tension: the constellation is a spatial, overview-first view of the critique, but the writer's mental model of their own draft is *linear*. Any final design needs to bridge these two — offering a spatial overview and a way to see the same findings laid out along the document.

### 2.6 Inline writing critique (Grammarly, ProWritingAid)

The industry standard for showing style/language issues on live text. ([ProWritingAid vs Grammarly comparison](https://prowritingaid.com/prowritingaid-vs-grammarly))

- Both underline issues *in the prose* with color-coded underlines and surface suggestions in a sidebar.
- Grammarly groups by category (correctness, clarity, engagement, delivery) — a four-bucket model very similar to what gaddr needs.
- ProWritingAid is explicitly praised for richer analysis but criticized for a cluttered sidebar that hides suggestions behind a tiny arrow. The lesson: **don't hide suggestions behind affordances smaller than 24×24**.

Style improvements should probably live on the text, not on the canvas — the constellation is for arguments and evidence, which are fundamentally structural, whereas style lives at the sentence.

### 2.7 Steelman-style rationality tools

Newer category. ([Steelman — Dylan Martin](https://dylanamartin.com/2026/03/11/announcing-steelman.html), [Steel Man technique for AI](https://aiadvisoryboards.wordpress.com/2025/03/16/the-steel-man-technique-and-ai-a-powerful-tool-for-critical-thinking-in-the-classroom/))

- Steelman (dylanamartin.com) decomposes arguments into individual empirical claims and value judgments, then runs adversarial personas at the weakest claims across multiple rounds, each round producing the strongest possible counterargument. The output is a **Decision Record** — a structured artifact, not a chat log.
- The core insight: modern AI chats default to sycophancy; the right role for AI in reasoning is to force the user to do the thinking better. That framing is the closest match to gaddr's product philosophy of any tool surveyed.

### 2.8 Confidence / uncertainty visualization

Research from data-viz and AI-UI work. ([Frontiers — trusting AI and uncertainty](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1464348/full), [Confidence UI pattern — Medium](https://medium.com/@Modexa/the-confidence-ui-pattern-that-users-actually-trust-ff27e1a8a956), [Agentic Design — confidence visualization](https://agentic-design.ai/patterns/ui-ux-patterns/confidence-visualization-patterns))

Patterns that work:
- **Size-based confidence** — higher-confidence findings render larger. Shown in trials to produce the strongest decision-perception effect.
- **Opacity / saturation** — lower-confidence findings fade toward the background.
- **Textual modifiers** — "likely", "uncertain", "well-supported" rendered in the card itself.
- **Dot plots / quantile dots** for explicit ranges.

Pitfall: hiding uncertainty undermines trust. Writers will lose faith if the system presents a weak citation with the same visual weight as a peer-reviewed study.

### 2.9 Semantic zoom and progressive disclosure

([Semantic zoom — Wikipedia on ZUIs](https://en.wikipedia.org/wiki/Zooming_user_interface), [Semantic zoom and mini-maps — arXiv 2510.00003](https://arxiv.org/html/2510.00003v1), [Zoom interfaces — Christopher Noessel](https://christophernoessel.medium.com/zoom-interfaces-a0b109639f05))

- **Semantic zoom** changes *what* is shown at each zoom level, not just how large. At low zoom, nodes collapse to icons; at mid zoom, to title + type; at high zoom, to full cards with excerpts.
- **Focus+context** techniques (fisheye, scaled lens) let the user magnify one node while keeping the surroundings visible. Relevant for "I want to read this citation in detail without losing the rest of the constellation."

The canvas-zoom-ux-improvements brainstorm already proposes tiered zoom (items #15, #17, #18, #19); that's aligned with the research and should be treated as a core architectural choice, not a polish item.

### 2.10 Affinity mapping (Miro, FigJam)

([Miro — affinity diagram](https://miro.com/brainstorming/affinity-diagram/), [Figma — affinity diagram](https://www.figma.com/templates/affinity-diagram-example/))

The standard move: sticky notes + spatial clustering + colored headers for cluster names. Miro and Figma both support auto-clustering by color, tag, sentiment, or AI-derived theme.

What this tells us about the constellation: clusters (by claim, by type, by severity) are a first-class organizing concept, not a nice-to-have. And cluster *headers* should be explicit — a halo, a bounding region, or a label — not left implicit for the reader to infer.

### 2.11 Bret Victor — explorable explanations

([Explorable Explanations — Bret Victor](https://worrydream.com/ExplorableExplanations/), [Awesome Explorables — GitHub](https://github.com/blob42/awesome-explorables))

Not a UI pattern so much as an ethic: readers should be able to poke at the reasoning, change an assumption, see the consequences. Translated to gaddr: the constellation should feel *inspectable*, not oracular. If a finding says "this premise doesn't support this conclusion," the user should be able to hover or click to see *why the system thinks that*, with the excerpt and the reasoning chain surfaced.

## 3. The five content-separation strategies

Distilled from the tools above. These are compositional — real products use 2–3 of them together.

| # | Strategy | How it works | Encodes | Best for | Risk if used alone |
|---|---|---|---|---|---|
| 1 | **Type-as-shape** | Each content type gets a distinct card silhouette / icon (IBIS, Compendium) | Type | Rational critique vs citation vs counterargument vs style | Reads noisy if shapes fight each other |
| 2 | **Type-as-color** | Warm/cool/warm-red palette per type (Kialo, Grammarly) | Type, stance | Pro vs con, severity | Inaccessible for colorblind users; overwhelms warm parchment palette |
| 3 | **Type-as-zone** | Spatial regions or concentric rings (proposed in brainstorm #13) | Type, relatedness | Giving each content type its own neighborhood | Rigid; fails when findings are unevenly distributed |
| 4 | **Type-as-lens / filter** | Toggle visibility by type (Obsidian group filters, Miro cluster view) | Type, user focus | Reducing visual load, comparing views | Hides information; user must know to toggle |
| 5 | **Type-as-panel / tab** | Each type lives on its own page or tab (Grammarly categories) | Type | Deep review of one type at a time | Loses the spatial "surrounding pressure" metaphor |

The current constellation brainstorm (doc #19) already proposes Strategy 1. The recommendation below combines Strategies 1, 2, 3, and 4.

## 4. Recommended separation model for gaddr

### 4.1 Map the four content types to a clear visual grammar

Given the warm-parchment aesthetic and the "surrounding pressure" metaphor in the docs, here is a concrete mapping. Every type gets **three** reinforcing signals: shape, color family, and spatial zone. This is the IBIS lesson and it is non-negotiable.

| Content type | Shape | Color family | Zone | Iconography |
|---|---|---|---|---|
| **Rational critique** (Toulmin issue) | Tag / chevron (asymmetric — signals "incomplete") | Muted warm red / rust | Scattered along the specific claim anchor | Question mark or caret |
| **Steelman support + citation** | Horizontal card with a source strip | Warm gold / amber | Inner ring around the draft | Book / quote glyph |
| **Counterargument + citation** | Horizontal card with a source strip, mirrored silhouette | Deep ink / oxblood | Outer ring, opposite the supports | Counterweight glyph or opposing arrow |
| **Style / language** | No canvas node at all | Neutral / graphite | *Inline* on the draft text, not on the canvas | Underline (thin) |

Why style lives on the text and not on the canvas: style critique is sentence-level, plentiful, and low-signal at the structural zoom of a constellation. Putting 30 style notes on the canvas drowns the five or six important argument findings. Grammarly/ProWritingAid convention holds here.

### 4.2 Sub-classification within a type

Every card on the canvas carries an **evidence tier strip** — a short visual band indicating whether the content is:

- **Source-backed** (real citation, provenance intact) — solid strip
- **Model-inferred** (LLM reasoning without a citation) — hatched / diagonal strip
- **Heuristic** (rule-based style or structure feedback) — empty strip

This maps directly to the domain invariant in architecture §6.5. The writer should never wonder whether a finding came from a study or from a language model guess.

Confidence is encoded by **card size + opacity**, not a separate badge. High-confidence findings are larger and fully opaque; low-confidence findings are smaller and ~70% opacity. The numeric confidence is available on hover but not on the card itself — numbers don't mean anything to a writer mid-review.

### 4.3 Anchoring to the draft

Every finding has an anchor back to the claim or passage it came from. Three techniques, used together:

1. **Claim anchor strips on the draft card edge** (brainstorm #17) — thin colored strips along the draft card's vertical edge mark where each claim lives in the document. Strip color matches the type of finding connected to that claim.
2. **Typed edges**, only from cards to the draft card — never card-to-card. The constellation isn't a debate between findings; each finding is a separate instrument pointing at the draft. Keep the graph a hub-and-spoke, not a web.
3. **Excerpt on hover** — hovering a finding dims everything else and pulls the anchored sentence out of the draft card into the finding card's context. The Hypothesis inline-anchor pattern done spatially.

### 4.4 Semantic zoom tiers

Three tiers, following the brainstorm's Progressive Disclosure proposal (#18):

| Zoom | What the draft card shows | What findings show | Primary use |
|---|---|---|---|
| **0.1–0.3** (overview) | Rectangle with edge anchors colored by cluster pressure | Colored dots, type only | Pattern recognition — "where is the draft under most pressure?" |
| **0.3–0.6** (scan) | Paragraph density bars + heading positions | Icon + title + evidence-tier strip | Triage — which findings to open |
| **0.6–1.0** (review) | Full readable text | Full card with summary, citation, severity | Deep review of individual findings |

At zoom < 0.3, the brainstorm's pressure-gradient idea (#21) becomes the primary signal — the draft card literally "heats up" where critique is dense. This is the moment the product earns its "constellation" name.

### 4.5 Filters / lenses

A small filter bar (top-right or top-center, accessible via a hotkey) with four toggles matching the content types, plus a fifth for evidence tier (source-backed only). The default state shows everything; the filters let the writer say "just show me the rational critiques" or "just source-backed findings." Miro's Cluster-by pattern. Essential for a second or third read-through.

### 4.6 Keyboard navigation

Non-negotiable per the brainstorm (#22) and feedback memory.
- `Tab` / `Shift+Tab` walks findings in *document order*, not spatial order. Writers think linearly about their drafts.
- `1` / `2` / `3` / `4` filters to one content type.
- `Enter` opens the focused finding's detail panel. `Escape` closes it.
- `Cmd+.` toggles back to writing (brainstorm #5).

## 5. What to avoid

Mistakes from the surveyed tools that will land hard in gaddr's context.

- **Symmetric visual weight on every finding** — the reason the 2026-03-11 audit flagged the original constellation. Differentiation isn't polish; it's what makes the view readable at a glance.
- **Color-only encoding of type** — fails for 8% of men and reads badly on warm parchment where red/orange already live. Shape must carry it too.
- **Force-directed layout** — looks beautiful in a demo, becomes a hairball the moment findings share claims. Use deterministic semantic layout (ring / zone / anchor-based).
- **Card-to-card edges** — turn the constellation into an opaque argument about the argument. Keep edges draft-centric.
- **Hiding provenance behind "details" buttons** — provenance is trust. Source name + evidence tier must be visible on every source-backed card at scan zoom (tier 2).
- **Chat-style sidebar** — the whole point of the constellation is that it is *not* a chat. Any "ask follow-up" surface should be tucked into a finding detail panel, not the global chrome.
- **Ghostwriting-adjacent language** — "rewrite suggestion" or "polish this paragraph" cards on the canvas violate the no-ghostwriting invariant. Style feedback should underline and question, not propose replacement prose.
- **One-shot assembly** — research and the brainstorm (#23) both point to staged reveal: supports first, counterarguments second, issues third. All-at-once is a data dump.

## 6. First-pass build recipe

If you want a single paragraph that translates the above into a build order:

Start with the draft card at the center of the React Flow canvas. Lay findings in two concentric rings — supports (warm gold) inside, counterarguments (deep ink) outside — with rational-critique tags (muted rust) scattered along the claim anchor strips on the draft card's edge. Keep style feedback off the canvas entirely; render it as subtle underlines on the draft when the writer returns to the editor. Every card is a real card with shape, icon, color, evidence-tier strip, and size-encoded confidence — no single signal is asked to carry more than one meaning. Edges go from findings to the draft only. Three zoom tiers: overview (pressure heatmap), scan (icon + title), review (full card). Filter bar with four type toggles plus a source-backed-only switch. Staged assembly on first reveal: supports, then counters, then issues. Full keyboard navigation in document order.

## 7. Open questions worth resolving before the Sprint 2 domain pass

1. **How many findings is "too many"?** The upper bound shapes layout. If a draft can produce 50 findings, ring layout breaks. If it's capped at ~20, rings are fine. Recommend a hard cap (or ranking) in the domain layer.
2. **Is there a shared "section" concept between draft and findings?** Anchor strips only work if the domain has a stable way to map a finding to a position in the draft.
3. **Do we need per-finding threads?** (Counter-counterarguments, user replies.) If yes, the flat hub-and-spoke breaks down and we need GitHub-style resolvable threads. If no, keep it flat.
4. **Where does the "accept / ignore / defer" action live** — on the card face, on hover, or only in the detail panel? This is the hinge between constellation and annotation pass and deserves its own call.
5. **Is a mini-map worth shipping v1?** (Brainstorm #20.) Low complexity, but only earns its keep once the constellation exceeds the viewport.

---

## Sources

- [Argument map — Wikipedia](https://en.wikipedia.org/wiki/Argument_map)
- [Kialo Edu research — argument mapping and critical thinking](https://www.kialo-edu.com/research)
- [How argument mapping trains critical thinking — Kialo Edu blog](https://blog.kialo-edu.com/critical-thinking/how-argument-mapping-trains-critical-thinking-on-kialo-edu/)
- [Using Computer-Aided Argument Mapping to Teach Reasoning](https://ecampusontario.pressbooks.pub/criticalthinking1234/chapter/introduction/)
- [FigJam Argument Mapping template](https://www.figma.com/templates/argument-mapping/)
- [Understanding Failures and Potentials of Argumentation Tools — ACM](https://dl.acm.org/doi/10.1145/3461564.3461584)
- [Issue-based information system — Wikipedia](https://en.wikipedia.org/wiki/Issue-based_information_system)
- [Compendium (software) — Wikipedia](https://en.wikipedia.org/wiki/Compendium_(software))
- [IBIS and dialogue mapping — buckleyPLANET](https://buckleyplanet.com/2022/02/ibis-and-dialogue-mapping/)
- [IBIS, dialogue mapping, and collaborative knowledge creation — Eight to Late](https://eight2late.com/2009/07/23/ibis-dialogue-mapping-and-the-art-of-collaborative-knowledge-creation/)
- [What is Dialogue Mapping? — Lucidchart](https://www.lucidchart.com/blog/what-is-dialogue-mapping)
- [Toulmin Argument — Purdue OWL](https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html)
- [Toulmin Argument Model — Writing Arguments in STEM](https://pressbooks.calstate.edu/writingargumentsinstem/chapter/toulmin-argument-model/)
- [Toulmin diagram overview — UWSP](https://www3.uwsp.edu/cols-ap/wact/Documents/WACT%20Conference%202010/Davidson%20Toulmin%20Diagram.pdf)
- [Toulmin's model of Argumentation — CIRIS](https://www.ciris.info/learningcenter/toulmins-model/)
- [Obsidian vs Roam vs LogSeq vs RemNote — Nodus Labs](https://support.noduslabs.com/hc/en-us/articles/6490899641234-Obsidian-vs-Roam-Research-vs-LogSeq-vs-RemNote)
- [How backlinks in Roam/Obsidian/Logseq become graphs — Nodus Labs](https://support.noduslabs.com/hc/en-us/articles/6829955215634-How-Are-Backlinks-from-Roam-Research-Obsidian-Logseq-Converted-into-a-Network-Graph)
- [Obsidian vs Roam vs LogSeq — The Sweet Setup](https://thesweetsetup.com/obsidian-vs-roam/)
- [How to use the knowledge graph — Mark McElroy](https://markmcelroy.com/how-to-use-the-knowledge-graph-or-why-the-graph-aint-just-eye-candy/)
- [7 Best Heptabase Alternatives — Kosmik](https://www.kosmik.app/blog/heptabase-alternatives)
- [Scrintal vs Heptabase comparison](https://scrintal.com/comparisons/heptabase-alternative)
- [Tools for Thought as Cultural Practices — Maggie Appleton](https://maggieappleton.com/tools-for-thought)
- [Visual notetaking tools — Scrintal](https://scrintal.com/comparisons/visual-notetaking-tools-alternative)
- [Making Peer Review More Transparent with Open Annotation — Hypothesis](https://web.hypothes.is/blog/transparent-peer-review/)
- [Annotation Tool Facilitates Peer Review — Eos](https://eos.org/editors-vox/annotation-tool-facilitates-peer-review)
- [Classification and analysis of PubPeer comments — Wiley](https://asistdl.onlinelibrary.wiley.com/doi/10.1002/asi.24568)
- [PubPeer 2.0: Post-Publication Peer Review — Enago](https://www.enago.com/academy/pubpeer-2-0-post-publication-peer-review/)
- [About pull request reviews — GitHub Docs](https://docs.github.com/articles/about-pull-request-reviews)
- [Best Practices for Reviewing Pull Requests — Rewind](https://rewind.com/blog/best-practices-for-reviewing-pull-requests-in-github/)
- [Steelman: adversarial reasoning for decision-making — Dylan Martin](https://dylanamartin.com/2026/03/11/announcing-steelman.html)
- [Steelman cloud — adversarial reasoning](https://www.steelman.cloud/)
- [The Steel Man Technique and AI in the classroom](https://aiadvisoryboards.wordpress.com/2025/03/16/the-steel-man-technique-and-ai-a-powerful-tool-for-critical-thinking-in-the-classroom/)
- [Mastering the Steel Man Argument](https://learnwisedaily.com/mastering-the-steel-man-argument/)
- [Reasoninglab — critical thinking software](https://www.reasoninglab.com/critical/software/)
- [Trusting AI: does uncertainty visualization affect decision-making? — Frontiers](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1464348/full)
- [Visualizing Uncertainty to Promote Clinicians' Understanding — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10623599/)
- [Confidence Visualization UI Patterns — Agentic Design](https://agentic-design.ai/patterns/ui-ux-patterns/confidence-visualization-patterns)
- [The Confidence UI Pattern Users Actually Trust — Medium](https://medium.com/@Modexa/the-confidence-ui-pattern-that-users-actually-trust-ff27e1a8a956)
- [Confidence Visualization — AI UX Design Guide](https://www.aiuxdesign.guide/patterns/confidence-visualization)
- [Fundamentals of Data Visualization — visualizing uncertainty](https://clauswilke.com/dataviz/visualizing-uncertainty.html)
- [Zooming user interface — Wikipedia](https://en.wikipedia.org/wiki/Zooming_user_interface)
- [Semantic zoom and mini-maps for software cities — arXiv](https://arxiv.org/html/2510.00003v1)
- [Semantic Zoom View: a focus+context technique — SFU thesis](https://summit.sfu.ca/_flysystem/fedora/sfu_migrate/11587/etd6479_DDunsmuir.pdf)
- [Zoom interfaces are better for thinking — Christopher Noessel](https://christophernoessel.medium.com/zoom-interfaces-a0b109639f05)
- [Navigation patterns and usability of zoomable user interfaces — ACM](https://dl.acm.org/doi/abs/10.1145/586081.586086)
- [Importance of Color Code Concepts in UI/UX — GeeksforGeeks](https://www.geeksforgeeks.org/importance-of-color-code-concepts-in-ui-ux-design/)
- [What is Color in UX Design — Interaction Design Foundation](https://ixdf.org/literature/topics/color)
- [The Role of Color Theory in UX Design — EyeQuant](https://www.eyequant.com/resources/the-role-of-color-theory-in-ux-design/)
- [Color-Coding Strategy to Improve Written Argumentation — Cornell](https://blogs.cornell.edu/teachingcasestudies/gai/color-coding-strategy-to-improve-student-written-argumentation/)
- [Naming colors in design systems — Adobe Design](https://adobe.design/stories/design-for-scale/naming-colors-in-design-systems)
- [ProWritingAid vs Grammarly comparison](https://prowritingaid.com/prowritingaid-vs-grammarly)
- [Grammarly Editor user guide](https://support.grammarly.com/hc/en-us/articles/360003474732-Grammarly-Editor-user-guide)
- [ProWritingAid vs Grammarly — Capitalize My Title](https://capitalizemytitle.com/grammarly-vs-prowritingaid/)
- [AI Writing Tools Reviewed — Fresh van Root](https://freshvanroot.com/blog/ai-writing-tools/)
- [Sudowrite vs Scrivener — AI Muse vs Digital Corkboard](https://sudowrite.com/blog/sudowrite-vs-scrivener-the-ai-muse-vs-the-digital-corkboard/)
- [Lex.page review — Netus.ai](https://netus.ai/blog/lex-page-review-an-ai-writing-helper/)
- [Free Affinity Diagram Tool — Miro](https://miro.com/brainstorming/affinity-diagram/)
- [Affinity Diagram template — FigJam](https://www.figma.com/templates/affinity-diagram-example/)
- [Clustering — Miro Help Center](https://help.miro.com/hc/en-us/articles/4409706795410-Clustering)
- [What is an Affinity Diagram — Figma resource library](https://www.figma.com/resource-library/what-is-an-affinity-diagram/)
- [Explorable Explanations — Bret Victor](https://worrydream.com/ExplorableExplanations/)
- [The rise of explorable explanations — Maarten Lambrechts](https://www.maartenlambrechts.com/2015/03/04/the-rise-of-explorable-explanations.html)
- [Awesome explorables — GitHub](https://github.com/blob42/awesome-explorables)
- [Bret Victor — Wikipedia](https://en.wikipedia.org/wiki/Bret_Victor)
