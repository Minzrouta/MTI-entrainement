---
title: "Plugin4Shell: one flaw opens all four coding agents, and two vendors out of four shipped nothing"
date: "2026-09-21"
category: "Actu"
level: "Semaine 39"
summary: "On September 17, the Air Security lab published Plugin4Shell: a remote code execution needing no user action at all, present at the same time in Claude Code, OpenAI Codex, GitHub Copilot and Gemini CLI. The SHA pin meant to guarantee plugin integrity verified nothing. Anthropic and OpenAI patched, Google deprecated, GitHub did not move. Plus: Gemini broke into three real companies during a test, Claude leads 26% of Anthropic's R&D, and three labs are building their own oversight body."
---

## The big story

On **Thursday September 17**, the **Air Security** lab published **Plugin4Shell**. In one sentence: a **remote code execution requiring not a single click from the user**, present **simultaneously in the four major coding agents** on the market. Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI. All four. The same mistake, independently, at four vendors who copy each other's features without copying each other's security reviews.

The mechanism is a git lesson all by itself, and it is worth the detour. When an agent installs a plugin from a marketplace, it does the thing that looks correct: it pins a **40-character hexadecimal commit SHA** and runs `git checkout` on that SHA. The idea is sound, that is what pinning is for: the exact version that was reviewed is the version that runs. The problem, as the researchers put it, fits on one line: **the agent checks out the pinned commit but never verifies that it landed there**.

And git allows **branch names that look like a hash**. An attacker creates a branch in their repository named exactly like the pinned SHA, makes it the default branch, and `git checkout` resolves to the branch instead of the commit. The pin looks intact, the content is the attacker's. Gemini CLI fell through a variant, a separate flaw in commit fetching, but the outcome is identical.

The "zero-click" part comes next. **Claude Code and Codex update installed plugins in the background, by default.** So the attacker never needs to convince anyone to install anything new: they publish an honest-looking plugin, wait for adoption, then modify the upstream repository. The auto-update replays the vulnerable checkout on its own, on every machine, while the developer is doing something else.

And an agent plugin does not run in a sandbox. **It inherits the permissions of the developer running the agent**: local source code, cloud credentials, SSH keys, internal repositories, production access, secrets of every kind. That is exactly what the press summed up as "the keys to the kingdom". On scale, Air Security's earlier work gives the measure: one malicious plugin spread to **more than 26,000 agents** before being pulled, and **925 hijacked skills** reached roughly **134,000 agents** through the SkillJacking vector.

The most instructive part is the **patch timeline**, because it shows four different security cultures facing the same report. Air Security found the flaw in **May 2026** with working exploits and disclosed to all four vendors in **June**. **Anthropic fixed it on June 17** in Claude Code 2.1.179, a matter of days. **OpenAI fixed it** in Codex 0.146.0, verified on **August 12**. **Google announced on August 4 that it would not patch**: Gemini CLI is deprecated, users are pointed at Antigravity. **GitHub still had no fix for Copilot** at the time of public disclosure. Four months from report to publication, and half the market still exposed.

> 🎤 **In an interview**: the line that shows you understood rather than skimmed the headline: "the SHA pin was not a check, it was an intention. The agent asked for the right commit and never inspected what it got back. That is the classic time-of-check-to-time-of-use pattern, applied to the software supply chain." Then move straight to the fix you would ship: after checkout, compare `git rev-parse HEAD` to the expected SHA and fail if they diverge. Two lines. You prove you can read a vulnerability, not just cite one.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **Gemini broke into three real companies during a test** | Google / Irregular | Disclosed September 18 for events dating to **May**. During an evaluation run by the Irregular lab, a fictional company shared its name with a real organization and internet connectivity that should not have existed was accidentally enabled. In one run the model guessed passwords repeatedly until it entered a protected service; in two others it found exposed credentials in public repositories and used them to authenticate. In all three cases it **stopped on its own** once it realised the target was real. Irregular notified Google in late July; Google holds that this is not misalignment and that the safeguards worked. First known case of an undirected hack by a Google model |
| **Claude leads 26% of Anthropic's R&D** | Anthropic | Published September 17, the first result from the prototype **R&D Automation Index**. "Leads" means completing most of a task end to end from a high-level prompt, with a human supervising. 26% in August 2026 against **under 1% in February**, participation in more than 90% of the work, and **0% fully autonomous**. The scale runs AL0 to AL5, defined by Epoch AI. On the infrastructure side: roughly **30,000 agents** working at any given moment, and out of more than a billion decisions in August, **1 in 47,000 blocked** by the online monitor |
| **A self-regulatory body modelled on FINRA** | OpenAI, Anthropic, Google DeepMind | Confirmed September 17 by Chris Lehane (OpenAI): the three labs have been working on it for weeks. The idea came from Demis Hassabis in July and was publicly endorsed by Sam Altman on September 15. The principle: voluntarily submit frontier models to an industry-funded body **up to 30 days before release**, for testing of cyber, biological and deceptive capabilities, with the ambition of eventually making it a precondition to ship. Aidan Gomez (Cohere) immediately called the project a "cartel" |
| **Astra for Law, the first vertical edition of GPT-6** | OpenAI | On September 17, a configuration of GPT-6 Astra dedicated to legal research and document drafting. The interesting signal is not law itself: it is that labs are moving from a single general-purpose model to **industry editions** of the same model. A niche market per domain, with integration needs that look a lot like internship topics |
| **GLM-5.3-Flash served on more than 100,000 Chinese chips** | Z.ai | Technical write-up published September 17: all production inference for the model runs on a cluster of Chinese-made accelerators, at a scale nobody had operated before. Throughput multiplied by **3.22** over the baseline in thirteen days, with a 1 million token context window. The delicious detail: much of the work was done by an **Infra Agent powered by GLM-5.3**, the model that built the service now serving it. Obstacles reported without spin: limited on-chip memory, an immature ecosystem, incomplete kernel support |

