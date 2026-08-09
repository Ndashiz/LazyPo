# Knowledge Quiz — Documentation

> Entraîneur de vocabulaire **EN→FR** et **NL→FR**, **grammaire néerlandaise** (23 chapitres) et verbes irréguliers, avec répétition espacée, gamification XP, et fil multijoueur.
>
> Le module est aussi **embarqué en iframe dans Jarvis** (`jarvis.ndashiz.be`) — voir §13.

---

## 1. Fichiers

| Fichier | Rôle |
|---------|------|
| `quiz.html` (~332 KB) | SPA complète : UI, logique, styles, état, **et les 23 chapitres de grammaire** (données inline). C'est le cœur de la feature. |
| `worker/src/worker.js` | Worker Cloudflare — sécurité/CSP. ⚠️ `/pro/quiz.html` est **explicitement public** (voir §9). |
| `session.js` | Détection d'activité / déconnexion après 2h d'inactivité. |
| `demo.js` | Génération de données de démo. |
| `vocab_import_onboarding.js` | Flux de premier import avec détection de doublons. |
| `vocab_duplicate_modal.js` | UI de détection de doublons de vocabulaire. |
| `feedback_modal.js` | Soumission de feedback. |
| `auth.js` | Enregistrement / permissions des modules (quiz = module autorisé par défaut). |
| `sidebar.js` | Navigation (lien vers quiz.html). |
| `apis.js` | Registre des APIs (Supabase = backend principal). |

Dépendances chargées par `quiz.html` : `session.js`, `demo.js`, `vocab_import_onboarding.js`, `vocab_duplicate_modal.js`, lib `XLSX.js`, API Pravatar (avatars).

---

## 2. Vue d'ensemble

Le Knowledge Quiz est un entraîneur bilingue avec **5 onglets** dans `quiz.html` :

1. **🧠 Quiz** — moteur de quiz à répétition espacée (SM-2).
2. **📚 Vocabulary** — gestion du vocabulaire perso + mots système, import/export Excel.
3. **📊 Progress** — stats, heatmap, graphiques, détail XP.
4. **🌍 Multi** — fil social, classement, Challenge Back, réactions.
5. **📖 Grammaire** — 23 chapitres de grammaire NL : théorie + exercices notés (voir §12).

Les **verbes irréguliers NL** ne sont plus un onglet : ils sont devenus le chapitre 23 du module Grammaire (`isVerbesModule` → `grShowVerbesEmbed()`), qui réutilise l'entraîneur de conjugaison existant.

Caractéristiques clés : répétition espacée adaptative, fil multijoueur avec Challenge Back, gamification XP + streak, classement all-time, import/export Excel, partage de vocabulaire entre utilisateurs, cours de grammaire noté.

---

## 3. Modèle de données

### Tables Supabase

**`vocabulary`** — le vocabulaire
- `id`, `user_id` (RLS : propre uniquement)
- `source_word` (anglais ou néerlandais), `target_translation` (français)
- `language_pair` ('EN→FR' ou 'NL→FR', legacy 'nl-fr')
- `example_sentence`, `tips` (optionnels)
- `is_system` (bool) — marque le vocabulaire fourni par le système
- `flagged_at`, `flag_reason`, `flag_note` — signalement d'une mauvaise question depuis l'Error Review (voir §7bis). `flag_reason` ∈ `wrong_translation` | `typo` | `bad_example` | `other`. Colonnes portées par la ligne elle-même : **un seul flag actif par mot, pas d'historique**.
- RLS `own_vocabulary` — couvre déjà les colonnes de flag, pas de policy supplémentaire

**`quiz_progress`** — répétition espacée SM-2
- `word_id`, `correct`, `attempts`, `last_tested`
- `ease_factor` (défaut 2.5, plafonné), `interval_days` (défaut 1)
- `recent` (jsonb, 10 dernières réponses 1/0 — fenêtre glissante de maîtrise, migration `quiz_progress_recent.sql`)
- unique `(user_id, word_id)`, RLS `own_progress`

