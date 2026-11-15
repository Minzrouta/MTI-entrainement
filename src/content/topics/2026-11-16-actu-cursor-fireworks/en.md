---
title: "The rigged Claude Code extension came from a key stolen at one of Cursor's AI providers"
date: "2026-11-16"
category: "Actu"
level: "Semaine 47"
summary: "On November 14, Cursor explained where the rigged Claude Code extension of October 29 came from: attackers stole credentials at Fireworks AI, its inference provider, then found more keys in plain text in old coding-agent traces. Also: Fireworks AI discloses a second intrusion, Apify rotates its customers' tokens, .NET 11 ships with C# 15 and Gemini 4 Carbon reaches the general public."
---

## The big story

Two weeks ago, we covered a rigged version of the Claude Code extension served by Cursor's marketplace. This week we learned how the attacker got there, and the story starts somewhere else.

According to BleepingComputer, based on Cursor's incident report published on **November 14**:

- **It started at a provider.** Attackers stole credentials at **Fireworks AI**, a platform that runs AI models for other companies, Cursor included.
- **A key stored at Fireworks** gave read access to a storage bucket Cursor used to share data with that provider. It held **old coding-agent traces**, mostly from 2025, from users who had not turned on Privacy Mode.
- **Those traces held plain-text keys.** Some contained unredacted API credentials that opened access to other Cursor systems.
- **On October 29**, using one of those credentials, the attacker placed malicious copies of the Claude Code extension (versions **2.1.312 and 2.1.313**, although 2.1.312 had been reported as clean until then) on the cache serving Cursor's extension marketplace. They stayed up for **about 11 hours**. According to Cursor, Anthropic's official extension and Open VSX were not compromised.
- **What else leaked**: archived non-production repositories, support conversations and the credentials customers had pasted into them, usage metrics, contact details and summaries of agent conversations. Cursor says **fewer than 0.05%** of users had traces exposed and **fewer than 0.01%** of customers had API credentials compromised. **Up to 5,000 users** may have received the rigged extension.
- **Response**: Cursor moved all its inference traffic off Fireworks, revoked and rotated the exposed credentials, rebuilt its extension marketplace and redeployed production.

**Why it stands out.** No code vulnerability was needed. One key at a partner was enough, followed by keys left in plain text in logs kept for a year. What you type or paste into a coding agent (a `.env`, a token, a command output) can end up in stored traces, shared with a provider, and read by someone else months later.

> 🎤 **In an interview**: if you are asked "what risks do you see with AI coding assistants?", you can answer: "Generated code is not the only risk, there is also the data we feed them. At Cursor, keys pasted into agent conversations ended up in traces shared with a provider, and an attacker who went through that provider used them to publish a rigged extension. So I never paste a secret into a prompt, I turn on privacy settings, and I treat every exposed key as one to rotate." You show that you follow the data end to end, not just the code.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Second intrusion at Fireworks AI** | Fireworks AI | Disclosed on **November 10**. A cloud provider hosting its research machines was breached on **October 23**, and the attacker reached Fireworks development machines on the 24th. Metadata, billing data, and for some customers datasets and incomplete model weights. A first leak in early October had already hit environment variables |
| **Apify rotates its customers' tokens** | Apify (scraping platform) | Intrusion on **November 9 and 10**, detected on the 10th. Internal credentials invalidated, sessions reset, OAuth connections (GitHub included) revoked as a precaution. Affected customers' API tokens and proxy passwords rotated, plus a request to reset two-factor authentication. The entry point has not been published |
| **.NET 11 and C# 15** | Microsoft | Released on **November 10** at .NET Conf 2026. C# 15 brings **union types**. Standard Term Support release (two years), .NET 10 remains the long-term support release. According to the press, .NET 8 and 9 reach end of support the same day |
| **Gemini 4 Carbon for the general public** | Google | Rollout announced from **November 10** in the Gemini API, AI Studio and the app, after two weeks reserved for cybersecurity teams. Names (Argon, Carbon) vary across sources and performance figures come from Google |

## Why it matters to you

- **Do not paste secrets into an agent.** Replace a key with `XXX` before sharing an error or a config file. What the agent sees can be stored, shared and read later.
- **Read your tools' privacy settings.** Privacy mode, data retention, sharing with subprocessors: often off by default.
- **Your providers have providers.** Cursor depended on Fireworks, which depended on a cloud host. For a group project, being able to list third-party services and what they see is already a good architecture answer.
- **Rotating a key is the reflex.** As soon as a secret may have been seen (in a log, a prompt, a support ticket), revoke it. Apify and Cursor did exactly that.
- **Update your .NET projects.** If a school project still runs on .NET 8 or 9, it no longer gets fixes. .NET 10 is the safe choice, .NET 11 if you want C# 15.

## In an interview

**"What is a supply chain attack?"**

The attacker does not target the victim directly but goes through someone it trusts: a package, an extension, a provider. At Cursor, the attacker went through Fireworks AI to get keys, then through the extension marketplace to reach users.

**"How do you keep secrets out of logs?"**

Redact secrets before logging (filters on `Authorization` headers, `password` fields, known key formats), limit log retention, and scan logs and repositories with a tool like gitleaks. And never give a secret to a tool that does not need it.

**"What is a union type in C# 15?"**

A type whose value is exactly one of several listed types, for example a result that is either a value or an error. The compiler can check that a `switch` handles every case, like TypeScript unions or Rust enums.

## Going further

- [Cursor confirms security breach led to malicious Claude Code extension (BleepingComputer)](https://www.bleepingcomputer.com/news/security/cursor-confirms-security-breach-led-to-malicious-claude-code-extension/)
- [Cursor incident report (Cursor)](https://cursor.com/blog/security-incident-update)
- [Cursor guidance on the Claude Code extension (Cursor)](https://cursor.com/blog/security-notice-claude-code-extension)
- [Fireworks AI discloses new breach after cloud provider hack (BleepingComputer)](https://www.bleepingcomputer.com/news/security/fireworks-ai-discloses-new-breach-after-cloud-provider-hack/)
- [Apify rotates API tokens, prompts 2FA resets after breach (BleepingComputer)](https://www.bleepingcomputer.com/news/security/apify-rotates-api-tokens-prompts-2fa-resets-after-breach/)
- [Announcing .NET 11 (.NET Blog)](https://devblogs.microsoft.com/dotnet/?p=61205)
- [.NET Conf 2026 (Microsoft)](https://dotnet.microsoft.com/en-us/conf)
- [Google rolls out Gemini 4 Carbon to general public (Let's Data Science)](https://letsdatascience.com/news/google-rolls-out-gemini-4-carbon-to-general-public-9b41bcb4)
