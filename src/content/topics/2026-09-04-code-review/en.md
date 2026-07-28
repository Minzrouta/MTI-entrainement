---
title: "Code review: giving and receiving"
date: "2026-09-04"
category: "Qualité"
level: "Fondamental"
summary: "Reviewing a PR and taking comments without taking them personally: the teamwork skill recruiters systematically probe in internship interviews."
---

## The essentials

A code review is the reading of a code change by at least one other developer before it gets merged. First reflex to fix before the interview: review is not primarily about "finding bugs". It does catch some, but its real value lies elsewhere:

- **Knowledge sharing** — the reviewer discovers a part of the code they didn't write, the author receives context they didn't have. It's the insurance against the *bus factor*: nobody should be the only person who understands a module.
- **Codebase consistency** — same patterns, same architectural conventions, same ways of handling errors. Ten developers, one project style.
- **Design quality** — a second pair of eyes spots the awkward API, the forgotten edge case, the missing test, the security issue.

And what it is **not** for: style. Indentation, quotes, import order — linters and formatters (ESLint, Prettier, Black, clang-format) handle that automatically in CI. A human commenting on a comma wastes two people's time; in an interview, saying "style is the linter's job, not the reviewer's" scores points immediately.

The quality of a review comes down to the quality of its comments:

| Bad comment | Good comment |
|---|---|
| "This is wrong." | "blocking: `parseInt(s)` without a radix parses `"08"` as octal on old runtimes — add `, 10`." |
| "Why did you do that??" | "question: which use case does this fallback cover? I don't see it tested." |
| "Rename your variable." | "nit: `data` → `invoices` would say what the array contains. Non-blocking." |
| "I would have used a Map." | "suggestion: a `Map` would avoid the O(n) lookup in the loop — worth measuring if the list grows." |

The difference fits in one word: **actionable**. A good comment says what the problem is, why, and what would unblock the situation.

## How it works

The lifecycle of a PR fits in one diagram — note that the re-review loop is the expensive part, the one small PRs shorten:

```text
code ─▶ self-review ─▶ PR ─▶ review ─▶ approve ─▶ merge
                             ▲  │
                   re-review │  │ changes requested
                             │  ▼
                        push the fixes
```

**On the reviewer's side**, the method in three steps:

1. **Understand the intent first.** Read the title, the description, the linked ticket — *before* the first line of diff. Reviewing code without knowing what it's trying to accomplish is like grading an essay without knowing the topic.
2. **From general to specific.** Is the approach the right one? Is the change in the right place? Only then: line-by-line logic, edge cases, tests. One "this approach won't hold under load" is worth more than twenty detail remarks on code that will be rewritten.
3. **Comment on two distinct levels.** What **blocks** the merge (bug, vulnerability, data loss, architectural inconsistency) and what is merely a **suggestion** or a preference. Putting everything on the same level drowns the real problems and exhausts the author.

And one rule of tone: **questions rather than orders**. "What happens if `items` is empty?" opens a discussion; "handle the empty array" assumes the reviewer is right — yet they don't have all the context. The question leaves the door open to "it's guaranteed non-empty by the upstream validation", an answer that closes the topic in ten seconds.

**Conventional comments** (conventionalcomments.org) formalize this two-level distinction with a prefix per comment: `blocking:` (must be resolved before merge), `question:` (needs an answer, not necessarily a change), `suggestion:` (proposed improvement), `nit:` (minor detail, never blocking), `praise:` (highlighting what's well done — yes, that's a thing, and it changes the mood of a review). The prefix removes all ambiguity: the author instantly knows what prevents them from merging.

An annotated review excerpt with these typical comments:

```diff
# PR "Email validation at signup" — excerpt
# annotated with the reviewer's comments

- if (email.includes("@")) {
+ if (EMAIL_REGEX.test(email)) {
    await createUser(email);
  }
# blocking: EMAIL_REGEX is not imported anywhere, CI
# is red — this PR cannot ship as is.

+ console.log("created: " + email);
# blocking: we're logging personal data in plain text.
# Could we log the user id instead of the email?

+ const t = Date.now();
# question: what is this timestamp for? I don't see
# it used anywhere — a debug leftover?

- function create_user(email) {
+ async function createUser(email) {
# nit: welcome rename but out of scope for this PR —
# a separate PR next time? Non-blocking.
```

## Key concepts to master

