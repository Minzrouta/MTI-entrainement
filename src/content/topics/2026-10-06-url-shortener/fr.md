---
title: "System design junior : l'URL shortener"
date: "2026-10-06"
category: "Architecture"
level: "Intermédiaire"
summary: "L'exercice de system design le plus donné aux juniors : dérouler la méthode (besoins, ordres de grandeur, schéma, itération) sur le cas bit.ly — et comprendre ce que l'interviewer évalue vraiment."
---

## L'essentiel

Un entretien de system design junior n'évalue pas votre connaissance d'architectures exotiques : il évalue votre **façon de raisonner**. L'interviewer veut vous voir clarifier un problème flou, poser des chiffres, proposer quelque chose de simple qui marche, puis l'améliorer là où ça coince. Un candidat qui dessine Kafka et douze microservices en trente secondes échoue ; un candidat qui commence par « combien d'URLs par jour ? » marque des points avant d'avoir dessiné quoi que ce soit.

> 🎤 **En entretien** — la méthode en 4 étapes, à dérouler à voix haute : **1. Clarifier les besoins** (fonctionnels et non fonctionnels : volumétrie, latence, disponibilité). **2. Estimer les ordres de grandeur** (requêtes/s, stockage — un calcul de coin de table suffit). **3. Dessiner le schéma simple** qui répond au besoin. **4. Itérer** sur les goulots d'étranglement, dans l'ordre où ils apparaîtraient. Annoncer le plan dès le début : l'interviewer voit que vous avez une démarche, pas des réflexes.

L'**URL shortener** (bit.ly, tinyurl) est le cas d'école : périmètre compréhensible en une phrase, mais assez riche pour toucher API, génération d'identifiants, stockage, cache, redirections HTTP et montée en charge.

**Étape 1 — les besoins.** Fonctionnels : créer un lien court depuis une URL longue ; rediriger le lien court vers l'original ; (bonus) compter les clics. Non fonctionnels : la lecture domine massivement l'écriture (ratio ~100:1), la redirection doit être rapide (< 100 ms), le service doit être disponible — un lien mort est un lien inutile.

**Étape 2 — les ordres de grandeur.** Hypothèse : 100 M de nouvelles URLs par an ≈ **3 écritures/s**, donc ~**300 lectures/s** avec le ratio 100:1. Stockage : 100 M × ~500 octets ≈ **50 Go par an**. Conclusion à énoncer tout haut : *ça tient sur une seule base Postgres bien indexée* — le « scaling » sera du confort de lecture, pas une question de survie.

## Comment ça marche

**L'API** — deux endpoints suffisent :

