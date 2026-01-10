# Kanban Vibecodé

<img src="public/favicon.svg" width="80" alt="Logo Kanban" />

Une application de gestion de tâches intuitive type Kanban, conçue pour organiser votre charge de travail avec une séparation claire entre vie professionnelle et vie personnelle.

## Fonctionnalités

- **Organisation Temporelle** : Colonnes dynamiques (Aujourd'hui, Demain, Cette semaine, Ce mois, Plus tard).
- **Double Mode** : Basculez instantanément entre un espace **Pro** (thème Indigo) et **Perso** (thème Émeraude).
- **Drag & Drop Fluide** : Réorganisez vos tâches par simple glisser-déposer (propulsé par `@dnd-kit`).
- **Gestion Complète** :
  - Ajout rapide de tâches.
  - Édition par double-clic.
  - Marquage des tâches terminées.
  - Nettoyage automatique des tâches finies par colonne.
- **Persistance** : Sauvegarde automatique de vos données dans le navigateur (LocalStorage).

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

3. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```

## Technologies

- React
- Tailwind CSS
- @dnd-kit
- Lucide React (Icônes)