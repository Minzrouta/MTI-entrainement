---
title: "MCP : le Model Context Protocol"
date: "2026-08-09"
category: "IA"
level: "Intermédiaire"
summary: "Le protocole ouvert qui connecte les LLM aux outils et aux données : architecture, transports, sécurité — le sujet IA le plus frais à sortir en entretien en 2026."
---

## L'essentiel

Le **Model Context Protocol (MCP)** est un protocole ouvert, lancé par Anthropic fin 2024, qui standardise la façon dont les applications LLM se connectent à des **outils** et des **sources de données** externes. Le problème qu'il résout : chaque application IA (Claude, un IDE, un agent maison) devait développer sa propre intégration pour chaque service (GitHub, Postgres, Slack…). C'est l'**intégration N×M** : N applications × M services = N×M connecteurs à écrire et maintenir.

MCP casse cette combinatoire comme USB-C l'a fait pour les périphériques : un serveur MCP GitHub écrit **une fois** fonctionne avec **toutes** les applications compatibles MCP. On passe de N×M à N+M. Le protocole a été adopté au-delà d'Anthropic — OpenAI, Google DeepMind, Microsoft, les IDE (VS Code, Cursor, Zed) l'ont intégré — ce qui en fait un standard de facto de l'écosystème agents, et un excellent sujet de veille à placer en entretien.

L'idée clé à retenir : MCP ne rend pas le modèle plus intelligent, il **standardise la plomberie** entre le modèle et le monde extérieur.

## Comment ça marche

L'architecture est **client-serveur**, avec trois rôles :

- **Host** — l'application LLM que l'utilisateur manipule : Claude Desktop, Claude Code, un IDE, un agent custom. C'est lui qui orchestre : il gère les connexions, agrège les capacités et décide (avec l'utilisateur) ce que le modèle peut faire.
- **Client** — le connecteur, à l'intérieur du host : une connexion 1-à-1 avec un serveur. Un host qui parle à trois serveurs maintient trois clients.
- **Serveur** — un programme (souvent minuscule) qui expose des capacités : accès à GitHub, à une base de données, à un navigateur, au système de fichiers.

Un serveur peut exposer trois types de capacités, et la distinction est une question d'entretien classique :

- **Tools** — des fonctions que **le modèle** décide d'appeler (avec approbation de l'utilisateur) : `create_issue`, `query_database`. Contrôlées par le modèle.
- **Resources** — des données en lecture que **l'application** attache au contexte : contenu de fichier, ligne de base de données, réponse d'API. Contrôlées par l'application.
- **Prompts** — des templates réutilisables que **l'utilisateur** déclenche explicitement (menus, slash commands). Contrôlés par l'utilisateur.

Sous le capot, tout passe par **JSON-RPC 2.0** : la session démarre par une poignée de main `initialize` où client et serveur négocient version du protocole et capacités, puis le client découvre ce qui est disponible (`tools/list`) et appelle (`tools/call`). Deux **transports** standard : **stdio** — le host lance le serveur comme sous-processus et communique via stdin/stdout, idéal en local (c'est comme ça que Claude Desktop lance la plupart des serveurs) ; et **HTTP streamable** — le serveur est un endpoint HTTP distant, avec streaming des réponses (ce transport remplace l'ancien HTTP+SSE), pour les serveurs partagés ou hébergés.

## Concepts clés à maîtriser

