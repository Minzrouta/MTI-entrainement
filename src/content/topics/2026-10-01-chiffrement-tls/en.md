---
title: "Symmetric/asymmetric encryption & TLS"
date: "2026-10-01"
category: "Sécurité"
level: "Intermédiaire"
summary: "One shared key or a public/private pair? Understand why TLS uses both, what a certificate actually proves, and how to answer \"explain HTTPS to me\" — a near-guaranteed interview question."
---

## The essentials

Encryption turns readable data into data that is unreadable to anyone without the right key. Two families share the work, and the whole art of modern protocols lies in combining them.

**Symmetric encryption** (AES) uses **a single key** to encrypt and decrypt. It is very fast — CPUs have dedicated instructions (AES-NI), you can encrypt several GB/s. Its Achilles heel: both parties need the same key. How do you exchange it over a network you don't control? Sending it in cleartext is like mailing the safe's code along with the safe.

**Asymmetric encryption** (RSA, elliptic curves) solves that problem with a **key pair**: the public key is handed out to everyone, the private key never leaves its owner. What one encrypts, only the other decrypts. The price: it is slow — roughly a thousand times slower than AES — and limited to small messages.

| | Symmetric (AES) | Asymmetric (RSA / EC) |
|---|---|---|
| Keys | One, shared | Public / private pair |
| Speed | GB/s (hardware acceleration) | ~1000× slower |
| Key size | 128–256 bits | RSA ≥ 2048 bits, EC 256 bits |
| Core problem | Exchanging the key | Binding the public key to an identity |
| Typical use | Encrypting traffic (TLS session) | Key exchange, signatures, certificates |

Hence the universal scheme — TLS, SSH, Signal, all the same: **asymmetric crypto is used to agree on a session key, then symmetric crypto encrypts all the traffic.** This is called hybrid encryption.

## How it works

The TLS 1.3 handshake fits in one sentence: client and server exchange what they need to derive a common key, the server proves its identity, then everything switches to symmetric.

```text
Client                                   Server
  │ ClientHello                             │
  │ versions, ciphers, ephemeral DH share   │
  │────────────────────────────────────────▶│
  │              ServerHello + DH share     │
  │              Certificate + signature    │
  │◀────────────────────────────────────────│
  │                                         │
  │  both derive the same session key       │
  │  (ECDHE) — it never travels             │
  │                                         │
  │═════ traffic encrypted with AES-GCM ═══▶│
```

Step by step:

1. **ClientHello** — the client announces the TLS versions and cipher suites it accepts, and attaches its public share of an **ephemeral Diffie-Hellman** exchange.
2. **ServerHello** — the server picks the suite, returns its own DH share, its **certificate**, and a signature made with its private key: proof that it really holds the key matching the certificate.
3. **Derivation** — each side combines its private share with the other's public share and obtains the **same secret**, without it ever crossing the network. Since the DH keys are ephemeral, stealing the server's private key later doesn't decrypt past traffic: that's **forward secrecy**.
4. **Symmetric session** — all traffic switches to AES-GCM or ChaCha20-Poly1305, **authenticated** encryption: confidentiality and integrity in a single operation.

**TLS 1.3** (2018) does all this in **a single round trip** (versus two for TLS 1.2) and purged the broken algorithms: RSA key exchange without forward secrecy, RC4, SHA-1.

Trust remains: a man-in-the-middle attacker can run a perfectly clean handshake… with his own certificate. Hence the **CAs (Certificate Authorities)**: the server's certificate is signed by an intermediate CA, itself signed by a root CA preinstalled in the OS or browser. The client walks this **chain of trust** up to a root it already knows; one invalid link and you get the red warning. **Let's Encrypt** made certificates free and automated (ACME protocol, renewal every 90 days): no excuse left for serving cleartext HTTP.

> 🎤 **In an interview** — "Explain HTTPS to a beginner" is a classic. A version that works: "the padlock makes two promises. One: nobody can read or modify what's in transit — that's encryption. Two: you're really talking to the site in the address bar — that's the certificate, verified by a trusted third party. A sealed envelope, plus an ID card." Two ideas, zero jargon.

## Key concepts to master

