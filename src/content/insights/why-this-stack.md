---
title: 'Why this site runs on Astro and Vercel'
description: "A portfolio site has one job: load fast, rank well, and get out of the way. Here's why Astro and Vercel are the right tools for that job — and what the same thinking looks like applied to your project."
pubDate: 2026-05-11
tags: ['web-performance', 'seo', 'architecture']
readingTime: '4 min read'
draft: false
---

## The bet

Every framework decision is a bet on what matters most. For a site like this one — a portfolio, case studies, long-form articles — the bet is simple: the fastest page wins. Not the most interactive page, not the most feature-rich page. The fastest one. Here's why that matters, and what it looks like in practice.

## Speed is not a feature. It is the feature.

Google has <a href="https://developers.google.com/search/blog/2020/05/evaluating-page-experience" target="_blank" rel="noopener noreferrer">published the data</a> repeatedly, and it has not changed direction. A page that loads in under 2.5 seconds scores well on Largest Contentful Paint. A page that loads in 4 seconds loses roughly half its visitors before they see a single word. <a href="https://developers.google.com/search/docs/appearance/core-web-vitals" target="_blank" rel="noopener noreferrer">Core Web Vitals</a> — the performance metrics Google uses to rank pages — are not a tiebreaker between two otherwise equal sites. They are a gate. A slow portfolio site does not just feel bad. It ranks worse, converts worse, and tells every visitor something about how carefully the person behind it thinks about the details.

That is the lens through which every technology decision on this site was made.

## What Astro does differently

Most modern web frameworks — <a href="https://react.dev/" target="_blank" rel="noopener noreferrer">React</a>, <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">Next.js</a>, <a href="https://svelte.dev/docs/kit" target="_blank" rel="noopener noreferrer">SvelteKit</a> — ship JavaScript to the browser on every page, whether the page needs it or not. A static "About" page built in Next.js still sends a JavaScript runtime to the browser, hydrates the page client-side, and only then becomes interactive. The page looks simple. The machinery behind it is not.

These are excellent frameworks — and for a highly interactive web application, something like SvelteKit would likely be the better choice. But the needs of every website are different. A content-driven site where SEO and page load speed are the priority has fundamentally different requirements than a real-time dashboard or a collaborative editing tool. The right question is not "which framework is best?" — it is "which framework is best _for this job_?"

<a href="https://astro.build/" target="_blank" rel="noopener noreferrer">Astro</a> takes the opposite approach. By default, it ships zero JavaScript. A page is rendered to HTML at build time, and that HTML is what the browser receives. No runtime. No hydration. No waiting for a bundle to parse before the text appears on screen.

When a page _does_ need interactivity — a form, an animation, a dynamic component — Astro uses what it calls <a href="https://docs.astro.build/en/concepts/islands/" target="_blank" rel="noopener noreferrer">"islands."</a> The interactive piece loads independently, on its own schedule, without blocking the rest of the page. The static content is already visible while the interactive parts are still loading. This is not a workaround. It is the architecture.

For a content-driven site, the result is measurable. Pages that would score 60–75 on Google's Lighthouse performance audit in a typical React setup score 95–100 in Astro, with less effort, because the framework is not fighting its own defaults to get there.

## Why edge hosting changes the math

Building a fast site and then serving it from a single data centre on the other side of the continent undoes most of the work. A visitor in Vancouver requesting a page from a server in Virginia adds 70–100ms of network latency before the first byte arrives. That does not sound like much. It compounds on every asset — the HTML, the stylesheet, the fonts, the images — and the total is the difference between a page that feels instant and one that feels like it is thinking.

<a href="https://vercel.com/" target="_blank" rel="noopener noreferrer">Vercel</a> deploys to a <a href="https://vercel.com/docs/edge-network" target="_blank" rel="noopener noreferrer">global edge network</a>. The built HTML is replicated to data centres worldwide, and each visitor's request is served from the node closest to them. A visitor in Toronto gets the page from Toronto. A visitor in London gets it from London. The latency floor drops to single-digit milliseconds.

For a portfolio site, this means every page load — the first impression a prospective client has — is as fast as the network allows. No cold starts, no server-side rendering delays, no container spin-up time. The page is already built. It is already nearby. It just arrives.

## What this means for your project

The principle generalises beyond portfolio sites. The question is always the same: what does this site _actually need to do_, and which tools match that job without dragging in overhead for capabilities you will never use?

A content-heavy marketing site does not need a full application framework. It needs fast static pages, good SEO defaults, and the ability to add interactivity surgically where it matters. A SaaS dashboard, on the other hand, probably does need a rich client-side runtime — and choosing Astro there would be the wrong call for the same reason choosing Next.js here would be.

The value is not in the tools. It is in the discipline of matching the tool to the job. A site that loads in under a second, scores 95+ on Core Web Vitals, and ranks well on Google did not get there by accident. It got there because someone made the stack decision _before_ writing the first line of code, based on what the site needed to do — not on what was trending on Hacker News that week.

If you are planning a web project and want to talk through what the right stack looks like for your specific situation — [let's talk](/contact/).