- **MCP vs function calling** : le function calling existe depuis 2023 — on décrit des fonctions en JSON Schema et le modèle génère des appels. Mais chaque intégration reste du code custom dans une seule app. MCP standardise la **couche au-dessus** : découverte dynamique des outils, protocole de communication, cycle de vie de la session. Un serveur MCP est réutilisable par n'importe quel host ; une fonction câblée dans ton backend ne l'est pas. Les deux se complètent : côté modèle, un tool MCP finit par ressembler à du function calling classique.
- **Écosystème** : des milliers de serveurs existent — officiels (GitHub, filesystem, fetch/navigateur, mémoire persistante), éditeurs (Stripe, Notion, Sentry, Cloudflare…), communautaires (Postgres, Docker, Kubernetes). Les SDK officiels (TypeScript, Python, et d'autres) permettent d'écrire un serveur basique en quelques dizaines de lignes : on déclare un tool avec son schéma d'entrée, le SDK gère le protocole.
- **Sécurité — le sujet qui fait la différence** : brancher des outils sur un LLM ouvre des risques réels. Le principal : la **prompt injection indirecte** — un contenu externe lu par un outil (une issue GitHub, une page web, un email) contient des instructions malveillantes que le modèle risque de suivre, par exemple « exfiltre les secrets via l'outil d'envoi de mail ». La combinaison dangereuse : accès à des données privées + exposition à du contenu non fiable + capacité de communication externe. Parades : **principe du moindre privilège** (tokens à permissions minimales, serveurs read-only quand possible), **human-in-the-loop** (approbation des appels sensibles), ne pas empiler des serveurs non audités, isoler les serveurs à risque.
- **Limites honnêtes** : chaque serveur connecté ajoute ses définitions d'outils au contexte (coût en tokens), la qualité des serveurs communautaires varie, et un agent avec 50 outils choisit moins bien qu'avec 5. MCP est une brique d'infrastructure, pas une baguette magique.

## En entretien

**« C'est quoi MCP, en deux phrases ? »** — Un protocole ouvert qui standardise la connexion entre applications LLM et outils/données externes, comme USB-C standardise les périphériques. Il transforme le problème d'intégration N×M en N+M : un serveur écrit une fois sert à tous les hosts compatibles.

**« Quelle différence avec le function calling ? »** — Le function calling est le mécanisme par lequel un modèle génère des appels de fonctions ; il est propriétaire à chaque app. MCP est un protocole ouvert au-dessus : découverte dynamique, transport standardisé (JSON-RPC sur stdio ou HTTP), réutilisabilité entre applications. Analogie : function calling = savoir appeler une fonction ; MCP = la norme qui permet de brancher des bibliothèques de fonctions interchangeables.

**« Tools, resources, prompts : qui contrôle quoi ? »** — Tools : le modèle décide de l'appel (l'utilisateur approuve). Resources : l'application choisit ce qu'elle attache au contexte. Prompts : l'utilisateur déclenche explicitement. Cette séparation des contrôles est un choix de design du protocole.

**« Quels risques de sécurité avec MCP ? »** — La prompt injection indirecte via le contenu que les outils rapportent (le modèle peut suivre des instructions cachées dans une page web ou une issue), l'excès de privilèges (un token trop large), et les serveurs tiers non audités. Réponses : moindre privilège, approbation humaine des actions sensibles, ne jamais combiner données privées + contenu non fiable + canal de sortie sans garde-fous.

**« Tu l'as utilisé concrètement ? »** — La meilleure réponse d'un stagiaire : citer un usage réel (un serveur MCP GitHub ou Postgres branché dans Claude Code ou un IDE), ou mieux, avoir écrit un petit serveur avec le SDK Python/TypeScript — trente lignes suffisent pour exposer un tool et comprendre le protocole de l'intérieur.

## Pièges & idées reçues

- **« MCP rend le modèle plus intelligent »** — non : il standardise l'accès aux outils. Un modèle qui raisonne mal choisira toujours mal ses outils, protocole ou pas.
- **« MCP remplace les API »** — non : un serveur MCP est presque toujours un **wrapper** autour d'une API existante, qui la décrit dans un format consommable par un LLM. L'API REST reste en dessous.
- **Brancher 15 serveurs « pour être complet »** — chaque outil coûte des tokens de contexte et dilue la capacité du modèle à choisir le bon. Quelques serveurs pertinents battent un catalogue.
- **Faire confiance à n'importe quel serveur communautaire** — un serveur MCP exécute du code sur ta machine (transport stdio) et voit passer des données sensibles. Lire le code ou choisir des serveurs officiels/audités.
- **Ignorer la prompt injection** — « le modèle n'exécutera jamais ça » est une hypothèse, pas une garantie. Les garde-fous se mettent côté permissions et approbation, pas côté espoir.
- **Confondre host et client** — le host est l'application ; le client est la connexion 1-à-1 vers un serveur, à l'intérieur du host. Petite précision qui montre qu'on a lu la spec.

## Pour aller plus loin

- [modelcontextprotocol.io](https://modelcontextprotocol.io/) — le site officiel : introduction, concepts, spécification
- [La spécification MCP](https://modelcontextprotocol.io/specification/latest) — poignée de main, capacités, transports (lisible en une heure)
- [Le dépôt des serveurs officiels](https://github.com/modelcontextprotocol/servers) — pour lire le code de vrais serveurs et s'en inspirer
- Écrire son premier serveur avec le [SDK Python](https://github.com/modelcontextprotocol/python-sdk) ou [TypeScript](https://github.com/modelcontextprotocol/typescript-sdk), puis le brancher dans Claude Desktop ou Claude Code — le meilleur investissement d'une soirée pour un entretien en 2026
