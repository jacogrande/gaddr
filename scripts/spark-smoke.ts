/**
 * spark-smoke.ts — live-model smoke for the spark stage, the instrument for
 * step 6 of the provider-switch protocol (llm-provider-portability §3): flip
 * the registry, run this, watch first-attempt yield. The spark-v2/v3 tuning
 * (spark plan §11) is the precedent — the first live run on a new model is
 * expected to find a prompt tune.
 *
 * Usage:
 *   OPENAI_API_KEY=...    bun scripts/spark-smoke.ts            # registry default
 *   ANTHROPIC_API_KEY=... LLM_PROVIDER=anthropic bun scripts/spark-smoke.ts
 *
 * Cost: 3 calls on the cheap-fast tier — well under a cent. Drafts below are
 * synthetic test prose, not user content.
 */

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

const SMOKE_SPRINT = sid("99999999-9999-4999-8999-999999999999");

async function main(): Promise<void> {
  const llm = resolveSparkLlm();
  console.log(`provider=${llm.provider} model=${llm.modelId}\n`);

  const client = createStructuredClientFor(llm.provider);
  let firstAttemptOk = 0;

  for (const { label, draft } of DRAFTS) {
    const attempts: string[] = [];
    const port = createSparkGenerationPort(client, {
      modelId: llm.modelId,
      onAttempt: (a) => {
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
      sprintId: SMOKE_SPRINT,
      servedLenses: [],
    });

    console.log(`[${label}]`);
    for (const line of attempts) console.log(line);
    if (attempts.length === 1 && attempts[0]?.includes("outcome=ok")) {
      firstAttemptOk += 1;
    }
    if (result.ok) {
      for (const c of result.value.candidates) {
        console.log(`    ${c.lens}: ${c.question}  ⚓ "${c.grounding}"`);
      }
    } else {
      console.log(`    ERROR ${result.error.reason}: ${result.error.message}`);
    }
    console.log("");
  }

  console.log(
    `first-attempt yield: ${String(firstAttemptOk)}/${String(DRAFTS.length)} ` +
      `(ship gate: tune the prompt before relaxing anything — spark plan §9 doctrine)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
