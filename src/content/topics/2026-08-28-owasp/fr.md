---
title: "OWASP Top 10 & les injections"
date: "2026-08-28"
category: "Sécurité"
level: "Intermédiaire"
summary: "Le Top 10 OWASP, l'injection SQL et le réflexe « ne jamais faire confiance à l'entrée utilisateur » : le minimum sécurité qu'un recruteur attend de tout candidat développeur, stage compris."
---

## L'essentiel

L'**OWASP** (Open Worldwide Application Security Project) publie le **Top 10** : le classement de référence des risques de sécurité des applications web. La version 2021, en une ligne chacun :

1. **A01 Broken Access Control** — l'utilisateur accède à ce qui ne lui appartient pas (le n°1, ex-aequo avec le plus fréquent).
2. **A02 Cryptographic Failures** — données sensibles mal chiffrées, en clair, ou avec des algos obsolètes (MD5, SHA1 pour les mots de passe).
3. **A03 Injection** — des données utilisateur interprétées comme du code : SQL, commandes shell, et désormais XSS y est rattaché.
4. **A04 Insecure Design** — la faille est dans la conception même (pas de limite d'essais, logique métier contournable), pas dans le code.
5. **A05 Security Misconfiguration** — défauts de config : credentials par défaut, stack traces exposées, ports ouverts, headers absents.
6. **A06 Vulnerable Components** — dépendances vulnérables non mises à jour (le `npm audit` qu'on ignore).
7. **A07 Identification & Authentication Failures** — sessions et authentification cassées : brute force possible, mots de passe faibles acceptés.
8. **A08 Software & Data Integrity Failures** — confiance aveugle dans des données ou du code non vérifiés (CI/CD compromise, désérialisation).
9. **A09 Logging & Monitoring Failures** — l'attaque réussit et personne ne le voit, faute de logs et d'alertes.
10. **A10 SSRF** — le serveur est manipulé pour faire des requêtes vers des cibles internes qu'il est seul à atteindre.

Le fil conducteur de presque tout le Top 10 tient en une règle : **ne jamais faire confiance à l'entrée utilisateur**. Toute donnée qui vient du client — paramètre d'URL, corps de requête, header, cookie — est potentiellement hostile, et **la validation doit se faire côté serveur**, toujours.

## Comment ça marche

Une **injection** exploite toujours la même confusion : l'application construit une chaîne (requête SQL, commande shell, HTML) en y concaténant des données utilisateur, et l'interpréteur en face ne sait pas distinguer *données* et *code*.

```text
Entrée : ' OR '1'='1' --
            │
            ▼ concaténation naïve
SELECT * FROM users
WHERE email = '' OR '1'='1' --' AND pw = '…'
            │
            ▼ l'interpréteur SQL exécute TOUT
   → la condition est toujours vraie
   → authentification contournée
```

La parade n'est **pas** d'échapper les quotes à la main, c'est de **séparer structurellement code et données** : les requêtes préparées. La requête (le code) part d'abord, les valeurs (les données) sont transmises à part et ne seront jamais interprétées.

```javascript
// ❌ VULNÉRABLE : l'entrée utilisateur devient du code SQL
const rows = await db.query(
  `SELECT * FROM users WHERE email = '${req.body.email}'`
);
// email = "' OR '1'='1' --"  → toute la table est renvoyée

// ✅ REQUÊTE PRÉPARÉE : la valeur reste une valeur, quoi qu'elle contienne
const rows = await db.query(
  "SELECT * FROM users WHERE email = $1",   // le code, figé
  [req.body.email]                          // la donnée, jamais interprétée
);
// Les ORM (Prisma, Sequelize…) le font par défaut — sauf si vous
// utilisez leurs méthodes "raw" avec de la concaténation.
```

Même famille, autres interpréteurs :

- **Command injection** — `exec("ping " + userInput)` avec `userInput = "8.8.8.8; rm -rf /"`. Parade : ne pas passer par un shell (`execFile` avec arguments séparés), allowlist stricte.
- **XSS** (*Cross-Site Scripting*) — l'injection côté client : du HTML/JS injecté dans la page et exécuté **chez les autres utilisateurs** (vol de session, actions à leur insu). Parade : échapper à l'affichage (les frameworks modernes le font par défaut — ne jamais contourner avec `dangerouslySetInnerHTML`/`innerHTML` sur de la donnée utilisateur), et une **Content Security Policy** en défense en profondeur.

> ⚠️ **La validation front n'est pas de la sécurité** — un `required`, un pattern regex ou un bouton désactivé côté client, c'est de l'**UX**. N'importe qui contourne le front avec `curl` ou en modifiant le DOM. La seule validation qui compte pour la sécurité est celle du serveur ; celle du front n'est qu'un confort pour l'utilisateur honnête.

## Concepts clés à maîtriser

Le Top 10 côté pratique — chaque risque et sa parade principale :

| Risque | Parade principale |
|---|---|
| A01 Access control (IDOR) | Vérifier l'autorisation **côté serveur à chaque requête** |
| A02 Crypto failures | TLS partout ; mots de passe en bcrypt/argon2, jamais MD5 |
| A03 Injection (SQL/XSS) | Requêtes préparées ; échappement à l'affichage ; CSP |
| A04 Insecure design | Threat modeling, limites (rate limit, quotas) dès la conception |
| A05 Misconfiguration | Durcir les défauts, fermer les ports, headers de sécurité |
| A06 Composants vulnérables | `npm audit`, Dependabot, mises à jour régulières |
| A07 Authentification | MFA, rate limiting, sessions invalidées au logout |
| A08 Intégrité | Signer/vérifier ; ne jamais désérialiser de l'inconnu |
| A09 Logging | Logger les échecs d'auth et accès sensibles, alerter |
| A10 SSRF | Allowlist d'URLs sortantes, bloquer IPs privées et métadonnées cloud |

- **IDOR** (*Insecure Direct Object Reference*), le cas d'école du broken access control : `GET /api/invoices/1042` → l'utilisateur essaie `1043` et lit la facture d'un autre. Le serveur vérifiait l'authentification (qui vous êtes) mais pas l'**autorisation** (ce à quoi vous avez droit). Parade : à chaque requête, vérifier que la ressource appartient bien à l'utilisateur courant.
- **Broken authentication** : autoriser le brute force (pas de rate limiting), accepter `123456`, stocker les mots de passe en clair ou en MD5, ne pas invalider les sessions. Parade : bcrypt/argon2 (lents par conception), rate limiting, MFA.
- **SSRF** (*Server-Side Request Forgery*) : une fonctionnalité « télécharger depuis une URL » détournée vers `http://169.254.169.254/` (métadonnées cloud, credentials AWS) ou un service interne. Le serveur a des accès réseau que l'attaquant n'a pas — il le transforme en proxy. Parade : allowlist de destinations, blocage des plages IP privées.
- **Security misconfiguration**, la plus banale : mot de passe par défaut sur une console d'admin, page de debug en prod, stack traces détaillées renvoyées au client, S3 bucket public, CORS `*` avec credentials.

> 💡 **Réflexe transversal** — en entretien, chaque parade peut se reformuler avec la même grille : où est la frontière de confiance, qu'est-ce qui la traverse, est-ce validé côté serveur ? Montrer cette grille vaut mieux que réciter dix noms.

## En entretien

**« C'est quoi une injection SQL et comment s'en protéger ? »** — L'entrée utilisateur concaténée dans une requête est interprétée comme du SQL (`' OR '1'='1' --` court-circuite un login). Protection : **requêtes préparées** — code et données transmis séparément, la valeur n'est jamais interprétée. Les ORM le font par défaut. L'échappement manuel n'est pas une défense fiable.

**« Différence entre authentification et autorisation ? »** — Authentification : prouver *qui* vous êtes (login, session, token). Autorisation : vérifier *ce à quoi* vous avez droit. L'IDOR est l'exemple parfait de la deuxième oubliée : connecté, donc « légitime », mais sur la ressource d'un autre.

**« C'est quoi une faille XSS ? »** — De l'injection côté client : du contenu utilisateur rendu comme HTML/JS et exécuté dans le navigateur des autres (vol de cookies de session, actions en leur nom). Parade : échappement à l'affichage (par défaut dans React/Vue), pas d'`innerHTML` sur de la donnée utilisateur, CSP en filet de sécurité.

**« La validation JavaScript côté client suffit-elle ? »** — Non, jamais : le client est sous le contrôle de l'attaquant (curl, proxy, DevTools). La validation front améliore l'UX ; la sécurité se joue exclusivement côté serveur. Réponse à donner sans hésitation — c'est une question éliminatoire.

**« C'est quoi une SSRF ? »** — Faire faire au serveur une requête qu'il est le seul à pouvoir faire : services internes, `localhost`, métadonnées cloud (`169.254.169.254`). Classique dès qu'une feature accepte une URL. Parade : allowlist et blocage des IP privées.

## Pièges & idées reçues

> 🎤 **En entretien** — ne récitez pas le Top 10 comme une liste de courses. Choisissez-en deux ou trois (injection, IDOR, XSS), expliquez l'attaque **et** la parade avec un mini-exemple. Un candidat qui montre le mécanisme sur un cas vaut dix candidats qui énumèrent des sigles.

- **« Mon ORM me protège de tout »** — des injections SQL, oui, par défaut… sauf les méthodes `raw` avec concaténation. Et l'ORM ne protège ni de l'IDOR, ni du XSS, ni de la misconfiguration.
- **« HTTPS sécurise mon site »** — TLS chiffre le **transport**. Une injection SQL passe très bien dans un tunnel chiffré. HTTPS est nécessaire, pas suffisant.
- **« Échapper les caractères dangereux suffit contre l'injection SQL »** — l'échappement manuel est fragile (encodages, cas limites) ; les requêtes préparées règlent le problème structurellement. C'est la réponse attendue.
- **« La sécurité, c'est pour la prod, on verra plus tard »** — les credentials commités dans Git, le bucket public et le port de debug exposé arrivent justement « en attendant ». Le Top 10 s'applique dès le premier commit.
- **Hasher ≠ chiffrer** : un mot de passe se **hashe** (bcrypt/argon2, irréversible, lent par conception), il ne se chiffre pas et ne se « décrypte » pas. Confondre les deux en entretien fait très mauvais effet.

## Pour aller plus loin

- [OWASP Top 10 (2021)](https://owasp.org/Top10/) : la référence, avec exemples et parades pour chaque catégorie
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) : fiches pratiques par sujet (SQL Injection Prevention, XSS Prevention, Authentication…)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) : labos gratuits et interactifs pour *pratiquer* chaque attaque — la meilleure préparation possible
- Exercice : reprendre un de vos projets et auditer trois points — requêtes SQL paramétrées ? autorisation vérifiée sur chaque endpoint ? secrets hors du repo Git ?
