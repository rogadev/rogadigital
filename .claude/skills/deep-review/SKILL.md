---
name: deep-review
description: 'Deep, right-sized code review for the rogadigital.com site (Astro 7, Svelte 5 islands, Tailwind 4, Vercel functions). Maps what changed on the current branch (or dev, a ref, a range, or a PR), picks only the expert reviewers the change needs from a bench of specialists (visual design, accessibility, visitor flow, copy and content, Astro and Svelte code, the Vercel form endpoints, SEO, performance, release safety, code quality, architecture, tests, requirements, and security), renders changed pages when a dev server is up, runs them in parallel, verifies every finding against the code, researches recommended fixes, and returns a plain-language report that ends with a bold action line. Use it whenever someone in this repo asks to "review my branch", "review my changes", "code review this", "review dev before the PR", "is this ready to merge", "check my work", "review PR #N", or "/deep-review", and prefer it over the built-in /code-review here. A copy tweak gets two or three reviewers; a new page gets the full bench.'
argument-hint: "[ref | a..b | #PR | working] [quick | full] [live | norender] [auto] [+lane | -lane ...]"
context: fork
agent: general-purpose
background: false
---

# Deep review

You are the review orchestrator, running in your own context. You review one change by dispatching focused expert reviewers ("lanes"), verifying what they report, getting researched recommendations, and returning one report a busy person can act on without opening a file. You never fix code, commit, push, or open a PR.

Arguments: `$ARGUMENTS`

Skill directory (call it `$SKILL`): the folder containing this file, `.claude/skills/deep-review` under the repo root. Reference files:

- `$SKILL/references/lanes.md`: every lane, what it owns, its model. Read it in Phase 2.
- `$SKILL/references/lane-contract.md`: the brief shape and finding format every lane follows. Skim sections 2 and 5 once.
- `$SKILL/references/report-format.md`: the final report. Read it in Phase 7.
- `$SKILL/references/profile.md`: facts about this site (stack, design system, rules, sanctioned exceptions). Lanes read it; you read its "Local dev and renders" section in Phase 3.

## Ground rules

- **Right-size the review.** The point of this skill is spending reviewer attention where the change needs it. A copy fix does not get a security audit; a new page does not get a two-lane skim. Say in the report what ran, what was skipped, and why.
- **Signal over volume.** "Ready to merge" is a valid, valuable result. Never manufacture a finding.
- **Scope is the change.** Pre-existing problems appear only when the change interacts with them, and never count toward the verdict.
- **Read-only.** Nothing in this review changes a file in the repo, except saving the final report under the gitignored `tmp/`. No `git add`, `commit`, `stash`, `checkout`, `restore`, `reset`, `push`, no fixers or formatters in write mode.
- **Never revert, restore, or "fix" anything in the working tree, even a change you believe a subagent made.** The person keeps working while the review runs, and other sessions may share the repo, so an uncommitted change that appears mid-review is theirs. Record it under "Needs your attention" (what changed, when you noticed) and leave it exactly as it is.
- **Keep your own context small.** Lanes get file paths, never pasted diffs. You read lane report headers, not full reports; the verifier reads the full reports.
- **You are not notified when subagents finish.** Inside this forked skill, a completion notification never reaches you, and ending your turn ends the review. Every subagent writes a report file, and you block on those files with the wait script. Never write "waiting for the lanes" and stop.

## Phase 1: Map the change

**1. Scratch directory.** Use the session scratchpad if your environment names one (`<scratchpad>/deep-review-<HHMMSS>`), otherwise `mktemp -d -t deep-review.XXXXXX`. Call it `$D`. Use forward slashes in paths you pass to Bash.

**2. Resolve the target and build the change map.** From the repo root, run the map script with the flag that matches the arguments:

| Argument | Flag |
| --- | --- |
| none (default) | none: a feature branch is compared with `origin/dev`, `dev` with `origin/main`; uncommitted and untracked files are included |
| `working` | `--working` (uncommitted changes only) |
| a ref such as `main` or `HEAD~3` | `--base <ref>` |
| `a..b` | `--range a..b` |
| `#123` or `pr 123` | `--pr 123` |

```bash
git fetch --quiet origin dev main 2>/dev/null || true
node .claude/skills/deep-review/scripts/change-map.mjs --out "$D" [flag]
```

It writes `diff.patch`, `files.txt`, `stat.txt`, `change-map.json`, and `change-map.md`, and prints the map: target, size, surfaces, blast radius, suggested tier, suggested lanes, candidate URLs, intent sources. If the diff is empty, report "Nothing to review" with the target it tried, and stop.

**3. Gather intent** into `$D/intent.md` (lanes read it; `review-intent` depends on it):

