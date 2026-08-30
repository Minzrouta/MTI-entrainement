---
title: "Nvidia buys Hugging Face for $12.9 billion: the GitHub of AI changes hands"
date: "2026-08-31"
category: "Actu"
level: "Semaine 36"
summary: "On August 27, The Information revealed that Nvidia agreed to acquire Hugging Face for $12.9B. The hub serving 13 million developers would belong to the chip vendor. Plus: Amazon shuts down Mechanical Turk after 21 years, two critical RCEs in Next.js, record Nvidia earnings at $96.2B."
---

## The big story

On **Thursday, August 27**, The Information dropped the story of the week: **Nvidia has agreed to acquire Hugging Face for $12.9 billion**. CNBC, Bloomberg, Fortune and Forbes picked it up within hours. One important caveat, and it is a lesson in reading tech news by itself: **no agreement has been signed**. TechCrunch states it plainly, the deal could still fall apart, and neither Nvidia nor Hugging Face commented. Everything rests on "a person with direct knowledge of the talks".

Why is it huge anyway? Because Hugging Face is not just another AI startup: it is **the GitHub of models**. More than **13 million developers** publish, download and test open weight models, datasets and Spaces there. If you have ever typed `from transformers import AutoModel`, you are a user. The last funding round valued the company at **$4.5 billion** ($235M raised in 2023): Nvidia would pay almost **triple that**, and the talks reportedly started because **another suitor** had shown interest.

The strategic logic is crystal clear: Nvidia sells the chips, finances its customers' data centers (the OpenAI/Ohio deal from week 35), and would now own **the marketplace where models circulate**. From the GPU leaving the factory to the `model.safetensors` a developer downloads, the whole chain would run through one company.

That is exactly what worries the community: Hugging Face owed its position to its **neutrality**. The hub hosts models from Meta, Google, Mistral, Qwen, DeepSeek, all competitors of Nvidia somewhere along the chain. A hub owned by the dominant compute supplier raises the **conflict of interest** question at ecosystem scale: will CUDA-optimized models get better placement? Will AMD alternatives or the clouds' custom chips be treated equally?

> 🎤 **In an interview**: know how to say what Hugging Face is in one sentence ("the hub where the ecosystem publishes and consumes open weight models, the GitHub or npm of AI") and why this acquisition would be controversial (the neutrality of critical infrastructure bought by the dominant compute supplier). And add the nuance "reported by the press, not signed": telling an established fact from a reported one is a valuable skill on any team.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Mechanical Turk shuts down on September 30** after 21 years | Amazon | Announced August 25. The human micro-task marketplace (labeling, transcription, over 500,000 workers at its peak), which Bezos called "artificial artificial intelligence", labeled the datasets of the entire machine learning era. SageMaker Ground Truth and Augmented AI close too: Amazon exits the annotation market entirely, leaving it to Scale AI, Mercor and Prolific |
| **Two critical unauthenticated RCEs** patched urgently | Next.js | Release moved up to August 25 (announced for the 26th in our week 35 brief). A flaw in **libheif**, used by sharp for AVIF image optimization: one crafted image is enough, AVIF optimization is disabled until the upstream fix lands. And **CVE-2026-75604**: RCE on Windows-hosted Next.js servers. Fixes: **16.3.3** and **15.5.24** |
| Record quarterly results: **$96.2B** | Nvidia | On August 26: up 106% year over year, including **$89B of data center revenue** (up 117%), driven by Blackwell Ultra. Guidance at $108B for next quarter, and Jensen Huang projects 70% growth for fiscal 2028. The stock still slipped: the market already prices in perfection |
| Its **in-house inference chip** reportedly beats Blackwell on perf/watt | OpenAI | According to benchmarks reported on August 26. Nvidia's biggest customer is building its way out of Nvidia for inference, while Nvidia buys the model hub: each is climbing the other's value chain |
| Settlement of up to **$16.68B** over minor protection | Meta | Settled with 52 US attorneys general, mid-trial: a 2-hour daily cap for under-18s, nighttime blocking, stronger age verification, an independent auditor. Addictive design is now a legal risk priced in billions |

## Why it matters to you

