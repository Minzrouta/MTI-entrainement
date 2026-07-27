---
title: "WebSockets & le temps réel"
date: "2026-07-29"
category: "Web"
level: "Intermédiaire"
summary: "Polling, SSE, WebSocket : choisir la bonne technique temps réel et savoir la scaler sur plusieurs instances — le sujet qui départage les candidats sur les questions de chat et de notifications."
---

## L'essentiel

HTTP est un protocole **requête/réponse** : le client demande, le serveur répond, la transaction est finie. Le serveur ne peut pas prendre l'initiative d'envoyer un message — problème dès qu'on veut du temps réel : chat, notifications, cours de bourse, curseurs collaboratifs.

Le **WebSocket** répond à cette limite : une connexion TCP persistante et **full-duplex** (les deux côtés émettent quand ils veulent), établie par un handshake HTTP puis affranchie du modèle requête/réponse. Une seule connexion, un overhead de quelques octets par message, une latence minimale.

Mais le réflexe « temps réel = WebSocket » est une erreur d'entretien classique : pour un flux **unidirectionnel** serveur → client (notifications, progression d'un job), les **Server-Sent Events** font le travail sur du HTTP simple, avec reconnexion automatique native. Savoir comparer honnêtement les options vaut plus que de réciter la RFC.

## Comment ça marche

**Le handshake** : le client envoie une requête HTTP GET avec `Connection: Upgrade`, `Upgrade: websocket` et un header `Sec-WebSocket-Key` (nonce aléatoire). Le serveur répond `101 Switching Protocols` avec `Sec-WebSocket-Accept` (hash SHA-1 du nonce concaténé à un GUID fixe — preuve qu'il parle bien WebSocket, pas de la crypto). À partir de là, la connexion TCP reste ouverte et les deux côtés échangent des **frames**.

```text
Client                             Serveur
  │ GET /chat HTTP/1.1               │
  │ Connection: Upgrade              │
  │ Upgrade: websocket               │
  │ Sec-WebSocket-Key: <nonce>       │
  │─────────────────────────────────▶│
  │                                  │
  │ HTTP/1.1 101 Switching Protocols │
  │ Sec-WebSocket-Accept: <hash>     │
  │◀─────────────────────────────────│
  │                                  │
  │◀════ frames full-duplex ════════▶│
  │      (text, binary, ping/pong)   │
```

**Les frames** : chaque message est découpé en frames avec un opcode (text, binary, ping, pong, close). Les frames client → serveur sont **maskées** (XOR avec une clé aléatoire) pour éviter des attaques d'empoisonnement de cache sur des proxies naïfs. Les frames de contrôle **ping/pong** servent de heartbeat.

**Heartbeat & reconnexion** : une connexion TCP peut être morte sans que personne ne le sache — un proxy, un NAT ou un firewall coupe silencieusement les connexions inactives (souvent après 30-60 s). D'où le heartbeat : le serveur envoie un ping périodique, pas de pong en retour = connexion morte, on nettoie. Côté client, la reconnexion se fait avec un **backoff exponentiel + jitter** (sinon, au redémarrage du serveur, tous les clients reviennent en même temps et l'écroulent — thundering herd), suivie d'une **resynchronisation d'état** : les messages ratés pendant la coupure ne reviennent pas tout seuls.

Tout le nécessaire côté client tient en quelques lignes de WebSocket natif :

```js
function connect(attempt = 0) {
  const ws = new WebSocket("wss://api.example.com/chat");

  ws.onopen = () => {
    attempt = 0;                                      // reset du backoff
    ws.send(JSON.stringify({ type: "auth", token })); // auth en 1er message
  };

  ws.onmessage = (e) => render(JSON.parse(e.data));

  ws.onclose = () => {
    // backoff exponentiel + jitter : évite le thundering herd
    const delay = Math.min(30_000, 1000 * 2 ** attempt)
                + Math.random() * 1000;
    setTimeout(() => connect(attempt + 1), delay);
  };
}
connect();
```

**Scaling horizontal** : c'est LA question piège. Un WebSocket est **stateful** : la connexion vit sur une instance précise. Avec 3 instances derrière un load balancer, Alice est connectée à l'instance A et Bob à l'instance B — si Alice envoie un message dans un salon, l'instance A ne peut pas le pousser à Bob directement. Deux briques : des **sticky sessions** au niveau du load balancer (pour que le handshake et la connexion restent sur la même instance), et un **pub/sub** (Redis typiquement) pour broadcaster entre instances : A publie le message sur un channel, toutes les instances abonnées le reçoivent et le relaient à leurs clients connectés.

> 🎤 **En entretien** — « et sur plusieurs instances ? » arrive systématiquement après votre belle explication du handshake. Avoir les deux briques prêtes — sticky sessions + Redis pub/sub — et savoir dire *pourquoi* chacune est nécessaire fait toute la différence.

## Concepts clés à maîtriser

Quatre techniques pour du temps réel, à comparer honnêtement :

| | Short polling | Long polling | SSE | WebSocket |
|---|---|---|---|---|
| Direction | client → serveur | serveur → client (simulé) | serveur → client | bidirectionnelle |
| Transport | HTTP répété | HTTP maintenu ouvert | HTTP streaming (`text/event-stream`) | TCP après upgrade |
| Latence | intervalle/2 en moyenne | quasi nulle | quasi nulle | minimale |
| Reconnexion | sans objet | à chaque message | automatique (`EventSource`, `Last-Event-ID`) | à la main (backoff) |
| Données | tout HTTP | tout HTTP | texte seulement | texte + binaire |
| Idéal pour | données peu fréquentes | compatibilité legacy | notifications, dashboards, flux LLM | chat, jeux, édition collaborative |

