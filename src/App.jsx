import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth'; // <-- On importe le composant Auth
import { 
  DndContext, 
  closestCorners, 
  useSensor, 
  useSensors, 
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Eraser, Briefcase, Home, Loader2, LogOut, KeyRound, Lock, Eye, EyeOff, Check } from 'lucide-react';

// --- CONFIGURATION ---
const COLUMNS = [
  { id: 'today', title: "Aujourd'hui", headerBg: 'bg-[#FFC8A2]' }, // Saumon
  { id: 'tomorrow', title: 'Demain', headerBg: 'bg-[#FFDF91]' }, // Jaune
  { id: 'week', title: 'Cette semaine', headerBg: 'bg-[#89CFF0]' }, // Bleu Ciel
  { id: 'month', title: 'Ce mois', headerBg: 'bg-[#88D8B0]' }, // Vert Menthe
  { id: 'later', title: 'Plus tard', headerBg: 'bg-black/10' }, // Gris neutre
];

// --- COMPOSANT CARTE (Inchangé) ---
function TaskCard({ task, deleteTask, toggleTask, updateTitle, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    data: { type: 'Task', task }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
      inputRef.current.select();
    }
  }, [isEditing]);

  const saveEdit = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== task.title) {
      updateTitle(task.id, editValue);
    } else {
      setEditValue(task.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (isOverlay) {
    return (
      <div className="bg-white p-3 rounded-none shadow-none border-2 border-black cursor-grabbing rotate-3 scale-105 z-50 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <span className="text-sm text-black font-medium break-words">{task.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-3 mb-3 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none group relative">
      <div className="flex items-start gap-3">
        {!isEditing && <div {...attributes} {...listeners} className="mt-1.5 -ml-1 text-black/40 hover:text-black cursor-grab active:cursor-grabbing touch-none flex-shrink-0"><GripVertical size={16} /></div>}
        <button onClick={() => toggleTask(task.id)} className="mt-1 text-black/60 hover:text-black transition-colors flex-shrink-0">
          <Circle size={20} />
        </button>
        <div className="flex-1 pr-6 min-h-[24px]">
          {isEditing ? (
            <textarea 
              ref={inputRef} 
              value={editValue} 
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }} 
              onBlur={saveEdit} 
              onKeyDown={handleKeyDown} 
              className="w-full text-sm text-black font-medium bg-white -ml-1 pl-1 rounded-none border-2 border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none resize-none overflow-hidden block" 
              rows={1}
            />
          ) : (
            <span onDoubleClick={() => setIsEditing(true)} className="text-sm text-black font-medium break-words block cursor-text" title="Double-cliquez pour éditer">{task.title}</span>
          )}
        </div>
      </div>
      {!isEditing && <button onClick={() => deleteTask(task.id)} className="absolute top-3 right-3 text-black/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>}
    </div>
  );
}

// --- COMPOSANT TÂCHE TERMINÉE (Inchangé) ---
function CompletedTaskCard({ task, deleteTask, toggleTask }) {
  return (
    <div className="bg-black/5 p-3 mb-2 rounded-none border-2 border-dashed border-black/20 opacity-75 group flex items-start gap-3">
      <button onClick={() => toggleTask(task.id)} className="mt-1 text-green-600 hover:text-black transition-colors flex-shrink-0"><CheckCircle2 size={20} /></button>
      <div className="flex-1"><span className="text-sm text-black/60 font-medium break-words line-through decoration-black/40">{task.title}</span></div>
      <button onClick={() => deleteTask(task.id)} className="text-black/30 hover:text-red-500"><Trash2 size={16}/></button>
    </div>
  );
}

// --- COMPOSANT COLONNE (Inchangé) ---
function KanbanColumn({ col, tasks, deleteTask, toggleTask, updateTitle, clearCompleted }) {
  const { setNodeRef } = useSortable({ id: col.id, data: { type: 'Column', col } });
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div ref={setNodeRef} className={`bg-[#E0EBDD] rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-[500px] flex flex-col min-w-[280px] md:min-w-0 snap-center`}>
      <div className={`flex justify-between items-center p-2 border-b-2 border-black ${col.headerBg}`}>
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-black text-sm uppercase tracking-wide">{col.title}</h2>
          <span className="bg-white/80 border border-black px-2 py-0.5 rounded-sm text-xs font-bold">{activeTasks.length}</span>
        </div>
        {completedTasks.length > 0 && (
          <button onClick={() => clearCompleted(col.id)} className="text-xs flex items-center gap-1 bg-white hover:bg-red-100 text-black px-2 py-1 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none"><Eraser size={14} /> Nettoyer</button>
        )}
      </div>
      <div className="flex-1 p-4">
        <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {activeTasks.map(task => <TaskCard key={task.id} task={task} deleteTask={deleteTask} toggleTask={toggleTask} updateTitle={updateTitle}/>)}
        </SortableContext>
      </div>
      {completedTasks.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
             <div className="h-px bg-black/30 flex-1 border-t border-dashed border-black/40 opacity-50"></div>
             <span className="text-xs font-medium text-black/50 uppercase">Terminées ({completedTasks.length})</span>
             <div className="h-px bg-black/30 flex-1 border-t border-dashed border-black/40 opacity-50"></div>
          </div>
          <div className="opacity-80">{completedTasks.map(task => <CompletedTaskCard key={task.id} task={task} deleteTask={deleteTask} toggleTask={toggleTask}/>)}</div>
        </div>
      )}
    </div>
  );
}