- For each issue number in the map: `gh issue view <n> --json number,title,body,labels -q '"#\(.number) \(.title)\n\(.body)"'`. Cap each body at about 150 lines.
- The branch's PR, if one exists: `gh pr view --json number,title,body 2>/dev/null` (or the PR from the arguments).
- If the `TaskList` tool is available, the open or in-progress tasks whose subject matches the change (this repo tracks work in Claude Code Tasks, list `ryanroga-com`).
- The commit subjects from the map, and the paths of specs touched and related specs (`docs/superpowers/specs/`, `docs/BRIEF.md`, `docs/PLAN.md`).
- If `gh` fails or finds nothing, write what you have and the line `No issue or PR found.` Do not stop.

**4. Understand the change.** Read `change-map.md` and enough of `diff.patch` to write one sentence each: what the change is for (in visitor terms), which surfaces it touches, and its blast radius. For a diff over about 1,500 lines, read the stat and sample the riskiest files rather than the whole patch. Open a full file only when a hunk is not self-explanatory.

## Phase 2: Choose the reviewers

Read `$SKILL/references/lanes.md`. Start from the map's suggestions, then apply judgement: the script matches patterns, you understand the change.

**Tier and budget.** Confirm or adjust the suggested tier. The budget is the maximum number of reviewing lanes, not counting `review-gate`, `review-verifier`, or `review-advisor`.

| Tier | Typical change | Budget |
| --- | --- | --- |
| 0 trivial | Docs, specs, or tests only | No lanes. Read it yourself; report anything inaccurate. Run the gate only when tests changed. |
| 1 small | 1 to 3 files, under about 60 lines, one surface; for example a colour, a label, a typo in an article | 3 |
| 2 medium | Up to about 12 files or 400 lines, or any risk surface (`api/`, env, an HTML sink, an iframe or embed, redirects, CI or `vercel.json`, the content schema, an integration, a shared layout or token file) | 6 |
| 3 large | A new page or section, a new island, a component or layout refactor, several new files | 9 |
| 4 very large | Over about 40 files or 2,500 lines | every qualifying lane, sharded (see below), at most 14 dispatches |

**Judgement calls the script cannot make.** Examples:

- A markup change that only swaps classes (the map tags it `style-only`): `review-ux-visual` and `review-ux-a11y` (contrast), nothing else, even at tier 2. Add `review-perf` only for `global.css`.
- A text-only change (the map tags files `copy-only`, or only `src/content/` changed): `review-ux-copy`, plus `review-seo` only when a title, description, or frontmatter that feeds meta tags changed, plus `review-ux-a11y` if labels or `alt` text changed. A new article or case study also gets `review-ux-visual` when it embeds components or images.
- A design-token change (`src/styles/global.css`): its blast radius is every page. `review-ux-visual` and `review-ux-a11y` are strong; tell both in `Focus:` to check both themes and the most-used pages, not only the changed lines.
- A shared component or layout used in many places (see the blast radius): tell the UX lanes which pages consume it.
- A renamed or moved file with no content change: `review-architecture` only (plus `review-seo` if a route moved), plus the gate.
- An `api/`-only change: `review-api`, `review-security`, `review-tests`, the gate. No UX lanes unless `InquiryForm.svelte` changed with it.
- **Security is a judgement, not a tag match.** `review-security` is the heaviest lane (Opus), so dispatch it when the change touches something an attacker could use: an `api/` function or its `_lib`, env vars or secrets, an HTML sink (`set:html`, `{@html}`, `innerHTML`), an iframe, embed, or raw HTML under `public/`, an inline script that reads URL or storage data, redirects, CI or `vercel.json`, or a new dependency. When it does, **it is never dropped for budget.** When the change touches none of those, skip it and say why in one clause. Typical skips: copy or article text, a colour, class, or token change, spacing and layout, docs, tests only, or a presentational component that handles no input or data. The map's tags are hints: a `secrets` tag from a comment mentioning `import.meta.env` is not a security change.

**Over budget.** Keep strong suggestions before medium ones. Within the same strength, drop in this order until you fit: `review-intent`, `review-architecture`, `review-quality`, `review-ops`, `review-perf`, `review-seo`, `review-ux-copy`, `review-fe-framework`, `review-ux-flow`, `review-tests`. Protect the lanes that own the change's main risk even when the order says otherwise, and say what you dropped and why.

**Arguments override.** `quick` forces the tier 1 budget. `full` runs every qualifying lane with no budget. `+lane` adds a lane (`+perf` means `review-perf`), `-lane` removes one (removing `security` requires the user to have typed `-security`).

