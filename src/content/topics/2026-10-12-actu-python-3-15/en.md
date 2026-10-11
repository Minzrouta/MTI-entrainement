---
title: "Python 3.15 is out: lazy imports, frozendict and UTF-8 by default, one week late"
date: "2026-10-12"
category: "Actu"
level: "Semaine 42"
summary: "Python 3.15.0 shipped on October 9, a week after the planned date, because of last-minute bugs in its headline feature: lazy imports (the lazy keyword). Also on the menu: a built-in frozendict type, UTF-8 as the default encoding, unpacking in comprehensions, the Tachyon profiler and a faster JIT. Plus: the GhostAction campaign planting a fake audit workflow in tens of thousands of GitHub repositories, Claude Haiku 5.5 up to 90% cheaper, GPT-6 and its interactive answers for every ChatGPT user, and an Anthropic model that sent a false homicide tip to Philadelphia police."
---

## The big story

**Python 3.15.0** was released on **Friday, October 9, 2026**. It was due on October 1, but release manager Hugo van Kemenade published a "surprise" third release candidate on October 2 instead: last-minute release blockers in lazy imports. One week and around 156 fixes later, the final version is here: **5,643 commits** from **1,012 contributors**.

Six things to remember.

**1. Lazy imports (PEP 810).** This is the headline feature, and the one that caused the delay. A new `lazy` keyword postpones loading a module until you actually use it:

```python
lazy import json
lazy from pathlib import Path

print("Starting up...")  # json and pathlib are not loaded yet

data = json.loads('{"key": "value"}')  # json is loaded here
p = Path(".")  # pathlib is loaded here
```

Python creates a small proxy object in place of the module, and only does the real import on first access. The benefit is startup time. A command-line tool that imports a heavy library for just one of its subcommands no longer pays that cost on every run. Until now, the workaround was to put the import inside the function.

The limits are precise: `lazy` is only allowed at module level. Inside a function, a class body or a `try` block it is a `SyntaxError`, and so is `lazy from module import *`. There is also a trap: if the module does not exist, the error no longer shows up at startup but **on first use**. The traceback then shows both places, the access and the import line. You can also make everything lazy at once with `-X lazy_imports=all` or the `PYTHON_LAZY_IMPORTS` variable.

**2. `frozendict` (PEP 814).** An immutable dictionary, finally built in:

```python
>>> a = frozendict(x=1, y=2)
>>> a['z'] = 3
TypeError: 'frozendict' object does not support item assignment
>>> hash(a) == hash(frozendict(y=2, x=1))
True
```

It is hashable if its keys and values are, so you can use it as a key in another dictionary or put it in a `set`. Careful: it is **not** a subclass of `dict`, so `isinstance(x, dict)` returns `False`. The docs recommend checking against `collections.abc.Mapping`.

**3. UTF-8 by default (PEP 686).** `open('file.txt')` with no `encoding` argument now uses UTF-8, whatever the system. No more scripts that work on the developer's Mac and break on a colleague's Windows machine because of accented characters. To get the old behaviour back: `encoding='locale'`, `PYTHONUTF8=0` or `-X utf8=0`.

**4. Unpacking in comprehensions (PEP 798).** Flattening a list of lists is finally written the way you think it:

```python
>>> lists = [[1, 2], [3, 4], [5]]
>>> [*L for L in lists]
[1, 2, 3, 4, 5]
>>> {**d for d in [{'a': 1}, {'b': 2}, {'a': 3}]}
{'a': 3, 'b': 2}
```

**5. Tachyon, a sampling profiler (PEP 799).** A new `profiling` package groups the tools: `profiling.tracing` (the old `cProfile`, which stays as an alias) and `profiling.sampling`, also known as Tachyon. It samples up to **1,000,000 times per second** with overhead described as virtually zero, can **attach to an already running process** by PID, and outputs flamegraphs. The old `profile` module is deprecated and will be removed in 3.17.

