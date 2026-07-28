---
title: "Les nids à bugs : UTF-8, dates & regex"
date: "2026-10-29"
category: "CS"
level: "Intermédiaire"
summary: "Trois sujets banals, une part démesurée des bugs de prod : encodage, fuseaux horaires et expressions régulières. Les maîtriser prouve en entretien qu'on a déjà maintenu du vrai code."
---

## L'essentiel

Trois domaines concentrent une part démesurée des bugs de production : les chaînes de caractères (encodage), les dates (fuseaux horaires) et les expressions régulières. Aucun n'est difficile en théorie ; tous punissent les hypothèses implicites — « un caractère = un octet », « minuit c'est minuit », « ma regex marche sur mes exemples ». Les recruteurs aiment ces sujets parce qu'ils distinguent l'étudiant qui a écrit du code de celui qui l'a débuggé.

| Symptôme | Cause | Fix |
|---|---|---|
| `Ã©tÃ©` affiché au lieu de `été` | octets UTF-8 décodés en Latin-1 (mojibake) | UTF-8 déclaré partout : fichiers, HTTP, DB |
| `'é'.length === 2` | unités UTF-16 ≠ graphèmes ; forme NFD | normaliser, segmenter par graphème |
| `"café" !== "café"` | NFC vs NFD : é précomposé vs e + accent | `.normalize('NFC')` avant comparaison |
| Rendez-vous décalé d'une heure | stockage en heure locale + DST | stocker UTC + ISO 8601, convertir à l'affichage |
| Anniversaire décalé d'un jour | date-seule stockée comme minuit local | type DATE sans heure, jamais un timestamp |
| API gelée sur une entrée précise | catastrophic backtracking (ReDoS) | regex sans quantificateurs imbriqués, timeout |

## Comment ça marche

**Encodage.** ASCII code 128 caractères sur 7 bits — l'anglais, point. Unicode attribue un numéro (**code point**) à plus de 150 000 caractères : `é` = U+00E9, `€` = U+20AC. **UTF-8** encode chaque code point sur 1 à 4 octets, à longueur variable, en restant compatible ASCII :

```text
Code point    →  octets UTF-8
U+0041 'A'    →  01000001                    (1 octet)
U+00E9 'é'    →  110_00011 10_101001         (2 octets)
U+20AC '€'    →  1110_0010 10_000010
                 10_101100                   (3 octets)
U+1F44D '👍'  →  11110_000 10_011111 …       (4 octets)

Le préfixe du 1er octet code la longueur ;
chaque octet de continuation commence par 10.
```

Un « caractère » à l'écran (**graphème**) peut occuper plusieurs code points : `é` existe précomposé (U+00E9, forme **NFC**) ou décomposé en `e` + accent combinant (U+0065 U+0301, forme **NFD**). Visuellement identiques, binairement différents — d'où la normalisation avant toute comparaison ou recherche. Le **mojibake** (`Ã©`) apparaît quand des octets UTF-8 sont relus avec le mauvais charset.

```javascript
'é'.length                    // 1 (forme NFC : U+00E9)
'é'.normalize('NFD').length   // 2 : e + accent combinant
'👍'.length                   // 2 : paire de substitution —
                              // JS compte en unités UTF-16
[...'👍'].length              // 1 : itération par code point
'👨‍👩‍👧'.length                  // 8 ! 3 emojis + 2 ZWJ invisibles

// Comparaison correcte de chaînes accentuées :
'café'.normalize('NFC') === 'café'.normalize('NFC')
// → true (sans normalize : false)

// Compter ce que voit l'utilisateur (graphèmes) :
[...new Intl.Segmenter().segment('👨‍👩‍👧')].length   // 1
```

**Dates.** La règle d'or : **stocker en UTC, au format ISO 8601** (`2026-10-29T14:30:00Z`), et convertir dans le fuseau de l'utilisateur uniquement à l'affichage. Un fuseau n'est pas un offset fixe : il change avec le **DST** (une heure qui n'existe pas au printemps, une heure qui existe deux fois à l'automne) et avec les décisions politiques — la base tz est mise à jour plusieurs fois par an. Le bug du « minuit local » : stocker une date-seule (anniversaire, deadline) comme timestamp à minuit local, puis l'afficher dans un autre fuseau → la date recule d'un jour.