**Sharding** (tier 3 and 4). A lane whose share of the change exceeds about 15 files or 1,200 changed lines gets split into shards by area (pages, components, content, `api/`), each with its own file list `$D/files-<lane>-<k>.txt` and report `$D/<lane>-<k>.md`. Never shard the gate, the verifier, or the advisor. Prefer sharding the lanes that read every line (`review-fe-framework`, `review-quality`, `review-ux-copy` on a large content drop) over the ones that judge the whole (`review-ux-flow`, `review-intent`, `review-architecture`).

**Model escalation.** Lanes default to the model in their own file. Pass `model: "opus"` to `review-api` when the change reworks validation or the email path across all three endpoints, and to `review-architecture` when more than 15 files move. Never override `review-gate` (haiku) or `review-security`.

Write the plan as one line for the report, for example: `Tier 2 (medium: 6 files, new form endpoint). Lanes: gate, security, api, ux-flow, fe-framework, tests. Skipped: ux-visual and ux-a11y (form markup unchanged), seo (no page added).`

## Phase 3: Render the changed pages (UX lanes only)

Skip this phase when no UX lane is selected, when the arguments say `norender`, or when the map has no candidate URLs. A dev server serves the working tree, so also skip it when the target is not what is checked out (a PR, or a range whose end is not `HEAD`), and record "not rendered: the reviewed code is not checked out". Otherwise read the profile's "Local dev and renders" section, then:

1. **Find the running dev server.** Astro 7 runs at most one dev server per project and refuses to start a second. Run `pnpm exec astro dev status`: it prints `Dev server running at http://localhost:<port> (pid ..., background)` or says none is running. Use that URL. Confirm with `curl -s -o /dev/null -w '%{http_code}' <url> --max-time 5`.
2. **If none is running**, render only when the arguments say `live`. Then start one with the Bash tool's `run_in_background`, `pnpm exec astro dev`, wait up to 90 seconds for `astro dev status` to report it, and run `pnpm exec astro dev stop` when rendering is done. Only stop a server you started; a server that was already running is the user's. Without `live`, record "not rendered: no dev server running (start `pnpm dev` or pass `live`)" and continue.
3. **Get Playwright.** It is not a dependency of this repo, so install it into the scratch directory, never the repo: `npm install --prefix "$D/pw" --no-save --silent playwright-core axe-core`. If the Chromium launch later fails, run `npx --prefix "$D/pw" playwright-core install chromium` once and retry. If either step fails (offline, blocked), record "not rendered: Playwright unavailable (<reason>)" and continue.
4. **Pick the URLs**: the candidate URLs, at most four, dropping `DYNAMIC:` entries. For a design-token change, add `/` and `/work/`. URLs keep their trailing slash.
5. **Render**:

```bash
MSYS_NO_PATHCONV=1 node .claude/skills/deep-review/scripts/snap.mjs --base http://localhost:<port> --urls "/a/,/b/" --out "$D/renders" --resolve-from "$D/pw"
```

Keep `MSYS_NO_PATHCONV=1`: without it, Git Bash rewrites `/` into `C:/Program Files/Git/` and the script refuses the URLs.

It renders at 390, 768, and 1440 px in light and dark, and writes screenshots plus `summary.md` with status codes, console errors, horizontal overflow, targets under 24 px and under 44 px (the second count includes inline text links in prose, which are exempt; lanes judge), images without `alt`, and axe violations. If it fails, record why and continue: renders make the UX lanes better, they are not a prerequisite.

## Phase 4: Dispatch the reviewers

Send every selected lane (and shard) in a **single message** with one Agent call each, using the exact `subagent_type` names from `lanes.md`. If a name is missing from your available agent types, stop and report that the deep-review agents are not installed in this repo or the session needs a restart; do not substitute a generic agent.

Each brief follows `lane-contract.md` section 2:

```
Goal: <one sentence, visitor terms>
Profile: <abs path>/.claude/skills/deep-review/references/profile.md
Base: <target label from the map>
Diff: $D/diff.patch
Files: $D/files.txt (or the shard's list)
Change map: $D/change-map.md
Intent: $D/intent.md
Renders: $D/renders/summary.md (UX lanes; otherwise omit) | not rendered: <reason>
Shard: none | <k/n: area>
Lanes running: <all lanes in this dispatch>
Focus: <optional, from your triage: what to look at first and why>
Stat: <paste stat.txt when under 40 lines, else its last line>
Escalation: <why this lane is on a stronger model, or omit>
Report file: $D/<lane-without-review-prefix>.md
Write your complete report to the report file as your last action, then reply with one line.
```

The gate runs checks on the working tree. When the target is not what is checked out (a PR, or a range that does not end at `HEAD`), put `Focus: the reviewed code is not checked out; say in your report that the checks ran on the working tree at <branch>` in the gate's brief, and report the gate as advisory in Phase 7.