**`quiz_sessions`** — fil social / multi
- `display_name`, `avatar_url`, `score`, `total`, `duration_sec`
- `mode` ('vocab' | 'verbes' | **'grammar'**), `lang`, `direction` ('forward' | 'reverse' | 'auto')
- `theme` — pour les sessions grammaire, l'id du chapitre (`lang` porte la même valeur)
- `words` (jsonb) — snapshot des mots joués → permet le Challenge Back **cross-user** (les IDs diffèrent d'un user à l'autre)
- `word_ids` (jsonb, déprécié au profit de `words`)

**`quiz_session_comments`** — commentaires sous chaque session (sert aussi à publier le résultat d'un Challenge Back).

**`quiz_session_reactions`** — réactions emoji `fire` / `muscle` / `clap`, clé `(session_id, user_id, type)`.

**`user_xp`** — XP & streak
- `total_xp` (cumul, jamais décrémenté), `current_streak_days`, `last_active_date`
- `last_reconciled_date`, `today_new_words`, `awarded_streak_milestones` (int[]), `mastered_word_ids` (uuid[])
- `mastered_module_ids` (text[]) — chapitres de grammaire déjà récompensés (anti double-crédit)

**`grammar_progress`** — progression par chapitre de grammaire
- clé `(user_id, module_id)` (upsert `onConflict: 'user_id,module_id'`)
- `attempts`, `best_score`, `last_tested`
- `scores_history` (int[]) — **10 derniers scores en %**, fenêtre glissante
- `status` — `'todo'` | `'in_progress'` | `'mastered'` ; **maîtrisé dès que la moyenne des scores de la fenêtre ≥ 80 %**

**`xp_daily_log`** — historique XP par jour
- `(user_id, date)`, `xp_earned`, `breakdown` (jsonb par règle) → alimente la heatmap.

**`vocab_shares`** — partage de vocabulaire entre utilisateurs
- `sender_id`, `recipient_id`, `payload` (jsonb `{v, words:[{s,t,l,e?,p?}]}`), `status` ('pending'|'accepted'|'declined')

**`profiles`** — `username`, `avatar_url` (affichage classement & fil).

### localStorage

| Clé | Contenu |
|-----|---------|
| `lazypo_quiz_log` | Array `{date, words, correct, durationSec}` — calcul de streak local (fallback 28 j si `xp_daily_log` indispo). |
| `lazypo_verbs_progress` | Progression verbes NL `{verbId: {correct, attempts, …}}`. |
| `lazypo_new_intro` | `{date, count}` — nouveaux mots introduits aujourd'hui (plafond SRS 15/jour, par device). |
| `lazypo:lastActivity` | Timestamp d'activité (timeout de session). |

---

## 4. Sources des questions

1. **Vocabulaire système** (`is_system: true`) — 1000+ mots néerlandais (`dutch_vocabulary.sql`), catégories : nombres, jours, mois, saisons, couleurs, corps, famille, nourriture, animaux, nature, maison, vêtements, transport, école/travail, santé, sports, technologie. Lisible par tous via RLS.
2. **Vocabulaire utilisateur** (`is_system: false`) — ajout manuel EN/NL → FR, détection de doublon sur `(source_word, language_pair)`.
3. **Construction du quiz** (`buildQuizQueue()`) — filtre par paire de langue, système/user, taux de réussite ; option « mots ratés / fragiles » ; shuffle aléatoire ; direction forward / reverse / auto (50/50).

> **Pas d'intégration IA/LLM.** Les questions viennent du vocabulaire pré-chargé (SQL) et des traductions saisies par l'utilisateur. Aucune génération ni correction par LLM.

---

## 5. Scoring, répétition espacée & XP

### Répétition espacée (SM-2) — `recordAnswer()` + `buildQuizQueue()`
- Correct : `correct++`, `ease_factor += 0.1` (**plafonné à 2.5**), `interval_days × ease_factor`.
- Incorrect : `ease_factor = max(1.3, ease_factor − 0.2)`, `interval_days` revient à 1.
- **File SRS réelle** : `buildQuizQueue()` priorise (1) les mots **dus** (`last_tested + interval_days` dépassé, les plus fragiles d'abord), puis (2) les **nouveaux** mots (max 15/jour, compteur localStorage `lazypo_new_intro`), puis (3) les mots vus non dus en remplissage.
- Bannière « 🔔 N mots à réviser aujourd'hui » sur l'écran de setup (`#due-banner`).
- **Fenêtre glissante** : colonne `quiz_progress.recent` (jsonb, 10 dernières réponses 1/0 — migration `quiz_progress_recent.sql`). La maîtrise (≥80 %), les mots fragiles (<60 %) et l'XP de maîtrise se calculent sur cette fenêtre dès ≥3 réponses (`wordRate()`), sinon fallback ratio lifetime. Rétro-compatible si la migration n'est pas appliquée.

### Correction des réponses — `checkAnswer()`
- Exact (insensible à la casse) → ✓ Correct. Alternatives séparées par `" / "`.
- **« Accepté »** : accents ignorés + article initial ignoré (le/la/les/l'/un/une/des · de/het/een · the/a/an) via `normalizeAnswer()` — la forme exacte est rappelée dans le feedback.
- **« Proche »** : 1 typo (distance Damerau-Levenshtein = 1, transpositions incluses : « chein » → « chien »).

### Phrases à trous (cloze) — `buildClozeItem()`
- Option « 🧩 Mix (~1/3) » sur l'écran de setup (`#cloze-pills`, défaut : off).
- Quand la phrase d'exemple contient le mot source, ~1 question sur 3 devient un texte à trou : la phrase avec `_____`, la traduction affichée en indice, réponse = la forme réelle dans la phrase.
- La review des erreurs affiche la phrase à trou et le mot attendu (direction `cloze`).

### Règles XP (réconciliation 1×/jour UTC — `runXpReconciliation()`)

| Règle | XP | Déclencheur |
|-------|----|-------------|
| Paliers de streak | 30 × (jour/5) | Tous les 5 jours consécutifs (5→30, 10→60…) |
| 5 mots/jour | 25 | ≥5 nouveaux mots ajoutés aujourd'hui |
| Quiz parfait | 20 / session | 100 % à un quiz |
| Quiz long | 15 / session | ≥20 questions dans une session |
| Maîtrise d'un mot | 10 / mot (cap 50/j) | Taux ≥80 % (≥3 tentatives) |
| Récupération | 15 / mot | Mot faible repassé >75 % |
| Diversité modes | 10 | Joué 'vocab' ET ('verbes' OU **'grammar'**) aujourd'hui |
| Diversité directions | 10 | Forward ET reverse (vocab) aujourd'hui |
| 1er commentaire social | 5 | 1er commentaire sur la session d'un autre |
| **Maîtrise d'un chapitre** | **40 / chapitre** | Chapitre de grammaire passé en `mastered` — **hors réconciliation**, crédité immédiatement (voir ci-dessous) |

Sources de vérité : `user_xp.total_xp` (cumul) et `xp_daily_log` (détail par jour).

> ⚠️ La maîtrise d'un chapitre de grammaire est le **seul XP attribué en direct** (`grAwardMasteryXp()` : `UPDATE user_xp` immédiat), pas via `runXpReconciliation()`. Il n'apparaît donc **pas** dans `xp_daily_log` et ne remonte pas dans la heatmap ni dans le détail XP par jour — seulement dans `total_xp`. L'anti-double-crédit repose sur `user_xp.mastered_module_ids`.

### Classement
- All-time par `total_xp`, départage par % moyen (`totalScore/totalPossible`).
- Top 5 affiché ; user courant affiché à part si hors top 5.

### Streak
- `user_xp.current_streak_days` ; reset si pas de quiz le jour même / consécutif. Fallback `computeStreak()` depuis `lazypo_quiz_log`.

---

## 6. Multijoueur & Challenge Back

### Fil social
- Paginé (20 sessions/page, lazy load), tri par date.
- Affiche nom, avatar, score/%, mode, ancienneté, nb commentaires.
- Réactions 🔥 / 💪 / 👏, commentaires imbriqués.
- Bouton Challenge Back visible si le snapshot `words` existe.

### Flux Challenge Back
1. Le quiz est rempli avec les **mots exacts** joués par l'autre user (cross-user safe via `words`).
2. L'utilisateur rejoue le même défi.
3. Résultats côte à côte « Moi » vs joueur d'origine → verdict Victoire 🏆 / Défaite / Égalité.
4. Option : publier le résultat en commentaire sur la session d'origine.
5. Option : ajouter les mots joués à son propre vocabulaire.

Implémentation : `launchChallengeQuiz(wordSnapshots, wordIdsFallback, originalMeta)` règle `challengeContext`. Fallback (sessions pré-snapshot) : recherche des IDs dans le vocab courant. La session de challenge n'est pas auto-postée (publication manuelle).

### Démo (admin only)
- `loadMultiDemoFeed()` génère 100 fausses sessions (noms, scores, réactions, commentaires). Challenge Back désactivé en démo.

---

## 7. Flux UI/UX

**Setup quiz** : paire de langue → direction → nombre de questions (5/10/20/50) → filtres (système, ratés/fragiles) → Start.

**Quiz actif** : timer 30 s par question, exemple + tip optionnels, saisie + Enter/Check, feedback ✅/❌, auto-advance, compteur de streak.

**Fin de session** : Review des erreurs (si présentes) → résumé (score, %, temps, badge streak) → panneau d'ajout (si Challenge Back) → auto-post au fil (sauf mode Challenge).

**Vocabulary** : formulaire d'ajout rapide, import/export Excel, actions bulk, table triable (n°, mot, traduction, langue, taux, niveau), filtres.

> **Colonne `#`** — numéro **permanent** du mot, calculé par `computeVocabNumbers()` comme son
> rang de création (le plus ancien = 1), pas comme sa position dans la liste affichée. Trier,
> filtrer ou ajouter un mot ne renumérote rien : un nouveau mot prend le numéro suivant. C'est
> ce qui permet de noter où on s'est arrêté et de le retrouver. Départage des ex æquo par `id`,
> sinon un import en masse (même `created_at` sur 1000 lignes) donnerait un ordre différent à
> chaque requête. Supprimer un mot décale les suivants — seul cas où un numéro bouge.

**Progress** : carte streak, stats (mots totaux, maîtrisés, taux), donut système/user, barres EN↔NL, heatmap 28 jours.

**Multi** : classement (top 5 + user), fil scroll infini, réactions, Challenge Back, commentaires.

---

## 7bis. Corriger ou flagger un mot depuis l'Error Review

Deux gestes disponibles **uniquement sur l'écran Error Review** (`#quiz-review`), pas sur le
feedback immédiat pendant le quiz. Ils répondent au même moment de doute — « cette correction est
fausse » — selon qu'on sait ou non par quoi la remplacer : **corriger** quand on sait, **flagger**
quand on ne sait pas.

| Geste | Bouton | Écrit |
|---|---|---|
| Corriger le mot | ✏️ Fix this word | `source_word`, `target_translation`, `example_sentence` |
| Signaler la question | 🚩 Flag | `flagged_at`, `flag_reason`, `flag_note` |

### Ce qui ne bouge pas

- **Le score n'est jamais recalculé.** Corriger un mot met à jour le vocabulaire pour les
  prochaines sessions ; la réponse reste comptée fausse et `quiz_progress` n'est pas retouché. Le
  toast le dit explicitement.
- **Le flag ne touche ni au score ni au SRS**, et n'exclut pas le mot du tirage.
- `reviewIndex` ne bouge pas : les panneaux se déplient **en place**, sous la comparaison
  ❌/✅. Jamais de modale — l'écran tourne en iframe chez Jarvis, une modale centrée sur le
  viewport se placerait de travers.

### Contraintes d'implémentation

- **`reviewSaveWord(id, patch)`, pas `updateWord()`** : cette dernière enchaîne `loadVocab()`
  (repagination complète du vocabulaire) puis `renderVocab()` sur un onglet caché. En pleine
  review c'est un aller-retour réseau inutile. `reviewSaveWord` pose `vocabDirty = true` et
  `flushVocabDirty()` recharge **une seule fois**, plus tard : au retour sur l'onglet vocabulaire
  ou dans `showSummary()`.
- **Mutation en place**, jamais de réassignation : `vocab[]`, `quizQueue[].word`,
  `reviewQueue[].word` et `sessionAnswers[].word` pointent vers le même objet. Un `Object.assign`
  les met tous à jour d'un coup ; réassigner en laisserait la moitié périmés.
- **`.select()` obligatoire après l'`update`** : sans lui, un refus RLS (0 ligne, 0 erreur)
  ressemble à un succès. Le garde 0-ligne renvoie le toast
  « Modification bloquée — vérifie les RLS policies Supabase ».
- **`word.id` peut être `null`** (Challenge Back : snapshot cross-user). Les deux boutons sont
  alors masqués, pas désactivés.
- **Clavier** : `Enter` enregistre, `Escape` annule. `stopPropagation()` sur les champs pour qu'un
  `Enter` en pleine correction ne puisse jamais faire avancer le quiz.
- **Mode `cloze`** : la phrase à trou est figée sur la réponse au moment du tirage. Après édition
  de l'exemple elle est reconstruite via `buildClozeItem()`, sinon l'écran afficherait l'ancienne.
- **Migration pas encore passée** : l'erreur Supabase sur colonne inconnue produit le toast
  « Flag indisponible — la migration SQL n'est pas encore passée », pas une exception.

### Retrouver un mot flaggé

Un badge 🚩 s'affiche sur la ligne dans l'onglet Vocabulary (titre = motif + note), et le groupe
de pilules **🚩 Flagged** filtre la liste. Sans ça le flag serait un trou noir : posé une fois,
jamais revu.

Re-cliquer sur **🚩 Flagged** rouvre le panneau prérempli avec `Update flag` et `Remove flag` —
confirmation par second clic, jamais de `confirm()` (on est en iframe).

---

## 8. État & fonctions clés

```javascript
let vocab = []              // vocabulaire user + système
let progress = {}           // { wordId → {correct, attempts, ease_factor, …} }
let currentUser = null
let quizQueue = []          // items du quiz courant
let quizIndex = 0
let quizMode = 'auto'       // forward | reverse | auto
let sessionAnswers = []     // { word, correct, skipped, givenAnswer, direction }
let challengeContext = null // défini quand Challenge Back actif
let quizTimer = null        // intervalle du compte à rebours 30 s
let vocabDirty = false      // mot corrigé/flaggé en review → recharger plus tard (§7bis)
```

| Fonction | Rôle |
|----------|------|
| `startQuizTimer()` | Compte à rebours 30 s, skip auto à 0. |
| `showQuestion()` | Rendu de la question courante. |
| `checkAnswer()` | Validation, enregistrement, mise à jour SM-2. |
| `advanceQuiz()` | Question suivante ou fin de session. |
| `endSession()` | Stats, post au fil, review/résumé. |
| `buildQuizQueue()` | Filtre + shuffle du vocabulaire. |
| `recordAnswer(wordId, isCorrect)` | Upsert `quiz_progress` (logique SM-2). |
| `reviewSaveWord(id, patch)` | Écriture ciblée depuis l'Error Review — mute le mot en place, marque `vocabDirty`, **ne recharge pas** le vocabulaire (§7bis). |
| `flushVocabDirty()` | Repagination différée, une seule fois, hors review. |
| `postMultiSession()` | INSERT dans `quiz_sessions`. |
| `launchChallengeQuiz()` | Mise en place du Challenge Back. |
| `publishChallengeResult()` | Publie le score en commentaire. |
| `runXpReconciliation()` | Évaluation/attribution XP quotidienne. |
| `multiLoadFeed()` | Fetch paginé du fil + hydratation réactions. |
| `multiLoadLeaderboard()` | Agrégation `user_xp` + `quiz_sessions`. |
| `grLoadProgress(userId)` | Charge `grammar_progress` dans `grProgress{}`. |
| `grSaveProgress(moduleId, correct, total)` | Upsert progression, calcule `status`/`trend`, poste la session, déclenche l'XP. |
| `grCheck(input, expected)` | Correction grammaire (normalisation stricte, alternatives `/`). |
| `grAwardMasteryXp(moduleId)` | +40 XP à la 1re maîtrise d'un chapitre. |

### Import/Export Excel
- **Export** (`XLSX.js`) : colonnes source, target, langue, exemples, tips, correct, attempts, ease_factor, last_tested.
- **Import** : lecture .xlsx, détection de doublons (insensible à la casse sur `(source_word, language_pair)`), upsert vocabulary + quiz_progress.

---

## 9. Authentification & permissions

> ⚠️ **`/pro/quiz.html` n'est plus gardé par le Worker.** La page est listée dans `PUBLIC_PAGES` (`worker/src/worker.js`) et servie **sans** vérification de JWT.
>
> Raison : la page est encadrée en iframe par Jarvis, qui peut ne pas porter le cookie au premier chargement. Un 302 aurait navigué **l'iframe** vers `login.html`. Le HTML part donc ungated et `quiz.html` applique sa propre garde en place (§13).
>
> **Conséquence** : ne jamais mettre de donnée sensible dans le markup de `quiz.html`. La vraie frontière est la **RLS Supabase**, pas le Worker.

- Le Worker continue d'injecter les en-têtes de sécurité + la CSP sur la réponse (dont `frame-ancestors 'self' https://jarvis.ndashiz.be`).
- Module `quiz` dans `allowed_modules` (défaut pour nouveaux users).
- Supabase Auth (email/mot de passe ou OAuth). RLS : chaque user ne lit/écrit que ses propres données.
- Toutes les libs sont **vendorisées** (`supabase.min.js`, `xlsx.min.js`…) : la CSP est `script-src 'self'`, un CDN serait bloqué en prod.

---

## 10. Performance & cache

- Cache du fil multi : TTL ~2 min (refresh manuel pour invalider).
- Pagination : 20 sessions/page.
- Chargement du vocabulaire : paginé au-delà de la limite 1000 lignes Supabase.
- Démo : bypass de la DB, données en mémoire.

---

## 11. Architecture

```
quiz.html (SPA, vanilla JS, CSS variables, sans framework)
 ├─ 5 onglets : Quiz | Vocab | Progress | Multi | Grammaire
 │                                                └─ ch.23 → entraîneur verbes NL
 ├─ État : vocab[], progress{}, grProgress{}, session
 └─ Intégrations : Supabase, XLSX.js, Pravatar
        │
Supabase ── Auth · 10 tables + RLS · Storage (avatars)
        │
Cloudflare Worker ── CSP + headers · quiz.html NON gardé (PUBLIC_PAGES)
        │
        └─ embed : <iframe> depuis jarvis.ndashiz.be (same-site, cross-origin)
                   session Supabase dédiée `sb-lazypo-embed-auth-token`
```

---

## 12. Module Grammaire

Onglet **📖 Grammaire** — cours de néerlandais noté, entièrement inline dans `quiz.html` (`var TOPICS = [...]`, ~900 lignes de données).

### Structure

23 chapitres, chacun `{ id, title, subtitle, theory (HTML), exercises: [{p, a, h?}] }` :

| # | Chapitre | # | Chapitre |
|---|----------|---|----------|
| 1 | Pluriel des noms | 13 | Conditionnel passé (VVTkT) |
| 2 | Pronoms personnels | 14 | La phrase simple |
| 3 | L'adjectif (règle du -e) | 15 | La négation (niet vs geen) |
| 4 | Degrés de comparaison | 16 | La phrase complexe |
| 5 | Hebben & Zijn | 17 | La proposition relative |
| 6 | Présent (OTT) | 18 | La proposition infinitive |
| 7 | Prétérit (OVT) | 19 | Kunnen |
| 8 | Passé composé (VTT) | 20 | Moeten |
| 9 | Plus-que-parfait | 21 | Phrases interrogatives |
| 10 | Futur simple (OTkT) | 22 | Prépositions |
| 11 | Futur antérieur (VTkT) | 23 | **Verbes irréguliers** (embarque l'entraîneur de conjugaison) |
| 12 | Conditionnel présent (OVkT) | | |

Les 22 premières théories sont alignées sur le PDF du cours (`eaba158`).

### UI — 2 panneaux

1. **Grille de cartes** — une carte par chapitre, badge de statut (`todo` / `in_progress` / `mastered`), meilleur score, barre de progression globale « N / 23 modules maîtrisés ».
2. **Détail** — théorie (`t.theory`, HTML riche) puis exercices notés.

### Correction — `grCheck()` / `grNorm()`

Normalisation : trim, minuscules, espaces multiples réduits, apostrophes typographiques unifiées (`'` → `'`), point final ignoré. Réponses alternatives séparées par `/`. Plus strict que le quiz vocabulaire : **pas** de tolérance aux accents ni de distance de typo.

### Notation & progression — `grSaveProgress()`

- Score en % → poussé dans `scores_history` (10 derniers).
- `status = 'mastered'` dès que la **moyenne** de la fenêtre ≥ 80 % (pas le meilleur score).
- `best_score` = max historique ; `trend` = delta avec la tentative précédente.
- Chaque session poste dans `quiz_sessions` avec `mode: 'grammar'` → **visible dans le fil Multi**.
- Première maîtrise → +40 XP immédiats (§5).

---

## 13. Embed Jarvis

`quiz.html` est encadré en iframe par le front Jarvis (`jarvis.ndashiz.be` → `ndashiz.be/pro/quiz.html`) : **cross-origin mais same-site**, donc les deux partagent la partition de stockage.

### Détection

```js
try { if (window.top !== window.self) document.documentElement.classList.add('qz-embed'); }
catch(_) { document.documentElement.classList.add('qz-embed'); }
```

Le `catch` compte comme embed : un `window.top` qui throw signifie justement qu'on est encadré cross-origin.

### Ce que fait le mode embed

| Aspect | Comportement |
|---|---|
| Chrome LazyPO | Sidebar, burger, overlay et barre Focus FM masqués (`html.qz-embed`) ; titre de page masqué (Jarvis a déjà sa topbar) |
| Session Supabase | **Client dédié** : `auth.js` crée le client avec `storageKey: 'sb-lazypo-embed-auth-token'` |
| Cookie de gate | **Jamais écrit ni effacé** en embed (`if (!IS_EMBED)`) |
| Timeout d'inactivité | `session.js` désactivé — la session embed survit |
| Sign-out LazyPO | Sans effet sur l'embed (scope `local`, storage key différente) |
| Pas de session | Carte de login **dans l'iframe** (`#qz-embed-gate`), jamais de navigation vers `login.html` |

### Invariant

> Tout code qui appelle `LazyAuth.requireAuth()` doit d'abord `await window.__qzEmbedAuth`. Sinon il court-circuite la garde, voit une session `null`, et **fait sortir l'iframe vers `login.html`** — précisément le bug corrigé par `cef5166` / `3eba74b`.

L'isolation de session (`b83a4ac`) fait qu'on ne se logge **qu'une fois** : le refresh token de l'embed vit dans sa propre storage key et n'est plus détruit par la politique d'inactivité ni par les sign-out de LazyPO.

Côté Worker : `frame-ancestors 'self' https://jarvis.ndashiz.be`, `X-Frame-Options` **supprimé** (XFO ne sait pas exprimer « ce sous-domaine-là »), et `/pro/quiz.html` dans `PUBLIC_PAGES` (§9).

---

## 14. Historique git (thèmes principaux)

Commits notables (récent → ancien) :

**Embed Jarvis (juillet 2026)**

- `b83a4ac` fix(quiz/embed) : isolation de la session embed — se logger une seule fois
- `3eba74b` fix(quiz/embed) : garde d'auth en place — l'iframe ne sort plus vers login.html
- `cef5166` fix(quiz/embed) : carte de login inline au lieu d'une redirection
- `e7729b2` fix(quiz) : autoriser le framing depuis jarvis.ndashiz.be (cross-origin, same-site)
- `999440d` feat(quiz) : autoriser l'embed iframe same-origin depuis Jarvis
- `8abda52` / `629f154` fix(csp) : restaurer les libs vendorisées — les CDN sont bloqués par la CSP du Worker

**Module Grammaire (juillet 2026)**

- `eaba158` feat(grammar) : les 22 théories alignées sur le PDF du cours
- `8744422` feat(grammar) : TOPICS étendu à 23 chapitres (syllabus PDF)
- `c235f2f` feat(grammar) : module grammaire unifié — cartes, quiz, XP, multi-feed
- `7c96214` fix(grammar) : ne plus fermer le cours/quiz au retour d'onglet
- `f6fed22` / `7d2d863` fix(grammar) : `getSession` au lieu de `getUser` (timeout 30 s / SIGNED_OUT parasite)

**Antérieur**

- `b541521` fix(quiz/multi) : sync cross-user du fil + leaderboard
- `f56c9b0` Merge PR #92 : fix quiz review cleanup
- `87cf79c` fix(quiz) : masquer Error Review au démarrage d'un nouveau quiz
- `43bd592` fix(quiz) : race condition au boot — `currentUser` null
- `e2b03d4` feat(quiz/vocab) : onboarding premier import + détection de doublons
- `c400e66` feat(quiz/share) : filtre langue, select/deselect all, partage direct
- `960be76` feat(quiz) : multi demo admin, Challenge Back fin de partie, vocab share
- `fab0727` feat(multi) : ajouter les mots Challenge Back à son vocabulaire
- `0c1ffad` fix(quiz) : formulaire d'ajout vocab — champ source adaptatif unique
- `37e0d3a` / `d92098a` fix(vocab) : suppression de la pagination
- `25eed19` feat(vocab) : refonte complète de l'onglet Vocabulary
- `0ad486d` feat(quiz) : option 50 questions
- `2209e44` feat(vocab) : filtre mots ratés/fragiles + marquage visuel + impression
- `33ef103` refactor : intégration des verbes NL dans quiz.html (4e onglet)
- `8febfb4` feat : verbes irréguliers NL + hint visible par défaut
- `f35a472` feat : écran de review des erreurs + stats gamifiées (streak, heatmap, temps)
- `93a9a8d` feat : countdowns projet personnalisables + carte Knowledge Quiz sur l'accueil

**Thèmes** : features social multijoueur (Challenge Back, réactions, classement), système XP/gamification, partage de vocabulaire, intégration verbes NL, sécurité cross-user, corrections de race conditions.
