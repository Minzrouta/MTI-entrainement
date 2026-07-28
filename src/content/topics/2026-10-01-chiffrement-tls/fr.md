---
title: "Chiffrement symétrique/asymétrique & TLS"
date: "2026-10-01"
category: "Sécurité"
level: "Intermédiaire"
summary: "Une clé partagée ou une paire publique/privée ? Comprendre pourquoi TLS utilise les deux, ce que prouve un certificat et comment répondre à « explique-moi HTTPS » — question quasi garantie en entretien."
---

## L'essentiel

Le chiffrement transforme des données lisibles en données illisibles pour quiconque n'a pas la bonne clé. Deux familles se partagent le travail, et tout l'art des protocoles modernes consiste à les combiner.

Le **chiffrement symétrique** (AES) utilise **une seule clé** pour chiffrer et déchiffrer. Il est très rapide — les CPU ont des instructions dédiées (AES-NI), on chiffre plusieurs Go/s. Son talon d'Achille : les deux parties doivent posséder la même clé. Comment l'échanger à travers un réseau qu'on ne contrôle pas ? L'envoyer en clair revient à poster le code du coffre avec le coffre.

Le **chiffrement asymétrique** (RSA, courbes elliptiques) résout ce problème avec une **paire de clés** : la clé publique se distribue à tout le monde, la clé privée ne quitte jamais son propriétaire. Ce que l'une chiffre, seule l'autre le déchiffre. Le prix : c'est lent — environ mille fois plus que l'AES — et limité à de petits messages.

| | Symétrique (AES) | Asymétrique (RSA / EC) |
|---|---|---|
| Clés | Une seule, partagée | Paire publique / privée |
| Vitesse | Go/s (accélération matérielle) | ~1000× plus lent |
| Taille de clé | 128–256 bits | RSA ≥ 2048 bits, EC 256 bits |
| Problème central | Échanger la clé | Lier la clé publique à une identité |
| Usage typique | Chiffrer le trafic (session TLS) | Échange de clé, signatures, certificats |

D'où le schéma universel — TLS, SSH, Signal, tous pareil : **l'asymétrique sert à se mettre d'accord sur une clé de session, le symétrique chiffre ensuite tout le trafic.** On parle de chiffrement hybride.

## Comment ça marche

Le handshake TLS 1.3 tient en une phrase : client et serveur échangent de quoi dériver une clé commune, le serveur prouve son identité, puis tout passe en symétrique.

```text
Client                                   Serveur
  │ ClientHello                             │
  │ versions, ciphers, part DH éphémère     │
  │────────────────────────────────────────▶│
  │              ServerHello + part DH      │
  │              Certificat + signature     │
  │◀────────────────────────────────────────│
  │                                         │
  │  chacun dérive la même clé de session   │
  │  (ECDHE) — elle ne circule jamais       │
  │                                         │
  │═════ trafic chiffré en AES-GCM ════════▶│
```

Étape par étape :

1. **ClientHello** — le client annonce les versions TLS et suites cryptographiques qu'il accepte, et joint sa part publique d'un échange **Diffie-Hellman éphémère**.
2. **ServerHello** — le serveur choisit la suite, renvoie sa propre part DH, son **certificat**, et une signature faite avec sa clé privée : la preuve qu'il détient bien la clé correspondant au certificat.
3. **Dérivation** — chacun combine sa part privée avec la part publique de l'autre et obtient le **même secret**, sans qu'il ait jamais transité sur le réseau. Les clés DH étant éphémères, voler la clé privée du serveur plus tard ne permet pas de déchiffrer le trafic passé : c'est la **forward secrecy**.
4. **Session symétrique** — tout le trafic passe en AES-GCM ou ChaCha20-Poly1305, du chiffrement **authentifié** : confidentialité et intégrité en une seule opération.

**TLS 1.3** (2018) fait tout ça en **un seul aller-retour** (contre deux pour TLS 1.2) et a purgé les algorithmes cassés : échange de clé RSA sans forward secrecy, RC4, SHA-1.

Reste la confiance : un attaquant en position d'intermédiaire peut faire un handshake parfaitement propre… avec son propre certificat. D'où les **CA (Certificate Authorities)** : le certificat du serveur est signé par une CA intermédiaire, elle-même signée par une CA racine préinstallée dans l'OS ou le navigateur. Le client remonte cette **chaîne de confiance** jusqu'à une racine qu'il connaît ; un maillon invalide et c'est l'avertissement rouge. **Let's Encrypt** a rendu les certificats gratuits et automatisés (protocole ACME, renouvellement tous les 90 jours) : plus aucune excuse pour servir du HTTP en clair.

> 🎤 **En entretien** — « Explique HTTPS à un débutant » est un classique. Version qui marche : « le cadenas fait deux promesses. Un : personne ne peut lire ni modifier ce qui transite — c'est le chiffrement. Deux : tu parles bien au site affiché dans la barre d'adresse — c'est le certificat, vérifié par un tiers de confiance. Une enveloppe scellée, plus une carte d'identité. » Deux idées, zéro jargon.

## Concepts clés à maîtriser

