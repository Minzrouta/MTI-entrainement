---
title: "Passwords: hashing & storage"
date: "2026-09-11"
category: "Sécurité"
level: "Fondamental"
summary: "Salt, bcrypt, argon2id, timing attacks: knowing how to store a password correctly is THE make-or-break security question in internship interviews — and the answer boils down to three reflexes."
---

## The essentials

A password is **never stored in plaintext** — obvious. But it's not stored **encrypted** either: encryption is **reversible** by definition. If the key leaks (and it always ends up leaking: database dump, stolen backup, malicious admin), every password is recoverable at once.

The right answer: a **cryptographic hash**, a one-way function. You store `hash(password)`, never the password. At login, you recompute the hash of what the user typed and compare. Nobody — not even you — can recover the original password from the hash.

> ⚠️ **Encrypted ≠ hashed** — encryption (AES, RSA…) is designed to be reversed with the right key; a hash is designed to never be. Saying "I encrypt passwords" in an interview is an instant red flag. The right phrasing: "I hash them with a dedicated algorithm and a salt".

But beware: **not all hashes are equal**. MD5 and SHA-256 are cryptographic hashes… designed to be *fast*. A modern GPU computes billions of SHA-256 per second: an attacker who steals your database runs through an entire dictionary in minutes. You need a **deliberately slow and expensive** algorithm: bcrypt, scrypt or argon2id.

## How it works

The full flow, signup then login:

```text
SIGNUP
 user ──"hunter2"──▶ server
                        │ salt = unique random value
                        │ hash = bcrypt(salt + "hunter2")
                        ▼
                     DB: { email, hash }   (the salt lives
                                            inside the hash)
LOGIN
 user ──"hunter2"──▶ server
                        │ reads the hash from the DB
                        │ recomputes with the same salt
                        │ constant-time compare
                        ▼
                     equal? ── yes ──▶ session/JWT
                             └─ no ──▶ 401 (vague message)
```

Two ingredients make this flow solid:

- **The salt**: a unique random value per user, concatenated with the password before hashing. Without a salt, two users with the same password get the same hash, and worse, an attacker can precompute **rainbow tables** (giant hash → password tables) once and for all. With a unique salt, every hash must be attacked individually. The salt is **not secret**: bcrypt stores it in plain sight inside its output string.
- **The tunable cost**: bcrypt has a *cost factor* (2^cost iterations), argon2id has memory/time/parallelism parameters. You tune it so the computation takes ~100 ms server-side: imperceptible for one login, catastrophic for an attacker who must test billions of candidates. And when hardware improves, you raise the parameter.

| Algorithm | Speed | Built-in salt | Correct use |
|---|---|---|---|
| MD5 | Very fast, broken | No | Nothing anymore (non-security checksum at best) |
| SHA-256 | Very fast | No | File integrity, signatures — **not passwords** |
| bcrypt | Slow, tunable cost | Yes | Passwords (battle-tested standard, 72-byte limit) |
| scrypt | Slow, RAM-hungry | Yes | Passwords |
| argon2id | Slow, tunable RAM + CPU | Yes | Passwords (current OWASP recommendation) |

## Key concepts to master

- **One-way function**: easy to compute one way, infeasible to invert. "Cracking" a password hash is never a mathematical inversion: it's brute force or a dictionary — which is exactly why slowness matters.
- **Rainbow tables vs salt**: a precomputed table only helps if everyone hashes the same way. A random 16-byte salt per user makes precomputation useless.
- **Timing attack**: comparing two strings with `===` stops at the first differing byte — the response time leaks information. For any secret (API tokens, HMAC signatures), use a **constant-time comparison** (`crypto.timingSafeEqual` in Node). Good news: `bcrypt.compare` already does it for you.
- **Password reset done right**: generate a **random, single-use, expiring** token (15-60 min), store its *hash* in the DB (the email link is a secret like any other), invalidate it after use, and respond "if this account exists, an email has been sent" so you don't reveal which emails are registered (account enumeration).
- **Pepper** (bonus): a global server-side secret (kept out of the DB) added before hashing — a database dump alone is no longer enough. Optional, worth mentioning as a deep cut.
- **MFA & passkeys** (overview): hashing protects storage, not phishing. A second factor (TOTP, WebAuthn) protects even if the password leaks; **passkeys** (WebAuthn key pairs) remove the password entirely — nothing secret to store server-side, just public keys.

