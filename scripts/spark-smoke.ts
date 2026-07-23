/**
 * spark-smoke.ts — live-model smoke for the spark stage, the instrument for
 * step 6 of the provider-switch protocol (llm-provider-portability §3): flip
 * the registry, run this, watch first-attempt yield. The spark-v2/v3 tuning
 * (spark plan §11) is the precedent — the first live run on a new model is
 * expected to find a prompt tune.
 *
 * Usage:
 *   bun scripts/spark-smoke.ts             # 3 inline drafts, full candidate output
 *   bun scripts/spark-smoke.ts --corpus    # every eval/corpus draft: per-draft
 *                                          # yield lines + the corpus-wide lens
 *                                          # histogram (the offline diversity
 *                                          # early warning); add --verbose for
 *                                          # candidate text
 *
 * Provider comes from the registry (LLM_PROVIDER); the active provider's key
 * must be set. Cost: cheap-fast tier — the full corpus run is a few cents.
 * All drafts are synthetic (see eval/corpus/README.md), never user content.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sprintId as makeSprintId } from "../src/domain/types/branded";
import { createSparkGenerationPort } from "../src/infra/llm/spark-adapter";
import {
  createStructuredClientFor,
  resolveSparkLlm,
} from "../src/infra/llm/providers";

const DRAFTS: ReadonlyArray<{ readonly label: string; readonly draft: string }> = [
  {
    label: "craftsmanship",
    draft:
      "I keep coming back to the idea that mass production killed craftsmanship, but maybe " +
      "that's too easy. Mass production made goods affordable for ordinary people, and the " +
      "handmade things we romanticize were luxury items most families never owned. So when " +
      "I mourn the decline of well-made objects, whose experience am I actually describing? " +
      "There's something about repairability too — my grandfather fixed his own radio, and " +
      "I throw my headphones away. But I'm not sure if that's about how things are made or " +
      "about what my time is worth now. The thing I can't shake is that everything feels " +
      "disposable, and I want to blame the factories, but the factories also gave everyone " +
      "chairs and shoes and light.",
  },
  {
    label: "ai-bubble",
    draft:
      "Everyone says the AI buildout is a bubble, and the capex numbers do look insane — " +
      "hundreds of billions on data centers with barely any revenue behind them. But the " +
      "railway manias left track, and the dotcom crash left fiber that later carried " +
      "everything. Maybe bubbles are how infrastructure gets built faster than caution " +
      "allows. What bothers me is that GPUs aren't track — they depreciate in a few years. " +
      "If the crash comes before the deployment phase, we're left with obsolete silicon, " +
      "not dark fiber waiting to be lit. I keep going back and forth on whether this boom " +
      "is productive investment or pure speculation, and I honestly don't know which side " +
      "I'd defend.",
  },
  {
    label: "city-noise",
    draft:
      "The city got louder this year, or I got more sensitive, hard to say. Construction on " +
      "every block, delivery trucks idling, everyone's phone speaker playing something. I " +
      "wonder if noise is a kind of rent we pay to live near each other, and whether quiet " +
      "has quietly become a luxury good — the expensive neighborhoods are the silent ones. " +
      "My first instinct is regulation, decibel limits, enforcement. But the noise is also " +
      "life: the loud street is the alive street, and the silence I want might just be the " +
      "sound of a place dying.",
  },
];

function sid(raw: string) {
  const result = makeSprintId(raw);
  if (!result.ok) throw new Error("bad smoke sprint id");
  return result.value;
}

/** Deterministic per-draft sprint id so seeded lens hints vary across drafts
 * the way they vary across real sprints. */
function smokeSprintFor(index: number) {
  const tail = String(index + 1).padStart(12, "0");
  return sid(`99999999-9999-4999-8999-${tail}`);
}

/** Load eval/corpus/*.md: strip frontmatter, keep (id, body). */
function loadCorpus(): ReadonlyArray<{ readonly label: string; readonly draft: string }> {
  const dir = join(import.meta.dir, "..", "eval", "corpus");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      const end = raw.indexOf("---", raw.indexOf("---") + 3);
      const body = end >= 0 ? raw.slice(end + 3).trim() : raw.trim();
      return { label: f.replace(/\.md$/, ""), draft: body };
    });
}

async function main(): Promise<void> {
  const corpusMode = process.argv.includes("--corpus");
  const verbose = !corpusMode || process.argv.includes("--verbose");
  const drafts = corpusMode ? loadCorpus() : DRAFTS;

  const llm = resolveSparkLlm();
  console.log(
    `provider=${llm.provider} model=${llm.modelId} drafts=${String(drafts.length)}\n`,
  );

  const client = createStructuredClientFor(llm.provider);
  let firstAttemptOk = 0;
  const lensCounts = new Map<string, number>();

  for (const [index, { label, draft }] of drafts.entries()) {
    const attempts: string[] = [];
    let firstOutcome = "";
    const port = createSparkGenerationPort(client, {
      modelId: llm.modelId,
      onAttempt: (a) => {
        if (a.retryCount === 0) firstOutcome = a.outcome;
        attempts.push(
          `    attempt#${String(a.retryCount)} outcome=${a.outcome} ` +
            `returned=${String(a.candidatesReturned ?? "-")} valid=${String(a.candidatesValid ?? "-")} ` +
            `rejects=[${(a.rejectReasons ?? []).join(",")}] ` +
            `${String(a.latencyMs)}ms in=${String(a.inputTokens)} out=${String(a.outputTokens)} ` +
            `cached=${String(a.cachedInputTokens ?? 0)}`,
        );
      },
    });

    const result = await port.generate({
      draft,
      sprintId: smokeSprintFor(index),
      servedLenses: [],
    });

    const firstAttemptClean = firstOutcome === "ok" && attempts.length === 1;
    if (firstAttemptClean) firstAttemptOk += 1;

    const lenses = result.ok ? result.value.candidates.map((c) => c.lens) : [];
    for (const lens of lenses) {
      lensCounts.set(lens, (lensCounts.get(lens) ?? 0) + 1);
    }

    if (verbose) {
      console.log(`[${label}]`);
      for (const line of attempts) console.log(line);
      if (result.ok) {
        for (const c of result.value.candidates) {
          console.log(`    ${c.lens}: ${c.question}  ⚓ "${c.grounding}"`);
        }
      } else {
        console.log(`    ERROR ${result.error.reason}: ${result.error.message}`);
      }
      console.log("");
    } else {
      const status = result.ok
        ? `${firstAttemptClean ? "ok " : "repaired"} lenses=[${lenses.join(",")}]`
        : `ERROR ${result.error.reason}`;
      console.log(`  ${label.padEnd(28)} ${status}`);
    }
  }

  console.log(
    `\nfirst-attempt yield: ${String(firstAttemptOk)}/${String(drafts.length)} ` +
      `(ship gate: tune the prompt before relaxing anything — spark plan §9 doctrine)`,
  );
  if (corpusMode) {
    console.log("\nlens histogram (the homogenization early warning):");
    const sorted = [...lensCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [lens, count] of sorted) {
      console.log(`  ${lens.padEnd(13)} ${"█".repeat(count)} ${String(count)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
