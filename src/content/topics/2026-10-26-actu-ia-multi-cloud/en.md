---
title: "Claude and OpenAI land on Google Cloud: AI models are no longer tied to a single cloud"
date: "2026-10-26"
category: "Actu"
level: "Semaine 44"
summary: "On October 22, Anthropic made its Anthropic-managed Claude Platform generally available on Google Cloud, with Google's identity, billing and spend commitments. The day before, OpenAI had opened access to its models through Google Cloud, as a private preview. Plus: Claude Duet, a personal agent that works in the background; Claude Security in public beta; MiniMax M3.1 Flash; Recursive Flint, a coding model that runs on a laptop; and \"LLMjacking\", which hijacks models exposed on the Internet."
---

## The big story

This week, two of the biggest model providers picked the same cloud: Google's.

On **Thursday, October 22, 2026**, Anthropic announced general availability of an **Anthropic-managed Claude Platform on Google Cloud**. In practice, a company that already has a Google Cloud account can use the Claude platform with its **Google Cloud identity**, its **Google Cloud billing** and, if it has any, its **spend commitments** (money already reserved with Google can pay for Claude). U.S. and global endpoints are offered. The Google-managed offering, available before, remains available alongside.

The day before, **Wednesday, October 21**, OpenAI had announced access to its models through Google Cloud. For now it is a **private preview**, limited to approved teams and to development and internal testing, not production. A wider rollout is planned "in the coming weeks". Google Cloud presents the same thing on its side, with models listed in its Model Garden (the press cites names such as GPT-6 Astra, GPT-6.1 Sol and GPT-6 Luna).

**Why it matters.** For a long time, picking a model almost meant picking a cloud: GPT at Microsoft Azure, Claude at Amazon or Google, Gemini at Google. Companies that already had a contract with one cloud had to either stick to its models, or open a second account, a second billing relationship and a second security review with another provider. When models show up on several clouds, that friction drops: purchasing, access rights and budget alerts stay in the tool the company already knows.

What to keep in mind:

- **Available is not the same as mature.** The Claude offering is generally available; OpenAI's is a private preview, with no production guarantee. Many articles this week blur the two.
- **Pricing and feature details vary.** Each provider has its own reference pages, and the features available on a cloud are not necessarily the same as on the direct API. It is not simply "same product, different address".
- **It says nothing about model quality.** This is a distribution change, not a capability change.

> 🎤 **In an interview**: if you are asked "how do you choose a model for a project?", you can answer: "I start from the need, then I also look at where the company is already a customer. This week, Claude became available on Google Cloud with Google's billing and identity, and OpenAI's models are arriving there in private preview. So I don't code against one provider: I put the model call behind a small interface, so I can switch model or cloud without rewriting the app." You show you think about portability, not just the latest fashionable model.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Claude Duet, a background personal agent** | Anthropic | Announced on **October 21** as a research preview, with a waitlist for U.S. Claude Pro and Max subscribers. Duet connects to your apps and uses a virtual computer to prepare work in the background. It shares Claude's usage limits. Team and Enterprise are not included |
| **Claude Security in public beta** | Anthropic | On **October 21**, for Enterprise customers: continuous repository scanning, fix tracking, multi-repository projects and threat-model support, through API and MCP |
| **MiniMax M3.1 Flash** | MiniMax | Released on **October 19**. The company claims better results on agentic tasks, programming and cybersecurity, nearly tripled inference speed and a 70% lower usage cost. These are the provider's figures, not independently verified |
| **Recursive Flint, a coding model for laptops** | Recursive | A free model that runs on a laptop, which the company says it built largely with its own AI research system (TechCrunch, October 21) |
| **LLMjacking** | Security researchers | Attackers hijack AI models exposed on the Internet to steal credentials or mine cryptocurrency. The compute cost falls on the model's owner (Help Net Security, October 23) |

## Why it matters to you

- **Internship offers increasingly talk about "cloud + AI".** Many companies have a contract with a single cloud. Being able to say "we can call Claude or an OpenAI model from our current cloud" makes you useful faster than a candidate who only knows the public API.
- **Don't get attached to a provider.** Put the model call behind a function or class of your own, with the model name in configuration. It is ten lines, and it saves you from rewriting the project when the client changes cloud or when a model becomes too expensive.
- **Identity and billing are engineering topics.** Using the cloud's identity (roles, service accounts) rather than an API key pasted in a `.env` reduces the risk of a leak, a theme from last week's OpenCode story.
- **Don't leave a model open on the Internet.** LLMjacking targets exactly the AI servers without authentication. If you run an Ollama or a model server on a machine for a project, put it behind a password or a private network.
- **A local coding model is becoming plausible.** Light models like Flint (and the trend behind them) can serve for code on sensitive data you don't want to send to a third party. Worth testing, without taking the claims on faith.

## In an interview

**"Why would a company use Claude or GPT through its cloud rather than through the provider's API?"**

Mostly for management reasons, not quality. The contract, billing and access rights already exist: you reuse the spend commitments, the company's identity and the security reviews already passed. The counterpoint: features and release timing can differ from the direct API, so I check that what I need exists on that cloud before committing.

**"How do you design an application so it doesn't depend on a single model provider?"**

I put the model call behind a simple interface (a `generate(prompt)` for example), with the provider and model name in configuration. I keep my prompts and evaluation tests in the repository, so I can compare two models on my real cases before switching. I don't try to abstract everything: only the boundary with the provider, not its specific features.

**"What is LLMjacking, and how do you protect against it?"**

It is a third party hijacking an AI model exposed on the Internet to use it at the owner's expense: stealing credentials, mining cryptocurrency or reselling access. The owner pays for the compute. Protection is the basics: don't expose a model server without authentication, restrict access by network, set quotas and usage alerts, and don't leave keys lying around.

## Going further

- [Anthropic-managed Claude Platform on Google Cloud (Anthropic)](https://claude.com/resources/articles/claude-models-on-google-cloud-anthropic-managed)
- [OpenAI models on Google Cloud (OpenAI)](https://openai.com/index/openai-models-google-cloud/)
- [Google Cloud brings OpenAI models to customers (Google Cloud)](https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-brings-openai-models-to-customers)
- [Claude Duet (Anthropic)](https://claude.com/resources/articles/claude-duet)
- [Claude Security now scans continuously and tracks fixes (Anthropic)](https://claude.com/resources/articles/claude-security-now-scans-continuously-and-tracks-fixes)
- [China's MiniMax launches M3.1 Flash (Reuters)](https://www.reuters.com/world/asia-pacific/chinas-minimax-launches-updated-ai-model-m31-flash-2026-10-19/)
- [Recursive launches Flint, a laptop coding model (TechCrunch)](https://techcrunch.com/2026/10/21/recursive-launches-flint-a-laptop-coding-model-it-says-was-largely-built-by-ai/)
- [LLMjacking: agents hijack exposed AI models (Help Net Security)](https://www.helpnetsecurity.com/2026/10/23/llmjacking-agent-hijacks-exposed-ai-models/)