In Node, the correct version fits in a few lines:

```javascript
import bcrypt from "bcrypt";

const COST = 12; // 2^12 iterations ≈ 100-250 ms; raise it as hardware improves

// Signup: generates the salt AND hashes in one call
async function register(email, password) {
  const hash = await bcrypt.hash(password, COST);
  // hash = "$2b$12$N9qo8uLO...": algo, cost and salt embedded in the string
  await db.users.insert({ email, hash }); // store ONLY the hash
}

// Login: bcrypt reads the salt back from the stored hash,
// recomputes, and compares in constant time
async function login(email, password) {
  const user = await db.users.findByEmail(email);
  // compare even if the user doesn't exist → uniform response time
  const ok = user && (await bcrypt.compare(password, user.hash));
  if (!ok) throw new AuthError("Invalid credentials"); // deliberately vague message
  return createSession(user);
}
```

> 💡 **The bcrypt format** — the `$2b$12$...` string contains everything: the algorithm version (`2b`), the cost (`12`), then salt + hash encoded. That's why there is no `salt` column in the table: showing you know this lands very well.

## In an interview

**"How do you store your users' passwords?"** — Never plaintext, never encrypted (reversible). Hashed with a dedicated algorithm — bcrypt or argon2id — with a unique salt per user and a cost factor tuned to around 100 ms. At login, recompute and compare in constant time.

**"Why isn't SHA-256 enough, since it's a cryptographic hash?"** — Because it's designed to be fast: billions of hashes/second on a GPU, so dictionaries and brute force become practical again on a dump. Password algorithms are deliberately slow and memory-hard, with a parameter you raise over the years.

**"What is the salt for, and must it stay secret?"** — It makes every hash unique: it defeats rainbow tables and prevents spotting two users with the same password. It's not secret — bcrypt stores it in plain sight in its output; the algorithm's slowness protects you, not the salt's secrecy.

**"What is a timing attack?"** — A naive comparison (`===`) stops at the first differing character: by measuring response times, an attacker guesses a secret byte by byte. Countermeasure: constant-time comparison (`crypto.timingSafeEqual`, `bcrypt.compare`). It applies to any secret: tokens, webhook signatures.

**"How do you design a safe 'forgot password' flow?"** — Random single-use token, expiring (15-60 min), whose hash is stored in the DB; invalidated after use; identical response whether the email exists or not to prevent account enumeration; and you never reveal the old password — you don't know it, which is exactly the point.

## Pitfalls & misconceptions

> ⚠️ **"They emailed me my password back"** — absolute red flag: if a site can send it back, it stores it plaintext or encrypted. A proper reset sends a *link*, never the password.

- **"I double the hash: md5(sha1(x)), it's safer"** — no: stacking fast hashes stays fast. Security comes from the tunable cost, not from the exoticism of a homemade recipe. Golden rule: never roll your own crypto.
- **"The salt must be hidden in another table"** — pointless: the threat model assumes the attacker has everything. The salt defeats precomputation, not reading.
- **Absurd complexity rules** (uppercase + symbol + rotation every 90 days) produce `Password1!` then `Password2!`. Current NIST guidance: length first, check against breached-password lists, no forced rotation.
- **Rate limiting is still essential**: the best hash in the world doesn't stop an *online* brute force against the login form. Rate limiting, backoff, progressive lockout.
- **bcrypt truncates at 72 bytes**: beyond that, the rest of the password is ignored. Documented, rarely a blocker, but good to know (argon2id has no such limit).

## Going further

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — the reference to cite in an interview
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) — the official guidance on password rules
- [Have I Been Pwned](https://haveibeenpwned.com/) and its Pwned Passwords API (k-anonymity) to reject already-breached passwords
- [webauthn.guide](https://webauthn.guide/) to understand passkeys and WebAuthn — the natural sequel to this card