- **Hugging Face is probably already in your stack.** `transformers`, `datasets`, an embedding model downloaded from the hub: it is infrastructure, like npm or PyPI. The professional reflex is not panic, it is **knowing your dependencies**: which models your project downloads, under which license, and what happens if the hub's terms change. For a production-critical model, an internal mirror is worth it.
- **"Reported" is not "signed".** This week, half the headlines say "Nvidia buys", the other half "reportedly in talks". Go back to the primary source (SEC filing, press release, official blog) before quoting a fact in an interview or making a technical decision based on it.
- **Update Next.js now.** An unauthenticated RCE via a crafted AVIF image is the worst-case scenario: the flaw is not even in Next.js but in libheif, two floors down the dependency chain (Next.js → sharp → libheif). Your attack surface includes your dependencies' dependencies.
- **The end of MTurk tells you where data work is going.** Two-cent micro-labeling is dead, absorbed by the models themselves. What remains and pays: expert annotation, model answer evaluation, RLHF. Data quality is a real ML internship topic, not a chore.
- **Follow the money to target your applications.** $89B of data center revenue in one quarter at Nvidia: AI infrastructure is hiring. And the OpenAI/Nvidia irony (the customer builds chips, the supplier buys the model hub) shows the borders are moving: transferable skills (systems, networking, optimization) stay the most portable.

## In an interview

**"What is Hugging Face, concretely?"**

Three building blocks. The **hub**: a giant repository of models, datasets and demos (Spaces), versioned with git, where Meta, Google, Mistral or DeepSeek publish their open models. The **libraries**: `transformers`, `datasets`, `tokenizers`, which became the standard interface for loading and running a model in Python. And a **community** of more than 13 million developers. It is the GitHub or npm of AI: not indispensable in theory, unavoidable in practice. Hence the reaction when the dominant chip supplier wants to buy it.

**"A critical vulnerability is published in a dependency of your framework. What do you do?"**

First assess exposure: am I affected (version, platform, feature enabled)? For this week's AVIF flaw: does my app optimize user-supplied images? Then fix fast with the patched version, or disable the feature if no patch exists yet (which is what Next.js did: AVIF disabled while waiting for libheif). Finally check in depth: an `npm audit` or equivalent, because the flaw often sits in a transitive dependency you never consciously installed. Bonus: quoting the real Next.js → sharp → libheif example shows you follow the news.

**"Does AI still need humans in the loop?"**

Yes, but not the same ones. The shutdown of Mechanical Turk on September 30, 2026 marks the end of mass micro-labeling: classifying an image or transcribing 10 seconds of audio, models do that now. Human work moved up the stack: annotation by domain experts (medicine, law, code), comparative evaluation of answers, RLHF. The startups recruiting those experts (Scale AI, Mercor, Prolific) replaced MTurk. The interview-ready answer fits in one sentence: humans moved from producing raw data to quality-controlling reasoning.

## Going further

- [Nvidia agrees to buy Hugging Face for $12.9 billion, report says (CNBC)](https://www.cnbc.com/2026/08/27/nvidia-hugging-face-acquisition.html)
- [Nvidia closes in on Hugging Face acquisition, with the usual caveats (TechCrunch)](https://techcrunch.com/2026/08/26/nvidia-closes-in-on-hugging-face-acquisition/)
- [Amazon shuts the service Bezos called "artificial artificial intelligence" (CNBC)](https://www.cnbc.com/2026/08/25/amazon-service-that-jeff-bezos-called-artificial-ai-is-shutting-down.html)
- [MTurk, SageMaker Ground Truth and Augmented AI close on September 30 (TechTimes)](https://www.techtimes.com/articles/325645/20260826/amazon-mechanical-turk-will-close-september-30-shutting-down-sagemaker-ground-truth-too.htm)
- [August 2026 Security Release: both flaws in detail (Next.js blog)](https://nextjs.org/blog/august-2026-security-release)
- [Next.js Patches Critical AVIF and Windows Flaws Enabling Unauthenticated RCE (The Hacker News)](https://thehackernews.com/2026/08/nextjs-patches-critical-avif-and.html)
- [Nvidia: $96.2B revenue for fiscal Q2 2027 (official release)](https://www.globenewswire.com/news-release/2026/08/26/3351702/0/en/nvidia-announces-financial-results-for-second-quarter-fiscal-2027.html)
