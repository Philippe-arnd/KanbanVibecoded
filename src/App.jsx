import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Landing } from './Landing';      // Ta nouvelle page d'accueil
import KanbanApp from './KanbanApp';  // Ton ancienne App (Auth + Kanban)

export function App() {
  return (
    <Router>
      <Routes>
        {/* Route racine : Affiche la Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Route App : Affiche le Kanban (et gère l'auth) */}
        <Route path="/app" element={<KanbanApp />} />
      </Routes>
    </Router>
  );
}