- **Encrypting vs signing**: same key pair, opposite directions. Encrypt = the **recipient's public** key (only they can decrypt). Sign = the **sender's private** key over the message hash; anyone can verify with the public key. A signature proves author and integrity, it hides nothing.
- **Hash ≠ encryption**: a hash (SHA-256) is **irreversible and keyless** — you don't "decrypt" a hash, you can only test candidates. Uses: integrity, signatures, password storage (via bcrypt/argon2, never a bare SHA).
- **Certificate**: a public key + an identity (the domain) + validity dates + a CA's signature. Nothing secret inside — it's a public document.
- **Elliptic curves**: the same guarantees as RSA with much shorter keys (EC 256 bits ≈ RSA 3072). Today's standard: X25519 for key exchange, Ed25519/ECDSA for signatures.
- **HTTPS everywhere**: cleartext HTTP lets any intermediary (public Wi-Fi, ISP) read *and modify* pages — script injection included. The **HSTS** header forbids the browser from ever retrying HTTP.

All of it is easy to poke at with `openssl`:

```bash
# Generate an RSA pair: private (secret) then public
openssl genrsa -out priv.pem 2048
openssl rsa -in priv.pem -pubout -out pub.pem

# Encrypt with the recipient's PUBLIC key:
# only the private key holder can read
openssl pkeyutl -encrypt -pubin -inkey pub.pem \
  -in msg.txt -out msg.enc

# Sign with your PRIVATE key (signed SHA-256 hash)…
openssl dgst -sha256 -sign priv.pem -out msg.sig msg.txt
# …and anyone verifies with the public key
openssl dgst -sha256 -verify pub.pem \
  -signature msg.sig msg.txt        # → Verified OK

# Inspect a real site's certificate and chain
openssl s_client -connect example.com:443 \
  -servername example.com
```

> 💡 **Order of magnitude to remember** — AES encrypts GB/s, RSA KB/s. That ~1000× factor is what forces the hybrid architecture: asymmetric crypto only opens the session, it never encrypts the stream.

## In an interview

**"Symmetric vs asymmetric — and why combine them?"** — Symmetric: one shared key, very fast, but the key-exchange problem. Asymmetric: public/private pair, solves the exchange, but a thousand times slower. TLS combines them: asymmetric key exchange (ECDHE) to establish a common secret, then a symmetric session (AES) for the traffic. Best of both.

**"Walk me through a TLS handshake."** — 1.3 version: ClientHello with an ephemeral DH share → ServerHello with its DH share, its certificate and a signature → both derive the same session key → traffic in AES-GCM. A single round trip. Bonus: mention forward secrecy thanks to the ephemeral keys.

**"What is the certificate for, exactly?"** — To **authenticate** the server, not to encrypt. It binds a public key to a domain, under the signature of a CA the client already knows (chain of trust). Without it, the encryption would work just as well… with an attacker in the middle.

**"What's the difference between encrypting and signing?"** — Encrypting protects confidentiality: the recipient's public key. Signing proves origin and integrity: the sender's private key, verifiable by everyone. A signature does not hide the message.

**"Why hash passwords instead of encrypting them?"** — Encrypted = reversible for whoever has the key, and the key sits somewhere on the server. A slow, salted hash (bcrypt, argon2) cannot be decrypted: even the database admin can't recover the password, only verify an attempt.

## Pitfalls & misconceptions

> ⚠️ **Golden rule** — never implement your own crypto, and don't even assemble the primitives yourself (ECB mode, reused IV, non-constant-time comparison… the traps are endless). In practice: TLS for transport, a battle-tested library (libsodium) for the rest.

- **"The certificate encrypts the connection"** — no: it authenticates. The session keys come from the Diffie-Hellman exchange; the certificate just guarantees you're negotiating it with the right server.
- **"HTTPS hides everything"** — the content and the URL path, yes. But the visited domain leaks via the DNS query and the handshake's SNI (ECH is being rolled out for the latter).
- **"SSL"** — the term survives in everyday speech (and in "openssl"), but SSL 2/3 have been dead and forbidden for years. The protocol is TLS, versions 1.2 and 1.3.
- **Self-signed certificate in production** — it encrypts, but proves nothing: clients have to click "accept the risk", training them into exactly the wrong reflex. Keep it for local dev.
- **MD5 and SHA-1** are broken for any security purpose (practical collisions). SHA-256 minimum.

## Going further

- [Cloudflare — What happens in a TLS handshake?](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/): the handshake, properly popularized
- [The Illustrated TLS 1.3 Connection](https://tls13.xargs.org/): every byte of the handshake, annotated — spectacular
- [Let's Encrypt — How it works](https://letsencrypt.org/how-it-works/): the ACME protocol explained
- [RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446): the TLS 1.3 spec, skimmable
- [badssl.com](https://badssl.com/): a gallery of broken certificates to see browser errors for real
