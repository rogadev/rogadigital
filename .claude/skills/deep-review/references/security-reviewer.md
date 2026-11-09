# Security trust model: rogadigital.com

`security-reviewer` reads this before the diff. It describes what an attacker can gain on this site, who the attackers are, the control each sink already has, and the gaps that predate any change. Checked against `dev` on 2026-11-09; when the code disagrees, trust the code.

The site has no accounts, sessions, database, or authorization, so most of a generic checklist (IDOR, access control, SQL injection, session fixation) doesn't apply. What does apply is narrow: three public POST endpoints that send email, two secrets, a few HTML sinks and iframes, a build step that pulls remote HTML into `public/`, and the supply chain.

## What is worth attacking

- **The sending domain and Ryan's inbox.** `api/_lib/email.ts` sends through Resend from `roga.dev`. Choosing the recipient, sending without Turnstile, or sending at volume burns the domain's reputation, floods the inbox, or relays phishing under Ryan's name.
- **The two secrets.** `RESEND_API_KEY` sends mail as `roga.dev` to anyone; `TURNSTILE_SECRET_KEY` verifies challenges. Either one reaching the browser, a log, or a response is a Blocker.
- **The origin.** Script on `https://rogadigital.com` can rewrite the inquiry form to post prospects' messages elsewhere or phish visitors from a trusted domain. There is no CSP to catch it.
- **The build.** Whatever lands in `dist/` ships. A remote party that can write into `public/` or the bundle at build time has script on the origin.
- **The bill.** Vercel function invocations and the Resend quota are metered.

## Attackers

Rank each finding by the weakest attacker who can exploit it.

| ID  | Attacker                                       | Reach                                                                                                                                                       |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Any anonymous client or bot                    | POSTs any JSON straight to `/api/contact`, `/api/support`, `/api/media`, skipping `InquiryForm.svelte`. The client-side checks protect nothing.            |
| A2  | Someone who sends a visitor a crafted link     | Controls the query string, hash, and path: reflected script, open redirects, parameters islands or inline scripts read.                                     |
| A3  | A hostile or compromised third-party origin    | The demo origins in `src/lib/demos.ts` (`https://trips.roga.dev`, `https://puntledge.ca`), `challenges.cloudflare.com`, and the Resend and siteverify APIs. |
| A4  | A malicious package version or GitHub Action   | Runs at install (`allowBuilds`), at build, in CI, or in the browser bundle, through a new dependency, an override, a Dependabot bump, or a workflow change. |
| A5  | A repo author (`src/content/`, `src/data/`, `src/consts.ts`) | Trusted to write copy, not to run script. Matters only when authored text reaches a sink that can break out of its context.                     |

A1 sets most severities: the only control between A1 and the inbox is `verifyTurnstile` plus the honeypot. A3 is the one generic reviewers miss.

## Surfaces and their controls

### The form endpoints (`api/contact.ts`, `api/support.ts`, `api/media.ts`, `api/_lib/`)

