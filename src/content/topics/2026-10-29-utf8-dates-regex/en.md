---
title: "Bug magnets: UTF-8, dates & regex"
date: "2026-10-29"
category: "CS"
level: "Intermédiaire"
summary: "Three mundane topics, an outsized share of production bugs: encoding, timezones and regular expressions. Mastering them proves in an interview that you've maintained real code."
---

## The essentials

Three areas concentrate an outsized share of production bugs: strings (encoding), dates (timezones) and regular expressions. None is hard in theory; all of them punish implicit assumptions — "one character = one byte", "midnight is midnight", "my regex works on my examples". Interviewers like these topics because they separate the student who wrote code from the one who debugged it.

| Symptom | Cause | Fix |
|---|---|---|
| `Ã©tÃ©` displayed instead of `été` | UTF-8 bytes decoded as Latin-1 (mojibake) | declare UTF-8 everywhere: files, HTTP, DB |
| `'é'.length === 2` | UTF-16 units ≠ graphemes; NFD form | normalize, segment by grapheme |
| `"café" !== "café"` | NFC vs NFD: precomposed é vs e + accent | `.normalize('NFC')` before comparing |
| Meeting shifted by one hour | stored in local time + DST | store UTC + ISO 8601, convert on display |
| Birthday shifted by one day | date-only stored as local midnight | DATE type without time, never a timestamp |
| API frozen on one specific input | catastrophic backtracking (ReDoS) | regex without nested quantifiers, timeout |

## How it works

**Encoding.** ASCII encodes 128 characters in 7 bits — English, full stop. Unicode assigns a number (**code point**) to more than 150,000 characters: `é` = U+00E9, `€` = U+20AC. **UTF-8** encodes each code point on 1 to 4 bytes, variable length, while staying ASCII-compatible:

```text
Code point    →  UTF-8 bytes
U+0041 'A'    →  01000001                    (1 byte)
U+00E9 'é'    →  110_00011 10_101001         (2 bytes)
U+20AC '€'    →  1110_0010 10_000010
                 10_101100                   (3 bytes)
U+1F44D '👍'  →  11110_000 10_011111 …       (4 bytes)

The first byte's prefix encodes the length;
every continuation byte starts with 10.
```

One on-screen "character" (**grapheme**) can span several code points: `é` exists precomposed (U+00E9, **NFC** form) or decomposed into `e` + combining accent (U+0065 U+0301, **NFD** form). Visually identical, binary different — hence normalization before any comparison or search. **Mojibake** (`Ã©`) appears when UTF-8 bytes are re-read with the wrong charset.

```javascript
'é'.length                    // 1 (NFC form: U+00E9)
'é'.normalize('NFD').length   // 2: e + combining accent
'👍'.length                   // 2: surrogate pair —
                              // JS counts UTF-16 units
[...'👍'].length              // 1: iteration by code point
'👨‍👩‍👧'.length                  // 8! 3 emojis + 2 invisible ZWJs

// Correct comparison of accented strings:
'café'.normalize('NFC') === 'café'.normalize('NFC')
// → true (without normalize: false)

// Count what the user sees (graphemes):
[...new Intl.Segmenter().segment('👨‍👩‍👧')].length   // 1
```

**Dates.** The golden rule: **store in UTC, in ISO 8601 format** (`2026-10-29T14:30:00Z`), and convert to the user's timezone only at display time. A timezone is not a fixed offset: it changes with **DST** (an hour that doesn't exist in spring, an hour that exists twice in autumn) and with political decisions — the tz database is updated several times a year. The "local midnight" bug: store a date-only value (birthday, deadline) as a timestamp at local midnight, then display it in another timezone → the date moves back a day.

JavaScript's `Date` stacks up the traps: zero-indexed months (`new Date(2026, 9, 29)` = October 29), inconsistent parsing, mutable objects. In 2026, use the **Temporal** API (rolling out in JS engines) or a library like date-fns or Luxon.

```javascript
// Two traps in two lines:
new Date('2026-10-29')          // midnight UTC
new Date('2026-10-29T00:00')    // midnight LOCAL
// In Paris (UTC+1), one hour apart — comparing these
// naively shifts deadlines.
```

**Regex.** The useful building blocks: classes (`[a-z]`, `\d`, `\w`), quantifiers (`*`, `+`, `?`, `{n,m}`), anchors (`^`, `$`, `\b`), capturing groups `(…)`, named `(?<name>…)`, non-capturing `(?:…)`. The central trap: quantifiers are **greedy** by default — they swallow the maximum then step back (backtracking).

```javascript
'<b>bold</b> and <i>ital</i>'.match(/<.+>/)[0]
// → '<b>bold</b> and <i>ital</i>'   greedy: everything!
'<b>bold</b>'.match(/<.+?>/)[0]     // '<b>'  lazy: minimum
'<b>bold</b>'.match(/<[^>]+>/)[0]   // '<b>'  negated class:
                                    // fast, no backtracking
```

## Key concepts to master

