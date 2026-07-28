---
title: "OWASP Top 10 & injections"
date: "2026-08-28"
category: "Sécurité"
level: "Intermédiaire"
summary: "The OWASP Top 10, SQL injection and the \"never trust user input\" reflex: the security baseline every recruiter expects from any developer candidate, interns included."
---

## The essentials

**OWASP** (Open Worldwide Application Security Project) publishes the **Top 10**: the reference ranking of web application security risks. The 2021 edition, one line each:

1. **A01 Broken Access Control** — users access what isn't theirs (number one, and the most frequently found).
2. **A02 Cryptographic Failures** — sensitive data poorly encrypted, in cleartext, or using obsolete algorithms (MD5, SHA1 for passwords).
3. **A03 Injection** — user data interpreted as code: SQL, shell commands, and XSS now belongs here too.
4. **A04 Insecure Design** — the flaw is in the design itself (no attempt limits, bypassable business logic), not in the code.
5. **A05 Security Misconfiguration** — configuration defects: default credentials, exposed stack traces, open ports, missing headers.
6. **A06 Vulnerable Components** — outdated vulnerable dependencies (the `npm audit` everyone ignores).
7. **A07 Identification & Authentication Failures** — broken sessions and authentication: brute force possible, weak passwords accepted.
8. **A08 Software & Data Integrity Failures** — blind trust in unverified data or code (compromised CI/CD, deserialization).
9. **A09 Logging & Monitoring Failures** — the attack succeeds and nobody sees it, for lack of logs and alerts.
10. **A10 SSRF** — the server is manipulated into making requests to internal targets only it can reach.

The common thread through almost the entire Top 10 fits in one rule: **never trust user input**. Any data coming from the client — URL parameter, request body, header, cookie — is potentially hostile, and **validation must happen server-side**, always.

## How it works

An **injection** always exploits the same confusion: the application builds a string (SQL query, shell command, HTML) by concatenating user data into it, and the interpreter on the other side cannot tell *data* from *code*.

```text
Input : ' OR '1'='1' --
            │
            ▼ naive concatenation
SELECT * FROM users
WHERE email = '' OR '1'='1' --' AND pw = '…'
            │
            ▼ the SQL interpreter runs ALL of it
   → the condition is always true
   → authentication bypassed
```

The defense is **not** escaping quotes by hand, it's **structurally separating code from data**: prepared statements. The query (the code) is sent first; the values (the data) travel separately and are never interpreted.

```javascript
// ❌ VULNERABLE: user input becomes SQL code
const rows = await db.query(
  `SELECT * FROM users WHERE email = '${req.body.email}'`
);
// email = "' OR '1'='1' --"  → the whole table comes back

// ✅ PREPARED STATEMENT: the value stays a value, whatever it contains
const rows = await db.query(
  "SELECT * FROM users WHERE email = $1",   // the code, frozen
  [req.body.email]                          // the data, never interpreted
);
// ORMs (Prisma, Sequelize…) do this by default — unless you use
// their "raw" methods with string concatenation.
```

Same family, other interpreters:

- **Command injection** — `exec("ping " + userInput)` with `userInput = "8.8.8.8; rm -rf /"`. Defense: don't go through a shell (`execFile` with separate arguments), strict allowlist.
- **XSS** (*Cross-Site Scripting*) — client-side injection: HTML/JS injected into the page and executed **in other users' browsers** (session theft, actions on their behalf). Defense: escape on output (modern frameworks do it by default — never bypass with `dangerouslySetInnerHTML`/`innerHTML` on user data), plus a **Content Security Policy** as defense in depth.

> ⚠️ **Front-end validation is not security** — a `required` attribute, a regex pattern or a disabled button on the client side is **UX**. Anyone bypasses the front-end with `curl` or by editing the DOM. The only validation that counts for security is the server's; the front-end's is just comfort for the honest user.

## Key concepts to master

The Top 10 in practice — each risk and its main countermeasure:

| Risk | Main countermeasure |
|---|---|
| A01 Access control (IDOR) | Check authorization **server-side on every request** |
| A02 Crypto failures | TLS everywhere; passwords in bcrypt/argon2, never MD5 |
| A03 Injection (SQL/XSS) | Prepared statements; output escaping; CSP |
| A04 Insecure design | Threat modeling, limits (rate limit, quotas) from day one |
| A05 Misconfiguration | Harden defaults, close ports, security headers |
| A06 Vulnerable components | `npm audit`, Dependabot, regular updates |
| A07 Authentication | MFA, rate limiting, sessions invalidated on logout |
| A08 Integrity | Sign/verify; never deserialize the unknown |
| A09 Logging | Log auth failures and sensitive access, alert |
| A10 SSRF | Allowlist outbound URLs, block private IPs and cloud metadata |