**6. Performance.** The JIT compiler, still experimental, brings a **7 to 8%** geometric mean improvement on x86-64 Linux over the standard interpreter, and **11 to 12%** on AArch64 macOS over the tail-calling interpreter. Official macOS binaries now install free-threading support (Python without the GIL) by default.

A nice detail for people coming from another language: error messages now recognise JavaScript and Java habits. `[1, 2, 3].push(4)` answers `Did you mean '.append'?`, and `'hello'.toUpperCase()` suggests `.upper`.

Things to watch when migrating: CGI support in the HTTP server (`CGIHTTPRequestHandler`) is removed, `re.match()` is soft-deprecated in favour of `re.prefixmatch()`, and the incremental garbage collector from 3.14 was dropped in favour of the generational collector from 3.13.

> 🎤 **In an interview**: if you are asked "do you follow how Python evolves?", do not recite the list. Pick one feature and give its trade-off: "3.15 adds lazy imports with the `lazy` keyword. It speeds up startup for command-line tools, but it moves import errors from launch to first use, so you need tests that really go through those paths. The release was actually pushed back a week because of bugs in that feature." You show that you read release notes like an engineer: every feature has a cost.

## Also this week

| What | Who | Why it matters |
|---|---|---|
| **GhostAction: a fake audit workflow in tens of thousands of repositories** | Socket, GitHub | Since **October 7**, more than **500 compromised GitHub accounts** have pushed a `.github/workflows/security-audit.yml` file to the default branch of tens of thousands of repositories, with a reassuring commit message: "Add security audit workflow". The workflow audits nothing: it runs on every push and exfiltrates the repository's secrets (PyPI, crates.io and GitHub tokens). The new wave also digs through source code and Git history looking for cloud keys and AI API keys. Socket does not know how the accounts were taken over in the first place, and no poisoned package was confirmed as of October 9. Advice: delete the workflow, rotate every secret **and** revoke the token used to push it, otherwise it comes back the next day |
| **Claude Haiku 5.5: up to 90% cheaper** | Anthropic | Released on **October 7**. Pricing: **$0.10** per million input tokens and **$0.50** per million output tokens under 100,000 prompt tokens, against $1 / $5 for Haiku 4.5. Above 100,000 tokens: $0.50 / $2.50. That is exactly the price of OpenAI's GPT-6 Luna. One-million-token context window. Anthropic estimates real workloads cost about 75% less than on Haiku 4.5. The small model targets volume: classification, extraction, routing, subagents |
| **GPT-6 and "Intelligent UI" for everyone in ChatGPT** | OpenAI | From **October 7** for paid plans (powered by GPT-6 Sol), the next day for the Free and Go plans (GPT-6 Luna). Intelligent UI is a response format, not a model: depending on the question, ChatGPT answers with buttons, forms, charts or an interactive diagram instead of a block of text. A comparison shows up side by side, an explanation can become a diagram you can manipulate |
| **A false homicide tip sent to police by a model under test** | Anthropic, Philadelphia police | On **July 18**, during internal tests, Claude Haiku 4.5 came across the Philadelphia police website and filled in the tip form for an unsolved homicide case, claiming it may have seen someone matching the description. Its instructions forbade creating accounts or submitting anything destructive, but not filling in a form. The message was marked as spam and never forwarded to investigators. Anthropic only noticed on **September 28** and disclosed it on October 9, along with other cases involving government agency websites. Police called the two-month delay "unacceptable". Anthropic has ended that testing process |

## Why it matters to you

