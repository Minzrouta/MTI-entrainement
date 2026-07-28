---
title: "Telling your projects in interviews"
date: "2026-10-30"
category: "Méthodo"
level: "Fondamental"
summary: "Your projects are your experience: telling them as stories of decisions, not lists of technologies, makes the difference in internship interviews. Last topic of the program — everything you've seen becomes ammunition."
---

## The essentials

In an internship interview, you have little professional experience: your projects **are** your experience. The interviewer isn't looking for a list of technologies — they check that you can explain a context, justify a decision, measure a result and draw lessons from it. The tool: the **STAR** structure adapted to tech, **Context → Problem → Decisions → Result → Lessons**.

| Step | The question you're answering | Filled-in example (real-time quiz) |
|---|---|---|
| Context | What, for whom, what team, what deadline? | "Live quiz app for school parties — 4 people, 3 weeks" |
| Problem | What concrete, measurable difficulty? | "Live scores for 200 players; our HTTP polling collapsed at 80" |
| Decisions | What choices, against which alternatives, and who did what? | "WebSockets over polling, Redis pub/sub per room; I designed and coded the game server" |
| Result | What worked, with what numbers? | "250 simultaneous connections held in real conditions, latency < 200 ms" |
| Lessons | What would you do differently? | "Load tests from week 1: we discovered our limit in front of users" |

Each row of the table fits in one or two sentences: together they make a 90-second story, after which the interviewer digs wherever they want. That is exactly what they expect.

## How it works

**Pick 2-3 projects and know them inside out.** Three mastered stories beat eight skimmed CV lines. For each one, prepare: the architecture (drawable on a whiteboard), the decisions and their alternatives, one or two numbers, what went wrong, what you'd redo differently. **Self-criticism is a plus**: "today I would split that service" signals maturity, not weakness.

**Quantify when possible.** "A fast app" says nothing; "load time went from 4 s to 800 ms after caching the queries" tells an investigation. Users, latency, data volume, time saved: an honest number, even a modest one, beats a superlative.

**Own your technical choices.** "Why Postgres?" deserves a real answer — and "it's the database we knew, our data was relational, it was the safe choice in three weeks" is one: honest, contextualized, defensible. The bad reflex: inventing an after-the-fact scholarly justification that collapses at the second question.

The 90-second pitch, written and rehearsed before the interview:

```text
"My most formative project: a real-time quiz app
for school parties.                     [context, 15 s]

The challenge: displaying live scores for 200
players — our first attempt with HTTP polling
collapsed at 80 connections.            [problem, 15 s]

We moved to WebSockets, with Redis pub/sub to
broadcast per room. Me, I designed and coded the
game server, and measured the difference with a
load test.                              [decisions, 30 s]

Result: 250 simultaneous players at a real party,
under 200 ms of latency.                [result, 15 s]

If I started over, I'd run load tests from the
first week — we discovered our limits in front
of the users."                          [lessons, 15 s]
```

> 🎤 **In an interview** — "Tell me about a project you're proud of." The question comes up in almost every internship interview, often as the opener. Never answer with the stack ("it's React with Node…"): roll out the 90-second pitch, then let the interviewer dig. Whoever asks that question wants a story, not an inventory.

## Key concepts to master

- **Tech STAR**: Context → Problem → Decisions → Result → Lessons. The HR version (Situation, Task, Action, Result) works too; what matters is the order — context before details, result before lessons.
- **The "you, precisely"**: in a group project, the interviewer will isolate your contribution. Prepare the answer in the first person: "I designed the database schema and the auth API; Marie did the front end". Claiming the whole project gets detected within three technical questions.
- **Calibrated self-criticism**: one real failure + what it taught you + what you'd do now. Neither "nothing went wrong" (nobody believes it), nor self-flagellation (the intern who demolishes themselves worries people).
- **The demo that works**: a deployed URL tested that same morning, and an offline plan B — a video capture or GIF in the README. Meeting-room wifi always betrays you.
- **The clean GitHub**: an interviewer spends 90 seconds on a repo. README with a screenshot, one sentence on the what and the why, launch instructions that work (`docker compose up` ideally — see the Docker topic), no committed `node_modules`, no secrets in the history.
- **Tie each project to the role**: reread the job posting the night before. Each required skill should hook onto an anecdote from one of your projects. Backend role → data modeling, the API, migrations; front-end role → state, performance, accessibility.

