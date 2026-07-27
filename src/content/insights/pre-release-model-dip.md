---
title: 'Opus 4.8 is getting worse. That usually means a new model is close.'
description: 'Opus 4.8 felt sharp at launch and duller three weeks on. The same dip preceded GPT-4’s 2023 slump and Claude’s April decline — here’s what I read into it.'
pubDate: 2026-06-22
tags: ['ai', 'llms', 'tooling']
readingTime: '6 min read'
draft: true
---

On 29 May I wrote on [my benchmarks page](/labs/benchmarks/) that Opus 4.8 was the most dependable coding model I'd used — that it held focus across long tasks without wandering or looping back through bad patches. Three weeks later I'm watching the same model drop the thread in the middle of a function, reintroduce a bug I'd just had it fix, and reach for the quick patch over the correct one. Same model name, same prompts, same project. It just feels duller.

I've started reading that feeling as a signal. When a model I rely on quietly gets worse, a new one is usually a few weeks out — and I don't think the timing is random.

## I've seen this one before

In December 2023, GPT-4 users began reporting that the model had gotten lazy: truncating code, refusing tasks it used to take, padding answers instead of doing the work. It got loud enough that OpenAI responded directly.

> "we've heard all your feedback about GPT4 getting lazier! we haven't updated the model since Nov 11th, and this certainly isn't intentional."
>
> — OpenAI, on X, December 2023 ([via CIO Dive](https://www.ciodive.com/news/chatgpt-lazy-winter-break-LLM-behavior-drifts/703165/))

The closer example is Anthropic's own. Through March and April 2026, developers reported that Claude and Claude Code had degraded — abandoning tasks midway, choosing the simplest fix over the right one, contradicting themselves. The complaints ran for weeks across GitHub, Reddit, and X, and picked up a name: _AI shrinkflation_, paying the same price for a quietly weaker product. Stella Laurenzo, a director in AMD's AI group, published an audit showing reasoning depth falling off.

Anthropic eventually traced the decline to three concrete changes, none of them a new model: on 4 March it had dropped Claude Code's default reasoning effort from `high` to `medium` to cut latency; a 26 March bug made the model discard its own reasoning mid-session; and a 16 April system-prompt instruction capping response length "measurably hurt coding quality" before it was reversed on 20 April ([Fortune, 24 April 2026](https://fortune.com/2026/04/24/anthropic-engineering-missteps-claude-code-performance-decline-user-backlash/)). The company stated plainly that it "does not purposely degrade the performance of its Claude models."

Worth holding onto that sentence. I'll come back to it.

## Is it the model, or is it me?

The uncomfortable part of this topic is that the felt experience is real _and_ unreliable at the same time.

The "real" side is documented. Lingjiao Chen, Matei Zaharia, and James Zou tracked GPT-3.5 and GPT-4 across 2023 and found the same model name covering very different behaviour over time — GPT-4's accuracy at identifying prime numbers fell from 84% in March to 51% in June, partly because it stopped following chain-of-thought prompting the way it had ([_How Is ChatGPT's Behavior Changing over Time?_](https://arxiv.org/abs/2307.09009), 2023). The model behind a stable name is a moving target, and no vendor owes you a changelog for every shift in it.

The "unreliable" side is just as real. Novelty decays: the first week with a strong model, you forgive its misses; the third week, you count them. And the mundane mechanics are mundane for a reason. Providers quantize models to cut inference cost, which measurably trims quality — Red Hat ran [over half a million evaluations on quantized models](https://developers.redhat.com/articles/2024/10/17/we-ran-over-half-million-evaluations-quantized-llms) and found the loss real, if usually small. Add capacity throttling under load, a quiet A/B test, or a tightened system prompt, and the quality you feel moves without anyone shipping a worse model.

Both companies, asked directly, said they don't do this on purpose. I have nothing to contradict them.

## What I suspect, and can't prove

Here is the part I can't source, flagged as exactly that: a hunch about incentives, not a finding.

When the next model is close, I don't think a vendor is in any hurry to fix the dip in the current one. A model that feels tired makes its replacement feel like a leap — the contrast does the marketing. I am not claiming anyone sat in a room and decided to nerf Opus 4.8. I have no evidence for that, and the public record cuts the other way: the documented cases all had boring causes, and the companies involved have flatly denied intent. It's a feeling about which way the incentives lean, and I'd rather say that out loud than dress it up as proof.

What I'll say without hedging is the part that doesn't need proof. Paying full freight for a tool that's quietly worse than it was a month ago is a bad deal, and _shrinkflation_ is the honest word for the experience. The frustration is legitimate even when the conspiracy isn't.

## The call

So, a prediction — bounded so it can actually be wrong, which is the only kind worth making.

Anthropic's recent cadence has been roughly one flagship every six to ten weeks: Opus 4.5 in late November, 4.6 in early February, 4.7 in mid-April, 4.8 on 28 May. Fable 5 shipped on 10 June and was [pulled from service three days later](/labs/benchmarks/), leaving the top of the lineup vacant. And 4.8 — the current default — is the model now showing the dip.

Put those three together and I expect a new Anthropic flagship within about six weeks of writing this: by early August 2026. If it's mid-August and nothing has shipped, I was wrong, and this post stays up saying so.

## What to actually do about it

Don't re-architect around a model's bad week. The teams that get burned are the ones flying on vibes — they feel a dip, panic, and rip out a workflow that was fine. If your work depends on a model, instrument it: keep a handful of real tasks you re-run and score, so you can tell genuine drift from a bad mood. Measurement is what lets you see the dip, route around it for a week, and wait.

The feeling that your tools got worse is worth taking seriously. It's just not worth taking on faith.