> 💡 **SSE sous-estimé** — reconnexion et reprise gratuites, du HTTP standard qui passe partout, et la vieille limite des 6 connexions par domaine en HTTP/1.1 est levée par le multiplexage HTTP/2. Avant de dégainer un WebSocket, une seule question : le client a-t-il vraiment besoin d'émettre ?

- **socket.io vs WebSocket natif** : socket.io est une bibliothèque **au-dessus** du transport (WebSocket quand c'est possible, long polling en fallback) qui ajoute reconnexion automatique, **rooms**, namespaces, acknowledgements et un adapter Redis prêt à l'emploi pour le multi-instance. Coût : un protocole propriétaire (un client WebSocket brut ne peut pas s'y connecter) et une dépendance des deux côtés. En 2026, le fallback compte moins qu'avant ; ce sont les rooms et l'adapter qui justifient socket.io.
- **Sécurité** : `wss://` (TLS) obligatoire — comme https. L'API WebSocket du navigateur **ne permet pas de headers custom** : l'auth du handshake passe par le cookie de session, un token en query string (attention aux logs serveur) ou un premier message d'authentification. Et surtout : **pas de CORS sur les WebSockets** — le serveur doit vérifier lui-même le header `Origin`, sinon n'importe quel site peut ouvrir une connexion authentifiée par cookie (cross-site WebSocket hijacking).

## En entretien

**« Pourquoi ne pas simplement faire du polling ? »** — Le short polling gaspille des requêtes vides et impose une latence moyenne de la moitié de l'intervalle. Ça reste défendable pour des données peu fréquentes (toutes les 30 s) — c'est simple, stateless, cacheable. Dès que la fréquence monte ou que la latence compte, SSE ou WebSocket.

**« Décris le handshake WebSocket »** — GET HTTP avec `Upgrade: websocket`, `Connection: Upgrade` et `Sec-WebSocket-Key` ; réponse `101 Switching Protocols` avec `Sec-WebSocket-Accept` dérivé de la clé. La connexion TCP est ensuite réutilisée pour des frames full-duplex. Bonus : commencer en HTTP permet de passer les proxies et de partager le port 443.

**« Comment scaler un chat sur plusieurs instances ? »** — Sticky sessions au load balancer pour que chaque connexion vive sur une instance stable, et Redis pub/sub entre les instances : celle qui reçoit un message le publie sur un channel, les autres le relaient à leurs clients du salon concerné. Mentionner l'adapter Redis de socket.io qui implémente exactement ça.

**« SSE ou WebSocket pour des notifications ? »** — SSE : le flux est unidirectionnel, l'API EventSource gère la reconnexion et la reprise nativement, ça passe par du HTTP standard (pas de config proxy/LB spéciale). Le WebSocket ajouterait de la complexité (heartbeat, reconnexion manuelle) sans bénéfice puisque le client n'émet pas.

**« Comment authentifies-tu une connexion WebSocket ? »** — Au handshake : cookie de session (mais vérifier `Origin` contre une allowlist, sinon hijacking cross-site) ou token court-vécu passé en query string ou échangé dans le premier message. Ensuite, l'identité est attachée à la connexion — pas besoin de re-authentifier chaque message, mais il faut gérer l'expiration du token sur les connexions longues.

## Pièges & idées reçues

> ⚠️ **Pas de CORS sur les WebSockets** — le navigateur n'applique aucune politique d'origine au handshake. Un serveur qui authentifie par cookie sans vérifier le header `Origin` laisse n'importe quel site ouvrir une connexion authentifiée : c'est le cross-site WebSocket hijacking. Allowlist d'origines côté serveur, systématiquement.

- **« Temps réel = WebSocket »** — pour du serveur → client pur, SSE est plus simple à opérer et souvent suffisant. Le WebSocket se justifie quand le client émet aussi.
- **Oublier le heartbeat** : les proxies et NAT coupent silencieusement les connexions inactives ; sans ping/pong, le serveur garde des connexions zombies et le client croit être connecté.
- **Reconnexion naïve** : reconnecter immédiatement en boucle transforme chaque redémarrage serveur en auto-DDoS. Backoff exponentiel avec jitter, et resynchronisation de l'état manqué.
- **« socket.io, c'est des WebSockets »** — c'est un protocole au-dessus : un client socket.io ne parle pas à un serveur WebSocket natif, et inversement.
- **Ignorer la backpressure** : un client lent avec un serveur qui pousse vite = buffer qui gonfle en mémoire. Surveiller `bufferedAmount` côté client, fermer ou throttler les connexions saturées côté serveur.

## Pour aller plus loin

- [MDN — WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) et [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455) : au moins la section sur le handshake
- [socket.io — documentation](https://socket.io/docs/v4/), notamment la page sur l'[adapter Redis](https://socket.io/docs/v4/redis-adapter/)
- Exercice : un mini-chat Node (`ws` côté serveur, WebSocket natif côté client), puis le passer à deux instances avec Redis pub/sub — l'expérience qui rend le sujet concret en entretien
