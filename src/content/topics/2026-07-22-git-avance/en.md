---
title: "Advanced Git: rebase, cherry-pick & bisect"
date: "2026-07-22"
category: "Outils"
level: "Intermédiaire"
summary: "Understand Git's object model so a rebase never scares you again: merge vs rebase, cherry-pick, bisect and the reflog as a safety net — the Git questions that separate candidates in interviews."
---

## The essentials

Git does not store diffs: it is a content-addressed **database of snapshots**. Each commit is a complete snapshot of the project, identified by a SHA-1 hash computed from its content. Every "advanced" command — rebase, cherry-pick, bisect — stops being magic once you understand this model: they only ever **create new commits and move pointers**. Nothing is modified in place, and almost nothing is truly lost.

In interviews, these topics separate the candidate who "uses Git" (add/commit/push) from the one who understands it. "Merge or rebase?" comes up almost every time; answering it with the object model in mind changes everything.

## How it works

The object model fits in four types, stored in `.git/objects`:

- **Blob** — the content of a file (not its name, not its path).
- **Tree** — a directory: a list of names pointing to blobs and other trees.
- **Commit** — points to a tree (the full snapshot), to its parent(s), plus author, date and message. The hash covers all of it: changing one character of the message produces a different commit.
- **Annotated tag** — a named object pointing to a commit (typically releases).

A **branch is just a pointer**: a 41-byte file in `.git/refs/heads/` containing a commit hash. `HEAD` points to the current branch. Creating a branch is instant and free — that's Git's killer feature, and the whole history is just a directed acyclic graph (DAG) of commits.

**Merge vs rebase**: `git merge feature` creates a merge commit with two parents and preserves history as it actually happened. `git rebase main` (from `feature`) **replays** each commit on top of `main`: **new commits** (new hashes), a linear but rewritten history — the old commits still exist in `.git/objects`, nothing points to them anymore.

```text
before                       after `git rebase main`

      A──B  feature
     /                       ──C──D──E──A'──B'  feature
──C──D──E  main                      ▲
                                     main
```

| | `git merge` | `git rebase` |
|---|---|---|
| History | Real, non-linear | Rewritten, linear |
| Commits | 1 merge commit (2 parents) | New commits, new hashes |
| Reading & bisect | Noisier | Straight line, easy to bisect |
| Shared branch | Safe | Forbidden |
| Typical use | Integrating the PR | Updating your branch onto `main` |

> 🎤 **In an interview** — when asked "merge or rebase?", the point-scoring reflex: draw this diagram. Two arrows, five commits, and you show you understand the object model instead of reciting a preference.

**Interactive rebase** (`git rebase -i HEAD~5`) opens the list of commits in your editor: `pick` (keep), `reword` (change the message), `squash`/`fixup` (fold into the previous one), `edit` (stop to amend), `drop` (delete) — and you can reorder the lines. It's the standard tool for cleaning up a branch before opening the pull request.

A typical session:

```bash
$ git rebase -i HEAD~4      # rework the last 4 commits

# --- the todo file opened in the editor ---
pick   a1b2c3d feat: login form
reword f4e5d6c fix typo          # stop to rewrite this message
squash 9a8b7c6 wip               # fold into the previous commit
drop   3c2b1a0 debug logs        # delete this commit

# save and quit: Git replays everything in order.
# Going wrong? `git rebase --abort` puts everything back.
```

> 💡 **Safety net** — a botched rebase destroys nothing: `git reflog` gives you the hash from before the operation, `git reset --hard HEAD@{n}` restores it. Saying this unprompted shows the tool doesn't scare you.

## Key concepts to master

