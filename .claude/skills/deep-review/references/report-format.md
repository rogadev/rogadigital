# Report format

The report is for a busy person who has not read the code. They see the **last paragraph first** in chat, then scroll up for detail. So the report ends with the verdict and the action, and every finding reads as a problem and a solution in plain language before any file path appears.

`/deep-review` produces two versions from the same content:

- **Chat report**: returned to the caller and shown to the user. Short, scannable, ends with the action block.
- **Full report**: saved to `tmp/reviews/<yyyy-mm-dd>-<branch>.md` in the repo when `tmp/` is gitignored, otherwise in the scratch directory. It adds the evidence quotes, alternatives considered, lane coverage, and discarded findings. The chat report links to it.

## Writing rules

- **Problem, then solution, in plain words.** Lead each finding with what goes wrong and for whom ("Prospects on a phone can't reach the Send button"), not with the mechanism ("Fixed width on flex child"). The mechanism goes in one short clause after.
- **No jargon without a gloss.** Say "the page flashes the wrong content before it loads (a hydration mismatch)", not "hydration mismatch". Name files and functions in backticks, but never make the reader open a file to understand the problem.
- **One recommended fix per problem.** State it as an instruction. Mention an alternative only when the trade-off is real, in one line.
- **Numbers over adjectives.** "Contrast is 3.1:1; it needs 4.5:1", "ships 48 KB of JavaScript to the home page; the budget is 30 KB".
- **Short.** A finding in the chat report is at most five lines. Nits are one line each.
- **Only actionable items in the fix lists.** A finding that a later commit on the same branch already fixed (common when reviewing an old commit or range) is not a "Must fix" or "Should fix" item and does not count toward the verdict. Mention it in one line under "Already fixed later on this branch" in the full report only.
- **Polish stays short in chat.** List at most five polish items, the most useful first, then "The full report lists <n> more." The rest go in the full report.
- **Every skipped reviewer has a reason.** "Not run" alone is not a reason; say "no logging or config changed" or "dropped to stay within the tier budget".
- **Honest scope.** Say what was not checked (lanes skipped, pages not rendered, a lane that timed out). A clean report on a partial review must say it was partial.
- Google developer documentation voice: second person, present tense, active voice, sentence-case headings, serial comma.

## Verdicts

| Verdict | When | Action block |
| --- | --- | --- |
| **Ready to merge** | No Blockers, no Warnings, gate passed | "No action needed." plus any optional polish count |
| **Ready after small fixes** | No Blockers; Warnings exist; gate passed | "Fix the N items below before merging." |
| **Not ready** | Any Blocker, or the gate failed | "Don't merge yet." plus the must-fix list |
| **Review incomplete** | A lane that owns a risk surface in this change failed to report, or the gate could not run | "Review incomplete." plus what to re-run |

## Chat report template

Use this shape exactly. Omit a section when it is empty, except the action block, which always ends the report.

```markdown
## Code review: <branch> vs <base>

<One sentence: what the change does, in user terms.> <Size word: small | medium | large> change, <n> files. <n> reviewers ran: <short list>. <One clause on what was skipped and why, if anything.>

**Checks:** <lint, types, tests: all passed | <what failed>> | **Pages rendered:** <n pages at phone, tablet, desktop, light and dark | not rendered (<reason>)>

### Must fix before merge

**1. <Problem in plain words, stated as what goes wrong>**
<One or two sentences: who is affected and what they experience.>
**Fix:** <the recommended fix, as an instruction>. <`path:line`>

### Should fix

**2. <Problem>**
<Impact sentence.>
**Fix:** <instruction>. <`path:line`>

### Polish (optional)

- <problem and fix in one line> (`path:line`)

### Recommendations

<Only when the advisor found a pattern across findings or a better approach worth a follow-up. One to three bullets, each: the pattern, the recommended change, the payoff. Say whether it belongs in this change or a follow-up issue.>

<Full report: `tmp/reviews/<file>.md`>

---

**<Action block, see below>**
```

## Action block

The last lines of the report. Bold. Nothing may follow it except the auto-mode block when `auto` was passed.

- Not ready:
  > **Don't merge yet: <n> problem(s) must be fixed first.** <Item 1 in five words>, <item 2 in five words>. <One sentence on the fastest path, for example "Both are one-line fixes; start with #1.">
- Ready after small fixes:
  > **Almost ready: fix <n> item(s) before merging.** <Short list.> <Optional: "The <n> polish items can wait.">
- Ready to merge:
  > **Ready to merge. No action needed.** <Optional: "<n> optional polish items are listed above.">
- Review incomplete:
  > **Review incomplete: <what did not run>.** <What to do, for example "Re-run `/deep-review` once the dev server is up, or run `/deep-review -ux-visual` to skip it.">

## Full report additions

The full report uses the same order, and adds under each finding:

```markdown
**What we found:** <the mechanism, two or three sentences>
**Evidence:** `path:line`
    <quoted code, at most three lines>
**Why this fix:** <one or two sentences; the alternatives considered and why they lost>
**Effort:** small (under 30 minutes) | medium (a few hours) | large (a day or more)
**Found by:** <lanes> | Verified: confirmed | downgraded from <X> | needs a human
```

Then these sections at the end:

- **Coverage**: the tier and why, each lane that ran and its result line, each lane skipped and why, shards, renders.
- **Needs a human**: findings the verifier could not settle from code, one line each with the question to answer.
- **Pre-existing issues this change touches**: one line each; never counted in the verdict.
- **Discarded**: findings the verifier dropped, one line each with the reason, so the user can see nothing was hidden.
- **Profile drift**: lines where the profile no longer matched the code, so the suite can be corrected.

## Example (chat report)

## Code review: feat/media-form vs origin/dev

Adds a media inquiry form at `/media/` so journalists and podcast hosts can reach Ryan. Medium change, 6 files. 6 reviewers ran: UI look, accessibility, visitor flow, framework, API, tests. Security ran too because a new endpoint was added.

**Checks:** format, lint, types, tests, and build all passed | **Pages rendered:** /media/ at phone, tablet, and desktop, light and dark

### Must fix before merge

**1. Anyone can send email that looks like it came from the site**
The new endpoint puts the visitor's `outlet` field into the email subject without stripping line breaks, so a crafted request can add extra email headers.
**Fix:** reject or strip `\r` and `\n` in `outlet`, as `validateSubmission` already does for `name`. `api/_lib/validation.ts:118`

### Should fix

**2. The send button gives no feedback on a slow connection**
The form waits up to several seconds for Turnstile and Resend with no pending state, so visitors click again and send two messages.
**Fix:** disable the button and show "Sending..." while the request runs, the way the contact form does. `src/components/InquiryForm.svelte:142`

### Polish (optional)

- The page title is "Media" only; "Media inquiries | Roga Digital" matches the other pages (`src/pages/media.astro:12`)

### Recommendations

- The three endpoints now repeat the same parse, validate, verify, and send sequence. A shared `handleInquiry(request, validate, build)` in `api/_lib/` would make the next form safe by default. Follow-up issue, not this change.

Full report: `tmp/reviews/2026-09-28-feat-media-form.md`

---

**Don't merge yet: 1 problem must be fixed first.** The media endpoint allows email header injection. It is a one-line fix; the pending state can go in the same commit.
```
