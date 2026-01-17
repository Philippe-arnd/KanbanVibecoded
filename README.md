# Kanban Vibecodé

<img src="public/favicon.svg" width="80" alt="Logo Kanban" />

Une application de gestion de tâches intuitive type Kanban, dans un style retro computer (Néo-brutalisme), conçue pour organiser votre charge de travail avec une séparation claire entre vie professionnelle et vie personnelle.

> Pour les spécifications détaillées, voir [requirements.md](./requirements.md).

## Fonctionnalités

- **Organisation Temporelle** : Colonnes dynamiques (Aujourd'hui, Demain, Cette semaine, Ce mois, Plus tard).
- **Double Mode** : Basculez instantanément entre un espace **Pro** (thème Indigo) et **Perso** (thème Émeraude).
- **Drag & Drop Fluide** : Réorganisez vos tâches par simple glisser-déposer (propulsé par `@dnd-kit`).
- **Assistant Rétro** : Un compagnon en Pixel Art qui analyse votre productivité et vous conseille.
- **Gestion Complète** :
  - Ajout rapide de tâches.
  - Édition par double-clic.
  - Marquage des tâches terminées.
  - Nettoyage automatique des tâches finies par colonne.
- **Cloud & Sécurité** : Authentification complète, gestion de compte et synchronisation temps réel (Supabase).

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Philippe-arnd/KanbanVibecoded.git
   cd KanbanVibecoded
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Configurez l'environnement :
   Créez un fichier `.env` à la racine et ajoutez vos clés Supabase :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```

4. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```

## Technologies

- React
- Tailwind CSS
- Supabase (Auth & Database)
- @dnd-kit
- Lucide React (Icônes)

## Déploiement (CI/CD)

Le projet est optimisé pour un déploiement sur **Vercel**.

1. **Connexion** : Connectez votre dépôt GitHub à Vercel.
2. **Configuration** : Vercel détectera automatiquement Vite (grâce au fichier `vercel.json`).
3. **Variables** : Ajoutez les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dans les paramètres du projet Vercel.
4. **Workflow** :
   - Push sur `main` → Mise à jour de la **Production**.
   - Push sur `dev` (ou autre branche) → Création d'un environnement de **Preview** unique.

## Crédits

© 2026 - [Kanban Vibecodé](https://github.com/Philippe-arnd/KanbanVibecoded)