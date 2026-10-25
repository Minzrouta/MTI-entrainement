---
title: "Claude et OpenAI débarquent sur Google Cloud : les modèles d'IA ne sont plus liés à un seul cloud"
date: "2026-10-26"
category: "Actu"
level: "Semaine 44"
summary: "Le 22 octobre, Anthropic a rendu disponible son offre Claude Platform gérée par Anthropic sur Google Cloud, avec l'identité, la facturation et les engagements de dépense de Google. La veille, OpenAI avait ouvert l'accès à ses modèles via Google Cloud, en préversion privée. Plus : Claude Duet, un agent personnel qui travaille en arrière-plan ; Claude Security en bêta publique ; MiniMax M3.1 Flash ; Recursive Flint, un modèle de code qui tourne sur un portable ; et le « LLMjacking », qui détourne les modèles exposés sur Internet."
---

## La une

Cette semaine, deux des plus grands fournisseurs de modèles ont choisi le même cloud, celui de Google.

Le **jeudi 22 octobre 2026**, Anthropic a annoncé la disponibilité générale d'une offre **Claude Platform gérée par Anthropic sur Google Cloud**. Concrètement, une entreprise qui a déjà un compte Google Cloud peut utiliser la plateforme Claude avec son **identité Google Cloud**, sa **facturation Google Cloud** et, si elle en a, ses **engagements de dépense** (l'argent déjà réservé chez Google peut servir à payer Claude). Des points d'accès américain et mondial sont proposés. L'offre gérée par Google, déjà disponible avant, reste proposée à côté.

La veille, le **mercredi 21 octobre**, OpenAI avait annoncé l'accès à ses modèles via Google Cloud. Pour l'instant, c'est une **préversion privée**, limitée aux équipes approuvées et à des usages de développement et de test interne, pas à la production. Un élargissement est prévu « dans les prochaines semaines ». Google Cloud présente la même chose de son côté, avec des modèles listés dans son Model Garden (la presse cite des noms comme GPT-6 Astra, GPT-6.1 Sol et GPT-6 Luna).

**Pourquoi c'est notable.** Pendant longtemps, le choix d'un modèle imposait presque le choix d'un cloud : GPT chez Microsoft Azure, Claude chez Amazon ou Google, Gemini chez Google. Les entreprises qui avaient déjà un contrat avec un cloud devaient soit se limiter à ses modèles, soit ouvrir un deuxième compte, une deuxième facturation et une deuxième validation de sécurité chez un autre fournisseur. Quand les modèles se retrouvent sur plusieurs clouds, cette friction baisse : l'achat, les droits d'accès et les alertes de budget restent dans l'outil que l'entreprise connaît déjà.

Ce qu'il faut garder en tête :

- **Disponible n'est pas la même chose que mûr.** L'offre Claude est en disponibilité générale ; celle d'OpenAI est en préversion privée, sans garantie de production. Beaucoup d'articles de la semaine mélangent les deux.
- **Les détails de prix et de fonctionnalités varient.** Les deux fournisseurs ont chacun leurs pages de référence, et les fonctions disponibles sur un cloud ne sont pas forcément identiques à celles de l'API directe. Ce n'est pas un simple « même produit, autre adresse ».
- **Ça ne dit rien de la qualité des modèles.** C'est un changement de distribution, pas de capacité.

> 🎤 **En entretien** : si on vous demande « comment choisissez-vous un modèle pour un projet ? », vous pouvez répondre : « Je commence par le besoin, puis je regarde aussi où l'entreprise est déjà cliente. Cette semaine, Claude est devenu disponible sur Google Cloud avec la facturation et l'identité de Google, et les modèles d'OpenAI y arrivent en préversion privée. Donc je ne code pas contre un fournisseur : j'isole l'appel au modèle derrière une petite interface, pour pouvoir changer de modèle ou de cloud sans réécrire l'application. » Vous montrez que vous pensez à la portabilité, pas seulement au dernier modèle à la mode.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Claude Duet, un agent personnel en arrière-plan** | Anthropic | Annoncé le **21 octobre** en préversion de recherche, avec liste d'attente pour les abonnés Claude Pro et Max aux États-Unis. Duet se connecte à vos applications et utilise un ordinateur virtuel pour préparer du travail en arrière-plan. Il partage les limites d'usage de Claude. Team et Enterprise ne sont pas inclus |
| **Claude Security en bêta publique** | Anthropic | Le **21 octobre**, pour les clients Enterprise : analyse continue des dépôts, suivi des correctifs, projets sur plusieurs dépôts et prise en compte d'un modèle de menaces, via API et MCP |
| **MiniMax M3.1 Flash** | MiniMax | Sorti le **19 octobre**. L'entreprise annonce de meilleurs résultats en tâches d'agent, en programmation et en cybersécurité, une vitesse d'inférence presque triplée et un coût d'usage réduit de 70 %. Ce sont des chiffres du fournisseur, non vérifiés de façon indépendante |
| **Recursive Flint, un modèle de code sur portable** | Recursive | Modèle gratuit qui tourne sur un ordinateur portable, que l'entreprise dit avoir construit en grande partie avec son propre système de recherche en IA (TechCrunch, 21 octobre) |
| **LLMjacking** | Chercheurs en sécurité | Des attaquants détournent des modèles d'IA exposés sur Internet pour voler des identifiants ou miner de la cryptomonnaie. Le coût de calcul retombe sur le propriétaire du modèle (Help Net Security, 23 octobre) |