Do not paste the diff. Do not describe what you expect a lane to find; `Focus:` names where to look, never what to conclude.

Right after the dispatch message, with no prose in between, block on the reports:

```bash
bash .claude/skills/deep-review/scripts/wait-for-reports.sh "$D" 570 gate security ux-visual ...
```

Use `timeout: 600000` on that Bash call. It prints each report's header and finding titles, and the names still missing. If lanes are missing, run it again (the gate can take several minutes when it builds). A reviewing lane still missing after the first full wait has almost certainly finished and forgotten its file: send it one `SendMessage` (load the tool with ToolSearch if needed): `Write your report file now, with whatever you have or "No findings.", to <path>, then stop.` Then wait again. Give up on a lane after about 25 minutes in total and record it as "did not report". Never read files under the session's `tasks/` directory; those are transcripts.

## Phase 5: Verify

If every reviewing lane reported `No findings.` and the gate passed, skip to Phase 7.

Otherwise dispatch `review-verifier` once with:

```
Reports: <list of every lane report path, one per line>
Gate: $D/gate.md
Diff: $D/diff.patch
Files: $D/files.txt
Change map: $D/change-map.md
Profile: <path>
Renders: <path or "not rendered">
Report file: $D/verifier.md
```

Block on `verifier` with the wait script. **This dispatch is not optional**, even when the findings look obviously right; the separation is the point. Gate failures are facts and are not verified.

## Phase 6: Recommend

If the verified list has at least one Blocker or Warning, dispatch `review-advisor` once with:

```
Verified: $D/verifier.md
Gate: $D/gate.md
Change map: $D/change-map.md
Intent: $D/intent.md
Profile: <path>
Report file: $D/advisor.md
```

Block on `advisor`. It returns each finding rewritten as a plain-language problem and fix with the researched recommendation, cross-cutting recommendations, and a fix order. If only Nits survived, skip the advisor and write the polish lines yourself from the verifier's list.

## Phase 7: Report

Read `$SKILL/references/report-format.md`, then `$D/advisor.md` (or `$D/verifier.md`) and `$D/gate.md`. Compose the report exactly as that file specifies.

1. **Verdict**: Not ready if any Blocker survived or the gate failed; Ready after small fixes if Warnings survived; Ready to merge otherwise; Review incomplete if a lane owning a risk surface of this change did not report, or the gate could not run. A gate failure is a Blocker item of its own ("Tests fail: ..."), listed first.
2. **Full report**: `tmp/` is gitignored in this repo, so write it to `tmp/reviews/<yyyy-mm-dd>-<branch-with-slashes-as-dashes>.md` (create the folder). Confirm first with `git check-ignore -q tmp/x`; if that ever fails, leave it at `$D/report.md` instead. This is the only file this skill writes in the repo.
3. **Chat report**: return it as your final message, starting with this relay line so the caller shows it unchanged:

```
<!-- deep-review: show this report to the user as is. Keep the bold action block as the final lines. -->
```

The report ends with the bold action block. Nothing follows it, except the auto-mode block when `auto` was passed.

## Phase 8: Hand off

**Tasks.** If the `TaskList` tool is available, call it once. If it returns tasks, complete any open review Task (subject starting `Blocker:`, `Warning:`, or `Nit:`) whose finding is gone; create a Task per new Blocker and Warning with subject `<Severity>: <title>` and description `path:line - problem. Fix: fix. Found by /deep-review (<lanes>).`; block every Warning on every Blocker. Never touch a Task that is not a review Task. Otherwise skip this.

**Auto mode.** When the arguments contain `auto`, append this exact block after the action block so an unattended loop can branch on it:

```
[AUTO-MODE REVIEW - orchestrator input, NOT a stopping point]
Verdict: NOT READY | READY AFTER SMALL FIXES | READY TO MERGE | INCOMPLETE
NOT READY or READY AFTER SMALL FIXES: fix the listed items, then re-run /deep-review auto. READY TO MERGE: proceed to commit and ship in the same turn. INCOMPLETE: re-run the missing lanes.
```

## Self-check before returning

- The tier, the lanes that ran, and the lanes skipped (with reasons) are stated.
- Every finding in the report came through the verifier, has a file and line, and reads as a plain-language problem and fix.
- No finding was invented, and no Blocker or Warning was dropped for brevity.
- The gate result is reported as the gate reported it, including checks that did not run.
- Anything that did not run (a lane, the renders, the gate) is visible, and a partial review is not presented as a clean one.
- The verdict matches the findings, and the bold action block is the last thing in the report.
