---
title: "Anthropic goes public: the books of Claude's maker are now open"
date: "2026-11-23"
category: "Actu"
level: "Semaine 48"
summary: "On November 19, Anthropic started trading on Nasdaq under the ticker ANT after raising about $81 billion, a record. Its prospectus shows $33.2 billion in revenue over nine months and huge compute commitments. Also: Microsoft's agent-framework PyPI package rigged, infected Optimizely scripts on 178 sites, GPT-6.2 from OpenAI, Gemini 4 Neon from Google and a backdoor hidden in a Claude Code settings file."
---

## The big story

After three weeks of breaches, a different kind of news: the company behind Claude is listed on the stock market, and anyone can read its accounts.

According to CNBC and Fortune:

- **The price.** On **November 18**, Anthropic priced its shares at **$83**, above the marketed range ($70 to $78). Demand pushed the deal from 825 million to **980 million shares**.
- **The amount.** About **$81 billion** raised ($81.3 billion per CNBC, $79 billion excluding shares sold by existing holders per Fortune). SpaceX held the previous record with $75 billion in June. At $83, Anthropic was worth **$1.5 trillion**.
- **Day one.** On **November 19**, ANT opened at $111.50 (+34%) on Nasdaq, then closed at **$97.17 (+17%)**, a market cap of about $1.8 trillion.
- **The accounts.** For the first nine months of 2026, Anthropic reports **$33.2 billion** in revenue, up from $2.5 billion a year earlier. The net loss reaches **$104 billion**. Fortune notes that most of it comes from the accounting treatment of convertible notes: Anthropic did not spend that amount in cash.
- **Compute.** CNBC cites a contract of up to **$120.5 billion** with SpaceX through 2029 for compute capacity. Analyses of the prospectus count about **$900 billion** in total commitments, almost all for compute and infrastructure.
- **Control.** A founders' company keeps **50.1% of voting power**. Amazon owns 14.7% of the shares, Google 13.7%.
- **And OpenAI?** Still private. According to Fortune, its IPO will wait until at least 2027.

**Why it matters.** A listed company publishes its accounts every quarter and puts its risks in writing. For the first time, you can read what an AI lab of this size costs to run. Analyses of the prospectus point to one item that affects developers: an agent that chains tool calls and holds a long context uses far more compute than a single API call. The prices and quotas of the tools you use depend on that equation.

> 🎤 **In an interview**: if asked "which AI model would you build a product on?", you can answer: "I would pick a model based on the task and the cost, and keep the option to switch. Anthropic's prospectus shows that compute weighs heavily on the accounts, and that agents use much more of it than a single call. Prices and limits can move. So I isolate the model call behind an interface, I measure my tokens, and I test a second provider." You show that you follow business news and turn it into a technical decision.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **agent-framework rigged on PyPI** | Microsoft | On **November 17** at 20:35 UTC, an attacker published versions **1.26.1** then **1.26.2** of the official package (about 200,000 downloads a month). They dropped a `.pth` file, which Python runs at every startup, even if you never import the package. The code stole environment variables, credential files and Azure and GitHub Actions tokens. PyPI removed both versions in under an hour. According to Wiz, the attacker appears to have compromised a certificate of Microsoft's publishing pipeline. Version 1.26.0 is clean |
| **Infected Optimizely scripts** | Optimizely (A/B testing) | On **November 16**, an attacker exploited a flaw in the signup flow to add JavaScript to customer projects. Report URI counts **188 infected scripts across 178 organizations**. BleepingComputer names Zoom, the BBC, CNN, Salesforce and GitLab among sites that loaded the script. The code skimmed card numbers and swapped crypto wallet addresses. According to Report URI, 24 organizations blocked execution thanks to a strict CSP |
| **GPT-6.2 Astra and Sol** | OpenAI | Released on **November 17** in ChatGPT, Codex and the API. Astra targets complex tasks ($8 / $40 per million input / output tokens), Sol everyday use ($2 / $10). OpenAI announces tighter safeguards on cybersecurity assistance |
| **Gemini 4 Neon** | Google | Released on **November 18**. A mid-tier model between Carbon and Hydrogen, $3 / $15 per million tokens and a 1 million token context according to press reports. The comparisons with Opus 5.5 and GPT-6.2 Sol are Google's own numbers |
| **Backdoor in `.claude/settings.json`** | Google GTIG | According to write-ups of a **November 16** report (the original is still worth reading), a North Korea-linked group edited this file in internal repositories of crypto firms. Starting Claude Code in the repository then downloaded a backdoor |

