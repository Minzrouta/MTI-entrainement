---
title: "GitHub down for 8 hours: AI agents doubled the traffic, the infrastructure gave way"
date: "2026-08-24"
category: "Actu"
level: "Semaine 35"
summary: "On August 17, GitHub spent 7h47 in a global outage: not a bug, a pure capacity shortage against traffic doubled by AI agents. Plus: Nvidia backs up to $105B in OpenAI data center financing, 421 CVEs on Patch Tuesday, Claude designs lab-validated proteins."
---

## The big story

On **Sunday, August 17**, GitHub went down. From **13:28 to 21:15 UTC**, that is **7 hours and 47 minutes**, github.com, authentication, the APIs, Issues, Pull Requests, **GitHub Actions** and **Copilot** were degraded worldwide. At peak, roughly **20% of web and API requests** were failing, and up to **50% of archive downloads**.

The postmortem, published this week on the GitHub blog, fits in one sentence that changes everything: the outage was caused **neither by a code change nor by a configuration change**. A critical infrastructure component in the Central US data center simply **failed to keep up with record traffic**, and the capacity pressure cascaded through the systems, starting with authentication. Specialist coverage points at the sidecar proxies (Istio) relaying service-to-service traffic: saturated, but invisible to auto-scaling, which did not account for their capacity.

Where did that record traffic come from? From the postmortem's own numbers: monthly commits went from **1.4 billion in April to 2.9 billion in August 2026**. A doubling in four months, widely attributed to **AI agents** committing, opening PRs (about 130 million merged per month) and triggering Actions runs (over 115 million) at a pace no human growth explains. The irony of 2026 in one outage: the AI writing the code brought down the platform hosting it.

One tasty technical detail: recovery was **slowed by the clients themselves**. Retry loops in Copilot services increased traffic during recovery, a classic "retry storm" that had to be tamed before services could safely reopen. In response, GitHub announced more than **3 million CPU cores** and **120 petabytes of storage** deployed, an Azure migration that went from **12% of platform load in May to 58%**, and consistent **retry budgets** across services.

> 🎤 **In an interview** : the reflex that sets you apart is knowing that **not every outage is a bug**. Here, zero faulty deploys: capacity, an auto-scaler blind to one component, and retries making things worse. If you can drop "exponential backoff with jitter and a retry budget" while explaining why Copilot clients slowed GitHub's own recovery, you sound like someone who has actually read a postmortem.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Up to $105B in financing** for an OpenAI data center | Nvidia | Revealed in an August 17 SEC filing: Nvidia backs the first phase of an **8 gigawatt** campus in Ohio, built and operated by SB Energy under a 20-year lease to OpenAI. Nvidia will be the exclusive compute provider, coming online from 2028. The chip supplier financing its own customer: the circularity of the AI economy in a single deal |
| **4 actively exploited flaws** added to the KEV catalog | CISA | On August 18: a **vCenter path traversal (CVE-2026-59310, CVSS 9.8)**, 361 servers compromised across 47 countries with Babuk-derived ransomware; a **SharePoint auth bypass (CVE-2026-55040, 9.1)** exploited within hours of the public PoC; a **wormable** Windows IKE flaw (9.8); a macOS Screen Sharing bypass used to install cryptominers |
| Patch Tuesday: **421 CVEs fixed**, one zero-day | Microsoft | Including **CVE-2026-68820**, a use-after-free in the afd.sys (Winsock) driver exploited in the wild to elevate privileges to System |
| Claude designs **lab-validated proteins** | Anthropic | Claude-designed binders worked against **14 of 15 targets** tested by Adaptyv Bio and Twist Bioscience, with 22 to 35% success versus the sector's typical 10 to 15%. Generative AI stepping out of text and into measurable biology |
| **30 layoffs** and buyouts offered | Cognition | Three weeks after acquiring Windsurf, the startup behind Devin lays off 30 people and offers buyouts to the ~200 remaining. Consolidation among AI coding startups continues, even the best-funded ones |
| Security release **scheduled for August 26** | Next.js | Patches announced for Next.js 16.3 and 15.5, including **one critical vulnerability**. If you run a Next.js project in production, block 30 minutes on Tuesday to update |

