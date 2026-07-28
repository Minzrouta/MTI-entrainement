---
title: "Mots de passe : hashing & stockage"
date: "2026-09-11"
category: "Sécurité"
level: "Fondamental"
summary: "Salt, bcrypt, argon2id, timing attacks : savoir stocker un mot de passe correctement est LA question sécurité éliminatoire en entretien de stage — et la réponse tient en trois réflexes."
---

## L'essentiel

Un mot de passe ne se stocke **jamais en clair** — évident. Mais il ne se stocke pas non plus **chiffré** : le chiffrement est **réversible** par définition. Si la clé fuit (et elle finit toujours par fuiter : dump de la base, backup volé, admin malveillant), tous les mots de passe sont récupérables d'un coup.

La bonne réponse : un **hash cryptographique**, une fonction à sens unique. On stocke `hash(mot_de_passe)`, jamais le mot de passe. À la connexion, on recalcule le hash de ce que l'utilisateur tape et on compare. Personne — pas même vous — ne peut retrouver le mot de passe d'origine à partir du hash.

> ⚠️ **Chiffré ≠ hashé** — le chiffrement (AES, RSA…) est fait pour être inversé avec la bonne clé ; le hash est fait pour ne jamais l'être. Dire « je chiffre les mots de passe » en entretien est un signal d'alarme immédiat. Le mot juste : « je les hashe avec un algorithme dédié et un salt ».

Mais attention : **tous les hashs ne se valent pas**. MD5 et SHA-256 sont des hashs cryptographiques… conçus pour être *rapides*. Un GPU moderne calcule des milliards de SHA-256 par seconde : un attaquant qui vole votre base teste tout un dictionnaire en minutes. Il faut un algorithme **volontairement lent et coûteux** : bcrypt, scrypt ou argon2id.

## Comment ça marche

Le flow complet, inscription puis connexion :

```text
SIGNUP
 user ──"hunter2"──▶ serveur
                        │ salt = aléatoire unique
                        │ hash = bcrypt(salt + "hunter2")
                        ▼
                     DB: { email, hash }   (le salt est
                                            dans le hash)
LOGIN
 user ──"hunter2"──▶ serveur
                        │ lit le hash en DB
                        │ recalcule avec le même salt
                        │ compare en temps constant
                        ▼
                     égal ? ── oui ──▶ session/JWT
                            └─ non ─▶ 401 (message vague)
```

Deux ingrédients rendent ce flow solide :

- **Le salt** : une valeur aléatoire unique par utilisateur, concaténée au mot de passe avant hashing. Sans salt, deux utilisateurs avec le même mot de passe ont le même hash, et surtout un attaquant peut précalculer des **rainbow tables** (tables géantes hash → mot de passe) une fois pour toutes. Avec un salt unique, chaque hash doit être attaqué individuellement. Le salt n'est **pas secret** : bcrypt le stocke en clair dans la chaîne de sortie.
- **Le coût paramétrable** : bcrypt a un *cost factor* (2^cost itérations), argon2id des paramètres mémoire/temps/parallélisme. On règle pour que le calcul prenne ~100 ms côté serveur : imperceptible pour un login, catastrophique pour un attaquant qui doit tester des milliards de candidats. Et quand le matériel progresse, on augmente le paramètre.

| Algorithme | Vitesse | Salt intégré | Usage correct |
|---|---|---|---|
| MD5 | Très rapide, cassé | Non | Plus rien (checksum non sécurisé au mieux) |
| SHA-256 | Très rapide | Non | Intégrité de fichiers, signatures — **pas les mots de passe** |
| bcrypt | Lente, coût réglable | Oui | Mots de passe (standard éprouvé, limite 72 octets) |
| scrypt | Lente, coûteuse en RAM | Oui | Mots de passe |
| argon2id | Lente, RAM + CPU réglables | Oui | Mots de passe (recommandation OWASP actuelle) |

## Concepts clés à maîtriser

