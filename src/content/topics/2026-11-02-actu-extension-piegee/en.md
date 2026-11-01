---
title: "A fake Claude Code extension plants an SSH backdoor on developer machines"
date: "2026-11-02"
category: "Actu"
level: "Semaine 45"
summary: "On October 29, a booby-trapped version 2.1.313 of the \"anthropic.claude-code\" extension circulated on Open VSX, the extension store Cursor uses. It added an attacker's SSH key and opened a reverse tunnel. Also: Anthropic publishes exploit chains built by an unreleased model, Mistral Large 4 is due to release its weights, Thrive Holdings buys ADT and Reddit moves to a logged-in experience."
---

## The big story

This week, the most ordinary developer tool there is, an editor extension, was used as an entry point.

According to the specialist press this week, version **2.1.313** of the **`anthropic.claude-code`** extension published on **Open VSX** (the open extension store Cursor uses) was **malicious**. Researchers found a loader of about 66 lines inserted before the normal code. It adds **an attacker's SSH key** to `authorized_keys`, opens a **reverse tunnel** to an external server and sets up **persistence**. In other words: remote access to the developer's machine.

What to keep in mind, with the limits:

- **Cursor said** the modified version was distributed through its store, to **at most 5,000 users**, and that it **was not developed by Anthropic**.
- **Microsoft's official marketplace** is not known to be affected. Researchers say their findings do not prove that Anthropic's official release or its distribution chain was compromised. A social media post claiming otherwise is unconfirmed.
- **Dates vary** by source (October 29 or 30). What is consistent: the version was pulled quickly. Versions 2.1.312 and 2.1.314 are reported as clean.
- **Uninstalling is not enough.** The malware dropped persistence outside the extension: look for and remove the added key in `authorized_keys` (a name like `svc-telemetry` is cited) and **rotate the credentials** reachable from the machine.

**Why it matters.** An extension runs with your rights: your SSH keys, Git tokens, `.env` files. A familiar name ("anthropic", "claude-code") inspires trust, while an open store does not have the same checks as the official one. It is the same family of risks as this year's npm package attacks: the developer tooling supply chain is a target.

> 🎤 **In an interview**: if asked "how do you secure your dev machine?", you can answer: "I treat an editor extension as a dependency: it has access to my secrets. This week a booby-trapped Claude Code extension circulated on Open VSX with an added SSH key and a reverse tunnel. So I check the publisher, I keep the number of extensions low, and if in doubt I look at `authorized_keys` and rotate my keys, not just uninstall." You show you think about persistence, not only installation.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Exploit chains built by an unreleased model** | Anthropic (Frontier Red Team) | Reportedly published on **October 27**: five exploit chains for Chrome, Safari, Android, Windows and Linux, in a test environment. The flaws were reportedly reported to vendors and fixed. Coverage is uneven and the original text was not reviewed here |
| **Mistral Large 4, open weights** | Mistral | Public API preview since **October 6**, weights announced for **October 27**. Size and cybersecurity performance are vendor figures with no published independent evaluation. I could not confirm the release actually happened |
| **Thrive Holdings buys ADT** | Thrive Holdings (OpenAI-backed) | Announced **October 29**: about $15.3 billion enterprise value, with plans to bring AI to home security (TechCrunch) |
| **Reddit moves to a logged-in experience** | Reddit | Announced **October 29**, as search traffic declines. The stated aim is to protect its data from AI scraping and negotiate licensing deals (TechCrunch) |
| **ARTEX, an AI agent framework used in intrusions** | CrowdStrike | On **October 29**, CrowdStrike described a China-nexus group, VAPOR PANDA, using it in intrusions. Secondary source, check the report |

## Why it matters to you

- **Your student laptop holds secrets.** SSH keys to GitLab or GitHub, deployment tokens, access to the team's VPS. One booby-trapped extension is enough to expose everything.
- **Choose where you install from.** Official or open store, verified publisher or not: read the publisher name and install count before clicking, especially for a well-known name.
- **Know how to audit in ten minutes.** `cat ~/.ssh/authorized_keys`, `ss -tnp` to spot unexpected outgoing connections, and the list of installed extensions. Recruiters like this skill.
- **Separate privileges.** A deploy key should not be your personal key, and a token should have minimal rights and an expiry date.
- **AI tools are targets too.** The more popular a tool, the more its name gets imitated. That is not a reason to stop using them, it is a reason to check the source.

## In an interview

**"An extension in your editor is compromised. What do you do?"**

I uninstall it, but above all I assume that whatever it could read is compromised. I look for persistence (keys added to `authorized_keys`, scheduled tasks, outgoing connections), I revoke and regenerate my SSH keys and tokens, and I check the access history on the services involved. I also tell my team, because my access is the team's access.

**"Why is an extension riskier than a website?"**

It runs with my user's rights, without the browser's sandboxing: it can read my files, run commands and open network connections. An update, even from a well-known name, is new code running on my machine.

**"How do you reduce this risk in a team?"**

A list of approved extensions, installation from the official store or a controlled mirror, deploy keys separate from personal keys with few rights, and a written secret rotation procedure so everyone knows what to do on an alert.

## Going further

- [Weaponized Claude Code extension gives hackers persistent remote access (Cybersecurity News)](https://cybersecuritynews.com/malicious-claude-code-extension/)
- [Malicious Claude Code 2.1.313 planted an SSH backdoor via Open VSX (daily.dev)](https://daily.dev/posts/malicious-claude-code-vs-code-extension-2-1-313-planted-an-ssh-backdoor-via-open-vsx-nwik77u1j)
- [Frontier Red Team: unreleased model chained flaws into working exploits (AI Weekly)](https://aiweekly.co/alerts/anthropics-frontier-red-team-says-unreleased-claude-chained-flaws-into-working)
- [Mistral unveils Large 4, "Le Chonk" (Cybernews)](https://cybernews.com/news/mistral-sovereign-model-le-chonk/)
- [Thrive Holdings acquires ADT (TechCrunch)](https://techcrunch.com/2026/10/29/openai-backed-thrive-holdings-acquires-adt)
- [Reddit shifts to a logged-in experience (TechCrunch)](https://techcrunch.com/2026/10/29/as-search-traffic-dries-up-reddit-announces-its-shifting-to-a-logged-in-experience)
