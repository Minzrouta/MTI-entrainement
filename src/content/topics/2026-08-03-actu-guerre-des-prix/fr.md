---
title: "La guerre des prix a commencé : OpenAI casse Luna de 80 %, Anthropic sort Opus 5"
date: "2026-08-03"
category: "Actu"
level: "Semaine 32"
summary: "En trois semaines, GPT-5.6 Luna perd 80 % de son prix, Opus 5 prend la tête de l'Intelligence Index sans augmenter son tarif, et Kimi K3 ouvre son API à moitié prix — la concurrence bascule de la capacité vers le coût. Plus : des conversations Claude retrouvées dans Google."
---

## La une

La bataille des modèles ne se joue plus sur les benchmarks, elle se joue sur la facture.

Le **30 juillet**, OpenAI a **baissé le prix de GPT-5.6 Luna de 80 %** — de 1 $ / 6 $ à **0,20 $ / 1,20 $** par million de tokens (entrée / sortie) — et celui de Terra de 20 % (2,50 $ / 15 $ → 2 $ / 12 $). Le flagship Sol, lui, ne bouge pas (5 $ / 30 $). Le détail qui compte : la famille GPT-5.6 n'avait que **21 jours**. Personne ne divise par cinq le prix d'un produit lancé trois semaines plus tôt sans une raison.

La raison, c'est ce qui s'est passé juste avant :

- **Claude Opus 5** (Anthropic, 24 juillet) prend la tête de l'*Artificial Analysis Intelligence Index* avec 61 points — **au même tarif que son prédécesseur Opus 4.8** (5 $ / 25 $), soit environ la moitié du coût par tâche de Fable 5.
- **Kimi K3**, le modèle open-weight de 2 800 milliards de paramètres de Moonshot AI, a ouvert son **API avec 1 million de tokens de contexte**, à environ la moitié du prix des flagships américains.

Trois labos, trois stratégies, un même mouvement : le prix de l'intelligence par tâche s'effondre. Le vocabulaire à retenir, c'est **coût par tâche** plutôt que prix par token — un modèle deux fois plus cher au token mais qui résout le problème en un seul appel au lieu de cinq revient moins cher. C'est exactement l'argument d'Anthropic sur Opus 5.

> 🎤 **En entretien** — « le prix des LLM baisse » est une banalité. « GPT-5.6 Luna est passé de 1 $ à 0,20 $ le million de tokens en entrée trois semaines après son lancement, sous la pression d'Opus 5 et des modèles open-weight chinois » est une réponse datée, chiffrée, sourcée. La différence entre les deux, c'est littéralement de la veille technique — et c'est ce que le recruteur évalue.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| Des conversations Claude partagées retrouvées dans Google | Anthropic | Repéré le 25 juillet : des centaines de chats et Artifacts publics indexés (CV, clés d'API, tableurs financiers). Pages sans `noindex`. Corrigé le 28 via `robots.txt` |
| MAI-Cyber-1-Flash + Project Perception | Microsoft | 27 juillet : premier modèle cyber maison (96 % sur CyberGym) et des agents *red / blue / green* qui attaquent, trient et patchent. Preview publique le 3 août |
| API Kimi K3, 1 M de contexte | Moonshot AI | Le plus gros modèle open-weight jamais publié devient une API bon marché — la pression tarifaire vient aussi de là |
| Fin des tokens npm qui contournent la 2FA | npm / GitHub | Première étape début août : les *granular access tokens* configurés pour contourner la 2FA perdent les actions sensibles. À vérifier dans vos CI |
| AZ-204 retirée, remplacée par AI-200 | Microsoft Learn | La certif « Azure Developer Associate » s'arrête le 31 juillet au profit d'« Azure AI Cloud Developer Associate ». Même le parcours de certif se réécrit autour de l'IA |

## Pourquoi ça vous concerne

- **Le coût n'est plus une excuse pour ne pas avoir de projet IA.** À 0,20 $ le million de tokens en entrée, traiter mille documents dans un side-project coûte quelques centimes. L'argument « je n'avais pas le budget API » ne tient plus devant un recruteur.
- **Savoir choisir son tier devient une compétence.** Router les tâches simples (extraction, classification, reformulation) vers un petit modèle et garder le flagship pour le raisonnement dur, c'est une décision d'architecture. En entretien, « j'ai routé 90 % des appels vers le petit modèle et mesuré le coût par tâche » vaut infiniment mieux que « j'ai utilisé l'IA ».
- **L'incident Claude/Google est une leçon de web, pas d'IA.** Une URL non devinable n'est pas un contrôle d'accès. Dès qu'un lien « privé » circule sur un forum, un crawler le suit. `noindex`, `robots.txt`, et surtout une vraie autorisation côté serveur : ça vaut pour vos projets Astro, Next ou Django exactement comme pour Claude.
- **La sécurité IA se structure côté défense.** Après l'intrusion agentique subie par Hugging Face en juillet, Microsoft sort des agents de sécurité. Le sujet passe de la conférence au produit — donc au recrutement.

## En entretien

**« Tu suis l'actualité tech ? Raconte-moi quelque chose de récent. »** — La guerre des prix de fin juillet : la baisse de 80 % sur Luna, Opus 5 en tête de l'Intelligence Index à tarif constant, Kimi K3 en API à moitié prix. Puis la conclusion qui montre que vous avez compris : la concurrence ne porte plus sur « qui a le meilleur modèle » mais sur « qui donne le plus d'intelligence par euro ».

**« Comment maîtriseriez-vous le coût d'une fonctionnalité IA en production ? »** — Quatre leviers concrets : router par tier selon la difficulté de la tâche, mettre en cache les prompts systèmes répétés, passer en *batch* ce qui n'est pas temps réel, et surtout **mesurer le coût par tâche résolue**, pas le coût par token. Ajouter qu'on met un plafond de dépense et une alerte : ça montre qu'on a déjà réfléchi à la prod.

**« Un lien de partage, c'est sécurisé ? »** — Non. C'est de l'*obscurité*, pas de la sécurité. Citer l'affaire des conversations Claude indexées par Google fin juillet suffit à illustrer : dès que le lien fuite, la donnée est publique et potentiellement archivée par les moteurs. La bonne réponse reste une autorisation vérifiée côté serveur.

## Pour aller plus loin

- [OpenAI baisse le prix de Luna de 80 % — l'analyse de la pression concurrentielle (VentureBeat)](https://venturebeat.com/technology/ai-price-wars-openai-cuts-gpt-5-6-luna-prices-by-80-as-model-competition-shifts-toward-cost)
- [OpenAI réduit les prix de deux modèles GPT-5.6 (CNBC)](https://www.cnbc.com/2026/07/30/open-ai-price-cut-gpt.html)
- [Claude Opus 5 en tête de l'Intelligence Index à moitié prix (MLQ News)](https://mlq.ai/news/anthropic-launches-claude-opus-5-tops-ai-benchmark-index-at-half-the-cost-of-fable-5/)
- [Vos conversations Claude partagées ont pu finir sur Google (TechCrunch)](https://techcrunch.com/2026/07/27/psa-your-claude-shared-chats-and-artifacts-may-have-ended-up-on-google/)
- [Microsoft lance son premier modèle cyber et Project Perception (TechCrunch)](https://techcrunch.com/2026/07/27/microsoft-launches-its-first-cyber-model-and-a-new-agentic-cybersecurity-system/)
- [npm v12 : les install scripts désactivés par défaut (The Hacker News)](https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html)
