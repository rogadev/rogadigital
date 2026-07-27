# Roga Digital — Redesign Brief

**Author:** Ryan Roga
**Status:** Draft v1 · 2026-05-01
**Replaces:** SvelteKit site (archived to `_references/old-svelte-site/`)

---

## 1. Why redesign

The current site reads as "competent freelance portfolio." It does not read as a person who builds the kind of internal tools, dashboards, and operational software that the work actually delivers. The redesign is a credibility play: the site itself should be a sample of the work — dense, fast, restrained, considered.

Audience is operators and decision-makers at small-to-mid businesses who already need software built and are deciding _who_ to trust. They are not browsing for inspiration. They are filtering.

## 2. Positioning

- **What I do:** Build internal tools and web applications for businesses. Dashboards, integrations, workflow automation, line-of-business apps.
- **What separates the work:** Functional design — the interface earns its keep. Things load fast, fit on screen, surface the right data, stay out of the way during real use.
- **The site should prove that** by being one. Not by claiming it.

## 3. Design principles

These are pulled from what experts consistently single out about Linear, Stripe, Vercel, and Resend — and translated into rules for this site.

### 3.1 Density without overwhelm

Linear and Stripe both put more information per screen than typical SaaS marketing — but they read calmly because typographic hierarchy and whitespace are deliberate. We pack content in. We do not pad sections to look "premium."

### 3.2 Typography is the design

When type is set well, ornamentation becomes unnecessary. Pick a strong sans (geometric, neutral) and a mono with personality. Use weight, size, and tracking — not color or borders — to build hierarchy. The site should hold up if you turned color off.

### 3.3 Restraint with color

One accent. Used for action, status, or emphasis — never decoration. Everything else is a grayscale ramp. Linear and Vercel both win this way. Resend especially.

### 3.4 Purposeful motion only

Micro-interactions confirm action (40–200ms). No scroll-triggered fade-ins. No decorative parallax. If motion is not communicating something, remove it.

### 3.5 Real product surfaces, not illustrations

Linear shows real app screens. Stripe shows real API responses. Vercel shows real deployment logs. We show real dashboards, real query results, real interfaces. No vector illustrations of "the cloud." No abstract gradients.

### 3.6 Borders, not shadows

Hairline borders (1px, low-contrast) define structure. Drop shadows are out — they read as 2018 SaaS. Where we need elevation, we use a slightly lighter surface.

### 3.7 Empty / error / loading states are first-class

Every interactive surface gets all four states designed at once. Skeleton states that look intentional, not broken. Vercel is the model here.

### 3.8 Monospace as personality

Use mono for technical content — code, IDs, timestamps, file paths, command palette. Treat it as part of the brand language, not just `<code>` formatting. Vercel does this to signal "we are engineers."

### 3.9 Performance is design

Subset fonts. No CLS. Above-the-fold renders < 100ms after HTML arrives. Lighthouse 100/100/100/100 is the floor, not the goal.

### 3.10 Dark mode is a peer

Dark and light are designed in parallel, not "dark = invert." Both look intentional. Default to system preference.

## 4. What the home page must do

In order, above the fold:

1. **State what I do**, in a sentence a busy operator understands. No taglines.
2. **Show one piece of evidence** — a real interface fragment, a metric, a quote with a name and company.
3. **Tell them where to go next** — book a call, read a case study, see the work.

Below the fold (still on the home page):

4. **Selected work** — three to five case studies, each rendered as a small dense card with the actual problem, the actual outcome, and a real screenshot.
5. **Services** — short list, link out, no rephrasing the same thing four times.
6. **A signal of recency** — the latest blog post or two, headline + date + read time. Cheap proof that I am still paying attention.
7. **One clear CTA** at the bottom.

What is _not_ on the home page anymore: a tech-stack logo wall, a generic "process" diagram, an FAQ with five obvious questions, decorative gradients, a hero illustration.

## 5. Information architecture

```
/                         Home
/work                     Case studies index
/work/[slug]              Individual case study
/services                 What I build (single page, sections per offering)
/blog                     Blog index
/blog/[slug]              Post
/about                    Short bio + photo + how I work
/contact                  Booking link + email + minimal form
/resume                   Plain-text-ish CV (kept from old site)
/privacy, /terms          Legal
```

Routes that existed before and are dropped or merged: separate sub-pages per service (`/services/dashboards`, `/services/integrations`, etc. — collapse into anchors on `/services`), `/free-tools`, `/development`, `/internal-tools`, `/ai`. They split traffic and dilute the message. If any earn a comeback, they become blog posts first.

## 6. Blog

A real blog, not a CMS shell with three placeholder posts. Topics:

- Project write-ups (longer than a case study, with the messy details).
- Opinions on tooling (what I am picking up, what I am dropping).
- Industry shifts — practical takes, not hot takes.
- AI impact on how this kind of software gets built and bought.

Authored as MDX. Each post: title, dek, date, est. read time, tags, optional cover. RSS feed. Paginated index. Tag filter.

## 7. Visual system (initial direction — to be refined in design)

- **Type:** Geist Sans + Geist Mono, or Inter + JetBrains Mono. Both are free, both subset well, both already feel "professional engineering." Decide during prototyping.
- **Color:** Near-black / near-white background pair, full grayscale ramp, one accent (candidate: a saturated blue-violet — distinctive, not corporate-blue, not the Linear purple). Status colors only when needed.
- **Spacing:** 4px base, scale of 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.
- **Radius:** 6px default, 4px for tight UI, 12px for cards. No fully-rounded "pill" everything.
- **Borders:** 1px, neutral-200 / neutral-800.
- **Layout:** 1200–1280px max content width, generous gutters, 12-column where useful.

## 8. Tech stack

- **Astro** for the site shell — content-first, ships zero JS by default, MDX-native.
- **Svelte** islands only where interactivity is real (command palette, theme toggle, any live-data demos). If a section can be static HTML and CSS, it is.
- **Tailwind CSS** with a tight token layer — design tokens defined once, used everywhere.
- **Vercel** for hosting, same project. Static output, ISR only if a page genuinely needs it.
- **MDX** for the blog. No headless CMS — files in the repo, version controlled.

## 9. Out of scope

- A redesigned admin / CMS.
- Newsletter signup (defer until there is something to send).
- i18n.
- Animation-heavy hero scenes.
- Dynamic personalization.

## 10. Success criteria

- Lighthouse 100 / 100 / 100 / 100 on `/`, `/work`, `/blog`, and one case study.
- LCP < 1.0s on a fast connection, < 2.5s on slow 4G.
- Total JS on home < 30KB (gzipped) — ideally zero.
- Site renders correctly without JavaScript.
- Two colleagues in the field, shown the home page cold, can correctly state what I do within ten seconds.
