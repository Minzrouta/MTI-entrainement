---
title: "OAuth 2.0, OIDC & JWT"
date: "2026-07-25"
category: "Sécurité"
level: "Intermédiaire"
summary: "Who you are, what you may do, and how to prove it without server-side state: the auth trio most asked about in backend interviews — and the one candidates mix up the most."
---

## The essentials

**Authentication**: proving who you are. **Authorization**: deciding what you're allowed to do. All the confusion around this topic starts there: **OAuth 2.0 is a delegated authorization framework** ("this app may read my GitHub repos without knowing my password"), not an authentication protocol. **OIDC (OpenID Connect)** is what adds the identity layer on top. And **JWT (JSON Web Token)** is just a signed token format, used (among others) by these protocols.

Two main models to keep a user logged in:

- **Sessions + cookies**: the server keeps the state (memory, Redis, DB); the browser only holds an opaque session ID in a cookie. Revocation is trivial (delete the session), but state must be shared across instances.
- **Self-contained tokens (JWT)**: the state lives in the token itself, signed by the server. Any service holding the verification key can validate the token **without a network call or shared storage** — ideal for microservices — but revocation becomes the problem.

## How it works

A JWT is three **base64url**-encoded parts separated by dots: `header.payload.signature`.

- **Header**: the signing algorithm — `{"alg":"RS256","typ":"JWT"}`.
- **Payload**: the **claims** — `sub` (subject), `iss` (issuer), `aud` (audience), `exp` (expiration), `iat` (issued at), plus business claims (roles, email).
- **Signature**: computed over header + payload. **HS256** = HMAC with a **shared secret** (the same secret signs and verifies — symmetric). **RS256** = RSA: the **private** key signs, the **public** key verifies. In microservices, RS256 wins: services verify with the public key (published through a **JWKS** endpoint) without ever holding the private key.

Decoded, it looks like this:

```jsonc
// Header — 1st part
{ "alg": "RS256", "typ": "JWT", "kid": "2026-key-1" }

// Payload — 2nd part: the claims, readable by anyone
{
  "sub": "user-42",                  // who (the subject)
  "iss": "https://auth.example.com", // issued by whom
  "aud": "api.example.com",          // for which API
  "exp": 1754061600,                 // expires at (Unix timestamp)
  "iat": 1754060700,                 // issued at
  "roles": ["dev"]                   // business claim
}

// Signature — 3rd part: signs header + payload
```

Crucial point: a JWT is **signed, not encrypted**. The payload above decodes in one click (jwt.io). The signature guarantees integrity and origin, not confidentiality.