`Date` en JavaScript cumule les pièges : mois indexés à zéro (`new Date(2026, 9, 29)` = 29 **octobre**), parsing incohérent, objets mutables. En 2026, on utilise l'API **Temporal** (en cours de déploiement dans les moteurs JS) ou une bibliothèque comme date-fns ou Luxon.

```javascript
// Deux pièges en deux lignes :
new Date('2026-10-29')          // minuit UTC
new Date('2026-10-29T00:00')    // minuit LOCAL
// À Paris (UTC+1), une heure d'écart entre les deux —
// comparer naïvement ces dates décale des deadlines.
```

**Regex.** Les briques utiles : classes (`[a-z]`, `\d`, `\w`), quantificateurs (`*`, `+`, `?`, `{n,m}`), ancres (`^`, `$`, `\b`), groupes capturants `(…)`, nommés `(?<nom>…)`, non capturants `(?:…)`. Le piège central : les quantificateurs sont **gloutons** (greedy) par défaut — ils avalent le maximum puis reculent (backtracking).

```javascript
'<b>gras</b> et <i>ital</i>'.match(/<.+>/)[0]
// → '<b>gras</b> et <i>ital</i>'   glouton : tout !
'<b>gras</b>'.match(/<.+?>/)[0]     // '<b>'  lazy : minimum
'<b>gras</b>'.match(/<[^>]+>/)[0]   // '<b>'  classe négée :
                                    // rapide, sans backtracking
```

## Concepts clés à maîtriser

- **Octet ≠ code point ≠ graphème** : trois niveaux distincts. `length`, `substring`, `reverse` travaillent souvent au mauvais niveau et coupent un emoji en deux (`�`).
- **Normalisation aux frontières** : normaliser en NFC à l'entrée du système (formulaires, imports, noms de fichiers — macOS produit du NFD), comparer et indexer sur la forme normalisée.
- **UTC + ISO 8601, avec une exception** : un événement futur lié à un lieu (« réunion à 9 h à Paris en 2027 ») se stocke en heure locale + identifiant IANA (`Europe/Paris`), car les règles de fuseau peuvent changer d'ici là. Un instant passé ou absolu (log, paiement) se stocke en UTC.
- **Types date-seule** : un anniversaire n'a pas d'heure ni de fuseau. `DATE` en SQL, `Temporal.PlainDate` en JS — jamais un timestamp à minuit.
- **Greedy vs lazy vs classe négée** : `.+?` répond au symptôme, `[^>]+` exprime l'intention et supprime le backtracking.
- **Quand ne pas utiliser une regex** : dès que le format est imbriqué ou récursif — HTML en tête. Une regex ne compte pas les niveaux d'imbrication (langage régulier vs langage algébrique) : utiliser un vrai parseur (DOMParser, BeautifulSoup). Pour les emails : validation minimale + email de confirmation, pas une regex de 400 caractères.
- **Tester ses regex** : sur [regex101](https://regex101.com/) avec des cas limites (chaîne vide, accents, entrées hostiles), puis des tests unitaires qui documentent les cas couverts.

> ⚠️ **ReDoS** — une regex avec quantificateurs imbriqués comme `(a+)+$` explose en backtracking exponentiel sur une entrée hostile (`"aaaaaaaaaaaaaaaaaaaaab"` suffit). Une seule requête peut geler un thread : Stack Overflow (2016) et Cloudflare (2019) sont tombés à cause d'une regex. Parades : pas de quantificateurs imbriqués ni d'alternatives qui se recouvrent, timeout sur l'exécution, ou moteur linéaire garanti (RE2, crate regex de Rust).

> 💡 **UTC partout, conversion à l'affichage** — le backend, la DB et les logs ne connaissent qu'UTC ; le fuseau de l'utilisateur n'intervient qu'à la toute dernière couche (le rendu). Un seul point de conversion = une seule classe de bugs possible, au lieu d'une par couche.

## En entretien

**« Pourquoi `'é'.length` peut-il valoir 2 en JavaScript ? »** — Deux raisons possibles. Si la chaîne est en NFD, `é` est composé de deux code points (`e` + accent combinant). Et `length` compte des unités UTF-16, pas des graphèmes : `'👍'.length === 2` (paire de substitution). Réponse complète : normaliser en NFC, et segmenter par graphème (`Intl.Segmenter`) quand on veut compter ce que voit l'utilisateur.

**« Comment stockes-tu les dates dans une application internationale ? »** — UTC + ISO 8601 en base, conversion dans le fuseau de l'utilisateur à l'affichage. Nuance qui marque des points : un événement futur localisé se stocke en heure locale + identifiant IANA, parce que les règles de DST peuvent changer entre le stockage et l'événement.

**« Greedy vs lazy ? »** — Un quantificateur glouton (`.+`) avale le maximum puis rétrocède jusqu'à ce que le reste du motif matche ; lazy (`.+?`) prend le minimum puis étend. Sur `<b>x</b>`, `<.+>` capture toute la chaîne, `<.+?>` capture `<b>`. La meilleure réponse propose la classe négée `<[^>]+>` : même résultat, sans backtracking.

**« Pourquoi ne pas parser du HTML avec une regex ? »** — Le HTML est un langage imbriqué : une regex ne peut pas compter les niveaux d'ouverture/fermeture (c'est la limite des langages réguliers). Ça marche sur trois exemples puis casse sur les attributs, les commentaires, l'imbrication. Un parseur existe déjà dans chaque écosystème : DOMParser, BeautifulSoup, lxml.

