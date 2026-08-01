---
title: "The price war is on: OpenAI cuts Luna by 80%, Anthropic ships Opus 5"
date: "2026-08-03"
category: "Actu"
level: "Semaine 32"
summary: "In three weeks, GPT-5.6 Luna lost 80% of its price, Opus 5 topped the Intelligence Index without raising its rate, and Kimi K3 opened its API at half price — competition shifts from capability to cost. Plus: Claude conversations found in Google."
---

## The big story

The model race isn't being fought on benchmarks anymore. It's being fought on the invoice.

On **July 30**, OpenAI **cut GPT-5.6 Luna's price by 80%** — from $1 / $6 to **$0.20 / $1.20** per million tokens (input / output) — and Terra's by 20% ($2.50 / $15 → $2 / $12). Flagship Sol stayed put at $5 / $30. The detail that matters: the GPT-5.6 family was **21 days old**. Nobody divides a three-week-old product's price by five without a reason.

The reason is what happened right before:

- **Claude Opus 5** (Anthropic, July 24) took first place on the *Artificial Analysis Intelligence Index* with 61 points — **at the same price as its predecessor Opus 4.8** ($5 / $25), roughly half the cost per task of Fable 5.
- **Kimi K3**, Moonshot AI's 2.8-trillion-parameter open-weight model, opened its **API with a 1-million-token context window**, at about half the price of the US flagships.

Three labs, three strategies, one shared move: the price of intelligence per task is collapsing. The phrase to remember is **cost per task**, not price per token — a model twice as expensive per token that solves the problem in one call instead of five ends up cheaper. That's precisely Anthropic's argument for Opus 5.

> 🎤 **In an interview** — "LLM prices are falling" is a platitude. "GPT-5.6 Luna went from $1 to $0.20 per million input tokens three weeks after launch, under pressure from Opus 5 and Chinese open-weight models" is dated, specific and sourced. The gap between those two answers is literally tech-watch — and that's what the recruiter is measuring.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| Shared Claude conversations found in Google | Anthropic | Spotted July 25: hundreds of public chats and Artifacts indexed (resumes, API keys, financial spreadsheets). Pages lacked `noindex`. Fixed July 28 via `robots.txt` |
| MAI-Cyber-1-Flash + Project Perception | Microsoft | July 27: first in-house cyber model (96% on CyberGym) plus *red / blue / green* agents that attack, triage and patch. Public preview August 3 |
| Kimi K3 API, 1M context | Moonshot AI | The largest open-weight model ever released becomes a cheap API — part of where the pricing pressure comes from |
| End of npm tokens that bypass 2FA | npm / GitHub | First step in early August: *granular access tokens* configured to bypass 2FA lose sensitive actions. Check your CI |
| AZ-204 retired, replaced by AI-200 | Microsoft Learn | The "Azure Developer Associate" cert ends July 31 in favour of "Azure AI Cloud Developer Associate". Even the certification path is being rewritten around AI |

## Why it matters to you

- **Cost is no longer an excuse for having no AI project.** At $0.20 per million input tokens, processing a thousand documents in a side project costs pennies. "I didn't have the API budget" no longer holds up in front of a recruiter.
- **Picking the right tier is becoming a skill.** Routing simple tasks (extraction, classification, rewriting) to a small model and keeping the flagship for hard reasoning is an architecture decision. In an interview, "I routed 90% of calls to the small model and measured cost per task" beats "I used AI" by a mile.
- **The Claude/Google incident is a web lesson, not an AI one.** An unguessable URL is not access control. The moment a "private" link circulates on a forum, a crawler follows it. `noindex`, `robots.txt`, and above all real server-side authorization — that applies to your Astro, Next or Django projects exactly as it does to Claude.
- **AI security is organising on the defence side.** After the agentic intrusion Hugging Face suffered in July, Microsoft is shipping security agents. The topic moves from conference talk to product — and therefore to hiring.

## In an interview

**"Do you follow tech news? Tell me something recent."** — The late-July price war: the 80% cut on Luna, Opus 5 topping the Intelligence Index at a flat rate, Kimi K3's API at half price. Then the takeaway that shows you understood: competition is no longer about "who has the best model" but "who delivers the most intelligence per euro".

**"How would you keep an AI feature's cost under control in production?"** — Four concrete levers: route by tier based on task difficulty, cache repeated system prompts, move anything non-real-time to *batch*, and above all **measure cost per solved task**, not cost per token. Adding that you'd set a spend cap and an alert shows you've already thought about production.

**"Is a share link secure?"** — No. That's *obscurity*, not security. Citing the Claude conversations indexed by Google in late July illustrates it in one sentence: once the link leaks, the data is public and potentially archived by search engines. The right answer is still server-side authorization.

## Going further

- [OpenAI cuts Luna's price by 80% — the competitive-pressure read (VentureBeat)](https://venturebeat.com/technology/ai-price-wars-openai-cuts-gpt-5-6-luna-prices-by-80-as-model-competition-shifts-toward-cost)
- [OpenAI cuts prices for two GPT-5.6 models (CNBC)](https://www.cnbc.com/2026/07/30/open-ai-price-cut-gpt.html)
- [Claude Opus 5 tops the Intelligence Index at half the cost (MLQ News)](https://mlq.ai/news/anthropic-launches-claude-opus-5-tops-ai-benchmark-index-at-half-the-cost-of-fable-5/)
- [PSA: your shared Claude chats may have ended up on Google (TechCrunch)](https://techcrunch.com/2026/07/27/psa-your-claude-shared-chats-and-artifacts-may-have-ended-up-on-google/)
- [Microsoft launches its first cyber model and Project Perception (TechCrunch)](https://techcrunch.com/2026/07/27/microsoft-launches-its-first-cyber-model-and-a-new-agentic-cybersecurity-system/)
- [npm v12: install scripts disabled by default (The Hacker News)](https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html)