## Why it matters to you

- **Your CI lives at GitHub, not at your place.** Eight hours without Actions or authentication is a lost team day if nobody knows how to work degraded. Useful reminder: git is **distributed**. Commit locally, exchange branches between teammates, possibly keep a mirror remote (GitLab, Codeberg). The host's outage is only a git outage if you let it be.
- **Naive retries amplify outages.** A `while (fail) retry` loop with no backoff turns every client into a participant in the recovery DDoS. Exponential backoff, jitter, retry budget, idempotency: four words to know before your first production service.
- **Read postmortems, it is free training.** GitHub's gives the timeline, the root cause, the aggravating factors and the costed remediations. That is exactly the level of detail a recruiter loves to hear quoted in an interview.
- **The patch window is now measured in hours.** SharePoint exploited within hours of the public PoC, vCenter five days after the fix. The real question is no longer "did you patch?" but "why is your vCenter or SharePoint reachable from the Internet at all?"
- **The AI internship market has two faces.** On one side, tens of billions in infrastructure (Nvidia, OpenAI, Ohio); on the other, layoffs at the best-funded AI coding startups (Cognition). Targeting infrastructure, platforms and companies deploying AI internally is currently less risky than the nth agent startup.

## In an interview

**"GitHub is down, your team is blocked. What do you do?"**

First, assess calmly (status page, no panic), then remember git is distributed: commits, branches and diffs keep working locally, and two teammates can exchange branches without a central server. Then protect the recovery: do not hammer the API with aggressive retries, defer non-urgent pushes. Finally, communicate: tell the team what is blocked (CI, reviews) and what is not. What the recruiter is evaluating is your calm and your understanding of the tool, not your ability to wait.

**"What does a well-designed retry look like?"**

Four ingredients. **Exponential backoff**: wait longer and longer between attempts. **Jitter**: randomness so all clients do not retry in the same second. A **retry budget**: past a certain failure rate, stop insisting and degrade gracefully. And **idempotency**: replaying the request must not create duplicates. Topical example: during the August 17 outage, retry loops in Copilot clients increased traffic at the exact moment GitHub was trying to recover.

**"Tell me about a famous outage and what it teaches."**

August 17, 2026, GitHub: 7h47 of global unavailability, with no bug and no bad deploy. Cause: a Central US data center component saturated by record traffic (commits doubled in four months, driven by AI agents), invisible to auto-scaling. Lessons: capacity is a first-class cause of outages, auto-scaling only protects what it measures, and client retries can prolong an incident. Bonus: citing the remediation (retry budgets, Azure migration at 58% of load) shows you read the source, not a tweet.

## Going further

- [The official postmortem: "The August 17 outage, and the work ahead" (GitHub Blog)](https://github.blog/news-insights/company-news/the-august-17-outage-and-the-work-ahead/)
- [The August 17 outage in detail, timeline and reactions (DEV Community)](https://dev.to/jamilxt/github-is-down-the-august-17-2026-outage-in-detail-1e36)
- [Nvidia backs up to $105B for OpenAI's Ohio data center (CNBC)](https://www.cnbc.com/2026/08/17/nvidia-financing-open-ai-data-center-ohio.html)
- [August Patch Tuesday: 421 CVEs, one exploited zero-day (SecurityWeek)](https://www.securityweek.com/august-2026-patch-tuesday-microsoft-fixes-421-cves-one-exploited-zero-day/)
- [The 4 flaws added to CISA's KEV catalog on August 18 (XHack)](https://xhack.io/blog/cisa-known-exploited-vulnerabilities-august-2026)
- [Cognition lays off staff three weeks after the Windsurf acquisition (Tech Startups)](https://techstartups.com/2026/08/17/top-tech-news-today-august-17-2026-ge-microsoft-nvidia-open-stripe-unitree-more/)
- [Next.js security release announced for August 26 (Next.js blog)](https://nextjs.org/blog)