- **Order.** Parse, `validate*Submission`, honeypot fake 200, configured check (500), `verifyTurnstile`, then `sendEmail`. No path reaches `sendEmail` unless `verifyTurnstile` returned true: a new endpoint, an early branch that sends, a test or admin shortcut, a retry that re-sends, or a skip keyed on a header, query, env flag, or `NODE_ENV` gives A1 an open spam cannon.
- **Turnstile fails closed.** `verifyTurnstile` (`api/_lib/turnstile.ts`) returns false with no secret and accepts only `verdict.success === true`; a non-JSON reply throws, which becomes a platform 500, still closed. Flag any change that treats a network error, a timeout, a missing secret, or a non-200 as success, accepts a token without calling siteverify, or sends the secret anywhere but the server-side request.
- **The recipient is fixed.** `TO_ADDRESS` and `FROM_ADDRESS` are constants in `api/_lib/email.ts`. A `to`, `cc`, `bcc`, or `from` built from input is an open relay. A "send the visitor a copy" feature is the same hole behind one Turnstile solve: at least a Warning, a Blocker when the attacker controls the body.
- **Header-like fields.** Resend takes JSON, so header injection needs CR or LF to survive into a header. `email` can't hold whitespace (`EMAIL_RE`), so `reply_to` is safe; `name` and `outlet` are only trimmed and flow into `subject`. Flag new input in `subject`, `reply_to`, `headers`, `tags`, or a `from` display name without stripping `\r` and `\n`; a switch from `text` to `html` built from input without escaping; and a move from the Resend HTTP API to raw SMTP or a mail library.
- **Bounds.** `name` and `outlet` cap at 200, `email` at 254, `message` at 5000 characters (`api/_lib/validation.ts`). Removing a cap or raising it by orders of magnitude is a security finding when it enables mail-size or quota abuse.
- **Error bodies** carry fixed, user-facing strings only. Flag a response that echoes `err.message`, an upstream body, a stack, an env name, or the request.
- **Outbound calls** go only to `https://api.resend.com/emails` and `https://challenges.cloudflare.com/turnstile/v0/siteverify`. A new outbound URL built from input is SSRF from a Vercel function: Blocker. A new expensive step before Turnstile lets A1 spend the budget unverified: Warning.

### Secrets and the `PUBLIC_` boundary

- `import.meta.env.PUBLIC_*` is inlined into the client bundle. A secret renamed to or introduced as `PUBLIC_*` is a Blocker.
- `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` are read with `process.env` only in `api/_lib/`. A read from `src/` (pages, islands, integrations) is a Blocker: Astro can inline values reached at build into static HTML.
- `api/_lib/validation.ts` importing `../../src/consts.js` is fine. The reverse, anything under `src/` importing `api/_lib/email.ts`, puts the address in the bundle.
- A credential literal in any committed file is a Blocker; `.env` and `.env.*` stay gitignored.

### HTML sinks and inline scripts

- **JSON-LD** (`src/components/BaseHead.astro`): `set:html={JSON.stringify(schema)}` in an `is:inline` `<script type="application/ld+json">`. `JSON.stringify` doesn't escape `<`, so `</script>` in any schema field breaks out. Inputs today are author-written (`src/lib/schema.ts` over `src/consts.ts` and frontmatter). Feeding it anything not repo-authored is a Blocker; the fix is `JSON.stringify(schema).replace(/</g, '\\u003c')`.
- **Any new** `set:html`, `{@html}`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, or `srcdoc` whose input isn't a compile-time constant: Blocker when A1 to A3 reach the input, Warning when only A5 does. Svelte and Astro `{expr}` interpolation escape by default; that is the idiom.
- **Inline scripts.** `is:inline` ships verbatim. The theme bootstrap in `src/layouts/Base.astro` reads `localStorage.theme` and only compares it with fixed values; keep new storage or URL reads to comparisons. `define:vars` serializes values into a script; flag it with non-author input.
- **URL reads.** `InquiryForm.svelte` reads `?product=` and uses it only after matching `SUPPORT_PRODUCTS`. That allowlist is the idiom. A URL value placed into `href`, `src`, `action`, `location`, or HTML without one is a finding; check `javascript:`.
- `target="_blank"` to another origin carries `rel="noopener noreferrer"`; missing it is a Nit.

### Iframes and embeds

- **`DemoFrame.astro`** frames the demo origins with `sandbox="allow-scripts allow-same-origin"` when it is a non-interactive preview with an `href` overlay. When the reachability probe fails, its script sets `sandbox=""` before swapping `src` to the same-origin snapshot under `/demos/`. Flag a demo origin that isn't HTTPS or isn't Ryan's, a `src` built from URL data, an `allow=` granting camera, microphone, geolocation, payment, or clipboard, a weakened snapshot sandbox, or the overlay losing its `rel`.
- **`EmbeddedPage.astro`** frames a same-origin file from `public/embeds/` and reaches into `iframe.contentDocument` by design. It becomes a hole if `src` points off-origin or at user-influenced content, or if an embed builds HTML from its URL, `postMessage`, or storage. Embed files are raw HTML served as-is; review them like source. `public/embeds/orc-pack/one-agent-vs-a-team.html` uses `innerHTML` over in-file constants only.
- **`postMessage`:** none today. A new listener checks `event.origin` against an exact allowlist; a sender names the target origin, never `'*'`.

