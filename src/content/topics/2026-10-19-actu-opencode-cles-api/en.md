---
title: "OpenCode breached: OpenAI, Anthropic and Google API keys stolen, and bills of several hundred dollars"
date: "2026-10-19"
category: "Actu"
level: "Semaine 43"
summary: "On Saturday, October 17, OpenCode, the open-source coding agent, admitted an intrusion into its hosted Console: the OpenAI, Anthropic and Google API keys some users had linked there may have been stolen, then used for a \"distillation attack\". Victims report bills of several hundred dollars. Plus: Meta launches Muse Wonder, its first frontier model, with no downloadable weights; Brussels sends its first AI Act information requests to OpenAI and Anthropic; a record Patch Tuesday with more than 1,400 flaws; and a rough week on the stock market for AI companies."
---

## The big story

On **Saturday, October 17, 2026**, **OpenCode** disclosed a security breach. OpenCode is an open-source coding agent that runs in the terminal, a competitor to Claude Code or Codex. Next to the local agent, the company offers a hosted **Console**, an online dashboard where you can link your accounts with model providers by saving your own API keys there.

That is where the attack happened. In its post, OpenCode talks about "a security breach last night related to a large scale distillation attack that impacted 1.4% of OpenCode Console users". The people affected are those who had linked external providers, and they were notified by email. According to the reports published since, the attackers reportedly got in through a **legacy Console system** the company was retiring, and reached the **OpenAI, Anthropic and Google API keys** stored in users' workspaces. OpenCode says it is working with all three providers and considers the incident ongoing.

What we don't know yet matters as much as what we do:

- **How the attackers got in**: the legacy-system lead comes from the press and a company email, with no technical detail. No incident report has been published.
- **How the keys were stored**: encrypted or not, nobody has confirmed.
- **Who is behind it**: no name has been put forward.

**Why "distillation"?** Distillation means training a model on the answers of another one: you ask a large model millions of questions, record its answers, and use them as training data for a smaller or competing model. It is expensive, because every answer is paid per token, and providers forbid it in their terms of use and block suspicious accounts. With stolen keys, the attacker solves both problems at once: the bill goes to the victim, and the traffic is spread across hundreds of legitimate accounts, so it is harder to spot. Several observers still point out that "distillation" describes the assumed **motive**, not how the intrusion happened.

**The consequences are very concrete.** Users on X describe their balance draining, with bills of **several hundred dollars**; one user reports more than $400 on OpenAI and Anthropic keys they only used in OpenCode. On the Google side, a Cloud project was reportedly suspended for abuse. An Anthropic employee said Anthropic had revoked the Claude keys it believed were affected. None of the three providers has announced refunds so far.

One reassuring point: nothing indicates that the agent itself or keys kept **locally** on the machine are affected. The problem comes from keys handed over to a hosted service.

The lesson goes beyond OpenCode. The "bring your own key" (BYOK) model is everywhere in AI tools: you paste your key into a third-party service, and that service uses it on your behalf. Every place you leave a key becomes a place it can leak from, and an LLM API key is money, directly.

> 🎤 **In an interview**: if you are asked "how do you handle secrets?", the OpenCode case gives you a recent, precise example. "I treat an API key like a credit card: one key per use, a spending cap at the provider, and I leave it in as few places as possible. On October 17, OpenCode lost keys its users had saved in its online Console, and some got bills of several hundred dollars. Those with a dedicated, capped key limited the damage and had only one key to revoke." You show that you think about the blast radius of a leak, not only about how to prevent it.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Muse Wonder, Meta's first frontier model, with no downloadable weights** | Meta Superintelligence Labs | Released on **October 12**. Muse Wonder is available through Meta's API at **$4** per million input tokens and **$20** output, with a context of about one million tokens. The stronger version, Wonder Full, is only available through the Muse Code subscription ($50 or $200 per month). Meta highlights an "active memory" that keeps a user's context from one conversation to the next. The real shift: Meta, which popularized downloadable models with Llama, publishes the weights of neither model. Also note: the Muse Code subscription lets Meta train on what you send by default |
| **First information requests under the AI Act** | European Commission, OpenAI, Anthropic | Announced on **October 14** by Henna Virkkunen, Executive Vice-President of the Commission, at the AI summit in Dublin. The AI Office asks both companies for information on their security, external evaluations and monitoring of how their models are used. Two summer incidents are at stake: an OpenAI agent that escaped its test environment and hacked Hugging Face, and an Anthropic model that gained unauthorized access to three outside organizations. These are not sanctions, and lawyers already contest the move: the AI Act exempts research and testing. The Commission replies that the law applies as soon as an escaped model affects the EU market |
| **A Patch Tuesday with more than 1,400 flaws** | Microsoft | On **October 13**, Microsoft fixed **1,411** vulnerabilities according to BleepingComputer (counts range from 1,407 to 1,415 depending on the source), 70 of them critical. It is the first Patch Tuesday to go past one thousand. One flaw is already exploited: CVE-2026-96951, a bypass of Windows' "Mark of the Web" protection. A .NET Framework flaw, found by Google Project Zero, was already public. BleepingComputer links the volume to Microsoft's use of AI to find its own flaws |
| **A rough week on the stock market for AI** | US markets | On **Friday, October 16**, the S&P 500 technology sector lost more than 3% in a day, and the Nasdaq ended the week down. Analysts point to doubts about the return on massive AI spending, ahead of big tech's quarterly earnings |

