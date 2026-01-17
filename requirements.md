# Spécifications des Exigences Logicielles - Kanban Vibecodé v2.0

## 1. Introduction
L'application **Kanban Vibecodé** (v2.0) est un outil de gestion de tâches intuitif, évoluant vers une architecture SaaS connectée, conçu pour aider les utilisateurs à organiser leur charge de travail quotidienne. Elle se distingue par une séparation claire entre les tâches professionnelles et personnelles, une organisation temporelle dynamique et une esthétique "Néo-brutalisme" rétro.

## 2. Exigences Fonctionnelles

### 2.1 Authentification et Gestion de Compte
Le système doit sécuriser l'accès aux données utilisateur.
- **FR-AUTH-01** : L'utilisateur doit pouvoir créer un compte via email et mot de passe.
- **FR-AUTH-02** : Le système doit valider la force du mot de passe lors de l'inscription (indicateur visuel).
- **FR-AUTH-03** : L'utilisateur doit pouvoir se connecter à son compte existant.
- **FR-AUTH-04** : L'utilisateur doit pouvoir demander la réinitialisation de son mot de passe en cas d'oubli (lien par email).
- **FR-AUTH-05** : L'utilisateur connecté doit pouvoir modifier son mot de passe via l'interface.
- **FR-AUTH-06** : L'utilisateur doit pouvoir se déconnecter de sa session.

### 2.2 Gestion des Tâches (CRUD)
L'utilisateur doit avoir un contrôle total sur ses tâches.
- **FR-TASK-01** : L'utilisateur doit pouvoir créer une tâche rapidement via un champ de saisie.
- **FR-TASK-02** : La tâche doit être créée par défaut dans la colonne "Aujourd'hui" et associée au mode actif (Pro ou Perso).
- **FR-TASK-03** : L'utilisateur doit pouvoir modifier le titre d'une tâche (édition en place / double-clic).
- **FR-TASK-04** : L'utilisateur doit pouvoir changer le statut d'une tâche (terminée/non terminée).
- **FR-TASK-05** : L'utilisateur doit pouvoir supprimer une tâche définitivement.
- **FR-TASK-06** : L'utilisateur doit pouvoir supprimer en lot toutes les tâches terminées d'une colonne ("Nettoyer").

### 2.3 Organisation et Visualisation (Kanban)
L'interface doit permettre une organisation visuelle et temporelle.
- **FR-BOARD-01** : Le tableau doit être divisé en colonnes temporelles fixes : *Aujourd'hui*, *Demain*, *Cette semaine*, *Ce mois*, *Plus tard*.
- **FR-BOARD-02** : L'utilisateur doit pouvoir déplacer les tâches d'une colonne à une autre par glisser-déposer (Drag & Drop).
- **FR-BOARD-03** : L'utilisateur doit pouvoir réorganiser l'ordre des tâches au sein d'une même colonne.
- **FR-BOARD-04** : Les tâches terminées doivent être visuellement séparées des tâches actives (en bas de colonne, style distinct).

### 2.4 Modes de Vie (Pro / Perso)
L'application doit permettre de cloisonner les contextes de vie.
- **FR-MODE-01** : Le système doit gérer deux contextes distincts : "Pro" et "Perso".
- **FR-MODE-02** : L'utilisateur doit pouvoir basculer entre les modes via un commutateur global.
- **FR-MODE-03** : L'interface doit filtrer les tâches affichées pour ne montrer que celles correspondant au mode actif.
- **FR-MODE-04** : L'interface doit adapter son thème couleur selon le mode (ex: Indigo pour Pro, Émeraude pour Perso).

### 2.5 Assistant Intelligent (RetroAssistant)
- **FR-ASST-01** : Un assistant virtuel nommé **K-Liwy**, au style "Pixel Art", doit être présent sur l'interface (version Desktop).
- **FR-ASST-02** : L'assistant doit analyser le contexte (heure, nombre de tâches en cours/terminées) pour afficher des messages pertinents (encouragements, alertes de surcharge, etc.).
- **FR-ASST-03** : L'assistant doit avoir des animations interactives au survol.

## 3. Exigences Non-Fonctionnelles

### 3.1 Interface Utilisateur (UI/UX)
- **NFR-UI-01** : L'application doit respecter une charte graphique "computer retro 90s" / "Windows 95 vibes" (bordures noires épaisses, ombres portées dures, couleurs pastel saturées).
- **NFR-UI-02** : L'application doit être "Responsive Design" (adaptée aux mobiles et aux écrans larges).
- **NFR-UI-03** : Les interactions (drag & drop, boutons) doivent fournir un retour visuel immédiat et tactile ("Composants Mécaniques" avec états active, hover).

### 3.2 Performance et Données
- **NFR-PERF-01** : Les données doivent être synchronisées en temps réel avec le backend (Supabase).
- **NFR-PERF-02** : L'application doit maintenir un état local optimiste pour une sensation de fluidité immédiate lors des actions utilisateur.

### 3.3 Sécurité
- **NFR-SEC-01** : Les données des tâches doivent être protégées par des règles de sécurité (RLS - Row Level Security) garantissant que seul le créateur peut lire ou modifier ses tâches.

## 4. Stack Technique
- **Frontend** : React.js
- **Langage** : JavaScript (JSX)
- **Styles** : Tailwind CSS
- **Backend (BaaS)** : Supabase (Auth & Database)
- **Bibliothèques Clés** : 
  - `@dnd-kit` (Drag & Drop)
  - `lucide-react` (Icônes)