### Build-time content (`src/integrations/demo-snapshots.ts`, `src/lib/snapshot-sanitize.ts`)

At build start (and dev start) the integration fetches each `DEMO_SITES` page, refuses redirects, inlines same-origin CSS and assets as `data:` URIs, and runs `sanitizeSnapshotHtml`: `stripActiveContent` removes scripts, inline `on*=` handlers, and preload links in a loop until stable, and a `SNAPSHOT_CSP` meta tag forbids scripts, forms, and frames. The HTML lands in the committed `public/demos/` and ships. A snapshot older than 7 days is re-captured on every build, including Vercel builds, so remote HTML reaches production without a commit. Flag a diff that widens what A3 can ship: a new demo origin or page, a weaker strip or CSP, a larger inline cap, following URLs from the remote HTML beyond the same-origin check, or any new build-time fetcher that writes remote content into `public/`, `src/`, or `dist/`. `tests/snapshot-sanitize.test.ts` pins the sanitizer.

### Redirects and routing

- `vercel.json` and `astro.config.mjs` redirects use fixed destinations. Flag a destination built from a captured parameter that can become `//evil.example` or a full URL, a `has` or `missing` rule whose query value feeds the destination, and a client `window.location` assignment from URL, hash, or storage without a same-origin, single-leading-slash check.
- A `rewrites` entry to an external origin makes the site serve third-party content: Blocker unless it is a documented proxy.

### Supply chain and CI

- **New dependencies:** name the package, where it runs (browser, build, or `api/`), and flag typosquat-shaped names, install scripts, very new packages with few maintainers, and a dependency that replaces a few lines of code. Version nags without a reachable advisory aren't findings.
- **`pnpm-workspace.yaml`:** a new `allowBuilds` entry is arbitrary code on every install (Warning at least). `minimumReleaseAgeExclude` entries are exact versions with a security reason. An `overrides` change that pins below a patched version, or drops an advisory override without the upgrade that replaces it, reopens an advisory.
- **Lockfile:** a resolution swapped to a git URL, a tarball, or another registry, or packages the manifest doesn't explain: Blocker until explained.
- **CI** (`.github/workflows/ci.yml`, `pull_request` to `main` and `dev`, no secrets): flag `pull_request_target` or `workflow_run` that checks out PR code, a secret exposed to fork PRs, write permissions, an action pinned to a mutable branch from an unknown publisher, and `run:` steps that interpolate `${{ github.event.* }}` text into shell. **Dependabot** (`.github/dependabot.yml`) has cooldowns that keep bumps behind pnpm's release-age window; removing them is a Warning.

## Known pre-existing gaps

Recognize these; count one only where the change interacts with it.

- **JSON-LD breakout:** `src/components/BaseHead.astro` doesn't escape `<` in the serialized schema. Author-only input today.
- **Control characters in the subject:** `name` and `outlet` in `api/_lib/validation.ts` are trimmed but can hold internal `\r`, `\n`, or other control characters, and flow into `subject` in `buildEmail`, `buildContactEmail`, and `buildMediaEmail`. Resend is expected to reject or encode them, so any exploit claim is medium confidence at most.
- **Turnstile hardening:** `verifyTurnstile` doesn't check `hostname` or `action` in the verdict; neither `fetch` in `api/_lib/` has a timeout; `remoteip` comes from the first `x-forwarded-for` entry, advisory only.
- **No security headers:** `vercel.json` sets no CSP, `frame-ancestors` or `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`. Rate every new sink as having no CSP safety net.
- **CI token scope:** `ci.yml` has no top-level `permissions:`, so the token gets the repository default.
- **Resend failure log:** `sendEmail` logs `await res.text()`, which can echo request fields into Vercel logs.
