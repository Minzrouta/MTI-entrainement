---
title: "Trigger.dev breached: an attacker read its customers' environment variables"
date: "2026-11-09"
category: "Actu"
level: "Semaine 46"
summary: "On November 1, background jobs platform Trigger.dev found that an attacker had obtained root API keys for some customer environments, and with them their environment variables. 0.66% of customers are affected. Also: GitLab flaw CVE-2026-97229 still exploited, KERNEL breached through a hosting provider credential, Kimi K3.1 Pro weights released and a Next.js security release."
---

## The big story

This week, what leaked was not a company's code but the secrets it handed to a third-party service.

**Trigger.dev** is a platform that runs background jobs for other applications (sending emails, long-running processing, scheduled tasks). For those jobs to run, customers store their **environment variables** there: database passwords, third-party API keys, access tokens.

What the company says in its incident report published on **November 6**:

- **On November 1**, infrastructure alerts fired. Trigger.dev found that an attacker had obtained **root API keys** for some customer environments. A root key gives full access to the environment's settings, **including its environment variables**.
- The attacker also listed runs, deployments and schedules (IDs, task names, tags).
- **0.66% of customers** are affected. The company says it found no evidence of access to production databases or dashboard accounts.
- **The root cause is not public**: "we are unable to comment on the specific attack vector currently". The report also does not say whether variables marked as secret were included. So be careful: assume they were.
- **Response**: attacker access cut off, internal credentials rotated, all affected customers' API keys revoked, incident response experts and law enforcement brought in. Trigger.dev also added IP allowlisting for scoped keys and **OIDC** support.
- **Affected customers**, emailed from the evening of November 1: regenerate their Trigger.dev keys, then **rotate every credential** stored in the affected environments and revoke the old ones with each provider. Webhook signing secrets were not exposed.

**Why it matters.** Environment variables are often presented as "the safe place" for secrets, as opposed to code. They are safe from Git, not from the platform that stores them. Every service you give a secret to becomes part of your attack surface. And the real cost of a leak is not the leak itself: it is the time it takes to rotate every key, with every provider.

> 🎤 **In an interview**: if asked "where do you store your secrets?", you can answer: "Out of the code, in environment variables or a secrets manager, but I keep in mind that the platform storing them can be breached. This week an attacker read the environment variables of some Trigger.dev customers. So I give each key the minimum rights, I prefer short-lived tokens like OIDC over long-lived keys, and I know where every secret lives so I can rotate it fast." You show you think about what happens after a leak, not just about storage.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **CVE-2026-97229, GitLab flaw still exploited** | GitLab, CISA, Shadowserver | Rated **10/10**, unauthenticated remote code execution through the CI/CD regular expression compiler. Fixed on October 12 (19.4.2, 19.3.5, 19.2.8), added to CISA's known exploited catalog at the end of October. Shadowserver counted **over 1,000 servers** still vulnerable on **November 1**. Alpine Linux rebuilt its server after an attempted attack |
| **KERNEL breached through a hosting credential** | KERNEL (browser infrastructure) | Incident detected on **November 2**. With a stolen credential for its hosting provider account, the attacker reached GPU servers on November 3. Credentials revoked, servers taken offline (public notice of November 4) |
| **Kimi K3.1 Pro, weights released** | Moonshot AI | Promised for **November 4**, the weights landed on Hugging Face (dates vary between the 2nd and the 5th depending on the source). 2.8 trillion parameter MoE, 104 billion active, one million token context. Comparisons with closed models come from Moonshot, outside testers are more cautious |
| **Next.js security release** | Vercel | Published on **November 3**. A DEV post mentions seven medium severity flaws whose detailed advisories were not yet public |
| **Inkling 2 Small** | Thinking Machines Lab | Announced on **November 5** according to aggregators: 594 billion parameter MoE, 17 billion active, weights promised after external safety testing. Not checked against the original announcement |

## Why it matters to you

- **Your projects already have secrets with third parties.** GitLab CI/CD variables, Vercel, Coolify or Railway settings, keys in Supabase. Make the list: it is the first question to ask on the day of a leak.
- **Least privilege, even on a school project.** A read-only key, or one scoped to a single project, does far less damage than an admin key.
- **Prefer short-lived tokens.** OIDC lets a CI get a token valid for a few minutes instead of a key stored forever. That is exactly what Trigger.dev just added.
- **Patch what you host.** A self-hosted GitLab or Next.js for a group project is a real target: the GitLab flaw hits internet-facing servers, with no credentials needed.
- **Practise rotation.** Changing a key without breaking production is a concrete skill a recruiter will value far more than a generic sentence about security.

## In an interview

**"A third-party service tells you your environment variables may have leaked. What do you do?"**

I assume they did leak. I list the secrets involved and rotate them one by one with each provider, revoking the old ones, starting with the most powerful (database, cloud keys). Then I check each service's access logs for unusual use, and I tell the team.

**"Environment variables or a secrets manager?"**

Environment variables are fine to start with, as long as they are never committed. A secrets manager adds automatic rotation, access history and fine-grained rights. Either way the secret is stored somewhere: what matters is that it has few rights, a short lifetime and that you know how to rotate it fast.

**"What is OIDC in CI/CD?"**

Instead of storing a cloud key in the CI, the CI presents a signed token proving who it is (this repository, this branch), and the cloud provider gives it temporary access in return. There is no long-lived key left to steal.

## Going further

- [Trigger.dev incident report, November 6 (Trigger.dev)](https://trigger.dev/blog/security-incident-report-nov-2026)
- [Initial incident disclosure, November 1 (Trigger.dev)](https://trigger.dev/blog/security-incident-nov-2026)
- [Trigger.dev discloses exposed environment variables (SC Media)](https://www.scworld.com/brief/trigger-dev-discloses-security-incident-involving-exposed-environment-variables)
- [Over 1,000 GitLab servers exposed to CVE-2026-97229 (Aviatrix)](https://aviatrix.ai/threat-research-center/over-1000-gitlab-servers-vulnerable-to-code-execution-attacks-cve-2026-97229/)
- [KERNEL public notice of November 4 (KERNEL)](https://www.kernel.sh/blog/public-notice-of-security-incident-nov-4-2026)
- [Kimi K3.1 Pro weights land on Hugging Face (ai-tldr)](https://ai-tldr.dev/releases/moonshot-kimi-k3-1-pro-open-weights/)
- [Next.js blog, November security release (Next.js)](https://nextjs.org/blog)
- [LLM news, November 7 (BenchLM)](https://benchlm.ai/blog/posts/llm-news-november-7-2026)
