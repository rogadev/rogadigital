# Roga Digital — Migration Plan

**Companion to:** `BRIEF.md`
**Goal:** ship the redesigned site at parity-or-better with the current one, on a fresh Astro stack, without a flag-day cutover.

---

## Working principles

- The old site stays archived at `_references/old-svelte-site/` for reference and content lift.
- We build the new site in this same repo, at the root. Same Vercel project, same domain.
- Every phase ends with something deployable. No big-bang merge.
- We do not rebuild every old route on day one. Home + work + one case study + blog scaffold is enough to cut over.
- Content is migrated _deliberately_, not bulk-copied. A lot of old copy was written for a different positioning and should be rewritten.

## Phases

### Phase 0 — Setup (½ day)

- [ ] Scaffold Astro project at repo root (`pnpm create astro@latest .` into the now-empty root).
  - TypeScript: strict.
  - Integrations: `@astrojs/svelte`, `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/tailwind`, `@astrojs/vercel`.
- [ ] Reinstate top-level config: `.gitignore` (extend), `.prettierrc`, `.editorconfig`, `tsconfig.json`.
- [ ] Tailwind config with design-token layer (colors, type scale, spacing, radii, shadows-as-borders).
- [ ] Vercel adapter set to static; verify `pnpm build` outputs a deployable `dist/`.
- [ ] First deploy to a Vercel preview URL — placeholder home page only.
- [ ] Update `CLAUDE.md` for the new stack (Astro + Svelte islands + Tailwind + MDX).

**Exit:** preview deploy works, CI is green, `pnpm dev` runs.

### Phase 1 — Design system (1–2 days)

- [ ] Tokens: color (light + dark), type, spacing, radius, border, motion.
- [ ] Typography: pick and self-host Geist or Inter + mono pair. Subset to Latin. `font-display: swap`.
- [ ] Layout primitives: `<Container>`, `<Section>`, `<Stack>`, `<Grid>`, `<Hairline>`.
- [ ] Component primitives (Astro, no JS): `Button`, `Link`, `Tag`, `Card`, `Code`, `Kbd`, `Quote`, `Stat`.
- [ ] Theme toggle (Svelte island, persisted, no FOUC — set theme class on `<html>` before paint).
- [ ] One-page style guide at `/_styles` (dev-only, gated) so we can compare components side-by-side.

**Exit:** style guide page renders, dark/light parity verified, no CLS.

### Phase 2 — Home page (2 days)

- [ ] Hero: positioning sentence, sub-line, primary CTA, secondary link. Real product fragment to the right (static screenshot, not illustration).
- [ ] Selected work: 3–5 case study cards. Card = real screenshot, client, problem in one line, outcome metric, link.
- [ ] Services: condensed list with short anchored descriptions and link-outs.
- [ ] Recent writing: latest 2 posts.
- [ ] Footer: minimal — contact, social, copyright, theme toggle.
- [ ] Lighthouse check; budget gate at 100/100/100/100.

**Exit:** home page is shippable on its own. Two trusted reviewers pass the "can you tell what I do" test from the brief.

### Phase 3 — Work / case studies (2 days)

- [ ] `/work` index page — same card pattern as home, full list.
- [ ] Case study layout. MDX-authored. Each case study = problem, approach, outcome, screenshots, tech notes. No marketing fluff.
- [ ] Migrate 1 case study end-to-end as the template (suggest: TechCentral / TELUS — strongest credential).
- [ ] Migrate remaining case studies (eztripr, lot-logistics, copycleanse) — content lifted from old site, edited for tone, screenshots audited.

**Exit:** all four case studies live and linkable.

### Phase 4 — Blog scaffold (1 day)

- [ ] Astro content collection for `blog/`, schema-validated frontmatter.
- [ ] Index page: chronological list, dek + tags + read time.
- [ ] Post layout: prose styles, code highlighting (Shiki), heading anchors, prev/next, related posts by tag.
- [ ] RSS feed at `/rss.xml`.
- [ ] Tag pages.
- [ ] Open Graph image generation per post (Astro `og` integration or Satori).
- [ ] Seed with 1–2 real posts so the index isn't empty at launch.

**Exit:** `/blog` is live with at least one real post.

### Phase 5 — Remaining pages (1 day)

- [ ] `/services` — single page, anchor-linked sections per offering. Replaces all the old per-service routes.
- [ ] `/about` — short bio, photo, how-I-work.
- [ ] `/contact` — booking link, email (obfuscated), minimal form (mailto fallback).
- [ ] `/resume` — port from old site, light restyle.
- [ ] `/privacy`, `/terms` — port copy as-is unless legal review needed.
- [ ] 404 page that fits the design.

**Exit:** every URL on the production site that gets meaningful traffic has a destination on the new site.

### Phase 6 — SEO / redirects / launch (½ day)

- [ ] Inventory old URLs from `_references/old-svelte-site/src/routes/` and from current sitemap.
- [ ] Map every old URL to its new home (or to the closest equivalent). Document in `docs/redirects.md`.
- [ ] Configure redirects in `vercel.json` (or `astro.config.mjs` redirects).
- [ ] Sitemap, robots.txt, canonical tags, OG defaults.
- [ ] Replace favicon set if rebranding visuals; otherwise port from old `static/logo/`.
- [ ] Final Lighthouse + manual smoke test on mobile.
- [ ] Cut over: merge to `main`, deploy to production, watch logs for 24h.

**Exit:** roga.dev is the new site. Old site remains archived in repo for content reference.

### Phase 7 — Post-launch (ongoing)

- Monitor 404s in Vercel logs for the first week; add redirects as needed.
- Write the next 2–3 blog posts to give the index momentum.
- Schedule a 2-week post-launch review: revisit copy, fix anything that read better in design than in the wild.

## Risks and how we handle them

| Risk                                               | Mitigation                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Scope creep on case studies                        | Cap at 4 for launch, the rest can come later as blog posts.            |
| Astro + Svelte island hydration order causing FOUC | Theme is set via inline script before paint; islands are non-blocking. |
| Lighthouse regressions when we add the blog        | Budget per route; CI check against `@lhci/cli` on PRs.                 |
| Domain / DNS hiccup at cutover                     | Same Vercel project; cutover is a deploy, not a DNS change.            |
| Lost SEO from URL changes                          | Per-URL redirect map in Phase 6, no exceptions.                        |

## Open questions for Ryan before Phase 1

1. **Brand direction** — keep "Ryan Roga" personal-brand framing, or push more "studio of one" framing? Affects tone, photography, and whether `/about` leads with "I" or "we."
2. **Accent color** — open to me proposing 2–3 candidates in Phase 1 against real components, or do you already have one in mind?
3. **Type pairing** — Geist (Vercel-aligned) vs Inter (more neutral) vs something with more personality (e.g. Söhne if licensing fits)? Will mock both in Phase 1.
4. **Case study count at launch** — confirm the four listed are the right four, in the right order of prominence.
5. **Booking link** — keep the same external scheduler, or swap?
