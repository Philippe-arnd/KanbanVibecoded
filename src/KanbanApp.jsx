import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth'; // <-- On importe le composant Auth
import RetroAssistant from './RetroAssistant';
import { KanbanColumn } from './KanbanColumn';
import UpdatePassword from './UpdatePassword';
import { TaskCard } from './TaskCard';
import { TaskDetailsModal } from './TaskDetailsModal';
import { 
  DndContext, 
  closestCenter, 
  useSensor, 
  useSensors, 
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { Plus, Briefcase, Home, Loader2, LogOut, KeyRound, Github, Settings } from 'lucide-react';

// --- CONFIGURATION ---
const COLUMNS = [
  { id: 'today', title: "Aujourd'hui", headerBg: 'bg-[#FFC8A2]' }, // Saumon
  { id: 'tomorrow', title: 'Demain', headerBg: 'bg-[#FFDF91]' }, // Jaune
  { id: 'week', title: 'Cette semaine', headerBg: 'bg-[#89CFF0]' }, // Bleu Ciel
  { id: 'month', title: 'Ce mois', headerBg: 'bg-[#88D8B0]' }, // Vert Menthe
  { id: 'later', title: 'Plus tard', headerBg: 'bg-black/10' }, // Gris neutre
];

// --- APP PRINCIPALE ---
export default function KanbanApp() {
  const [session, setSession] = useState(null); // SESSION UTILISATEUR
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [mode, setMode] = useState(() => localStorage.getItem('kanban-mode') || 'pro');
  const [input, setInput] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null); // Pour la modale
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef(null);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1. Gestion de la Session Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Chargement des données (Uniquement si session active)
  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session]); 

  async function fetchTasks() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erreur chargement:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Gère la vue de réinitialisation de mot de passe après clic sur le lien dans l'email
  if (isPasswordRecovery) {
    return (
      <UpdatePassword
        title="Créez votre nouveau mot de passe"
        description="Vous avez été redirigé depuis un lien de réinitialisation. Entrez votre nouveau mot de passe ci-dessous."
        onDone={() => {
          setIsPasswordRecovery(false);
          // Déconnecte l'utilisateur pour qu'il se reconnecte avec son nouveau mot de passe
          supabase.auth.signOut();
          window.location.hash = ''; // Nettoie l'URL
        }}
      />
    );
  }

  // Si pas connecté -> Afficher le Login
  if (!session) {
    return <Auth />;
  }

  // --- LE RESTE DE L'APPLICATION (MODE CONNECTÉ) ---

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTasks([]); // On vide le state local pour sécurité
  };

  const visibleTasks = tasks.filter(t => (t.type || 'pro') === mode);

  const addTask = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const user = session.user;

    // UI Update
    const tempId = Date.now().toString();
    const newTask = { 
      id: tempId, 
      title: input, 
      columnId: 'today', 
      completed: false, 
      type: mode,
      user_id: user.id, // Important pour RLS
      subtasks: []
    };
    setTasks([...tasks, newTask]);
    setInput('');

    // DB Update
    const { data } = await supabase
      .from('tasks')
      .insert([{ title: input, columnId: 'today', type: mode, user_id: user.id, subtasks: [] }])
      .select();
    
    if (data) {
        setTasks(prev => prev.map(t => t.id === tempId ? data[0] : t));
    }
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    const newStatus = !task.completed;
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
  };

  const updateTaskTitle = async (id, newTitle) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t));
    await supabase.from('tasks').update({ title: newTitle }).eq('id', id);
  };

  const handleUpdateTask = async (updatedTask) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    // Try to update subtasks. If the column doesn't exist, this might fail or just not save subtasks.
    // Ideally we should alert the user or checking schema, but we'll try best effort.
    await supabase.from('tasks').update({ 
        title: updatedTask.title,
        subtasks: updatedTask.subtasks 
    }).eq('id', updatedTask.id);
  };

  const clearCompleted = async (columnId) => {
    if(confirm('Supprimer toutes les tâches terminées de cette colonne ?')) {
      const tasksToDelete = tasks.filter(t => (t.type || 'pro') === mode && t.columnId === columnId && t.completed);
      const idsToDelete = tasksToDelete.map(t => t.id);
      setTasks(tasks.filter(t => !idsToDelete.includes(t.id)));
      await supabase.from('tasks').delete().in('id', idsToDelete);
    }
  };

  // Drag & Drop (Identique)
  const handleDragStart = (event) => {
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
    }
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    const activeTask = tasks.find(t => t.id === activeId);
    
    const isOverColumn = COLUMNS.some(c => c.id === overId);
    if (isOverColumn && activeTask) {
       if (activeTask.columnId !== overId) {
         setTasks(tasks.map(t => t.id === activeId ? { ...t, columnId: overId } : t));
         await supabase.from('tasks').update({ columnId: overId }).eq('id', activeId);
       }
       return;
    }

    const overTask = tasks.find(t => t.id === overId);
    if (overTask && activeTask) {
      if (activeTask.columnId !== overTask.columnId) {
        setTasks(tasks.map(t => t.id === activeId ? { ...t, columnId: overTask.columnId } : t));
        await supabase.from('tasks').update({ columnId: overTask.columnId }).eq('id', activeId);
      } else {
        const oldIndex = tasks.findIndex(t => t.id === activeId);
        const newIndex = tasks.findIndex(t => t.id === overId);
        setTasks(arrayMove(tasks, oldIndex, newIndex));
      }
    }
  };

  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) };
  
  const isPro = mode === 'pro';
  const titleClass = isPro ? 'text-indigo-600' : 'text-emerald-600';
  const inputClass = isPro ? "bg-gray-50 border border-gray-200 p-3 rounded-xl w-full md:w-80 outline-none focus:ring-2 focus:ring-indigo-500 transition" : "bg-gray-50 border border-gray-200 p-3 rounded-xl w-full md:w-80 outline-none focus:ring-2 focus:ring-emerald-500 transition";
  const buttonClass = isPro ? "bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-indigo-200" : "bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-emerald-200";

  return (
    <div className="p-4 md:p-8 bg-[#586A7A] min-h-screen font-sans flex flex-col">
      {showChangePassword && (
        <UpdatePassword
          title="Changer votre mot de passe"
          description="Entrez un nouveau mot de passe sécurisé pour votre compte."
          onDone={() => setShowChangePassword(false)}
        />
      )}
      
      {/* Modal Détails Tâche */}
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={handleUpdateTask} 
        />
      )}

      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-4 bg-[#FFDF91] p-4 rounded-none border-2 border-black">
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex justify-between items-center w-full md:w-auto gap-4">
              <div className="bg-black/10 p-1 rounded-sm inline-flex items-center self-start border-2 border-black">
                <button onClick={() => setMode('pro')} className={`px-4 py-1.5 rounded-sm text-sm font-bold flex items-center gap-2 transition-all ${isPro ? 'bg-white text-black shadow-[2px_2px_0px_0px_#00000080]' : 'text-black/70'}`}><Briefcase size={16} /> Pro</button>
                <button onClick={() => setMode('perso')} className={`px-4 py-1.5 rounded-sm text-sm font-bold flex items-center gap-2 transition-all ${!isPro ? 'bg-white text-black shadow-[2px_2px_0px_0px_#00000080]' : 'text-black/70'}`}><Home size={16} /> Perso</button>
                
                {/* Separator */}
                <div className="w-px h-4 bg-black/20 mx-1"></div>

                {/* MENU PARAMÈTRES */}
                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)} 
                    className={`p-1.5 rounded-sm transition-colors flex items-center justify-center ${showSettingsMenu ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
                    title="Paramètres"
                  >
                    <Settings size={18} />
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] z-50 flex flex-col animate-in fade-in zoom-in duration-200">
                      <button 
                        onClick={() => { setShowChangePassword(true); setShowSettingsMenu(false); }} 
                        className="p-3 text-left hover:bg-[#89CFF0] flex items-center gap-3 border-b-2 border-black transition-colors font-medium"
                      >
                        <KeyRound size={18} /> <span>Mot de passe</span>
                      </button>
                      <button 
                        onClick={() => { handleLogout(); setShowSettingsMenu(false); }} 
                        className="p-3 text-left hover:bg-red-100 text-red-600 flex items-center gap-3 transition-colors font-medium"
                      >
                        <LogOut size={18} /> <span>Se déconnecter</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
               <h1 className={`text-2xl font-bold flex gap-2 items-center text-black`}>
                  <img src="/favicon.svg" alt="Logo" className="w-8 h-8" /> Mon Kanban vibecodé
               </h1>
               <div className="flex items-center gap-2 text-black/80 text-sm mt-1">
                 {loading ? <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={14}/> Synchronisation...</span> : <span>{visibleTasks.filter(t => !t.completed).length} tâches à faire</span>}
               </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <form onSubmit={addTask} className="flex gap-2 items-center w-full md:w-auto">
              <input value={input} onChange={e => setInput(e.target.value)} className="bg-white p-3 rounded-none w-full md:w-80 outline-none border-2 border-black focus:shadow-[2px_2px_0px_0px_#000] transition-none" placeholder={`Nouvelle tâche ${isPro ? 'Pro' : 'Perso'}...`} />
              <button type="submit" className="bg-[#88D8B0] text-black p-3 rounded-none font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none" disabled={loading}><Plus /></button>
            </form>
            
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto md:overflow-visible pb-4 snap-x snap-mandatory md:snap-none">
            {COLUMNS.map(col => <KanbanColumn key={col.id} col={col} tasks={visibleTasks.filter(t => t.columnId === col.id)} deleteTask={deleteTask} toggleTask={toggleTask} updateTitle={updateTaskTitle} openTaskModal={setSelectedTask} clearCompleted={clearCompleted}/>)}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>{activeTask ? <TaskCard task={activeTask} isOverlay /> : null}</DragOverlay>
        </DndContext>

        {/* Ajoute l'assistant ici, il se positionnera en "fixed" par-dessus tout */}
        <RetroAssistant tasks={tasks} />
      </div>

      <footer className="mt-auto w-full p-4 text-center">
        <p className="inline-flex items-center gap-2 text-black/30 text-sm font-bold">
          <span>© {new Date().getFullYear()} - </span>
          <a
            href="https://github.com/Philippe-arnd/KanbanVibecoded"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-black/60 transition-colors"
          >
            Kanban Vibecodé <Github size={16} />
          </a>
        </p>
      </footer>
    </div>
  );
}