## Why it matters to you

- **Your AI tools have a real cost.** Subscriptions and quotas for Claude, ChatGPT or Gemini can change. For a project, write down the model you use, count tokens and keep a plan B.
- **Two model releases in two days.** Look at the price per million tokens before the leaderboard. Sol at $2 / $10 or Neon at $3 / $15 is enough for most student projects.
- **Wait before you update.** The rigged agent-framework versions lived for less than an hour. A delay of a few days before accepting a new version (the minimum age option in Renovate or Dependabot) would have protected you.
- **Pin your dependencies.** A lockfile with exact versions keeps `pip install` from fetching a release published ten minutes ago.
- **A CSP earns its keep.** At Optimizely, sites with a strict `Content-Security-Policy` blocked the malicious script even though it came from a trusted domain. Add one to your web projects.
- **Review a repository's configuration files.** `.claude/settings.json`, `.vscode/tasks.json`, git hooks: these files can run commands. In a code review, they deserve the same attention as code.

## In an interview

**"What is an IPO, and what does it change for a tech company?"**

The company sells shares to the public to raise money. In return, it publishes a prospectus (the S-1 form in the United States), then accounts every quarter. For Anthropic, the money funds compute, and anyone can read its revenue, losses and risks.

**"How do you limit dependence on one LLM provider?"**

You put the model call behind an internal interface, keep prompts and test sets outside provider-specific code, and run the same tests against a second model. Switching providers then comes down to a configuration change.

**"What is a Content Security Policy for?"**

It is an HTTP header that tells the browser which sources of scripts, styles or connections a page accepts. With restricted `script-src` and `connect-src`, an injected script can neither load from an unknown domain nor send data elsewhere. In the Optimizely incident, that protected part of the affected sites.

## Going further

- [Anthropic's Nasdaq debut (CNBC)](https://www.cnbc.com/2026/11/19/anthropic-ipo-ant-live-updates.html)
- [Anthropic stock pops on its first trading day (Fortune)](https://fortune.com/2026/11/19/anthropic-ipo-first-day-trading-nasdaq-record-valuation/)
- [Anthropic shares end first day up 17% (Deadline)](https://deadline.com/2026/11/anthropic-ai-volatile-ipo-shares-trading-nasdaq-market-1237229045/)
- [Analysis of Anthropic's S-1 prospectus (sec-api.io)](https://sec-api.io/insights/anthropic-ant-s-1-ipo-sec-filing-analysis)
- [agent-framework compromised on PyPI (Wiz)](https://www.wiz.io/blog/malicious-version-of-microsofts-agent-framework-published-to-pypi)
- [Microsoft's agent-framework package compromised (BleepingComputer)](https://www.bleepingcomputer.com/news/security/microsofts-agent-framework-pypi-package-compromised-to-steal-credentials/)
- [Optimizely attack infects major brands' sites (BleepingComputer)](https://www.bleepingcomputer.com/news/security/optimizely-supply-chain-attack-infects-major-brands-sites-with-malware/)
- [Report URI's analysis of the Optimizely incident (Report URI)](https://blog.report-uri.com/worlds-largest-brands-infected-with-malware-via-optimizely/)
- [GPT-6.2 Astra and Sol are now available (OpenAI developer forum)](https://community.openai.com/t/gpt-6-2-astra-and-sol-are-now-available/1417531)
- [Introducing Gemini 4 Neon (Google)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)
- [The Claude Code settings backdoor, per GTIG (explainx.ai)](https://explainx.ai/blog/google-gtig-sombermeme-claude-code-settings-backdoor-november-2026)
