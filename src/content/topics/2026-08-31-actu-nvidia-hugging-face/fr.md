---
title: "Nvidia s'offre Hugging Face pour 12,9 milliards : le GitHub de l'IA change de mains"
date: "2026-08-31"
category: "Actu"
level: "Semaine 36"
summary: "Le 27 août, The Information révèle que Nvidia a accepté de racheter Hugging Face pour 12,9 Md$. Le hub de 13 millions de développeurs passerait chez le vendeur de puces. Plus : Amazon ferme Mechanical Turk après 21 ans, deux RCE critiques dans Next.js, résultats records de Nvidia à 96,2 Md$."
---

## La une

Le **jeudi 27 août**, The Information lâche l'info de la semaine : **Nvidia a accepté de racheter Hugging Face pour 12,9 milliards de dollars**. CNBC, Bloomberg, Fortune et Forbes reprennent dans la foulée. Précision importante, et c'est une leçon de lecture de presse tech en soi : **aucun accord n'est signé**. TechCrunch le rappelle noir sur blanc, le deal peut encore capoter, et ni Nvidia ni Hugging Face n'ont commenté. Tout repose sur « une personne ayant une connaissance directe des discussions ».

Pourquoi c'est énorme quand même ? Parce que Hugging Face n'est pas une startup IA parmi d'autres : c'est **le GitHub des modèles**. Plus de **13 millions de développeurs** y publient, téléchargent et testent des modèles open weight, des datasets et des Spaces. Si vous avez déjà fait un `from transformers import AutoModel`, vous êtes client. La dernière levée de fonds valorisait la société **4,5 milliards** (235 M$ levés en 2023) : Nvidia paierait presque **le triple**, et les discussions auraient démarré parce qu'un **autre acquéreur** s'était manifesté.

L'intérêt stratégique est limpide : Nvidia vend les puces, finance les datacenters de ses clients (le montage OpenAI/Ohio de la semaine 35), et s'offrirait maintenant **la place de marché où circulent les modèles**. De la sortie d'usine du GPU jusqu'au `model.safetensors` téléchargé par le développeur, toute la chaîne passerait par la même entreprise.

C'est exactement ce qui inquiète la communauté : Hugging Face devait sa position à sa **neutralité**. Le hub héberge les modèles de Meta, Google, Mistral, Qwen, DeepSeek, tous concurrents ou presque de Nvidia sur un maillon de la chaîne. Un hub possédé par le fournisseur de compute dominant, c'est la question du **conflit d'intérêts** posée à l'échelle de l'écosystème : les modèles optimisés CUDA seront-ils mieux mis en avant ? Les alternatives AMD ou les puces maison des clouds seront-elles traitées à égalité ?

