---
description: Génère des questions de quiz (QCM) sur un sujet donné, au format prêt à coller dans le textarea d'import de l'app FlashCard.
user-invocable: true
---

# Skill : Créer des questions FlashCard

L'utilisateur te donne un **sujet** (et éventuellement un nombre de questions). Tu dois générer des questions au format d'import de l'application.

## Source des informations

- **Ne jamais inventer** de faits, dates, citations ou attributions. Chaque information dans une question ou une explication doit être **vérifiable**.
- **Privilégier le vault Obsidian** comme source principale : lis les notes du vault liées au sujet demandé avant de générer les questions. Les notes de l'utilisateur sont la source la plus fiable et la plus pertinente.
- Si le vault ne contient pas assez de matière, tu peux **chercher sur internet** (WebSearch / WebFetch), mais uniquement des informations dont tu es **certain de la source**. En cas de doute, ne pas inclure l'information.
- Si tu n'es pas sûr d'un fait, **ne l'utilise pas**. Mieux vaut moins de questions que des questions fausses.

## Format de sortie

Une question par ligne, champs séparés par `::`, propositions séparées par `$$` :

```
Question :: Proposition1$$Proposition2$$Proposition3 :: Réponse correcte :: Explication
```

## Règles

1. **3 propositions** par question (sauf demande contraire).
2. La **réponse** doit être l'une des propositions, recopiée exactement.
3. L'**explication** doit être **riche, complète et captivante**. Elle ne se limite PAS à reformuler la réponse. Elle doit :
   - Donner le **contexte historique, intellectuel ou scientifique** nécessaire pour comprendre pourquoi c'est la bonne réponse.
   - Expliquer **pourquoi les autres propositions sont fausses** (ou ce qu'elles désignent réellement).
   - Ajouter une **anecdote, un lien surprenant, ou un détail mémorable** qui donne envie de lire jusqu'au bout.
   - Être suffisamment détaillée pour que le lecteur **apprenne réellement quelque chose** en la lisant, même s'il connaissait déjà la réponse.
   - La longueur n'est PAS un problème : 5-15 phrases sont bienvenues si le contenu est pertinent et intéressant.
4. Les propositions fausses doivent être **plausibles** (pas de réponses absurdes évidentes).
5. Pas d'émojis sauf demande explicite.
6. Par défaut, génère **5 questions**. L'utilisateur peut en demander plus ou moins.
7. Entoure le bloc de sortie dans un code block pour faciliter le copier-coller.
8. **Questions inversées** : une fois toutes les questions générées, **reformule chaque question sous un angle différent** pour créer des questions supplémentaires. L'objectif est de tester la même connaissance mais en inversant ce qui est demandé.
   - Exemple original : « Qu'est-ce qui s'est passé en France en 1789 ? » → Réponse : La Révolution française
   - Question inversée : « En quelle année a éclaté la Révolution française ? » → Réponse : 1789
   - Autre inversion possible : « Dans quel pays la Révolution de 1789 a-t-elle eu lieu ? » → Réponse : La France
   - Chaque question inversée suit le même format (propositions plausibles, explication riche).
   - Il n'est pas obligatoire de trouver une inversion pour chaque question — seulement quand c'est pertinent et que ça teste réellement un autre aspect de la connaissance.
   - Résultat : si l'utilisateur demande 10 questions, il en obtiendra **bien plus** (les originales + les inversées).

## Exemple

Si l'utilisateur demande : `/create-questions Philosophie du sacré`

````
```
Quel concept Rudolf Otto introduit-il pour décrire l'expérience fondamentale du sacré ? :: Le karma$$Le numineux$$La catharsis :: Le numineux :: En 1917, le théologien allemand Rudolf Otto publie Das Heilige (Le Sacré), un ouvrage qui va révolutionner l'étude des religions. Il y forge le terme « numineux » (du latin numen, puissance divine) pour désigner une expérience irréductible à la morale ou à la raison : le mysterium tremendum et fascinans — un mélange de terreur sacrée et de fascination irrésistible face à ce qui nous dépasse totalement. Le karma, lui, est un concept indien de rétribution des actes qui n'a rien à voir avec la phénoménologie du sacré d'Otto. La catharsis est un terme aristotélicien désignant la purification des émotions par le théâtre tragique. Ce qui rend Otto si important, c'est qu'il montre que le sacré n'est pas d'abord une idée mais une expérience vécue, un frisson existentiel que même un athée peut reconnaître.
Quel penseur distingue le sacré du profane comme deux modes d'être dans le monde ? :: Mircea Eliade$$Claude Lévi-Strauss$$Max Weber :: Mircea Eliade :: Mircea Eliade (1907-1986), historien des religions d'origine roumaine, est l'auteur de Le Sacré et le Profane (1957), où il défend l'idée que l'humanité se divise entre deux façons radicalement différentes d'habiter le monde. Pour l'homo religiosus, l'espace n'est pas homogène : certains lieux (une montagne, un temple, un carrefour) sont des points de rupture où le sacré fait irruption — ce qu'Eliade appelle des hiérophanies. Lévi-Strauss, lui, s'intéresse aux structures inconscientes de la pensée mythique (les oppositions binaires nature/culture), pas à l'expérience vécue du sacré. Weber, sociologue allemand, analyse la rationalisation des sociétés, pas la phénoménologie religieuse. Ce qui est fascinant chez Eliade, c'est que même dans nos sociétés sécularisées, nous conservons des comportements « sacrés » : pensez à la façon dont on traite un drapeau national ou un lieu de mémoire.
Que désigne le terme « hiérophanie » chez Eliade ? :: Une prière rituelle$$Une manifestation du sacré$$Un texte sacré :: Une manifestation du sacré :: Le mot hiérophanie vient du grec hieros (sacré) et phainein (montrer, se manifester). Pour Eliade, c'est le phénomène le plus fondamental de l'histoire religieuse : n'importe quel objet du monde profane — une pierre, un arbre, une source — peut devenir le véhicule d'une manifestation du sacré, sans cesser pour autant d'être une pierre ou un arbre. C'est ce paradoxe qui est au cœur du concept : le sacré se montre à travers le profane. Une prière rituelle est un acte humain dirigé vers le divin, pas une irruption du divin dans le monde. Un texte sacré (Bible, Coran) peut être le support d'une hiérophanie, mais il n'en est pas synonyme. Le concept est volontairement très large : Eliade l'utilise pour englober aussi bien le buisson ardent de Moïse que le culte d'une pierre sacrée en Australie aborigène, montrant une structure commune à toutes les religions.
Quel philosophe allemand a formulé le concept d'« Âge Axial » en 1949 ? :: Mircea Eliade$$Karl Jaspers$$Max Weber :: Karl Jaspers :: Karl Jaspers (1883-1969), psychiatre devenu philosophe, propose dans Vom Ursprung und Ziel der Geschichte (Origine et sens de l'histoire, 1949) une idée vertigineuse : entre 800 et 200 av. J.-C., de façon apparemment indépendante, une révolution spirituelle simultanée a lieu en Grèce (Socrate, Platon), en Inde (Bouddha, Upanishads), en Chine (Confucius, Lao-Tseu) et en Israël (les prophètes). C'est durant cette période que l'humanité commence à réfléchir sur elle-même, à poser des questions universelles sur le sens de l'existence. Eliade, bien que contemporain, travaille sur les structures du sacré et non sur cette périodisation. Weber s'intéresse à la sociologie de la modernité. Ce qui rend l'Âge Axial si débattu encore aujourd'hui, c'est la question irrésolue : pourquoi cette convergence ? Coïncidence, diffusion culturelle, ou stade nécessaire du développement humain ?
Quel sociologue a théorisé le « désenchantement du monde » ? :: Émile Durkheim$$Max Weber$$Georg Simmel :: Max Weber :: Max Weber (1864-1920) utilise l'expression Entzauberung der Welt (littéralement « dé-magification du monde ») pour décrire un processus historique de longue durée : la rationalisation progressive des sociétés occidentales, qui remplace les explications magiques et religieuses par le calcul, la science et la bureaucratie. Pour Weber, ce processus commence paradoxalement avec le monothéisme juif lui-même, qui en chassant la magie prépare le terrain à la rationalité moderne. Durkheim, l'autre géant de la sociologie des religions, s'intéresse plutôt à la fonction sociale du sacré (Les Formes élémentaires de la vie religieuse, 1912) : pour lui, quand une société adore un dieu, elle s'adore elle-même. Simmel, plus marginal, explore la religiosité comme forme d'interaction sociale. Ce qui est frappant, c'est que Weber ne célèbre pas ce désenchantement : il y voit une « cage d'acier » où l'efficacité a remplacé le sens, un diagnostic qui résonne étrangement avec notre époque.
```
````