- **Chiffrer vs signer** : même paire de clés, sens inverse. Chiffrer = clé **publique du destinataire** (lui seul déchiffre). Signer = clé **privée de l'émetteur** sur le hash du message ; n'importe qui vérifie avec la clé publique. La signature prouve l'auteur et l'intégrité, elle ne cache rien.
- **Hash ≠ chiffrement** : un hash (SHA-256) est **irréversible et sans clé** — on ne « déchiffre » pas un hash, on ne peut que tester des candidats. Usages : intégrité, signatures, stockage de mots de passe (via bcrypt/argon2, jamais un SHA nu).
- **Certificat** : une clé publique + une identité (le domaine) + des dates de validité + la signature d'une CA. Rien de secret dedans — c'est un document public.
- **Courbes elliptiques** : mêmes garanties que RSA avec des clés bien plus courtes (EC 256 bits ≈ RSA 3072). Le standard actuel : X25519 pour l'échange de clé, Ed25519/ECDSA pour les signatures.
- **HTTPS partout** : le HTTP en clair permet à tout intermédiaire (Wi-Fi public, FAI) de lire *et modifier* les pages — injection de scripts comprise. Le header **HSTS** interdit au navigateur de retenter du HTTP.

Le tout se manipule très bien avec `openssl` :

```bash
# Générer une paire RSA : privée (secrète) puis publique
openssl genrsa -out priv.pem 2048
openssl rsa -in priv.pem -pubout -out pub.pem

# Chiffrer avec la clé PUBLIQUE du destinataire :
# seul le détenteur de la privée pourra lire
openssl pkeyutl -encrypt -pubin -inkey pub.pem \
  -in msg.txt -out msg.enc

# Signer avec sa clé PRIVÉE (hash SHA-256 signé)…
openssl dgst -sha256 -sign priv.pem -out msg.sig msg.txt
# …et n'importe qui vérifie avec la publique
openssl dgst -sha256 -verify pub.pem \
  -signature msg.sig msg.txt        # → Verified OK

# Voir le certificat et la chaîne d'un vrai site
openssl s_client -connect example.com:443 \
  -servername example.com
```

> 💡 **Ordre de grandeur à retenir** — AES chiffre des Go/s, RSA des Ko/s. C'est ce facteur ~1000 qui impose l'architecture hybride : l'asymétrique ne sert qu'à ouvrir la session, jamais à chiffrer le flux.

## En entretien

**« Symétrique vs asymétrique — et pourquoi les combiner ? »** — Symétrique : une clé partagée, très rapide, mais problème d'échange de la clé. Asymétrique : paire publique/privée, résout l'échange, mais mille fois plus lent. TLS combine : échange de clé asymétrique (ECDHE) pour établir un secret commun, puis session symétrique (AES) pour le trafic. Le meilleur des deux.

**« Déroule un handshake TLS. »** — Version 1.3 : ClientHello avec part DH éphémère → ServerHello avec sa part DH, son certificat et une signature → chacun dérive la même clé de session → trafic en AES-GCM. Un seul aller-retour. Bonus : mentionner la forward secrecy grâce aux clés éphémères.

**« À quoi sert le certificat, exactement ? »** — À **authentifier** le serveur, pas à chiffrer. Il lie une clé publique à un domaine, sous la signature d'une CA que le client connaît déjà (chaîne de confiance). Sans lui, le chiffrement marcherait aussi bien… avec un attaquant au milieu.

**« Quelle différence entre chiffrer et signer ? »** — Chiffrer protège la confidentialité : clé publique du destinataire. Signer prouve l'origine et l'intégrité : clé privée de l'émetteur, vérifiable par tous. Une signature ne cache pas le message.

**« Pourquoi hasher les mots de passe plutôt que les chiffrer ? »** — Chiffré = réversible pour qui a la clé, et la clé est quelque part sur le serveur. Un hash lent et salé (bcrypt, argon2) ne se déchiffre pas : même l'admin de la base ne peut pas retrouver le mot de passe, seulement vérifier une tentative.

## Pièges & idées reçues

> ⚠️ **Règle d'or** — on n'implémente jamais sa propre crypto, et on n'assemble même pas soi-même les primitives (mode ECB, IV réutilisé, comparaison non constante… les pièges sont innombrables). En pratique : TLS pour le transport, une lib éprouvée (libsodium) pour le reste.

- **« Le certificat chiffre la connexion »** — non : il authentifie. Les clés de session viennent de l'échange Diffie-Hellman ; le certificat garantit juste qu'on la négocie avec le bon serveur.
- **« HTTPS cache tout »** — le contenu et le chemin de l'URL, oui. Mais le domaine visité fuit via la requête DNS et le SNI du handshake (ECH est en cours de déploiement pour ce dernier).
- **« SSL »** — le terme survit dans le langage courant (et dans « openssl »), mais SSL 2/3 sont morts et interdits depuis des années. Le protocole s'appelle TLS, versions 1.2 et 1.3.
- **Certificat auto-signé en prod** — il chiffre, mais ne prouve rien : les clients doivent cliquer sur « accepter le risque », ce qui les entraîne exactement au mauvais réflexe. Réserver ça au dev local.
- **MD5 et SHA-1** sont cassés pour tout usage de sécurité (collisions pratiques). SHA-256 minimum.

## Pour aller plus loin

- [Cloudflare — What happens in a TLS handshake?](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/) : le handshake vulgarisé proprement
- [The Illustrated TLS 1.3 Connection](https://tls13.xargs.org/) : chaque octet du handshake, annoté — spectaculaire
- [Let's Encrypt — How it works](https://letsencrypt.org/how-it-works/) : le protocole ACME expliqué
- [RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446) : la spec TLS 1.3, lisible en diagonale
- [badssl.com](https://badssl.com/) : une galerie de certificats cassés pour voir les erreurs navigateur en vrai