> 🎤 **En entretien** : sachez dire ce qu'est Hugging Face en une phrase (« le hub où l'écosystème publie et consomme les modèles open weight, l'équivalent de GitHub ou npm pour l'IA ») et pourquoi ce rachat ferait débat (neutralité d'une infrastructure critique rachetée par le fournisseur dominant du compute). Et placez la nuance « annoncé par la presse, pas signé » : distinguer un fait établi d'une information rapportée, c'est précieux dans une équipe.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Mechanical Turk ferme le 30 septembre** après 21 ans | Amazon | Annoncé le 25 août. La place de marché de micro-tâches humaines (étiquetage, transcription, plus de 500 000 workers au pic), que Bezos appelait « artificial artificial intelligence », a étiqueté les datasets de toute l'ère du machine learning. SageMaker Ground Truth et Augmented AI ferment aussi : Amazon sort entièrement du marché de l'annotation, laissé à Scale AI, Mercor et Prolific |
| **Deux RCE critiques non authentifiées** corrigées en urgence | Next.js | Release avancée au 25 août (annoncée pour le 26 dans notre fiche de la semaine 35). Une faille dans **libheif**, utilisée par sharp pour l'optimisation d'images AVIF : une image piégée suffit, l'optimisation AVIF est désactivée en attendant le correctif amont. Et **CVE-2026-75604** : RCE sur les serveurs Next.js hébergés sous Windows. Correctifs : **16.3.3** et **15.5.24** |
| Résultats trimestriels records : **96,2 Md$** | Nvidia | Le 26 août : +106 % sur un an, dont **89 Md$ de datacenter** (+117 %), portés par Blackwell Ultra. Guidance à 108 Md$ pour le trimestre suivant, et Jensen Huang projette +70 % de croissance pour l'exercice 2028. L'action baisse quand même : le marché price déjà la perfection |
| Sa **puce d'inférence maison** battrait Blackwell en perf/watt | OpenAI | Selon des benchmarks rapportés le 26 août. Le plus gros client de Nvidia construit de quoi s'en passer pour l'inférence, pendant que Nvidia rachète le hub des modèles : chacun remonte la chaîne de valeur de l'autre |
| Accord jusqu'à **16,68 Md$** sur la protection des mineurs | Meta | Réglé avec 52 procureurs généraux américains, en plein procès : plafond de 2h par jour pour les moins de 18 ans, blocage nocturne, vérification d'âge renforcée, auditeur indépendant. Le design addictif devient un risque juridique chiffré en milliards |

## Pourquoi ça vous concerne

- **Hugging Face est probablement déjà dans votre stack.** `transformers`, `datasets`, un modèle d'embedding téléchargé du hub : c'est une dépendance d'infrastructure, comme npm ou PyPI. Le réflexe pro n'est pas de paniquer, c'est de **connaître ses dépendances** : quels modèles votre projet télécharge, sous quelle licence, et que se passerait-il si les conditions du hub changeaient. Pour un modèle critique en production, un miroir interne se justifie.
- **« Rapporté » n'est pas « signé ».** Cette semaine, la moitié des titres disent « Nvidia rachète », l'autre « serait en discussions ». Remontez à la source primaire (dépôt SEC, communiqué, blog officiel) avant de citer un fait en entretien ou de prendre une décision technique dessus.
- **Mettez à jour Next.js maintenant.** Une RCE non authentifiée via une image AVIF piégée, c'est le pire scénario : la faille n'est même pas dans Next.js mais dans libheif, deux étages plus bas dans la chaîne de dépendances (Next.js → sharp → libheif). Votre surface d'attaque inclut les dépendances de vos dépendances.
- **La fin de MTurk raconte où va le travail de la donnée.** Le micro-étiquetage à 2 centimes la tâche est mort, absorbé par les modèles eux-mêmes. Ce qui reste et paie : l'annotation experte, l'évaluation de réponses de modèles, le RLHF. La qualité des données est un vrai sujet de stage ML, pas une corvée.
- **Suivez l'argent pour cibler vos candidatures.** 89 Md$ de datacenter en un trimestre chez Nvidia : l'infrastructure IA embauche. Et l'ironie OpenAI/Nvidia (le client fait des puces, le fournisseur achète le hub de modèles) montre que les frontières bougent : les compétences transverses (systèmes, réseau, optimisation) restent les plus portables.

## En entretien

**« C'est quoi Hugging Face, concrètement ? »**

Trois briques. Le **hub** : un dépôt géant de modèles, datasets et démos (Spaces), versionné avec git, où Meta, Google, Mistral ou DeepSeek publient leurs modèles ouverts. Les **bibliothèques** : `transformers`, `datasets`, `tokenizers`, devenues l'interface standard pour charger et exécuter un modèle en Python. Et une **communauté** de plus de 13 millions de développeurs. C'est l'équivalent de GitHub ou npm pour l'IA : pas indispensable en théorie, incontournable en pratique. D'où l'émotion quand le fournisseur de puces dominant veut le racheter.

**« Une faille critique est publiée dans une dépendance de votre framework. Vous faites quoi ? »**

D'abord évaluer l'exposition : suis-je concerné (version, plateforme, fonctionnalité activée) ? Pour la faille AVIF de cette semaine : est-ce que mon app optimise des images fournies par les utilisateurs ? Ensuite corriger vite avec la version patchée, ou couper la fonctionnalité si le patch n'existe pas encore (c'est ce que fait Next.js : AVIF désactivé en attendant libheif). Enfin vérifier en profondeur : un `npm audit` ou équivalent, car la faille est souvent dans une dépendance transitive que vous n'avez jamais installée consciemment. Bonus : citer le vrai exemple Next.js → sharp → libheif montre que vous suivez l'actu.

**« L'IA a-t-elle encore besoin d'humains dans la boucle ? »**

Oui, mais plus les mêmes. La fermeture de Mechanical Turk le 30 septembre 2026 marque la fin du micro-étiquetage de masse : classifier une image ou transcrire 10 secondes d'audio, les modèles le font. Le travail humain s'est déplacé vers le haut : annotation par des experts du domaine (médecine, droit, code), évaluation comparative de réponses, RLHF. Les startups qui recrutent ces experts (Scale AI, Mercor, Prolific) ont remplacé MTurk. La bonne réponse en entretien tient en une phrase : l'humain est passé de la production de données brutes au contrôle qualité du raisonnement.

## Pour aller plus loin

- [Nvidia agrees to buy Hugging Face for $12.9 billion, report says (CNBC)](https://www.cnbc.com/2026/08/27/nvidia-hugging-face-acquisition.html)
- [Nvidia closes in on Hugging Face acquisition, avec les réserves d'usage (TechCrunch)](https://techcrunch.com/2026/08/26/nvidia-closes-in-on-hugging-face-acquisition/)
- [Amazon ferme le service que Bezos appelait « artificial artificial intelligence » (CNBC)](https://www.cnbc.com/2026/08/25/amazon-service-that-jeff-bezos-called-artificial-ai-is-shutting-down.html)
- [MTurk, SageMaker Ground Truth et Augmented AI ferment le 30 septembre (TechTimes)](https://www.techtimes.com/articles/325645/20260826/amazon-mechanical-turk-will-close-september-30-shutting-down-sagemaker-ground-truth-too.htm)
- [August 2026 Security Release : le détail des deux failles (blog Next.js)](https://nextjs.org/blog/august-2026-security-release)
- [Next.js Patches Critical AVIF and Windows Flaws Enabling Unauthenticated RCE (The Hacker News)](https://thehackernews.com/2026/08/nextjs-patches-critical-avif-and.html)
- [Nvidia : 96,2 Md$ de chiffre d'affaires au T2 fiscal 2027 (communiqué officiel)](https://www.globenewswire.com/news-release/2026/08/26/3351702/0/en/nvidia-announces-financial-results-for-second-quarter-fiscal-2027.html)