- **Fonction à sens unique** : facile à calculer dans un sens, infaisable à inverser. La « cassure » d'un hash de mot de passe n'est jamais une inversion mathématique : c'est du brute force ou du dictionnaire — d'où l'importance de la lenteur.
- **Rainbow tables vs salt** : la table précalculée ne sert que si tout le monde hashe pareil. Un salt de 16 octets aléatoires par utilisateur rend le précalcul inutile.
- **Timing attack** : comparer deux chaînes avec `===` s'arrête au premier octet différent — le temps de réponse fuit de l'information. Pour tout secret (tokens d'API, signatures HMAC), utiliser une **comparaison en temps constant** (`crypto.timingSafeEqual` en Node). Bonne nouvelle : `bcrypt.compare` le fait déjà pour vous.
- **Reset de mot de passe bien fait** : générer un token **aléatoire, à usage unique, expirant** (15-60 min), en stocker le *hash* en DB (le lien email est un secret comme un autre), l'invalider après usage, et répondre « si ce compte existe, un email a été envoyé » pour ne pas révéler quels emails sont inscrits (énumération de comptes).
- **Pepper** (bonus) : un secret global côté serveur (hors DB) ajouté avant hashing — un dump de la base seule ne suffit plus. Optionnel, à mentionner comme approfondissement.
- **MFA & passkeys** (survol) : le hash protège le stockage, pas le phishing. Le second facteur (TOTP, WebAuthn) protège même si le mot de passe fuit ; les **passkeys** (paires de clés WebAuthn) suppriment carrément le mot de passe — rien de secret à stocker côté serveur, juste des clés publiques.

En Node, la version correcte tient en quelques lignes :

```javascript
import bcrypt from "bcrypt";

const COST = 12; // 2^12 itérations ≈ 100-250 ms ; à augmenter avec le matériel

// Inscription : génère le salt ET hashe en un appel
async function register(email, password) {
  const hash = await bcrypt.hash(password, COST);
  // hash = "$2b$12$N9qo8uLO...": algo, coût et salt inclus dans la chaîne
  await db.users.insert({ email, hash }); // on ne stocke QUE le hash
}

// Connexion : bcrypt relit le salt dans le hash stocké,
// recalcule, et compare en temps constant
async function login(email, password) {
  const user = await db.users.findByEmail(email);
  // comparer même si l'utilisateur n'existe pas → temps de réponse uniforme
  const ok = user && (await bcrypt.compare(password, user.hash));
  if (!ok) throw new AuthError("Identifiants invalides"); // message volontairement vague
  return createSession(user);
}
```

> 💡 **Le format bcrypt** — la chaîne `$2b$12$...` contient tout : la version de l'algo (`2b`), le coût (`12`), puis salt + hash encodés. C'est pour ça qu'il n'y a pas de colonne `salt` dans la table : montrer qu'on le sait fait très bon effet.

## En entretien

**« Comment stockes-tu les mots de passe de tes utilisateurs ? »** — Jamais en clair, jamais chiffrés (réversible). Hash avec un algorithme dédié — bcrypt ou argon2id — avec un salt unique par utilisateur et un facteur de coût réglé autour de 100 ms. À la connexion, on recalcule et on compare en temps constant.

**« Pourquoi SHA-256 ne suffit pas alors que c'est un hash cryptographique ? »** — Parce qu'il est conçu pour être rapide : des milliards de hashs/seconde sur GPU, donc dictionnaires et brute force redeviennent praticables sur un dump. Les algorithmes de mots de passe sont volontairement lents et coûteux en mémoire, avec un paramètre qu'on augmente au fil des années.

**« À quoi sert le salt, et doit-il rester secret ? »** — Il rend chaque hash unique : il neutralise les rainbow tables et empêche de repérer deux utilisateurs avec le même mot de passe. Il n'est pas secret — bcrypt le stocke en clair dans sa sortie ; c'est la lenteur de l'algo qui protège, pas le secret du salt.

**« Qu'est-ce qu'une timing attack ? »** — Une comparaison naïve (`===`) s'arrête au premier caractère différent : en mesurant le temps de réponse, un attaquant devine un secret octet par octet. Contre-mesure : comparaison en temps constant (`crypto.timingSafeEqual`, `bcrypt.compare`). Valable pour tout secret : tokens, signatures de webhooks.

**« Comment concevoir un "mot de passe oublié" sûr ? »** — Token aléatoire à usage unique, expirant (15-60 min), dont on stocke le hash en DB ; invalidé après usage ; réponse identique que l'email existe ou non pour éviter l'énumération de comptes ; et on ne révèle jamais l'ancien mot de passe — on ne le connaît pas, c'est justement le but.

## Pièges & idées reçues

> ⚠️ **« On m'a renvoyé mon mot de passe par email »** — signal rouge absolu : si un site peut vous le renvoyer, il le stocke en clair ou chiffré. Un reset bien fait envoie un *lien*, jamais le mot de passe.

- **« Je double le hash : md5(sha1(x)), c'est plus sûr »** — non : empiler des hashs rapides reste rapide. La sécurité vient du coût paramétrable, pas de l'exotisme de la recette maison. Règle d'or : ne jamais inventer sa crypto.
- **« Le salt doit être caché dans une autre table »** — inutile : le modèle de menace suppose que l'attaquant a tout. Le salt combat le précalcul, pas la lecture.
- **Imposer des règles absurdes** (majuscule + symbole + rotation tous les 90 jours) produit `Password1!` puis `Password2!`. Les recommandations NIST actuelles : longueur d'abord, vérifier contre les listes de mots de passe compromis, pas de rotation forcée.
- **Limiter les tentatives** reste indispensable : le meilleur hash du monde ne protège pas contre un brute force *en ligne* sur le formulaire. Rate limiting, backoff, verrouillage progressif.
- **bcrypt tronque à 72 octets** : au-delà, le reste du mot de passe est ignoré. C'est documenté, rarement bloquant, mais bon à savoir (argon2id n'a pas cette limite).

## Pour aller plus loin

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — la référence à citer en entretien
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) — les recommandations officielles sur les règles de mots de passe
- [Have I Been Pwned](https://haveibeenpwned.com/) et son API Pwned Passwords (k-anonymity) pour rejeter les mots de passe déjà compromis
- [webauthn.guide](https://webauthn.guide/) pour comprendre passkeys et WebAuthn — la suite logique de cette fiche