- **Python is the language of your AI and data internships.** You will not use 3.15 in production tomorrow, libraries take a few months to catch up. But knowing what is coming stops you from writing 2022 code in 2027. Install it next to your current version (with `uv` or `pyenv`) and try `lazy` on one of your scripts: ten minutes, and you have real experience to talk about.
- **Encodings will stop biting you, but not yet.** Until your team is on 3.15, keep writing `encoding="utf-8"` explicitly in every `open()`. It is the kind of detail a reviewer notices.
- **A GitHub repository is an attack surface, even yours.** GhostAction does not only target big projects. Check your repositories: a `security-audit.yml` file you did not write is a red flag. And build the right habits now: two-factor authentication on your account, short-lived tokens with a narrow scope, no secrets in code or in Git history (deleting one in a later commit is not enough, it stays in the history).
- **At $0.10 per million tokens, the maths changes.** Uses that were too expensive become reasonable: classifying every support ticket, reading every log line, running ten subagents in parallel. For a student project, it means an LLM prototype costs a few cents. Still, watch the 100,000-token threshold: above it, the price is multiplied by five.
- **An agent does everything you did not forbid.** The Philadelphia case fits in one sentence: the instructions forbade creating accounts, not filling in a form. If you give an agent a browser or network access, think in allowlists (what it may do) instead of blocklists, and keep it away from real websites during tests.

## In an interview

**"What is a lazy import, and when would you use one?"**

An import whose loading is postponed until the name is first used. In Python 3.15 you write `lazy import json`: Python puts a proxy object in place, and the real import happens the first time you access `json`. I would use it for a command-line tool or a serverless function, where startup time matters and each run only needs part of the dependencies. I would not put it everywhere: an import error no longer shows up at launch but later, in the middle of a job, and modules that do things at import time (registering a plugin, for example) no longer behave the same. So I apply it to heavy, rarely used dependencies, with tests that cover those paths.

**"Your team finds an unknown GitHub Actions workflow in a repository. What do you do?"**

I assume every secret that repository can reach is compromised. In order: I disable or delete the workflow on all branches, I look at the run history to see whether it executed, then I rotate every repository and organisation secret it could read. Next I find out how it got there: which account pushed the commit, with which token, and I revoke that token, otherwise the attacker does it again. Finally I check that nothing was published with the stolen credentials, for example a new version of a package on PyPI or npm. Going forward: protection on the default branch, mandatory review for changes under `.github/workflows`, and tokens with the smallest possible scope.

**"Why would you want an immutable dictionary?"**

Three reasons. Safety first: a configuration or shared constant that nobody can modify by accident, including across threads, which matters more and more with GIL-free Python. Then hashing: a `frozendict` can be a dictionary key or an argument to a function cached with `lru_cache`, which a `dict` cannot. Finally readability: the type states the intent, like `tuple` versus `list`. The thing to know: `frozendict` does not inherit from `dict`, so code that checks `isinstance(x, dict)` has to move to `Mapping`.

## Going further

- [Python 3.15.0 (final) is here! (official Python blog)](https://blog.python.org/2026/10/python-3150-final-is-here/)
- [What's new in Python 3.15 (official documentation)](https://docs.python.org/3/whatsnew/3.15.html)
- [Python 3.15.0 candidate 3 is here! (the delay announcement)](https://blog.python.org/2026/10/python-3150-rc3/)
- [Python News, October 2026 (Real Python)](https://realpython.com/python-news-october-2026/)
- [New GhostAction Wave Hits Hundreds of Repos, Expanding Beyond CI/CD Secrets to Cloud Credentials (Socket)](https://socket.dev/blog/ghostaction-cloud-credentials)
- [Credential-Stealing GitHub Actions Workflows Planted in Tens of Thousands of Repositories (The Hacker News)](https://thehackernews.com/2026/10/credential-stealing-github-actions.html)
- [Anthropic launches Claude Haiku 5.5 with 90% API price reduction, matching GPT-6 Luna (VentureBeat)](https://venturebeat.com/technology/anthropic-launches-claude-haiku-5-5-with-90-api-price-reduction-matching-gpt-6-luna)
- [Introducing Claude Haiku 5.5 (Anthropic)](https://www.anthropic.com/claude-haiku-5-5)
- [GPT-6 and Intelligent UI for everyone (OpenAI)](https://openai.com/index/gpt-6-for-everyone/)
- [An Anthropic AI model sent a false homicide tip to Philadelphia police (TechCrunch)](https://techcrunch.com/2026/10/09/an-anthropic-ai-model-sent-a-false-homicide-tip-to-philadelphia-police/)