- **IDOR** (*Insecure Direct Object Reference*), the textbook case of broken access control: `GET /api/invoices/1042` → the user tries `1043` and reads someone else's invoice. The server checked authentication (who you are) but not **authorization** (what you're entitled to). Defense: on every request, verify the resource belongs to the current user.
- **Broken authentication**: allowing brute force (no rate limiting), accepting `123456`, storing passwords in cleartext or MD5, not invalidating sessions. Defense: bcrypt/argon2 (slow by design), rate limiting, MFA.
- **SSRF** (*Server-Side Request Forgery*): a "download from URL" feature redirected to `http://169.254.169.254/` (cloud metadata, AWS credentials) or an internal service. The server has network access the attacker doesn't — they turn it into a proxy. Defense: destination allowlist, blocking private IP ranges.
- **Security misconfiguration**, the most mundane: default password on an admin console, debug page in production, detailed stack traces returned to the client, public S3 bucket, CORS `*` with credentials.

> 💡 **Cross-cutting reflex** — in an interview, every countermeasure can be rephrased through the same grid: where is the trust boundary, what crosses it, is it validated server-side? Showing that grid beats reciting ten names.

## In an interview

**"What is SQL injection and how do you protect against it?"** — User input concatenated into a query gets interpreted as SQL (`' OR '1'='1' --` short-circuits a login). Protection: **prepared statements** — code and data sent separately, the value is never interpreted. ORMs do it by default. Manual escaping is not a reliable defense.

**"Difference between authentication and authorization?"** — Authentication: proving *who* you are (login, session, token). Authorization: checking *what* you're entitled to. IDOR is the perfect example of the second one forgotten: logged in, therefore "legitimate", but on someone else's resource.

**"What is an XSS flaw?"** — Client-side injection: user content rendered as HTML/JS and executed in other users' browsers (session cookie theft, actions in their name). Defense: output escaping (default in React/Vue), no `innerHTML` on user data, CSP as a safety net.

**"Is client-side JavaScript validation enough?"** — No, never: the client is under the attacker's control (curl, proxy, DevTools). Front-end validation improves UX; security happens exclusively server-side. Answer without hesitation — this one is eliminatory.

**"What is SSRF?"** — Making the server issue a request only it can make: internal services, `localhost`, cloud metadata (`169.254.169.254`). Classic as soon as a feature accepts a URL. Defense: allowlist and blocking private IPs.

## Pitfalls & misconceptions

> 🎤 **In an interview** — don't recite the Top 10 like a shopping list. Pick two or three (injection, IDOR, XSS), explain the attack **and** the defense with a mini-example. One candidate who shows the mechanism on a case is worth ten who enumerate acronyms.

- **"My ORM protects me from everything"** — from SQL injection, yes, by default… except the `raw` methods with concatenation. And the ORM protects neither from IDOR, nor XSS, nor misconfiguration.
- **"HTTPS secures my site"** — TLS encrypts the **transport**. A SQL injection travels perfectly well through an encrypted tunnel. HTTPS is necessary, not sufficient.
- **"Escaping dangerous characters is enough against SQL injection"** — manual escaping is fragile (encodings, edge cases); prepared statements solve the problem structurally. That's the expected answer.
- **"Security is for production, we'll see later"** — credentials committed to Git, the public bucket and the exposed debug port happen precisely "in the meantime". The Top 10 applies from the first commit.
- **Hashing ≠ encrypting**: a password is **hashed** (bcrypt/argon2, irreversible, slow by design), it is not encrypted and cannot be "decrypted". Confusing the two in an interview leaves a very bad impression.

## Going further

- [OWASP Top 10 (2021)](https://owasp.org/Top10/): the reference, with examples and countermeasures for each category
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/): practical sheets by topic (SQL Injection Prevention, XSS Prevention, Authentication…)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security): free interactive labs to *practice* each attack — the best possible preparation
- Exercise: take one of your projects and audit three points — parameterized SQL queries? authorization checked on every endpoint? secrets out of the Git repo?
