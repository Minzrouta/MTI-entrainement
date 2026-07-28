---
title: "DNS : de l'URL à l'IP"
date: "2026-09-01"
category: "DevOps"
level: "Fondamental"
summary: "Résolution récursive, types d'enregistrements, TTL et le mythe de la « propagation » : le DNS est au cœur du « que se passe-t-il quand tu tapes une URL ? », la question culte des entretiens."
---

## L'essentiel

Le **DNS** (*Domain Name System*) est l'annuaire d'Internet : il traduit des noms mémorisables (`www.example.com`) en adresses IP (`93.184.216.34`) que les machines utilisent pour se joindre. C'est une **base de données distribuée et hiérarchique** : personne n'a la liste complète, chaque niveau sait seulement vers qui déléguer.

La hiérarchie se lit de droite à gauche : la **racine** (`.`) connaît les serveurs des **TLD** (`.com`, `.fr`, `.me`) ; le TLD connaît les **serveurs autoritaires** de chaque domaine (`example.com`) ; et l'autoritaire détient les enregistrements réels du domaine. Entre vous et cette hiérarchie, un **resolver récursif** (celui de la box, du FAI, ou un public comme `1.1.1.1` / `8.8.8.8`) fait le travail d'enquête et **met en cache** les réponses.

Quand vous tapez une URL, la résolution DNS est la toute première étape — avant TCP, avant TLS, avant HTTP. Et dans l'immense majorité des cas, elle ne va nulle part : la réponse est déjà dans un cache (navigateur, OS, resolver).

## Comment ça marche

Le déroulé complet, du navigateur à l'autoritaire — chaque étape ne se produit que si la précédente n'a pas la réponse en cache :

```text
Navigateur → cache navigateur → cache OS
     │ (raté)
     ▼
Resolver récursif (FAI, 1.1.1.1…) ── cache ? ── oui → IP
     │ (raté : il enquête)
     ├─▶ 1. Racine « . »
     │      ← « voici les serveurs du .com »
     ├─▶ 2. TLD .com
     │      ← « voici les autoritaires
     │         d'example.com »
     └─▶ 3. Autoritaire d'example.com
            ← « www = 93.184.216.34 » (TTL 300)
     │
     ▼
IP rendue au navigateur, réponse mise en
cache partout pour TTL secondes
```

Vous pouvez rejouer cette enquête vous-même avec `dig +trace`, qui court-circuite les caches et interroge la hiérarchie depuis la racine :

```bash
dig +trace www.example.com

# .            518400  IN  NS  a.root-servers.net.
#   → étape 1 : la racine liste les serveurs des TLD
# com.         172800  IN  NS  a.gtld-servers.net.
#   → étape 2 : le TLD .com délègue vers les
#     serveurs autoritaires du domaine
# example.com. 172800  IN  NS  a.iana-servers.net.
#   → étape 3 : l'autoritaire répond enfin
# www.example.com. 300 IN  A   93.184.216.34
#   → la réponse finale : un enregistrement A,
#     avec son TTL de 300 secondes

# Au quotidien : dig www.example.com   (via le resolver, caches inclus)
#                dig @1.1.1.1 example.com MX   (interroger un resolver précis)
```

Chaque réponse porte un **TTL** (*Time To Live*, en secondes) : la durée pendant laquelle un cache a le droit de la garder. C'est la clé du mythe le plus répandu du DNS :

> 💡 **La « propagation » n'existe pas** — le DNS ne « pousse » rien vers personne. Quand vous changez un enregistrement, les caches qui détiennent l'ancienne valeur la servent **jusqu'à expiration de leur TTL**, puis vont chercher la nouvelle. Ce qu'on appelle « attendre la propagation », c'est attendre que les caches expirent — c'est de l'**expiration**, pas de la diffusion. D'où la pratique : baisser le TTL (300s) *avant* une migration, le remonter après.

## Concepts clés à maîtriser

Les types d'enregistrements à connaître :

| Type | Rôle | Exemple |
|---|---|---|
| A | Nom → adresse IPv4 | `app.bantou.me → 51.210.246.139` |
| AAAA | Nom → adresse IPv6 | `example.com → 2606:2800:…` |
| CNAME | Alias vers un autre nom | `www → example.com` |
| MX | Serveurs de mail du domaine (avec priorité) | `10 mail.example.com` |
| TXT | Texte libre : vérifications, SPF/DKIM/DMARC | `"v=spf1 include:…"` |
| NS | Délègue la zone à des serveurs autoritaires | `ns1.ovh.net` |
| `*` (wildcard) | Attrape tous les sous-domaines non définis | `*.bantou.me → VPS` |