- **Byte ≠ code point ≠ grapheme**: three distinct levels. `length`, `substring`, `reverse` often work at the wrong level and cut an emoji in half (`�`).
- **Normalize at the boundaries**: normalize to NFC at system entry points (forms, imports, filenames — macOS produces NFD), compare and index on the normalized form.
- **UTC + ISO 8601, with one exception**: a future event tied to a place ("meeting at 9am in Paris in 2027") is stored as local time + IANA identifier (`Europe/Paris`), because timezone rules may change before then. A past or absolute instant (log, payment) is stored in UTC.
- **Date-only types**: a birthday has no time and no timezone. `DATE` in SQL, `Temporal.PlainDate` in JS — never a timestamp at midnight.
- **Greedy vs lazy vs negated class**: `.+?` treats the symptom, `[^>]+` states the intent and removes the backtracking.
- **When not to use a regex**: as soon as the format is nested or recursive — HTML first. A regex cannot count nesting levels (regular language vs context-free language): use a real parser (DOMParser, BeautifulSoup). For emails: minimal validation + a confirmation email, not a 400-character regex.
- **Test your regexes**: on [regex101](https://regex101.com/) with edge cases (empty string, accents, hostile inputs), then unit tests documenting the covered cases.

> ⚠️ **ReDoS** — a regex with nested quantifiers like `(a+)+$` explodes into exponential backtracking on hostile input (`"aaaaaaaaaaaaaaaaaaaaab"` is enough). A single request can freeze a thread: Stack Overflow (2016) and Cloudflare (2019) went down because of one regex. Countermeasures: no nested quantifiers or overlapping alternations, a timeout on execution, or a guaranteed-linear engine (RE2, Rust's regex crate).

> 💡 **UTC everywhere, convert on display** — the backend, the DB and the logs know only UTC; the user's timezone appears only at the very last layer (rendering). One conversion point = one possible class of bugs, instead of one per layer.

## In an interview

**"Why can `'é'.length` be 2 in JavaScript?"** — Two possible reasons. If the string is in NFD, `é` is two code points (`e` + combining accent). And `length` counts UTF-16 units, not graphemes: `'👍'.length === 2` (surrogate pair). Complete answer: normalize to NFC, and segment by grapheme (`Intl.Segmenter`) when you want to count what the user sees.

**"How do you store dates in an international application?"** — UTC + ISO 8601 in the database, conversion to the user's timezone at display time. The nuance that scores points: a future localized event is stored as local time + IANA identifier, because DST rules may change between storage and the event.

**"Greedy vs lazy?"** — A greedy quantifier (`.+`) swallows the maximum then backs off until the rest of the pattern matches; lazy (`.+?`) takes the minimum then extends. On `<b>x</b>`, `<.+>` captures the whole string, `<.+?>` captures `<b>`. The best answer offers the negated class `<[^>]+>`: same result, no backtracking.

**"Why not parse HTML with a regex?"** — HTML is a nested language: a regex cannot count opening/closing levels (that's the limit of regular languages). It works on three examples then breaks on attributes, comments, nesting. A parser already exists in every ecosystem: DOMParser, BeautifulSoup, lxml.

**"What does DST change for a developer?"** — Twice a year, local time jumps: a nonexistent hour in spring, an ambiguous hour in autumn. Consequences: "add 24h" ≠ "tomorrow same time", cron jobs between 2am and 3am skip or run twice, durations computed in local time are off by an hour. Hence computing in UTC and using tz libraries.

## Pitfalls & misconceptions

- **"UTF-8 = 1 character per byte"** — only for ASCII. `é` takes 2 bytes, `€` 3, emojis 4. Truncating a string at N bytes can cut a character in half and produce `�`.
- **`substring`/`slice` break graphemes** — truncating "for the preview" at 20 characters can cut an emoji or an accent. Segment by grapheme before truncating.
- **`\d` is not `[0-9]` everywhere** — in Python, `\d` matches Unicode digits (including `'٣'`); use `re.ASCII` or `[0-9]` if you want Western Arabic digits.
- **Adding offsets by hand** (`hour + 2` for Paris) — the offset depends on the date because of DST. Always go through the tz database via a library.
- **"My email regex is correct"** — the RFC 5322 grammar is monstrous and a "perfect" regex rejects valid addresses. Check `something@something.something`, then send a confirmation email: the only reliable test.
- **Comparing dates with `==`** — in JS, two identical `Date`s are two different objects: `d1 == d2` is `false`. Compare `getTime()`, or use a library.

## Going further

- [The Absolute Minimum Every Software Developer Must Know About Unicode](https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/) — Joel Spolsky's classic
- [UTC is enough for everyone, right?](https://zachholman.com/talk/utc-is-enough-for-everyone-right) — Zach Holman, funny and thorough on timezones
- [Falsehoods programmers believe about time](https://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time) — the list of wrong assumptions
- [Cloudflare 2019 post-mortem](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) — one regex taking down a global CDN
- [regex101](https://regex101.com/) for testing, [Temporal documentation](https://tc39.es/proposal-temporal/docs/) for modern JS dates