## Pourquoi ça vous concerne

- **Les offres de stage parlent de plus en plus de « cloud + IA ».** Beaucoup d'entreprises ont un contrat avec un seul cloud. Savoir dire « on peut appeler Claude ou un modèle OpenAI depuis notre cloud actuel » vous rend utile plus vite qu'un candidat qui ne connaît que l'API publique.
- **Ne vous attachez pas à un fournisseur.** Mettez l'appel au modèle derrière une fonction ou une classe à vous, avec le nom du modèle en configuration. C'est dix lignes, et ça vous évite de réécrire le projet quand le client change de cloud ou quand un modèle devient trop cher.
- **L'identité et la facturation sont des sujets d'ingénieur.** Utiliser l'identité du cloud (rôles, comptes de service) plutôt qu'une clé API collée dans un `.env` réduit le risque de fuite, un thème qui revenait dans l'actu de la semaine dernière sur OpenCode.
- **Ne laissez pas un modèle ouvert sur Internet.** Le LLMjacking vise justement les serveurs d'IA sans authentification. Si vous lancez un Ollama ou un serveur de modèle sur une machine pour un projet, mettez-le derrière un mot de passe ou un réseau privé.
- **Un modèle de code local devient plausible.** Les modèles légers comme Flint (et la tendance qui va avec) peuvent servir pour du code sur des données sensibles qu'on ne veut pas envoyer à un tiers. À tester, sans croire les promesses sur parole.

## En entretien

**« Pourquoi une entreprise voudrait-elle utiliser Claude ou GPT via son cloud plutôt que via l'API du fournisseur ? »**

Surtout pour des raisons de gestion, pas de qualité. Le contrat, la facturation et les droits d'accès existent déjà : on réutilise les engagements de dépense, l'identité de l'entreprise et les validations de sécurité déjà passées. Le contrepoint : les fonctionnalités et les délais de sortie peuvent différer de l'API directe, donc je vérifie que ce dont j'ai besoin existe bien sur ce cloud avant de m'engager.

**« Comment concevez-vous une application pour ne pas dépendre d'un seul fournisseur de modèle ? »**

Je mets l'appel au modèle derrière une interface simple (un `generate(prompt)` par exemple), avec le fournisseur et le nom du modèle en configuration. Je garde mes prompts et mes tests d'évaluation dans le dépôt, pour pouvoir comparer deux modèles sur mes vrais cas avant de changer. Je ne cherche pas à tout abstraire : seulement la frontière avec le fournisseur, pas ses fonctions spécifiques.

**« Qu'est-ce que le LLMjacking, et comment s'en protéger ? »**

C'est le détournement d'un modèle d'IA exposé sur Internet par un tiers, pour s'en servir à ses frais : voler des identifiants, miner de la cryptomonnaie ou revendre l'accès. Le propriétaire paie le calcul. Se protéger, c'est la base : ne pas exposer de serveur de modèle sans authentification, restreindre l'accès par réseau, mettre des quotas et des alertes de consommation, et ne pas laisser traîner de clés.

## Pour aller plus loin

- [Claude Platform géré par Anthropic sur Google Cloud (Anthropic)](https://claude.com/resources/articles/claude-models-on-google-cloud-anthropic-managed)
- [Les modèles OpenAI sur Google Cloud (OpenAI)](https://openai.com/index/openai-models-google-cloud/)
- [Google Cloud apporte les modèles OpenAI à ses clients (Google Cloud)](https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-brings-openai-models-to-customers)
- [Claude Duet (Anthropic)](https://claude.com/resources/articles/claude-duet)
- [Claude Security analyse en continu et suit les correctifs (Anthropic)](https://claude.com/resources/articles/claude-security-now-scans-continuously-and-tracks-fixes)
- [MiniMax lance M3.1 Flash (Reuters)](https://www.reuters.com/world/asia-pacific/chinas-minimax-launches-updated-ai-model-m31-flash-2026-10-19/)
- [Recursive lance Flint, un modèle de code pour portable (TechCrunch)](https://techcrunch.com/2026/10/21/recursive-launches-flint-a-laptop-coding-model-it-says-was-largely-built-by-ai/)
- [LLMjacking : des agents détournent des modèles exposés (Help Net Security)](https://www.helpnetsecurity.com/2026/10/23/llmjacking-agent-hijacks-exposed-ai-models/)
