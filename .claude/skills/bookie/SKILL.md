---
name: bookie
description: Convert a project's documentation into a Bookie project of bets, experiments, and tasks, and inspect or create Bookie entities. Use when the user wants to turn a README/spec/PRD/roadmap into Bookie bets, asks to create/list/view Bookie projects, wants to manage a project's dues (recurring manual chores like org admin or outreach warmup — list what's due, settle one, add or edit them), or wants to log customer evidence (interview notes, sales calls, usage observations) and link it to the bets it supports. Runs the local CLI at .bookie/bookie.ts against the Bookie JSON API.
allowed-tools: Read, Bash(bun .bookie/bookie.ts:*)
user-invocable: true
---

# Bookie

Bookie tracks product work as a decision pipeline:

- **Project** — a product or initiative. Has a `phase`: `exploring`, `building`, `launched`.
- **Bet** — one falsifiable hypothesis the project is making. Has a `title` and a `statement` (what you believe and why it matters). `status`: `draft`, `active`, `validated`, `invalidated`, `paused`. A project can run several `active` bets at once. A bet is also tagged with the `stage` it's for — the project phase it belongs to (`exploring`, `building`, `launched`); defaults to the project's current phase.
- **Experiment** — how you will test a bet. Has a `validation_plan` (how you'll test it) and `success_criteria` (the measurable bar that decides it). `status`: `planned`, `running`, `completed`, `inconclusive`.
- **Task** — a concrete, actionable step to run an experiment.
- **Due** — recurring manual upkeep on a project (org management, outreach warmup, inbox checks) that software can't do for you. A due has a `cadence`: `daily`, or `weekly` with a `due_weekday` (0 = Sunday … 6 = Saturday). Each occurrence is settled (checked off) individually; a weekly due missed on its day stays overdue for the rest of the week, a missed daily occurrence lapses at midnight. Dues sit outside the bet → experiment → task pipeline — they're operations, not evidence.
- **Evidence** — one piece of customer learning captured on a project. Has a `kind`: `interview`, `sales_call`, `support`, `usage`, `churn`, `competitor`, `other` (defaults to `interview`); a `strength`: `behavior` or `opinion` (defaults to `opinion`); an optional Markdown `body`, a `source` (who/where it came from), and an `occurred_on` date (`YYYY-MM-DD`). The strength field is the Mom Test distinction: mark `behavior` only for things people *did* — money spent, a current workaround, observed usage, a concrete committed next step; everything people merely *said* ("I'd totally pay for that") is `opinion`. Evidence can be linked to any number of the project's bets — the bets it supports or undermines.

Free-text fields (bet statements, validation plans, success criteria, results, task titles) render lightweight Markdown in the UI: `**bold**`, `*italic*`, `` `code` ``, `[links](https://…)`, and `- ` / `1.` lists.

The CLI lives at `.bookie/bookie.ts` and is invoked with `bun .bookie/bookie.ts <command>`. Pass `--json` to get machine-readable output.

## Workflow: documentation → Bookie

1. **Check auth.** Run `bun .bookie/bookie.ts whoami --json`. If it fails with an auth error, stop and ask the user to run:
   `bun .bookie/bookie.ts login --url <their-bookie-url> --email <email> --password <password>`
   (Do not ask for or handle their password yourself — have them run login.)

2. **Read the docs.** Read the project's documentation — `README.md`, `docs/**`, any PRD/spec/roadmap the user points to. Identify: what the project is, its current phase, and the key uncertainties (these become bets).

3. **Draft the import.** Build an import JSON object (schema below). Translate the docs into Bookie's model — do not copy headings verbatim:
   - **Bets** = the riskiest assumptions, each phrased as one falsifiable belief. The `statement` should read "We believe <X> because <Y>, and it matters because <Z>." One decision per bet.
   - **Experiments** = the cheapest test that would change your mind. `validation_plan` is concrete (what you'll actually do); `success_criteria` is measurable (a number/threshold), not vague.
   - **Tasks** = the literal steps to run that experiment.
   - Mark the bets you're actively pursuing `"status": "active"` (a project can have several); leave the rest `"draft"`.
   - Use only the valid enum values listed above.

4. **Review with the user.** Show the drafted bets/experiments/tasks (a short outline) and confirm before writing. This creates real data in their Bookie workspace.

5. **Import.** Write the JSON to a temp file and run:
   `bun .bookie/bookie.ts import <file>.json --json`
   Report the created project URL and the bet/experiment/task counts from the result. Offer to refine (you can re-run import to create another project, or use the granular commands to extend an existing one).

## Import schema

```json
{
  "org": "Bootstrapped Labs",
  "project": { "name": "Bookie", "phase": "exploring", "current_goal": "Validate demand" },
  "bets": [
    {
      "title": "Solo founders will adopt a weekly decision cockpit",
      "statement": "We believe solo founders will use Bookie weekly to decide what to work on next, because they lack a lightweight way to track bets, and it matters because retention depends on the weekly habit.",
      "status": "active",
      "stage": "exploring",
      "experiments": [
        {
          "title": "Concierge weekly review",
          "validation_plan": "Manually run the weekly review for 5 founders over 3 weeks.",
          "success_criteria": "3 of 5 founders complete a review in week 2 without a reminder.",
          "status": "planned",
          "tasks": ["Recruit 5 founders", "Run week-1 sessions", "Send week-2 self-serve prompt"]
        }
      ]
    }
  ]
}
```

Notes:
- Provide either `"org"` (an org name — reused if it already exists, created if not) **or** `"org_id"`.
- `phase`, bet `status`, bet `stage`, and experiment `status` must be from the enums above; invalid values fall back to defaults (bet `stage` falls back to the project's phase).
- `tasks` is an array of strings.

## Other commands

- `bun .bookie/bookie.ts projects` — list orgs and projects.
- `bun .bookie/bookie.ts project <id> --json` — view a project's full bet/experiment/task tree (includes its dues with current state).

## Dues (recurring manual upkeep)

Manage a project's recurring chores. `due list` shows each due's current occurrence state: `due today`, `OVERDUE since <date>`, or `settled`. Get the project id from `projects`.

```
bun .bookie/bookie.ts due list --project <id>
bun .bookie/bookie.ts due create --project <id> --title "..." --cadence daily
bun .bookie/bookie.ts due create --project <id> --title "..." --cadence weekly --day friday
bun .bookie/bookie.ts due update <id> [--title "..."] [--cadence daily|weekly] [--day monday|0-6]
bun .bookie/bookie.ts due toggle <id>       # settle ⇄ reopen the current occurrence
bun .bookie/bookie.ts due archive <id>
```

Notes:
- `--day` takes a weekday name or 0–6 (0 = Sunday) and is required when `--cadence weekly`; it's ignored (and cleared) for daily dues.
- `toggle` acts on the **current occurrence** only — today for daily dues, the most recent occurrence of its weekday for weekly ones. History is kept per occurrence; there is no "complete all".
- When the user asks "what's due?" or "what do I need to do today?", run `due list` for the relevant project(s) and lead with open and overdue items.
- Import files do **not** support dues — create them with `due create` after an import.

## Evidence (customer learning)

Capture what you learn from customers and tie it to the bets it bears on. `evidence list` shows each item's strength (● behavior / ○ opinion), kind, date, and linked bet ids. Get project and bet ids from `projects` and `project <id> --json`.

```
bun .bookie/bookie.ts evidence list --project <id>
bun .bookie/bookie.ts evidence create --project <id> --title "..." [--kind interview] [--strength behavior|opinion] [--body "..."] [--source "..."] [--date YYYY-MM-DD]
bun .bookie/bookie.ts evidence update <id> [--title ...] [--kind ...] [--strength ...] [--body ...] [--source ...] [--date ...]
bun .bookie/bookie.ts evidence archive <id>
bun .bookie/bookie.ts evidence link <id> --bet <betId>
bun .bookie/bookie.ts evidence unlink <id> --bet <betId>
```

Notes:
- When logging evidence for a user, ask what actually happened and pick the `strength` yourself: `behavior` for money spent, a workaround in use, observed usage, or a committed next step; `opinion` for compliments, predictions, and stated preferences. When in doubt, it's `opinion` (the default).
- `--date` is when the learning **happened** (the call, the churn, the observation), not when you log it. `--source` records who or where it came from ("call with Dana", "support ticket #812").
- After creating evidence, link it to the bet(s) it supports or undermines with `evidence link` — that's what makes it show up as the bet's evidential footing. Evidence and bet must belong to the same project. A piece of evidence can link to several bets; `unlink` detaches without deleting.
- Import files do **not** support evidence — create it with `evidence create` after an import.

## Revising an existing project

`import` **always creates a new project** — it never merges into or replaces an existing one, so re-running it duplicates. To change a project you already imported, use the granular commands (all accept `--json`; get ids from `project <id> --json`):

```
bun .bookie/bookie.ts bet create --project <id> --title "..." --statement "..." [--status active] [--stage building]
bun .bookie/bookie.ts bet update <id> [--title ...] [--statement ...] [--status ...] [--stage ...] [--kill-criteria ...]
bun .bookie/bookie.ts bet archive <id>

bun .bookie/bookie.ts experiment create --bet <id> --title "..." --validation-plan "..." --success-criteria "..."
bun .bookie/bookie.ts experiment update <id> [--title ...] [--validation-plan ...] [--success-criteria ...] [--status ...] [--result ...]
bun .bookie/bookie.ts experiment archive <id>

bun .bookie/bookie.ts task create --experiment <id> --title "..."
bun .bookie/bookie.ts task update <id> --title "..."
bun .bookie/bookie.ts task toggle <id>      # done ⇄ todo
bun .bookie/bookie.ts task archive <id>
```

To **replace** a bet (the common "swap the old bet for a new one" case): `bet create` the replacement, then `bet archive` the old one. `archive` is a soft-delete — archived items drop out of the active tree but stay recoverable in an export; there is no hard delete.

The import is **not transactional** — if it fails partway, some entities may already exist; it is safe to re-run (it creates a new project each time).
