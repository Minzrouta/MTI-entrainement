---
title: "Agile/Scrum as actually lived"
date: "2026-10-02"
category: "Méthodo"
level: "Fondamental"
summary: "Sprint, daily, velocity, retro: what Scrum actually says, what goes wrong in real companies, and what is concretely expected of an intern on an agile team."
---

## The essentials

The [agile manifesto](https://agilemanifesto.org/) (2001) fits in four values: **individuals and interactions over processes and tools**; working software over comprehensive documentation; customer collaboration over contract negotiation; responding to change over following a plan. The nuance everyone forgets: the manifesto says "while there is value in the items on the right, we value the items on the left more". Agile does not mean "no process, no docs" — it means shipping often, in small increments, and adjusting at every feedback loop.

**Scrum** is the most widespread agile framework, and the one you'll meet during your internship. Three roles: the **Product Owner** (PO) carries the product vision and prioritizes the backlog — they decide *what* to build; the **Scrum Master** (SM) facilitates, removes obstacles and protects the team — they are **not a project manager**; the **development team** self-organizes and decides *how* to build. All of it paced by short iterations: sprints.

In an internship interview, nobody expects a certification from you. They expect you to describe a sprint, explain what each ceremony is for, and above all show good teammate reflexes: split, signal, ask.

## How it works

A sprint lasts 1 to 2 weeks and always follows the same loop:

```text
Product backlog (prioritized by the PO)
        │  sprint planning: the team pulls
        │  from the top and commits
        ▼
Sprint backlog ──▶ SPRINT (1-2 weeks)
                      │ daily, 15 min each day
                      ▼
              "Done" increment
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   Sprint review             Retrospective
   (product demo to          (improve the
   the stakeholders)         team's process)
         └──────── start again ────┘
```

- **Sprint planning** — the team picks the backlog items it believes it can deliver, splits them into tasks, and sets a sprint goal.
- **Daily** — 15 minutes standing up, every day: what I moved forward, what I'm on today, what's blocking me. It's a team sync, not a report to the boss.
- **Sprint review** — you show working software to stakeholders and collect feedback. A demo, not a PowerPoint.
- **Retrospective** — the team, among itself, looks at its own way of working: what went well, what created friction, one or two concrete actions for the next sprint. The most important ceremony — it's where the team improves.

**Story points** estimate the relative complexity of a user story (often on a Fibonacci scale: 1, 2, 3, 5, 8…), not hours. **Velocity** — the total points delivered per sprint — helps the team forecast what it can take on. It's an internal forecasting tool, nothing more: as soon as you compare two teams' velocities or turn it into a target, estimates inflate and the metric dies (Goodhart's law).

> 💡 **The daily is for unblocking, not reporting** — if your daily looks like a line of pupils reciting their day to the manager, it's broken. The good signal: someone says "I'm stuck on X", someone else answers "I'll grab you for 15 minutes after". The daily creates conversations, it doesn't replace them.

## Key concepts to master

- **Scrum vs kanban** — two ways of organizing the flow:

| | Scrum | Kanban |
|---|---|---|
| Cadence | Fixed-length sprints | Continuous flow |
| Roles | PO, SM, dev team | None imposed |
| Commitment | Sprint scope | WIP limit (work in progress) |
| Metrics | Velocity (points / sprint) | Lead time, cycle time |
| Priority changes | Wait for next sprint | Any time |
| Best suited to | Plannable product development | Support, ops, unpredictable inflow |

- **Definition of Done (DoD)** — the shared checklist defining "finished": code written + tested + code-reviewed + merged + deployed to staging, for instance. Without a DoD, "it's done" means ten different things to ten people — and the "finished" sprint blows up in acceptance testing.
- **User story** — a need expressed from the user's side: "As a ⟨role⟩, I want ⟨action⟩ so that ⟨benefit⟩", completed with testable acceptance criteria.
- **Splitting a story into tasks** — the intern's number one skill. A good task: one day max, testable on its own, deliverable independently:

```markdown
Story: "As a user, I can reset my password
by email."   (5 points)

Tasks (≤ 1 day each, separately testable):
- [ ] POST /password-reset: generate an
      expiring token (1 h), stored hashed   # back
- [ ] Send the email with the link           # back
- [ ] "New password" page + form             # front
- [ ] POST /password-reset/confirm:
      validate token, update the password    # back
- [ ] Rate limiting on both endpoints        # security
- [ ] End-to-end test of the full flow       # QA
```

- **The intern's toolkit** — what's really expected of you: splitting a fuzzy task into one-day subtasks; saying at the daily (or before!) when you're blocked, without waiting until the eve of the demo; asking for help at the right time — the classic rule: 30 to 60 minutes of serious digging, then ask, bringing what you already tried.

## In an interview

**"Walk me through a typical sprint in your project."** — Unroll the loop with concrete details: planning ("we took on 3 stories, ~20 points"), the daily, one blocker and how it was lifted, the demo at the review, one action out of the retro. Concrete details prove you lived it rather than just studied it.

**"What is the daily for?"** — Syncing the team and surfacing blockers early. 15 minutes max, not a report to the manager. Bonus: point out that a blocker raised at the day-2 daily gets solved in an hour; the same one discovered on day 9 sinks the sprint.

**"What is velocity, and what is it for?"** — The sum of points delivered per sprint. It helps the team forecast its capacity. It doesn't measure productivity, doesn't compare across teams, and must never become a target — otherwise estimates inflate.

**"Scrum or kanban for a support team?"** — Kanban: the incoming flow is unpredictable, a frozen sprint makes no sense. You limit work in progress (WIP) and measure lead time. Scrum fits plannable product development better.

**"What is a definition of done?"** — The shared checklist that makes "finished" objective: tested, reviewed, merged, deployed. It prevents the fake-done that explodes at the end of the sprint.

> 🎤 **In an interview** — "Tell me about a sprint that went wrong" is a reverse trick question: the interviewer is testing your lucidity, not your perfection. Winning structure: the context ("we took on too many points"), the missed signal ("a blocker kept quiet until day 8"), what the retro changed ("we added a WIP limit and a mid-sprint check"). A candidate with only perfect sprints to tell has never done Scrum.

## Pitfalls & misconceptions

> ⚠️ **Cargo cult agile** — running all the ceremonies without the values: dailies without mutual help, retros without actions, sprints that adapt nothing. The team "does Scrum" and ships like before, with extra meetings. Ceremonies are tools in the service of feedback; emptied out, they're just theater.

- **The 45-minute daily** — turned into a disguised status meeting, everyone waits their turn looking at their phone. Remedy: 15 minutes on the clock; deep discussions happen in pairs afterwards.
- **Mini-waterfall sprints** — spec the first week, code the second, tests "next sprint". You've sliced waterfall into two-week chunks, not done agile. An increment must be *done* — tests included — by the end of the sprint.
- **Velocity as surveillance** — the moment a manager compares teams or demands "+10% points", estimates quietly inflate. Velocity is the team's forecasting tool, for the team.
- **The SM as project manager** — a Scrum Master who assigns tasks and demands accountability isn't an SM, it's a project manager with a new title. The team self-organizes; the SM clears the path.
- **"Agile = no docs, no plan"** — the manifesto prioritizes, it doesn't eliminate. You document what's useful, you plan at the scale of a sprint and a roadmap — you just refuse to believe a plan frozen six months out.

## Going further

- [The agile manifesto](https://agilemanifesto.org/) and its [12 principles](https://agilemanifesto.org/principles.html) — 5 minutes, read the whole thing
- [The official Scrum Guide](https://scrumguides.org/) — 13 pages, the source to cite in an interview
- Henrik Kniberg, [Scrum and XP from the Trenches](https://www.infoq.com/minibooks/scrum-xp-from-the-trenches-2/) — Scrum as lived, not Scrum as theorized
- Henrik Kniberg, [Agile Product Ownership in a Nutshell](https://www.youtube.com/watch?v=502ILHjX9EE) — a 15-minute video, the best explanation of the PO role