- **cherry-pick**: `git cherry-pick <hash>` replays one specific commit onto the current branch (new commit, new hash). Canonical use case: backporting a hotfix from `main` to a release branch. Use in moderation: if the source branch is later merged, the same change exists twice in history.
- **bisect**: binary search for the commit that introduced a bug. `git bisect start`, `git bisect bad` (HEAD is broken), `git bisect good v1.2` (that version worked); Git checks out the middle commit, you test, answer `good` or `bad`, and in log₂(n) steps the culprit is found — 1000 commits ≈ 10 tests. Automatable: `git bisect run ./test.sh` (exit 0 = good, anything else = bad).
- **reflog**: `git reflog` locally journals every move of `HEAD` and of branches (kept ~90 days by default). A botched rebase, an unfortunate `reset --hard`, a deleted branch: the reflog gives you the previous hash, and `git reset --hard HEAD@{2}` restores it. A commit is only truly lost once nothing references it anymore *and* the garbage collector has run.
- **Branching strategies**: **trunk-based development** = very short-lived branches (hours, a few days) merged quickly into `main`, feature flags for incomplete code — the norm with modern CI/CD. **Git flow** = structured `develop`, `release/*`, `hotfix/*` branches — relevant for versioned, shipped software (mobile, embedded), too heavy for continuous deployment. Be able to explain why trunk-based dominates today.
- **Commit conventions**: Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, `!` suffix for a breaking change. Readable history, automatable changelog and version bumping (semantic-release). Imperative mood, short first line, the *why* in the body.
- **`--force-with-lease`**: after a rebase, `git push` is rejected (diverged history). `--force` blindly overwrites the remote branch; `--force-with-lease` fails if someone pushed in the meantime. It's the only acceptable force push on a team.

## In an interview

**"Merge or rebase?"** — Both integrate changes; the difference is the resulting history. Merge preserves reality (merge commit, non-linear history); rebase rewrites it to get a linear history that's easier to read and to bisect. Common practice: rebase your local branch onto `main` to update it cleanly, then merge (often squash merge) the PR. Golden rule to state unprompted: never rebase commits that have already been pushed and shared.

**"A bug appeared somewhere in the last 500 commits. How do you find which one?"** — `git bisect`: you mark one `bad` and one `good` commit, Git binary-searches — about 9 tests are enough for 500 commits. Bonus: `git bisect run` with a test script to automate the whole hunt.

**"You ran `git reset --hard` on the wrong commit. Is it gone?"** — No: `git reflog` lists all recent positions of HEAD; find the entry from before the mistake, then `git reset --hard HEAD@{n}`. What is not recoverable: work that was never committed — hence frequent commits and the stash.

**"What is a branch, concretely?"** — A mutable pointer to a commit, a 41-byte file. The history is the DAG of commits; the branch is just a label that advances with each new commit. That's why branching is instant, unlike SVN which copied directories.

**"When would you use cherry-pick?"** — To backport an isolated fix to a release branch, or to salvage one specific commit from an abandoned branch. Not to synchronize whole branches: that's what merge/rebase are for, and duplicated commits complicate history.

## Pitfalls & misconceptions

> ⚠️ **The golden rule** — never rebase a **shared** branch: the new hashes leave colleagues who based their work on the old commits with diverged histories that are painful to reconcile. Rebase only your local, unpushed commits; when in doubt, merge.

- **`git push --force` as a reflex**: prefer `--force-with-lease` — same effect when all is well, but it fails if the remote branch moved since your last fetch. Wiping out a colleague's work with `--force` is the classic blunder.
- **"The rebase deleted my commits"** — no: the old commits are no longer referenced but remain in `.git/objects` and in the reflog for weeks.
- **`git pull` is not harmless**: it's `fetch` + `merge`, a source of noisy merge commits. `git pull --rebase` (or `pull.rebase=true` in config) keeps local history clean.
- **Systematically squashing entire branches**: fine for short PRs, but you lose the step-by-step structure that helps review… and bisect.

## Going further

- [Pro Git, ch. 10 — Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain): the object model explained by the reference book (free)
- The official [git rebase](https://git-scm.com/docs/git-rebase) and [git bisect](https://git-scm.com/docs/git-bisect) pages
- [Conventional Commits](https://www.conventionalcommits.org/): the spec for standardized messages
- [Learn Git Branching](https://learngitbranching.js.org/): visualize rebase and cherry-pick by manipulating the graph yourself
