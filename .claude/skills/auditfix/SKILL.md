---
name: auditfix
description: One command to bring dependencies up to date, fix security advisories, and consolidate everything into a single dev→main PR. Use when the user says "/auditfix", "audit and fix", "fix the vulnerabilities", "run pnpm audit", "update the dependencies", "get deps up to date", "handle the dependabot PRs", "patch the security issues", or any variation of wanting the project's dependencies audited, updated, and shipped as one reviewable update. Prefer this over running pnpm audit / pnpm update ad hoc — it sequences the audit, the semver-safe updates, the Dependabot reconciliation, the pnpm ready gate, and the PR into one pass.
---

# /auditfix — Audit, update, and ship deps as one PR

Bring the project's dependencies current and secure in a single pass, verify nothing broke, and open **one** PR from `dev` to `main`. The goal is a clean, reviewable dependency update with the work already proven green — not a pile of separate bumps.

Scope, decided for this repo:

- **Updates are semver-safe.** Bring every dependency to the latest version its `^` range already allows (`pnpm update`), plus any security overrides. Do **not** jump major versions — that's a deliberate, reviewed change, not something a one-shot command should do silently.
- **Dependabot PRs get reconciled.** Read them to know what's outstanding. Close the ones this run supersedes (with a comment); leave the rest (e.g. major bumps we intentionally skipped) open.

## Workflow

### 1. Preflight

Run these in parallel and resolve any blocker before touching dependencies:

- `git status` — the working tree must be clean. If there are unrelated uncommitted changes, **stop** and tell the user — don't sweep their work into a deps PR.
- `git branch --show-current` — work happens on `dev`. If on another branch, switch to `dev` (`git switch dev`) and `git pull --rebase` so we branch from current `main`-bound history. If `dev` doesn't exist, create it from `main`.
- `gh auth status` — needed to read and close Dependabot PRs. If it fails, ask the user to run `! gh auth login` in this session, then continue.

### 2. Survey what needs doing

Gather the full picture before changing anything:

- `pnpm audit --json` — current advisories. Capture them; you'll confirm they're gone at the end.
- `pnpm outdated` — what's behind, and which bumps stay inside the existing `^` ranges (semver-safe) vs. require a major jump (out of scope).
- `gh pr list --author "app/dependabot" --state open --json number,title,headRefName,url` — the outstanding Dependabot PRs. Parse each title for the package and target version (e.g. `bump svelte from 5.55.6 to 5.55.9`). You'll use these to decide what to close in step 6.

If there are **no advisories, nothing outdated, and no Dependabot PRs**, report "everything's already current and clean" and stop. Don't open an empty PR.

### 3. Apply the updates

In order, because each step feeds the next:

1. `pnpm update` — pulls every dep to the latest version allowed by its range and refreshes `pnpm-lock.yaml`.
2. `pnpm audit --fix override` — for advisories not resolved by the range update, this writes/extends entries in the `pnpm.overrides` block of `package.json` (the repo already pins advisories this way — match that pattern, don't invent a new one). **The `override` argument is required on pnpm 11** — bare `pnpm audit --fix` fails with `ERR_PNPM_INVALID_FIX_OPTION`. (`--fix update` is the other accepted value; it bumps ranges instead of pinning overrides, which step 1 has already done.) Skip this step entirely when step 2's `pnpm audit` already reported zero vulnerabilities — there is nothing to pin.
3. `pnpm install` — apply any override changes to the lockfile.
4. `pnpm audit` — confirm it now reports **0 vulnerabilities**. If advisories remain, they have no in-range fix; surface them to the user with the advisory and the version that would resolve it, rather than forcing a major bump.

While here, check the existing `pnpm.overrides`: if an override pinned a transitive dep that the update has now carried past the advisory on its own, the override may be dead weight. Note redundant ones for the user — don't aggressively prune unless it's clearly stale, since overrides are load-bearing.

### 4. Verify it's actually good to go

A dependency update is only done when it's proven green. Run the repo's gate:

```
pnpm ready    # = format → format:check → lint:fix → lint → astro check
```

Then, because type-checking alone won't catch a dep that breaks the static build:

```
pnpm build
```

If either fails:

- Lint/format issues are auto-fixed by `pnpm ready`; just re-run and stage the result.
- A type error or build break from an updated dep is a real signal. Investigate it (read the dep's changelog if needed). If a specific bump is the culprit and there's no quick fix, **pin that one back** to its prior in-range version via an override or a tightened range, note it for the user, and re-run the gate. Don't ship red.

Re-run until both are clean. Evidence before claiming success — actually see the passing output.

### 5. Commit

Stage the dependency files (and any override edits):

```
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): audit fixes and semver-safe updates"
```

Use a conventional `chore(deps):` message. If the diff is mostly one notable bump or a specific CVE fix, say so in the subject or a short body — reviewers scan deps PRs fast, so make the headline useful (e.g. `chore(deps): patch <pkg> advisory + bump astro/svelte`).

### 6. Reconcile Dependabot PRs

For each open Dependabot PR from step 2, compare the version now in `pnpm-lock.yaml` against the version that PR targets:

- **Superseded** (our installed version ≥ the PR's target): close it with a comment so the queue stays clean and the trail is clear.

  ```
  gh pr comment <number> --body "Superseded by the consolidated dependency update in #<new-pr>. Bumped to <version-or-higher> there."
  gh pr close <number>
  ```

- **Not superseded** (a major bump we intentionally skipped, or otherwise still outstanding): leave it open and mention it in the final report so the user can decide on the major upgrade deliberately.

If `gh` isn't authenticated and the user declined to log in, skip the close step but still list which PRs are superseded so they can close them.

### 7. Open the single PR

Push and open one PR, `dev` → `main`:

```
git push -u origin dev
gh pr create --base main --head dev --title "chore(deps): audit fixes and dependency updates" --body "<body>"
```

If a `dev`→`main` PR already exists, push to it and update its body instead of opening a duplicate.

**PR body** — `## Summary` with bullets, and **no Test plan section** (repo convention). Cover:

- What was updated (group by notable bumps; don't list every transitive line)
- Advisories fixed (name the CVE/advisory if `pnpm audit` reported one)
- Which Dependabot PRs were consolidated and closed (link them)
- Any major-bump Dependabot PRs left open for separate review
- Confirmation that `pnpm ready` and `pnpm build` pass

Keep it scannable — a reviewer should grasp the blast radius in ten seconds.

### 8. Report

One tight summary: deps updated, advisories cleared (0 remaining), Dependabot PRs closed vs. left open, gate + build status, and the new PR link. Flag anything that needs a human decision (remaining advisory with no in-range fix, a dep pinned back, a major bump awaiting review).

## Notes

- This repo uses pnpm (`packageManager` is pinned). If `pnpm install` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, prefix with `CI=true`.
- Never bypass the gate to ship faster. The entire value of this command is that the update lands already verified — a green PR a reviewer can trust at a glance.
- Don't `git add -A`. Stage the dependency files explicitly so an unrelated stray file never rides along in a deps PR.