// --- COMPOSANT DE MISE À JOUR DU MOT DE PASSE ---
function UpdatePassword({ onDone, title, description }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const strength = getPasswordStrength(password);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas !");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Mot de passe mis à jour avec succès !");
      setTimeout(() => {
        onDone();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#E0EBDD] p-0 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black relative">
        <div className="text-left mb-8 p-2 border-b-2 border-black bg-[#89CFF0] flex items-center gap-2">
          <div className="inline-flex p-1 rounded-sm bg-white/50 text-black">
            <KeyRound size={32} />
          </div>
          <h1 className="text-xl font-bold text-black">{title}</h1>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 p-8 pt-0">
          <p className="text-black/80 -mt-4 mb-4">{description}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-white border-2 border-black rounded-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-none" placeholder="••••••••" minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-black/60 hover:text-black transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div className="flex gap-1 h-1.5">
            {[1, 2, 3, 4].map((step) => (<div key={step} className={`h-full flex-1 rounded-full transition-all duration-300 ${strength >= step ? (strength === 4 ? 'bg-emerald-500' : strength === 3 ? 'bg-blue-500' : strength === 2 ? 'bg-orange-400' : 'bg-red-400') : 'bg-gray-200'}`} />))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-10 pr-4 py-2 border-2 rounded-none outline-none transition-none bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-black'}`} placeholder="Répétez le mot de passe" />
              {confirmPassword && password === confirmPassword && (<Check className="absolute right-3 top-3 text-emerald-500 animate-in fade-in zoom-in" size={18} />)}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <button type="submit" disabled={loading || !!success} className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : 'Mettre à jour'}
          </button>
        </form>
        
        {title === "Changer votre mot de passe" && (
            <button onClick={onDone} className="absolute top-2 right-2 text-black hover:bg-red-500 hover:text-white border-2 border-black bg-white w-8 h-8 font-mono rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none">&times;</button>
        )}
      </div>
    </div>
  );
}

// --- APP PRINCIPALE ---
export default function App() {
  const [session, setSession] = useState(null); // SESSION UTILISATEUR
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [mode, setMode] = useState(() => localStorage.getItem('kanban-mode') || 'pro');
  const [input, setInput] = useState('');
  const [activeTask, setActiveTask] = useState(null);

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
      user_id: user.id // Important pour RLS
    };
    setTasks([...tasks, newTask]);
    setInput('');

    // DB Update
    const { data } = await supabase
      .from('tasks')
      .insert([{ title: input, columnId: 'today', type: mode, user_id: user.id }])
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
    <div className="p-4 md:p-8 bg-[#586A7A] min-h-screen font-sans">
      {showChangePassword && (
        <UpdatePassword
          title="Changer votre mot de passe"
          description="Entrez un nouveau mot de passe sécurisé pour votre compte."
          onDone={() => setShowChangePassword(false)}
        />
      )}
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-4 bg-[#FFDF91] p-4 rounded-none border-2 border-black">
          <div className="flex flex-col gap-4">
            <div className="bg-black/10 p-1 rounded-sm inline-flex self-start border-2 border-black">
              <button onClick={() => setMode('pro')} className={`px-4 py-1.5 rounded-sm text-sm font-bold flex items-center gap-2 transition-all ${isPro ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' : 'text-black/70'}`}><Briefcase size={16} /> Pro</button>
              <button onClick={() => setMode('perso')} className={`px-4 py-1.5 rounded-sm text-sm font-bold flex items-center gap-2 transition-all ${!isPro ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' : 'text-black/70'}`}><Home size={16} /> Perso</button>
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
              <input value={input} onChange={e => setInput(e.target.value)} className="bg-white p-3 rounded-none w-full md:w-80 outline-none border-2 border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-none" placeholder={`Nouvelle tâche ${isPro ? 'Pro' : 'Perso'}...`} />
              <button type="submit" className="bg-[#88D8B0] text-black p-3 rounded-none font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none" disabled={loading}><Plus /></button>
            </form>
            
            {/* BOUTON CHANGER MOT DE PASSE */}
            <button onClick={() => setShowChangePassword(true)} className="p-3 bg-white text-black rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none" title="Changer de mot de passe">
              <KeyRound size={20} />
            </button>

            {/* BOUTON LOGOUT */}
            <button onClick={handleLogout} className="p-3 bg-white text-black hover:bg-red-500 hover:text-white rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none" title="Se déconnecter">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto md:overflow-visible pb-4 snap-x snap-mandatory md:snap-none">
            {COLUMNS.map(col => <KanbanColumn key={col.id} col={col} tasks={visibleTasks.filter(t => t.columnId === col.id)} deleteTask={deleteTask} toggleTask={toggleTask} updateTitle={updateTaskTitle} clearCompleted={clearCompleted}/>)}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>{activeTask ? <TaskCard task={activeTask} isOverlay /> : null}</DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}