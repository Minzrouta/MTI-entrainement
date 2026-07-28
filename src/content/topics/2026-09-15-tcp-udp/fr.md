---
title: "TCP, UDP & le réseau du développeur"
date: "2026-09-15"
category: "DevOps"
level: "Intermédiaire"
summary: "Three-way handshake, ports, NAT, latence : le socle réseau qu'un recruteur attend d'un dev backend — et les outils pour diagnostiquer « pourquoi c'est lent » en entretien comme en prod."
---

## L'essentiel

Tout ce qu'un développeur envoie sur le réseau traverse une pile de couches. Le modèle OSI à 7 couches est académique ; en pratique, quatre suffisent :

| Couche | Rôle | Exemples |
|---|---|---|
| Applicatif | Le sens des données | HTTP, DNS, gRPC, WebSocket |
| Transport | De processus à processus (ports) | **TCP, UDP, QUIC** |
| Réseau (IP) | De machine à machine, routage | IPv4, IPv6, ICMP |
| Lien | Le support physique local | Ethernet, Wi-Fi |

Chaque couche encapsule celle du dessus : votre requête HTTP part dans un segment TCP, dans un paquet IP, dans une trame Ethernet. IP ne garantit **rien** : les paquets peuvent se perdre, arriver en désordre ou en double. Toute la question du transport est : que fait-on de cette réalité ?

- **TCP** répond : je masque tout ça. Connexion établie, octets livrés **dans l'ordre, sans perte, sans doublon** — au prix de latence et de mécanique.
- **UDP** répond : rien. J'ajoute juste les ports à IP. Un datagramme part, il arrive ou pas — à l'application de gérer. C'est un choix, pas une négligence.

## Comment ça marche

TCP est **orienté connexion** : avant le moindre octet utile, client et serveur se synchronisent par le **three-way handshake** :

```text
Client                          Serveur
  │──────── SYN (seq=x) ─────────▶│  « je veux parler,
  │                               │    je numérote depuis x »
  │◀──── SYN-ACK (seq=y, ack=x+1)─│  « ok, moi depuis y »
  │──────── ACK (ack=y+1) ───────▶│  « reçu, on y va »
  │                               │
  │═══════ données HTTP… ════════▶│  = 1 RTT avant le
  │                               │    premier octet utile
```

Ce handshake coûte **un aller-retour (RTT)** avant toute donnée — et TLS en ajoute par-dessus. C'est pour ça que la latence, pas la bande passante, domine le temps de réponse des petites requêtes.

Une fois connecté, TCP fournit :

- **Ordre et fiabilité** : chaque octet est numéroté (sequence numbers), le récepteur acquitte (ACK) ; un segment non acquitté est **retransmis** après timeout ou ACKs dupliqués.
- **Flow control** : le récepteur annonce la taille de sa fenêtre de réception — l'émetteur n'envoie jamais plus que ce que l'autre peut absorber.
- **Congestion control** : l'émetteur sonde le réseau (slow start, puis évitement de congestion) et réduit son débit dès qu'il détecte des pertes. C'est ce qui empêche Internet de s'effondrer — et ce qui fait qu'un transfert TCP démarre « doucement ».

UDP, lui, envoie des **datagrammes** indépendants : pas de connexion, pas d'ordre, pas de retransmission, en-tête de 8 octets. Parfait quand la retransmission n'a pas de sens : **DNS** (une question, une réponse — on réessaie soi-même), **jeux temps réel et visio** (une position vieille de 200 ms est bonne à jeter, pas à retransmettre), et **QUIC**, qui rebâtit fiabilité + chiffrement *au-dessus* d'UDP.

> 🎤 **En entretien** — « pourquoi HTTP/3 passe à UDP ? » Parce que TCP a deux problèmes que personne ne peut corriger : le handshake coûte des RTT (TCP puis TLS), et une seule perte bloque **tout** le flux, même les requêtes multiplexées qui n'ont rien à voir (head-of-line blocking). QUIC, construit sur UDP, fusionne transport + TLS 1.3 en un seul handshake, gère des streams indépendants (une perte ne bloque qu'un stream) et survit au changement de réseau (Wi-Fi → 4G). On ne pouvait pas modifier TCP lui-même : il est figé dans les noyaux et les middleboxes — UDP était la seule porte de sortie.

## Concepts clés à maîtriser

- **Ports et sockets** : l'adresse IP identifie la machine, le **port** (0-65535) identifie le processus. Une connexion TCP est identifiée par le quadruplet `(IP src, port src, IP dst, port dst)` — c'est pour ça qu'un serveur sur le port 443 sert des milliers de clients simultanés. Côté code : `listen()` crée la socket d'écoute, chaque `accept()` retourne une socket dédiée à un client.
- **NAT** : votre machine en `192.168.x.x` n'est pas routable sur Internet. Le routeur **réécrit** IP source et port sortants vers son IP publique et mémorise le mapping pour router les réponses. Conséquences : plusieurs machines partagent une IP publique, et un serveur derrière un NAT n'est pas joignable de l'extérieur sans redirection de port — d'où les techniques de traversée (STUN/TURN) de WebRTC.
- **Latence vs bande passante** : la bande passante est la largeur du tuyau (Mo/s), la latence le temps d'un aller-retour (ms). Charger 100 petites ressources est limité par la **latence** (des dizaines de RTT), pas par le débit. Réflexes : réduire les allers-retours (HTTP/2-3, batching), rapprocher les données (CDN, cache), réutiliser les connexions (keep-alive, pools).
- **Les outils du quotidien** : `ss -tlnp` (qui écoute sur quels ports — le réflexe sécurité), `ping` (latence ICMP), `traceroute` (le chemin, saut par saut), `dig` (DNS), `tcpdump` pour voir les paquets, et `curl -w` pour décomposer une requête HTTP :