- **Small PRs.** Review quality collapses with diff size: beyond a few hundred lines, the reviewer skims and approves — the "LGTM" effect (*looks good to me*). A big feature gets split into successive PRs: first the data model, then the logic, then the UI.
- **Self-review before submitting.** Re-read your own diff in the PR interface, as if you were the reviewer: you'll catch the forgotten `console.log`, the file committed by mistake, the dead comment. Complete it with a description that gives context (what, why, how to test). Every minute of self-review saves a review round-trip — that is, hours of latency.
- **Blocking vs non-blocking.** A reviewer who blocks a PR over a name is imposing a preference; a reviewer who lets a SQL injection through to avoid hurting feelings is not doing their job. Sorting each remark into the right category is *the* core review skill.
- **Receiving a review.** Three rules: it's **not personal** (the code is reviewed, not the person — and in three months the code will no longer be "yours" but the team's); **respond to everything** (each comment gets a fix, an answer, or a ticket — never silence); **disagreement comes with arguments** ("I'm keeping this approach because X" is legitimate, silently applying a change you believe is wrong is not).
- **The merge standard.** The rule from Google's guide: approve as soon as the change **improves the overall health of the code**, even if it isn't perfect. Demanding perfection paralyzes the team; "I would have done it differently" is not grounds for blocking if the author's approach works and stays consistent.

> 💡 **The 200-line PR** — that's the order of magnitude to remember (the classic SmartBear studies place the attention drop-off around 400 lines; aiming for 200 keeps a margin). A 200-line PR gets a deep read in twenty minutes; a 2000-line PR gets an "LGTM" in three. Small PR = better review, faster feedback, fewer merge conflicts, easy revert.

> 🎤 **In an interview** — "how do you react to a negative review?" is a classic trap question: the recruiter is testing ego, not technique. The expected answer: I separate the code from my person, I read all the comments before replying, I fix what's justified, and when I disagree I say so **with arguments** — an argued technical disagreement is a sign of maturity, not arrogance. Bonus: mention that a dense review means the reviewer took the time to actually read, which beats a distracted LGTM.

## In an interview

**"What is a code review for?"** — Three things: sharing knowledge (nobody is the only one who knows a module), keeping the codebase consistent, and improving design through a second pair of eyes. Specify what it does not do: style, automated by linters in CI. Reducing review to "finding bugs" is the weak answer.

**"How do you write a good review comment?"** — Actionable: what the problem is, why, and a way out. Phrased as a question when I don't have all the context. Labeled by severity — `blocking:` vs `nit:` — so the author knows what prevents the merge. And never about style: the linter handles that.

**"A reviewer requests a change you find unjustified — what do you do?"** — I reply to the comment with my arguments (a constraint, a measurement, context they don't have). If they hold their ground with good reasons, I apply it; if the disagreement persists on a non-blocking point, the team convention or a third opinion settles it. What I never do: ignore the comment, or apply it silently while believing it's wrong.

**"What's the ideal size for a PR and why?"** — The order of magnitude: 200 lines, a few hundred at most. Beyond that, the reviewer's attention drops and the review becomes a skim. A big feature gets split into stacked PRs, each readable in one session.

**"What do you do before submitting a PR?"** — A self-review of the full diff in the interface, as if I were the reviewer: forgotten debug code, stray files, dead code. Then a description with the context, the link to the ticket, and how to test. A PR that arrives clean saves a full review round-trip.

## Pitfalls & misconceptions

> ⚠️ **The LGTM effect** — the most common team-level trap: big PRs and rubber-stamp reviews reinforce each other. The bigger the PR, the less it's actually read, the more approvals become stamps — and the more the review loses credibility, and therefore usefulness. The discipline of small PRs is not comfort: it's what keeps reviews alive.

- **"Review is there to check style"** — no: linters and formatters do it in CI, without fatigue or debate. If your team argues about quotes in review, a tool is missing, not rigor.
- **"A review comment is an order"** — no: it's the start of a conversation. The author can reply, argue, refuse with good reasons. Only `blocking:` comments condition the merge.
- **"A harsh review = the reviewer judging me"** — the review targets the code, never the person. Symmetrically, on the reviewer's side: ban the accusatory "you" ("you forgot…") in favor of the code ("this path doesn't handle the empty case").
- **Leaving comments unanswered** — merging while ignoring remarks destroys trust. Every comment deserves a fix, an answer, or an explicit follow-up ticket.
- **Demanding perfection** — the standard is "better than before", not "perfect". Blocking a working PR over personal preferences is review abuse.

## Going further

- [Conventional Comments](https://conventionalcomments.org/) — the `label: subject` format (`nit:`, `question:`, `blocking:`…) ready to adopt from your very next internship
- [Google Engineering Practices — Code Review Developer Guide](https://google.github.io/eng-practices/review/) — both sides, reviewer and author; the reference for the "merge standard"
- [How to Do Code Reviews Like a Human (Michael Lynch)](https://mtlynch.io/human-code-reviews-1/) — the human side: phrasing, tone, ego
- Hands-on exercise: open a merged PR from a well-known open source project and read the review thread — you'll see the conventions in practice, disagreements included