> 💡 **Do it once** — paste a real token into [jwt.io](https://jwt.io/) and see your own payload in plain text: it beats every reminder that base64 ≠ encryption. So never put a password or unnecessary personal data in a JWT.

**The revocation problem**: a JWT stays valid until its `exp` — the server never "sees" a logout or a ban. The standard answer: a **short-lived access token** (5-15 min) + a long-lived **refresh token**, stored and revocable server-side. A stolen access token has a short exploitation window; the refresh token can be revoked — and **rotated**: each use issues a new one, and reuse of an old one signals theft.

**OAuth 2.0** defines four roles: **resource owner** (the user), **client** (the application), **authorization server** (issues the tokens), **resource server** (the protected API). The flows to know:

- **Authorization code + PKCE** — the reference flow (diagram below). **PKCE**: the client generates a random `code_verifier`, sends its SHA-256 hash (`code_challenge`) upfront, then proves possession of the verifier at exchange time — an intercepted code is unusable. Recommended for **all** clients (SPA, mobile, backend), mandatory in OAuth 2.1.
- **Client credentials** — machine-to-machine, no user involved: the client authenticates directly (batch job, internal service).
- **Implicit** (token returned in the URL fragment) and **ROPC** (password typed into the client): **deprecated**, removed from OAuth 2.1. Know them to name them, not to use them.

The authorization code + PKCE flow, step by step:

```text
Client (SPA)          Authorization Server       API
  │ 1. redirect + code_challenge│                  │
  ├────────────────────────────▶│                  │
  │ 2. login + consent          │                  │
  │◀───────────────────────────▶│                  │
  │ 3. code (short-lived)       │                  │
  │◀────────────────────────────┤                  │
  │ 4. code + code_verifier     │                  │
  ├────────────────────────────▶│                  │
  │ 5. access + refresh         │                  │
  │    (+ id_token if OIDC)     │                  │
  │◀────────────────────────────┤                  │
  │ 6. Authorization: Bearer <access_token>        │
  ├─────────────────────────────┴─────────────────▶│
```

**OIDC** standardizes identity on top of OAuth: the `openid` scope, an **`id_token`** (a JWT) carrying who the user is (standardized claims: `sub`, `email`, `name`…), and a `/userinfo` endpoint. "Login with Google" is OIDC. Three tokens are now in flight — never use one for the other:

| | Access token | Refresh token | ID token (OIDC) |
|---|---|---|---|
| Purpose | Call the API | Obtain new access tokens | Know who is logged in |
| Consumed by | Resource server | Authorization server | The client |
| Lifetime | Short (5-15 min) | Long (days), revocable | Short, read at login |
| Typical storage | JS memory | httpOnly cookie, rotated | Not stored |

> 🎤 **In an interview** — the metaphor that lands: the access token is the cinema ticket (short-lived, grants entry), the refresh token the membership card (issues new tickets, revocable at the desk), the id_token the ID card (says who you are, grants access to nothing).

## Key concepts to master

- **Validating a JWT server-side**: verify the signature with the **expected** algorithm (enforced by the server, never blindly read from the header), then `exp`, `iss` and `aud`. Always through a battle-tested library (jose, jsonwebtoken, PyJWT) — never home-made crypto.
- **Front-end storage**: the robust pattern — access token **in memory** (JS variable, lost on refresh, silently renewed), refresh token in an **httpOnly cookie**. The why is in the callout below.
- **Scopes**: the perimeter requested by the client (`repo:read`) — authorization, not identity. The resource server must check them.
- **Expiration and clocks**: `exp` is checked server-side with a small tolerance (clock skew); on the client side, refresh before expiration.
- **JWKS and key rotation**: the authorization server publishes its public keys with a `kid` identifier; keys rotate without redeploying the services.

> ⚠️ **localStorage vs httpOnly cookie** — a token in `localStorage` is readable by any script on the page: one **XSS** flaw (or one compromised npm package) is enough to exfiltrate it. An `httpOnly` + `Secure` + `SameSite` cookie is invisible to JS, but sent automatically → **CSRF** surface (mitigated by `SameSite=Lax/Strict` and an anti-CSRF token). Neither option is safe "on its own": it's a trade-off, and you must be able to defend it.

## In an interview

**"Difference between authentication and authorization?"** — Authentication = verifying identity (login, MFA). Authorization = verifying rights (may this user delete this resource?). The bonus that lands: OAuth 2.0 does authorization; authentication is OIDC's job.

**"Explain the structure of a JWT."** — Three base64url segments: header (alg), payload (claims: sub, iss, aud, exp…), signature over the first two. Signed, not encrypted: anyone can read it, nobody can modify it without breaking the signature. HS256 shared secret vs RS256 private/public key.

**"How do you log a user out if their JWT is still valid?"** — You can't invalidate the token itself without reintroducing state. Expected answer: short access token + refresh token revocation; if immediate invalidation is required, a denylist of `jti` values (in Redis) until `exp` — acknowledging you've traded statelessness away again.

**"Why PKCE?"** — Historically for public clients (mobile/SPA) unable to keep a `client_secret`: the `code_verifier` hash binds the code to the client that requested it, so a stolen code cannot be exchanged. Now recommended everywhere, even with a secret.

**"Where do you store the token on the front end?"** — Walk through the XSS vs CSRF trade-off from the callout above, then conclude: access token in memory + refresh token in an httpOnly cookie. Showing you know both attacks is worth more than the answer itself.

## Pitfalls & misconceptions

- **`alg: none` and algorithm confusion**: old libraries accepted a token declaring `"alg":"none"` (empty signature!) or verified an RS256 token as HS256 using the public key as the HMAC secret. Defense: enforce the list of accepted algorithms server-side.
- **Weak HS256 secret**: the signature can be brute-forced **offline** (hashcat) — a "secret123"-grade secret falls in seconds, and the attacker then forges admin tokens. Long random secret (256 bits), or RS256.
- **"JWT = modern, sessions = obsolete"**: for a monolithic web app, a server-side session is simpler AND revocable. JWT is justified by multiple services, not by fashion.
- **Forgetting `aud`/`iss`**: a token issued for service A accepted by service B — the audience claim exists precisely for that.

## Going further

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) and [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700): the official state of the art (2025)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) and [OAuth 2.1 (draft)](https://oauth.net/2.1/), which consolidates best practices
- [jwt.io](https://jwt.io/) to decode tokens, and the [OWASP JWT cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) on the implementation side