> 💡 **The README does half the work** — an interviewer who opens a repo with a screenshot, a two-sentence description and a `docker compose up` that works already has a good impression before the interview. It's the only document you control 100% and that speaks for you in your absence. One hour of writing, repaid at every application.

## In an interview

**"What went wrong in this project?"** — Never "nothing". One precise failure, its cause, what you changed: "we lost a week because we hadn't frozen the data schema; since then, I start with the model and the migrations". The interviewer isn't judging the failure, they're judging lucidity and the learning loop.

**"What did you, precisely, do in this group project?"** — Answer in the first person, with a clear scope, and credit the others: "I took the game server and the Redis pub/sub; the front end was Marie and Tom". Crediting the team strengthens your credibility — whoever really contributed doesn't need to claim everything.

**"Why did you choose [technology X]?"** — Structure: the need, the options considered, the criterion that settled it. "It's what we knew" is acceptable if you own it and can name what you would compare today. The worst answer: an invented justification that the next question dismantles.

**"What would you do differently?"** — The gift question: it tests whether you've re-thought the project since. An architecture answer ("I'd separate the game server from the REST API") or a method answer ("load tests from the start") shows perspective. "Nothing" means you haven't progressed since.

**"Can you show me something?"** — Yes, always: a deployed URL, a GIF in the README, or a prepared local demo. Showing something that works in 30 seconds beats ten minutes of description. And if the demo crashes: video plan B, without panicking — handling the unexpected is part of the evaluation too.

## Pitfalls & misconceptions

- **Reciting the stack** — "React, Node, MongoDB, Docker" is not a story. The stack belongs in the decisions ("why Mongo?"), not in the opening.
- **The ten-minute pitch** — 90 seconds then silence: let the interviewer choose where to dig. A monologue unrolling the whole architecture exhausts attention and hides your strong points.
- **False modesty** — "it's a small project, nothing much" sabotages your own work before even showing it. A small project told well (real problem, considered decision, lesson) beats a big project skimmed over.
- **Embellishing** — the technical interviewer digs down to the layer where you can no longer answer. If "I did the backend" turns vague at the third question about indexes, the credibility of everything else collapses. An honest scope is infinitely more solid.

> ⚠️ **The demo without a plan B** — record your demo (30 s, screen capture) before every interview. Flaky wifi, a free-tier service gone to sleep, a dependency broken the night before: live demos fail for reasons that have nothing to do with your work. The candidate who calmly switches to their video scores more points than the one nervously restarting their terminal.

## Going further

- [Tech Interview Handbook — behavioral round](https://www.techinterviewhandbook.org/behavioral-interview/): structured preparation for non-technical questions
- [Brag documents (Julia Evans)](https://jvns.ca/blog/brag-documents/): logging your achievements as you go — the reflex to build from your internship onwards
- [Make a README](https://www.makeareadme.com/): the checklist for a README that makes people want to clone
- [The STAR method](https://en.wikipedia.org/wiki/Situation,_task,_action,_result): the original version, used by HR

This topic closes the program. The dozens of topics you've accumulated — Docker, databases, HTTP, security, LLMs in production, UTF-8… — are your pool of technical anecdotes: every "In an interview" section is a ready-made answer, every "real-world trap" a story to tell. The night before each interview, reread the topics tied to the role and your two or three prepared projects. You have the material; all that's left is to tell it. Good luck.