- `POST /shorten` avec `{ "url": "https://…" }` → `201` et `{ "code": "aZ3k9x1" }` (valider l'URL, refuser les schémas dangereux).
- `GET /:code` → `301` ou `302` vers l'URL longue, `404` si le code n'existe pas.

**La génération du code** — le cœur de l'exercice. Deux approches à comparer :

- **Compteur + base62** : un id auto-incrémenté, encodé sur l'alphabet `[0-9a-zA-Z]`. Simple, aucune collision possible, codes courts. Défaut : les codes sont prévisibles (on peut énumérer les URLs des autres) — se corrige en mélangeant l'id avec une permutation ou un offset secret.
- **Hash de l'URL** (MD5/SHA tronqué à 7 caractères) : pas de compteur central, la même URL redonne le même code. Défaut : la troncature crée des **collisions** (paradoxe des anniversaires) — il faut vérifier en base et ré-essayer avec un salt.

```python
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz" \
           "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(n: int) -> str:
    """Encode un id auto-incrémenté en code court."""
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)       # reste = index dans l'alphabet
        out.append(ALPHABET[r])
    return "".join(reversed(out))  # 125 → "21", 10**9 → "15ftgG"

# 62^7 ≈ 3,5 × 10^12 codes sur 7 caractères :
# à 100 M/an, l'espace dure ~35 000 ans. Largement.
```

**Le stockage** — le modèle est une table clé-valeur : `code (PK) → url, created_at, user_id?`. Aucune jointure, aucune transaction complexe : n'importe quel store convient. Postgres suffit très largement à cette échelle ; un store clé-valeur (DynamoDB) ne devient pertinent qu'à l'échelle « milliards ». Le dire ainsi montre que vous dimensionnez au besoin, pas au CV.

**L'architecture** — version simple, puis itérée :

```text
           ┌───────────────┐
 client ──▶│ load balancer │
           └───────┬───────┘
                   ▼
       ┌──────────────────────┐
       │ app servers          │
       │ (stateless, scale    │
       │  horizontal)         │
       └────┬────────────┬────┘
    1. hit? │            │ 2. miss
            ▼            ▼
     ┌────────────┐  ┌───────────────┐
     │ Redis      │◀─│ DB code → URL │
     │ (hot URLs) │  │ + réplicas    │
     └────────────┘  └───────────────┘
```

Les serveurs applicatifs sont **stateless** : tout l'état vit en base et en cache, on peut en ajouter derrière le load balancer sans rien coordonner. Pour la lecture : des **réplicas** de la base et le cache absorbent les 300 req/s sans effort.

## Concepts clés à maîtriser

- **301 vs 302 — le vrai piège de l'exercice** :

| | 301 Moved Permanently | 302 Found (temporaire) |
|---|---|---|
| Cache navigateur | Agressif, souvent définitif | Pas de cache par défaut |
| Clics suivants | Vont direct à la cible | Repassent par le service |
| Analytics | Perdues après le 1er clic | Comptées à chaque clic |
| Charge serveur | Minimale | Chaque clic touche le service |
| À choisir si | Aucun besoin de stats | Le tracking est un besoin (cas réel de bit.ly) |

- **Cache des hot URLs** — la popularité des liens suit une loi de Zipf : une petite fraction des codes concentre l'essentiel du trafic. Un Redis en **cache-aside** (on lit le cache, sur miss on lit la base et on remplit, avec un TTL) absorbe la majorité des lectures. Les URLs étant immuables, l'invalidation — le problème dur du caching — disparaît presque.
- **Rate limiting** — indispensable sur `POST /shorten` : sans lui, un spammeur génère des millions de liens (phishing, pollution de l'espace de codes). Un token bucket par IP ou par clé API, et un `429 Too Many Requests`.
- **404 et validation** — un code inconnu renvoie 404 ; une URL d'entrée se valide (schéma http/https uniquement — sinon vous venez de créer un open redirect vers `javascript:`).
- **Ce que l'interviewer évalue vraiment** — dans l'ordre : vous clarifiez avant de dessiner ; vous posez des chiffres ; chaque brique du schéma a une justification (« un cache *parce que* la lecture domine ») ; vous connaissez les limites de votre design. Le raisonnement bat les buzzwords à tous les coups.

> 💡 **Commencer simple est une compétence** — « une base Postgres et deux serveurs suffisent à cette échelle » est une meilleure réponse d'entretien que n'importe quelle architecture distribuée non justifiée. Vous montrez que vous savez *quand* la complexité devient nécessaire — c'est exactement ce qui distingue un futur bon ingénieur.

## En entretien

**« Conçois-moi un raccourcisseur d'URL. »** — Dérouler la méthode : besoins (2 endpoints, lecture >> écriture), chiffres (3 écritures/s, 300 lectures/s, 50 Go/an), schéma simple (LB → app stateless → Postgres + Redis), itérations (cache, réplicas, rate limiting). Annoncer le plan avant de commencer.

**« 301 ou 302 pour la redirection ? »** — 301 est « correct » sémantiquement et économise du trafic, mais le navigateur le met en cache : tous les clics suivants échappent au service, donc **plus d'analytics**. Si le tracking compte — c'est le business model de bit.ly — on choisit 302 (ou 301 assumé si on ne veut aucune stat). Montrer le trade-off vaut plus que la « bonne » réponse.

**« Comment tu génères le code court ? »** — Compteur + base62 : simple et sans collision, mais prévisible (corrigible par permutation secrète). Hash tronqué : pas de compteur central mais collisions à gérer (vérifier + retry). À cette échelle, compteur + base62 gagne ; 7 caractères = 62⁷ ≈ 3,5 × 10¹² codes.

**« Que se passe-t-il si ta base tombe ? »** — Les lectures survivent partiellement grâce au cache (les hot URLs répondent encore) ; les écritures échouent — acceptable brièvement. Ensuite : réplica promu en primaire, et le dire simplement suffit à un niveau junior.

**« Comment tu empêches les abus ? »** — Rate limiting sur la création (token bucket par IP/clé API), validation stricte des URLs, éventuellement une liste noire de domaines de phishing et un délai d'expiration des liens gratuits.

## Pièges & idées reçues

> ⚠️ **Le 301 qui tue les analytics** — c'est LE piège tendu de l'exercice. Répondre « 301 parce que la redirection est permanente » sans mentionner le cache navigateur, c'est rater le point : après le premier clic, le navigateur ne repassera plus jamais par votre service. Si on vous demande ensuite « et comment tu comptes les clics ? », il est trop tard.

- **La soupe de buzzwords** — Kafka, microservices, sharding et CQRS pour 3 écritures/s : l'interviewer y voit du plaquage de mots-clés, pas de l'ingénierie. Chaque brique doit répondre à un chiffre.
- **« Un hash est unique »** — tronqué à 7 caractères, non : le paradoxe des anniversaires rend les collisions probables bien avant d'épuiser l'espace. Toujours prévoir la détection et le retry.
- **Optimiser l'écriture d'un système de lecture** — le ratio 100:1 dicte tout le design (cache, réplicas). Sharder les écritures ici, c'est résoudre un problème qui n'existe pas.
- **Oublier la sécurité du produit** — accepter n'importe quelle URL fait de vous un relais de phishing avec une belle réputation de domaine. Validation, rate limiting, expiration.
- **Dessiner avant de questionner** — se jeter sur le tableau blanc sans demander la volumétrie est l'erreur numéro un. Les deux premières minutes de questions sont celles qui rapportent le plus de points.

## Pour aller plus loin

- [System Design Primer — Design Pastebin/Bit.ly](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md) : la solution détaillée du repo de référence
- [ByteByteGo — System Design Interview](https://bytebytego.com/) : la newsletter et les schémas d'Alex Xu, dont le chapitre URL shortener de son livre
- [MDN — Redirections HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP/Redirections) : 301, 302, 307, 308 et leurs sémantiques exactes
- S'entraîner : refaire l'exercice sur un cas voisin (pastebin, système de likes) en chronométrant les 4 étapes — 35 minutes, conditions réelles