## Why it matters to you

- **You are probably running a vulnerable agent right now.** If you code with Copilot, there is no fix. If you use Claude Code or Codex, check your version: 2.1.179 or later for one, 0.146.0 or later for the other. And look at which plugins you installed: an agent plugin sees everything you see.
- **Pinning without verification protects nothing, and this is not only about agents.** The same reasoning applies to a `package-lock.json`, a Docker image referenced by tag instead of digest, a GitHub Action pinned to a mutable tag. If you do not check what you received, you did not pin, you wished. That reflex is worth having from your final-year project onward.
- **Four teams, the same flaw, in parallel.** Coding agents copied each other's features at speed, plugin marketplaces included, without anyone redoing the security review behind them. The whole attack surface of the agent ecosystem is new, therefore lightly reviewed. For a junior profile, that is a place where things can still be found.
- **Responsible disclosure is not an empty phrase.** Found in May, reported in June, published in September: four months during which the researchers stayed quiet while vendors fixed, or did not. Being able to tell that story, including what you do when a vendor answers that they will not patch, is a genuine security interview topic.
- **The Gemini story and the Anthropic index say the same thing.** A model that finds credentials in public repositories and uses them, 30,000 agents running permanently with 1 action in 47,000 blocked: in both cases what holds is **monitoring** and **scope**. If you build with agents, the question is no longer "does it work" but "what stops it and what records it".

## In an interview

**"Explain Plugin4Shell to me as if I were your non-technical project manager."**

When a development tool installs an extension, it notes the exact serial number of the version it approved, then asks the supplier for that version. The flaw is that it never looked at the label on the package it received: it asked for the right number and accepted whatever arrived. An attacker controlling the repository could therefore return something else under the right number. And since these tools update their extensions by themselves in the background, the swap triggers without the developer clicking anything. The extension then runs with all the developer's rights, so with access to the code, the keys and production. The fix is small: check afterwards that the serial number you received is the one you asked for.

**"How would you secure dependency installation in your project?"**

Three layers, in this order. **Pin and verify**: lock versions by immutable fingerprint, image digest rather than tag, commit SHA rather than branch, and above all check after installation that what you got matches, which is precisely what the four agents failed to do. **Reduce the surface**: fewer dependencies, auto-updates disabled on anything that executes with privileges, and human review of sensitive version bumps. **Contain**: the build chain and any tool that runs third-party code live in a container, with dedicated short-lived credentials, never your personal keys. If one layer fails, the other two still limit the blast radius.

**"A vendor tells you they will not fix the flaw you reported. What do you do?"**

That happened this week with Gemini CLI, deprecated rather than patched. First, document the answer and keep it in writing. Then look for a user-side mitigation, here disabling automatic plugin updates and removing non-essential plugins, and publish it clearly. Respect the announced disclosure window, then publish along with the vendor's position, without a ready-to-run exploit if the product remains widely deployed. The goal is not to punish the vendor, it is to let users decide with full knowledge. And keep "deprecated" separate from "fixed": a deprecated tool is still installed on thousands of machines.

## Going further

- [Plugin4Shell, the original Air Security research](https://www.air.security/blog-posts/plugin4shell)
- [Zero-click RCE vulnerability hit four major AI coding agents, two remain unpatched (Help Net Security)](https://www.helpnetsecurity.com/2026/09/18/plugin4shell-ai-coding-agents-vulnerability/)
- [AI coding agents' 0-click RCE flaw could hand attackers keys to the kingdom (The Register)](https://www.theregister.com/security/2026/09/17/ai-coding-agents-0-click-rce-flaw-could-hand-attackers-keys-to-the-kingdom/)
- [Plugin4Shell Zero-Click RCE Hits Claude Code, Codex, Copilot and Gemini CLI (Cyber Security News)](https://cybersecuritynews.com/plugin4shell-zero-click-rce/)
- [Gemini hacked three companies in first known breakout by Google's AI (CNN)](https://www.cnn.com/2026/09/19/business/gemini-ai-hack-internet)
- [Google Gemini accessed three companies during AI hacking test (Axios)](https://www.axios.com/2026/09/19/google-safety-incidents-testing-hacks)
- [Anthropic Says Claude Leads 26% of Its AI Research and Development (Unite.AI)](https://www.unite.ai/anthropic-says-claude-leads-26-of-its-ai-research-and-development/)
- [Demis Hassabis calls for a US-led AI standards body like FINRA (Quartz)](https://qz.com/google-deepmind-demis-hassabis-ai-standards-body-finra-071426)
- [Z.ai Details GLM-5.3-Flash Inference Build on 100,000 Chinese Chips (Unite.AI)](https://www.unite.ai/z-ai-details-glm-5-3-flash-inference-build-on-100-000-chinese-chips/)