- **CNAME, la subtilité classique** : il aliasse un nom entier vers un autre nom (résolution en deux temps), et un nom portant un CNAME ne peut porter aucun autre enregistrement — c'est pourquoi l'apex (`example.com` sans sous-domaine) ne peut pas être un CNAME (il porte déjà NS…), d'où les solutions type ALIAS/ANAME chez certains hébergeurs.
- **DNS et déploiements** : le workflow type — créer l'enregistrement A (ou wildcard `*.domaine.tld` → serveur, et chaque nouvelle app n'est plus qu'une config du reverse proxy), attendre l'expiration des caches, et seulement alors la validation Let's Encrypt (HTTP-01) peut aboutir puisqu'elle exige que le nom résolve vers votre serveur. Le wildcard DNS est exactement ce qui permet le pattern « un sous-domaine par app » sans toucher à la zone à chaque déploiement.
- **`dig`, l'outil du quotidien** : `dig domaine` (résolution via resolver), `dig @8.8.8.8 domaine` (interroger un serveur précis — pratique pour comparer caches), `dig domaine MX` (un type précis), `dig +trace` (rejouer la hiérarchie), `dig -x IP` (résolution inverse).
- **DoH / DoT** en une phrase : DNS-over-HTTPS et DNS-over-TLS chiffrent les requêtes entre vous et le resolver — le DNS historique circule en clair sur le port 53, lisible par tout intermédiaire.

> ⚠️ **Piège vécu** — après un changement DNS, votre machine peut « voir » la nouvelle IP et pas celle du voisin (caches différents, TTL non expirés). Diagnostiquer avec `dig @1.1.1.1` vs `dig @8.8.8.8` vs votre resolver local : trois réponses potentiellement différentes, aucune n'est « fausse » — leurs caches ont expiré à des moments différents.

## En entretien

**« Que se passe-t-il quand tu tapes une URL dans le navigateur ? »** — Dérouler dans l'ordre : 1) résolution DNS (caches navigateur/OS → resolver récursif → si besoin racine → TLD → autoritaire) ; 2) connexion TCP vers l'IP (handshake) ; 3) handshake TLS si HTTPS ; 4) requête HTTP, réponse du serveur ; 5) parsing et rendu. La profondeur attendue sur le DNS : citer la hiérarchie et les caches. C'est LA question pour évaluer votre vision d'ensemble.

**« Quelle différence entre resolver récursif et serveur autoritaire ? »** — Le récursif est un *enquêteur mandaté par le client* : il parcourt la hiérarchie et met en cache. L'autoritaire *détient la vérité* pour une zone : il répond sans rien demander à personne. `8.8.8.8` est un récursif ; les serveurs NS de votre registrar sont autoritaires pour votre domaine.

**« A vs CNAME ? »** — A : nom → IP, direct. CNAME : nom → autre nom, résolu ensuite (une indirection de plus). CNAME pratique quand la cible change d'IP (le CNAME suit tout seul) ; impossible à l'apex du domaine.

**« Pourquoi mon changement DNS n'est-il pas visible partout ? »** — Parce qu'il n'y a pas de propagation : chaque cache sert l'ancienne valeur jusqu'à expiration de son TTL. Réponse bonus : « c'est pour ça qu'on baisse le TTL avant une migration » — vous venez de montrer que vous avez déjà migré quelque chose.

**« À quoi servent les enregistrements TXT ? »** — Métadonnées en texte libre : prouver la propriété d'un domaine (vérifications Google/Let's Encrypt DNS-01) et lutter contre l'usurpation d'email via SPF, DKIM, DMARC.

## Pièges & idées reçues

> 🎤 **En entretien** — « que se passe-t-il quand tu tapes une URL ? » est posée dans une majorité d'entretiens, du stage au senior. Elle ne teste pas le par-cœur : elle teste si vous savez *où s'arrêter et où creuser*. Stratégie gagnante : dérouler les 5 grandes étapes en une minute, puis proposer « je peux détailler l'étape que vous voulez » — et être réellement capable de creuser le DNS et TLS.

- **« Le DNS, c'est un serveur »** — non : une base distribuée et hiérarchique. Aucun serveur ne connaît tout ; chacun sait déléguer. Les 13 « root servers » (a à m) sont eux-mêmes des centaines d'instances anycast.
- **« La propagation prend 24-48h »** — non : ça dépend du TTL des enregistrements concernés. TTL de 300s = visible partout en ~5 minutes une fois les caches expirés. Les « 48h » viennent des changements de serveurs NS chez le registrar, dont les TTL sont longs.
- **Confondre registrar et hébergeur DNS** — le registrar loue le nom ; l'hébergeur DNS fait tourner les serveurs autoritaires de la zone. C'est souvent la même entreprise, jamais le même rôle.
- **Oublier le cache de l'OS et du navigateur** — vider le cache du resolver ne suffit pas toujours : Chrome et l'OS ont les leurs (`chrome://net-internals/#dns`, `resolvectl flush-caches`).
- **`/etc/hosts` court-circuite tout** — lu avant toute requête DNS : parfait pour tester un site avant la bascule DNS, source de « bugs » mystérieux quand on l'oublie dedans.

## Pour aller plus loin

- [Cloudflare — What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) : la meilleure série d'articles d'introduction
- [How DNS works](https://howdns.works/) : la BD qui explique la résolution récursive — mémorable en dix minutes
- [RFC 1034](https://datatracker.ietf.org/doc/html/rfc1034) : les concepts DNS à la source (survol suffisant)
- Manipuler : `dig +trace` sur votre propre domaine, changer un TTL, chronométrer l'expiration réelle des caches avec `dig @1.1.1.1` vs `dig @8.8.8.8`
