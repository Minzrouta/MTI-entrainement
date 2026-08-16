---
title: "Claude now signs everything it writes: invisible watermarks land in your copy-paste"
date: "2026-08-17"
category: "Actu"
level: "Semaine 34"
summary: "Anthropic is watermarking Claude's text with an invisible mark that survives copy-paste, to comply with Article 50 of the EU AI Act in force since August 2. Plus: Gemini 3.7 Flash, GPT-5.6-Cyber, and a rough week for unauthenticated RCEs."
---

## The big story

On **August 11**, Anthropic confirmed that **Claude now watermarks its text**. Not a banner, not a footer disclaimer: a statistical signature baked into the model itself.

The mechanism, in plain terms: the model **slightly biases its word choices** according to a secret key. On a single word, undetectable. Over a few hundred words, the pattern shows up under statistical analysis. Practical consequence: **the mark travels with copy-paste** and survives light editing, but fades under heavy rewriting. For files, Anthropic also uses the open **C2PA** standard: cryptographically signed provenance metadata that says Claude was involved and makes tampering detectable.

The scope is broad and there is no opt-out: Claude API, the Claude app, **Claude Code**, Claude Cowork, Claude Tag, worldwide. Every model shipped **after August 2, 2026** carries it by default; older ones follow by December.

Why now? Because **Article 50 of the EU AI Act** applies as of **August 2, 2026**. It requires providers of generative systems to make their outputs (text, image, audio, video) **marked in a machine-readable format and detectable** as AI-generated. Penalties reach **15 million euros or 3% of worldwide annual turnover**, whichever is higher. Systems already on the market have until **December 2, 2026** to meet the marking requirement. Google, Meta, Microsoft, OpenAI and others signed the same commitment: Anthropic is simply first to ship the text version.

The reception has been anything but warm. The dominant fear is not censorship but **exposure**: an essay, a report or a cover letter polished with Claude can be flagged without its author realising. Watermark-removal tools appeared within the week, which raises the real technical question: is a mark that does not survive a rewrite a control, or a signal?

> 🎤 **In an interview** : the distinction worth drawing, and few candidates do, is **watermark is not AI detector**. A detector like GPTZero *guesses* from style and is often wrong (with a documented bias against non-native English speakers). A watermark is *placed at the source* by whoever produced the text, using a key: that is **provenance**, not stylometry. Being able to explain that difference in two sentences puts you instantly above the ambient noise about "AI detectors".

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Gemini 3.7 Flash** | Google | Shipped August 13, only three weeks after 3.6 Flash, and not retrained from scratch. Big jumps on coding and agentic work: DeepSWE v1.1 from 49.0% to 65.3%, AutomationBench from 17.0% to 30.4%, WebDev Arena Elo from 1538 to 1588. Priced $0.75 / $3.75 per million tokens **through December 31, 2026**, then doubling on January 1. Flagship Gemini 3.5 Pro is still delayed |
| **GPT-5.6-Cyber** in gated access | OpenAI | A cyber-defense-specific model opened to a small group of vetted experts on application. Alongside it, an **Ultrafast** API tier running GPT-5.6 Sol up to 14 times faster than the standard queue |
| A brutal week for RCEs | JetBrains, IBM, Progress | **Unauthenticated** remote code execution on TeamCity (CVE-2026-63077) and IBM Langflow (CVE-2026-9198), plus Progress LoadMaster (CVE-2026-8037), all actively exploited. CI and internal tooling are the target, not the marketing site |
| Booby-trapped VS Code extensions, GitLab CI in the crosshairs | CISA | After the npm worm earlier this month, the developer toolchain stays the favourite vector: extension marketplaces, packages, pipelines |
| $10.9B Q2 revenue, first operating profit | Anthropic | $559M operating income: the first positive quarter for a frontier model lab |
| One billion monthly users | Google | Sundar Pichai says the Gemini app has crossed one billion monthly active users |

## Why it matters to you

- **Your written deliverables now carry a label.** Internship report, cover letter, README: if the text comes out of Claude and ships as-is, it is marked. The sane strategy is not a technical dodge but a workflow: AI as draft and reviewer, you write the final version. You keep your voice, and the problem disappears.
- **Compliance is becoming a spec line.** If you build a product that generates text for European users, Article 50 applies to you: tell users they are talking to an AI, mark synthetic outputs. Exactly the kind of constraint a candidate who can cite it without revising raises in an interview.
- **Provenance and detection are two different jobs.** C2PA signs a file's production chain; a text watermark marks a model's output; a statistical detector guesses after the fact. Three different questions, three different guarantees.
- **A model's sticker price has an expiry date.** Gemini 3.7 Flash is cheap until December 31, then doubles. Any cost estimate for an AI feature should state the date it was computed.
- **Secure CI like production.** Three unauthenticated RCEs on internal tools in one week: a TeamCity server or a Langflow instance left reachable is a direct path to your build secrets. "Who can reach your CI from the internet?" is a genuine interview question.

## In an interview

**"How do you know a piece of text was AI-generated?"**

Three families of answers, not to be confused. The **watermark**: the provider biases token choices with a key, then verifies statistically; reliable over enough volume, fragile under rewriting (this is what Anthropic shipped on August 11). **Signed provenance** like C2PA: cryptographic metadata attached to the file, which disappears if the content is copied elsewhere. The **statistical detector**: it guesses from perplexity and style, with documented false positives. Close with the honest limit: none of the three proves a human did not write the text, at best they prove a machine touched it.

**"What does the EU AI Act change for a developer?"**

Since August 2, 2026, Article 50 mandates transparency: tell users they are interacting with an AI, and mark synthetic content in a machine-readable format. Penalties up to 15M euros or 3% of worldwide turnover. In code terms: a UI disclosure, marking at generation time, and a retained provenance trail. That is product work, not just legal paperwork.

**"Do you use AI to code?"**

Say yes, plainly, then show the method: what you delegate (boilerplate, repetitive tests, exploring an unfamiliar API), what you never delegate (architecture decisions, security review), and how you verify (you read the diff, you run the tests, you can explain every line). The interviewer is not looking for someone who avoids AI, they are looking for someone who knows when it is wrong.

## Going further

- [Anthropic says it will watermark text generated by its AI models (TechCrunch)](https://techcrunch.com/2026/08/11/anthropic-says-it-will-watermark-text-generated-by-its-ai-models/)
- [What Claude's invisible watermarks detect, and miss (explainX)](https://explainx.ai/blog/anthropic-claude-invisible-watermarks-c2pa-august-2026)
- [Article 50 transparency rules, a practical guide (EU Artificial Intelligence Act)](https://artificialintelligenceact.eu/transparency-rules-article-50/)
- [Transparency obligations under Article 50 (European Commission)](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Introducing Gemini 3.7 Flash (Google blog)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-3-7-flash/)
- [Gemini 3.7 Flash arrives before Gemini 3.5 Pro (Axios)](https://www.axios.com/2026/08/13/google-gemini-37-flash)
- [Six actively exploited flaws this week (Security Online)](https://securityonline.info/weekly-cve-report-august-2026/)