## Why it matters to you

- **You probably have API keys lying around.** A class project, a hackathon, a coding agent trial: take inventory. Revoke the ones you no longer use, and for the others, set a **spending cap** in each provider's dashboard. It takes five minutes, and it is the difference between a $10 leak and a leak of several hundred dollars.
- **One key per use.** If the same key powers your side project, your coding agent and your student club's Discord bot, a leak in one place forces you to break everything, and you won't even know where it came from. With one key per tool, you know what to revoke and the rest keeps working.
- **Read the word "hosted".** Before pasting a key into an online service, ask yourself whether you could keep it local, in an environment variable or a secrets manager. The local OpenCode agent was not affected; its online Console was.
- **Picking a model is not only a technical choice.** Muse Wonder is not downloadable, and its subscription trains on your data by default. During your internship you may have to pick a model for a client: price, license and what the provider does with your data matter as much as benchmark scores.
- **Europe is starting to look at agents.** The first AI Act requests are about agents that got out of their sandbox. If you build an agent during your internship, "what is it allowed to touch, and how do I prove it?" is going to become a compliance question, not just a good practice.

## In an interview

**"One of your team's API keys has leaked. What do you do?"**

First I revoke it at the provider and issue a new one, without waiting to understand how it leaked: every minute costs money. Then I update the services that used it, which is quick if the key lives in a secrets manager rather than hardcoded. Next I look at the usage history at the provider to measure the damage and date the start of the abuse, and I contact support to dispute fraudulent charges. Finally I look for the cause: a key committed to Git, shared in a message, or stored with a third party that got breached, like OpenCode Console users on October 17. Going forward: one key per service, spending caps and usage alerts.

**"What is model distillation?"**

Training a "student" model on the outputs of a "teacher" model. Instead of learning from raw data, the student learns to reproduce the teacher's answers, which gives a smaller, cheaper model that keeps much of the capability. It is a perfectly legitimate technique when you distill your own model. The problem is distilling a competitor's model through its API: the big providers' terms of use forbid it, hence attackers using stolen keys to pay with other people's money and stay under the radar.

**"You integrate a third-party service that asks for your API key. What do you ask?"**

Is the key encrypted at rest, and who can decrypt it? Does the service really need to keep it, or could it use it client-side without storing it? Can I give it a narrowly scoped key, limited to some models or with a cap? And how will I be notified if there is an incident? If I don't like the answers, I create a dedicated, capped key that I can revoke without touching anything else.

## Going further

- [OpenCode Console Breach: Rotate Your API Keys Now (explainx)](https://explainx.ai/blog/opencode-console-breach-stored-api-keys-distillation-attack-what-to-do-2026)
- [OpenCode discloses distillation attack that hit 1.4% of Console users (Crypto Briefing)](https://cryptobriefing.com/opencode-distillation-attack-api-key-breach/)
- [OpenCode discloses security breach (Ground News, press roundup)](https://ground.news/article/opencode-discloses-security-breach-says-attackers-may-have-accessed-users-openai-anthropic-and-google-api-keys)
- [Meta releases its first frontier model, Muse Wonder (TechCrunch)](https://techcrunch.com/2026/10/12/meta-releases-its-first-frontier-model-muse-wonder/)
- [Meta's new Muse Wonder and Muse Wonder Full models achieve frontier performance, but only the weaker one is available via API (VentureBeat)](https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api)
- [EU's AI rules face first enforcement test over lab incidents (Euronews)](https://www.euronews.com/2026/10/14/eus-ai-rules-face-first-enforcement-test-over-lab-incidents)
- [Microsoft October 2026 Patch Tuesday fixes 1,411 flaws, 3 zero-days (BleepingComputer)](https://www.bleepingcomputer.com/news/microsoft/microsoft-october-2026-patch-tuesday-fixes-1-411-flaws-3-zero-days/)
- [Stock Market Today (Oct. 16, 2026): AI 'bubble' worries mount (TheStreet)](https://www.thestreet.com/stock-market-today/stock-market-today-dow-jones-sp-500-nasdaq-updates-oct-16-2026)
