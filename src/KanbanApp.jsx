import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './Auth';
import RetroAssistant from './RetroAssistant';
import { KanbanColumn } from './KanbanColumn';
import UpdatePassword from './UpdatePassword';
import { TaskCard } from './TaskCard';
import { TaskDetailsModal } from './TaskDetailsModal';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { 
  DndContext, 
  closestCorners, 
  useSensor, 
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  getFirstCollision
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates,
  arrayMove
} from '@dnd-kit/sortable';
import { Plus, Briefcase, Home, Loader2, LogOut, KeyRound, Github, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from './supabaseClient'; // Still needed for UpdatePassword signout call if not wrapped, but useAuth handles main auth

// --- CONFIGURATION ---
const COLUMNS = [
  { id: 'today', title: "Aujourd'hui", headerBg: 'bg-[#FFC8A2]' }, // Saumon
  { id: 'tomorrow', title: 'Demain', headerBg: 'bg-[#FFDF91]' }, // Jaune
  { id: 'week', title: 'Cette semaine', headerBg: 'bg-[#89CFF0]' }, // Bleu Ciel
  { id: 'month', title: 'Ce mois', headerBg: 'bg-[#88D8B0]' }, // Vert Menthe
  { id: 'later', title: 'Plus tard', headerBg: 'bg-black/10' }, // Gris neutre
];

// --- MODALE DE CONFIRMATION ---
function ConfirmationModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 border-2 border-red-500 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-black">Confirmation requise</h3>
        <p className="text-sm text-black/70 mt-2 mb-6">{message}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-black font-bold border-2 border-black hover:bg-gray-300 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// --- APP PRINCIPALE ---
export default function KanbanApp() {
  const { session, isPasswordRecovery, setIsPasswordRecovery, logout } = useAuth();
  const { 
    tasks, 
    setTasks,
    loading, 
    addTask: addTaskHook, 
    deleteTask: deleteTaskHook, 
    toggleTask, 
    updateTaskTitle, 
    updateTask, 
    clearCompletedTasks, 
    moveTask 
  } = useTasks(session);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // { message, onConfirm }
  
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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }));

  const collisionDetectionStrategy = useCallback((args) => {
    // First, let's see if there are any collisions with the pointer
    const pointerCollisions = pointerWithin(args);
    
    // If there are pointer collisions, return them
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // If there are no pointer collisions, return the closest corners
    return closestCorners(args);
  }, []);

  // Gère la vue de réinitialisation de mot de passe après clic sur le lien dans l'email
  if (isPasswordRecovery) {
    return (
      <UpdatePassword
        title="Créez votre nouveau mot de passe"
        description="Vous avez été redirigé depuis un lien de réinitialisation. Entrez votre nouveau mot de passe ci-dessous."
        onDone={() => {
          setIsPasswordRecovery(false);
          // Déconnecte l'utilisateur pour qu'il se reconnecte avec son nouveau mot de passe
          logout();
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
    await logout();
  };

  const visibleTasks = tasks.filter(t => (t.type || 'pro') === mode);

  const handleAddTask = (e) => {
    e.preventDefault();
    addTaskHook(input, mode);
    setInput('');
  };

  const handleDeleteTask = (id) => {
    setConfirmation({
      message: `Voulez-vous vraiment supprimer cette tâche ?`,
      onConfirm: async () => {
        // Close the details modal if it's open for this task
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask(null);
        }
        await deleteTaskHook(id);
      }
    });
  };

  const handleClearCompleted = (columnId) => {
    setConfirmation({
      message: 'Supprimer toutes les tâches terminées de cette colonne ?',
      onConfirm: async () => {
        await clearCompletedTasks(columnId, mode);
      }
    });
  };

  // Drag & Drop
  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === 'Task';
    const isOverATask = over.data.current?.type === 'Task';
    const isOverAColumn = over.data.current?.type === 'Column' || COLUMNS.some(c => c.id === overId);

    if (!isActiveATask) return;

    // Immediat visual feedback for cross-column movement
    const activeTaskObj = tasks.find(t => t.id === activeId);
    if (!activeTaskObj) return;

    if (isOverATask) {
      const overTaskObj = tasks.find(t => t.id === overId);
      if (overTaskObj && activeTaskObj.columnId !== overTaskObj.columnId) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === activeId);
          const overIndex = prev.findIndex(t => t.id === overId);
          
          const updatedTasks = [...prev];
          updatedTasks[activeIndex] = { ...updatedTasks[activeIndex], columnId: overTaskObj.columnId };
          
          return arrayMove(updatedTasks, activeIndex, overIndex);
        });
      }
    }

    if (isOverAColumn) {
      const columnId = over.data.current?.col?.id || overId;
      if (activeTaskObj.columnId !== columnId) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === activeId);
          const updatedTasks = [...prev];
          updatedTasks[activeIndex] = { ...updatedTasks[activeIndex], columnId };
          
          return arrayMove(updatedTasks, activeIndex, activeIndex); // Triggers re-render
        });
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;

    // The state might have already been updated by handleDragOver
    // We call moveTask to persist changes to DB
    await moveTask(activeId, overId, COLUMNS);
  };

  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) };
  
  const isPro = mode === 'pro';

  return (
    <div className="p-4 md:p-8 bg-[#586A7A] min-h-screen font-sans flex flex-col">
      {showChangePassword && (
        <UpdatePassword
          title="Changer votre mot de passe"
          description="Entrez un nouveau mot de passe sécurisé pour votre compte."
          onDone={() => setShowChangePassword(false)}
        />
      )}

      {/* Modal de Confirmation */}
      {confirmation && (
        <ConfirmationModal
          message={confirmation.message}
          onConfirm={() => {
            confirmation.onConfirm();
            setConfirmation(null);
          }}
          onCancel={() => setConfirmation(null)}
        />
      )}
      
      {/* Modal Détails Tâche */}
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={updateTask} 
          onDelete={handleDeleteTask}
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
            <form onSubmit={handleAddTask} className="flex gap-2 items-center w-full md:w-auto">
              <input value={input} onChange={e => setInput(e.target.value)} className="bg-white p-3 rounded-none w-full md:w-80 outline-none border-2 border-black focus:shadow-[2px_2px_0px_0px_#000] transition-none" placeholder={`Nouvelle tâche ${isPro ? 'Pro' : 'Perso'}...`} />
              <button type="submit" className="bg-[#88D8B0] text-black p-3 rounded-none font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none" disabled={loading}><Plus /></button>
            </form>
            
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto md:overflow-visible pb-4 snap-x snap-proximity md:snap-none">
            {COLUMNS.map(col => <KanbanColumn key={col.id} col={col} tasks={visibleTasks.filter(t => t.columnId === col.id)} deleteTask={handleDeleteTask} toggleTask={toggleTask} updateTitle={updateTaskTitle} openTaskModal={setSelectedTask} clearCompleted={handleClearCompleted}/>)}
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