```bash
# Décomposer le temps d'une requête, étape par étape
curl -w '
DNS:        %{time_namelookup}s   # résolution du nom
TCP:        %{time_connect}s      # fin du three-way handshake
TLS:        %{time_appconnect}s   # fin du handshake TLS
TTFB:       %{time_starttransfer}s # premier octet de la réponse
Total:      %{time_total}s
' -o /dev/null -s https://api.example.com/health

# Lecture : TCP - DNS ≈ 1 RTT ; TLS - TCP ≈ le coût du chiffrement ;
# TTFB - TLS ≈ le temps de calcul CÔTÉ SERVEUR.
# Si Total explose mais TTFB est bon → problème de débit/taille,
# si TTFB est mauvais → serveur lent ou trop de RTT.
```

> 💡 **Le réflexe diagnostic** — « l'API est lente » ne veut rien dire tant qu'on n'a pas séparé DNS / connexion / TLS / serveur / transfert. `curl -w` fait cette séparation en une commande : c'est la meilleure réponse possible à « comment tu débuggerais ça ? ».

## En entretien

**« Explique le three-way handshake. »** — SYN (le client propose son numéro de séquence initial), SYN-ACK (le serveur acquitte et propose le sien), ACK (le client confirme). Les deux côtés ont synchronisé leurs numéros de séquence : la connexion est établie, au prix d'un RTT. Bonus : mentionner que TLS ajoute son propre handshake par-dessus, et que QUIC fusionne les deux.

**« TCP vs UDP, lequel choisir ? »** — TCP dès qu'il faut de l'exactitude : HTTP/1-2, bases de données, mail, transferts. UDP quand la fraîcheur prime sur la complétude (jeux, voix, visio), quand l'échange est minuscule (DNS), ou quand on rebâtit son propre transport au-dessus (QUIC). La question cachée : « sais-tu que la fiabilité a un coût ? »

| | TCP | UDP |
|---|---|---|
| Connexion | Oui (handshake, 1 RTT) | Non |
| Ordre / fiabilité | Garantis (seq + ACK + retransmission) | Aucun |
| Congestion control | Oui | Non (à l'application) |
| En-tête | 20+ octets | 8 octets |
| Usages | HTTP/1-2, DB, SSH, mail | DNS, jeux, VoIP, QUIC/HTTP-3 |

**« Que se passe-t-il quand un paquet se perd ? »** — En TCP : le récepteur acquitte le dernier octet contigu reçu ; l'émetteur retransmet sur timeout ou triple ACK dupliqué, et le congestion control réduit le débit. En UDP : rien — le datagramme est perdu, point ; c'est à l'application de décider si ça mérite un renvoi.

**« Une machine derrière un NAT peut-elle recevoir une connexion entrante ? »** — Pas spontanément : le NAT ne route que les réponses aux flux sortants qu'il a mémorisés. Il faut une redirection de port configurée, ou des techniques de traversée (STUN pour découvrir son adresse publique, TURN comme relais) — exactement ce que fait WebRTC.

**« Pourquoi ajouter de la bande passante n'accélère pas mon API ? »** — Parce que le temps d'une petite requête est dominé par les allers-retours : DNS + handshake TCP + TLS + requête ≈ 3-4 RTT avant le premier octet. À 80 ms de RTT, c'est 300 ms incompressibles quel que soit le débit. Solutions : keep-alive, HTTP/2-3, CDN, régions proches.

## Pièges & idées reçues

> ⚠️ **« UDP n'est pas fiable, donc inutilisable »** — faux : « pas fiable » signifie que la couche transport ne retransmet pas, pas que les paquets se perdent en masse. Sur un bon réseau, la quasi-totalité arrive. QUIC — donc HTTP/3, donc une part énorme du web — tourne sur UDP avec une fiabilité rebâtie au-dessus.

- **« TCP garantit la livraison »** — TCP garantit *ordre et intégrité de ce qui arrive*, et retransmet tant que la connexion vit. Si le câble est coupé, rien n'est livré : l'application doit gérer timeouts et reconnexions.
- **Confondre latence et bande passante** : « on a la fibre, pourquoi c'est lent ? » — parce que 40 requêtes séquentielles × 50 ms de RTT = 2 s, fibre ou pas.
- **`ping` qui échoue ≠ service down** : ping teste ICMP, pas votre port TCP. Beaucoup d'hôtes filtrent ICMP. Tester le service réel : `curl` ou `nc -zv host 443`.
- **Oublier que le port < 1024 exige des privilèges** sous Linux — d'où les apps qui écoutent sur 3000/8080 derrière un reverse proxy qui, lui, tient le 80/443.
- **`ss -tlnp` avant tout debug** « connection refused » : si personne n'écoute sur le port, inutile de chercher plus loin dans le réseau.

## Pour aller plus loin

- [High Performance Browser Networking](https://hpbn.co/) (Ilya Grigorik) — gratuit en ligne, LE livre latence/TCP/TLS pour développeurs
- [RFC 9293 — TCP](https://datatracker.ietf.org/doc/html/rfc9293) et [RFC 9000 — QUIC](https://datatracker.ietf.org/doc/html/rfc9000) pour toucher les specs
- [Cloudflare Learning — What is QUIC?](https://www.cloudflare.com/learning/network-layer/what-is-quic/) — le pourquoi d'HTTP/3, très lisible
- Manipuler : `traceroute vers un site lointain`, `tcpdump -i any port 443 -c 20`, et `curl -w` sur vos propres APIs