**« Qu'est-ce que le DST change pour un développeur ? »** — Deux fois par an, l'heure locale saute : une heure inexistante au printemps, une heure ambiguë à l'automne. Conséquences : « ajouter 24 h » ≠ « demain même heure », les crons entre 2 h et 3 h sautent ou doublent, les durées calculées en heure locale se trompent d'une heure. D'où le calcul en UTC et les bibliothèques tz.

## Pièges & idées reçues

- **« UTF-8 = 1 caractère par octet »** — seulement pour l'ASCII. `é` en prend 2, `€` 3, les emojis 4. Tronquer une chaîne à N octets peut couper un caractère au milieu et produire `�`.
- **`substring`/`slice` cassent les graphèmes** — tronquer « pour l'aperçu » à 20 caractères peut couper un emoji ou un accent. Segmenter par graphème avant de tronquer.
- **`\d` n'est pas `[0-9]` partout** — en Python, `\d` matche les chiffres Unicode (`'٣'` compris) ; `re.ASCII` ou `[0-9]` si on veut des chiffres arabes occidentaux.
- **Additionner des offsets à la main** (`heure + 2` pour Paris) — l'offset dépend de la date à cause du DST. Toujours passer par la base tz via une bibliothèque.
- **« Ma regex email est correcte »** — la grammaire RFC 5322 est monstrueuse et une regex « parfaite » refuse des adresses valides. Vérifier `qqch@qqch.qqch`, puis envoyer un email de confirmation : c'est le seul test fiable.
- **Comparer des dates avec `==`** — en JS, deux `Date` identiques sont deux objets différents : `d1 == d2` est `false`. Comparer `getTime()`, ou utiliser une bibliothèque.

## Pour aller plus loin

- [The Absolute Minimum Every Software Developer Must Know About Unicode](https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/) — le classique de Joel Spolsky
- [UTC is enough for everyone, right?](https://zachholman.com/talk/utc-is-enough-for-everyone-right) — Zach Holman, drôle et complet sur les fuseaux
- [Falsehoods programmers believe about time](https://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time) — la liste des hypothèses fausses
- [Post-mortem Cloudflare 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) — une regex qui fait tomber un CDN mondial
- [regex101](https://regex101.com/) pour tester, [documentation Temporal](https://tc39.es/proposal-temporal/docs/) pour les dates JS modernes
