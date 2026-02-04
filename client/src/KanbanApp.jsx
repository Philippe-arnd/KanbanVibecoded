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
  pointerWithin
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, Home, Loader2, LogOut, KeyRound, Github, Settings, AlertTriangle } from 'lucide-react';

// --- CONFIGURATION ---
const COLUMNS = [
  { id: 'today', title: "Today", headerBg: 'bg-[#FFC8A2]' }, // Salmon
  { id: 'tomorrow', title: 'Tomorrow', headerBg: 'bg-[#FFDF91]' }, // Yellow
  { id: 'week', title: 'This Week', headerBg: 'bg-[#89CFF0]' }, // Sky Blue
  { id: 'month', title: 'This Month', headerBg: 'bg-[#88D8B0]' }, // Mint Green
  { id: 'later', title: 'Later', headerBg: 'bg-black/10' }, // Neutral Gray
];

// --- CONFIRMATION MODAL ---
function ConfirmationModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 border-2 border-red-500 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-black">Confirmation required</h3>
        <p className="text-sm text-black/70 mt-2 mb-6">{message}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-black font-bold border-2 border-black hover:bg-gray-300 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function KanbanApp() {
  const { session, isPasswordRecovery, setIsPasswordRecovery, logout } = useAuth();
  const navigate = useNavigate();
  const { 
    tasks, 
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
  const [selectedTask, setSelectedTask] = useState(null); // For the modal
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef(null);

  // Close menu if clicking outside
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

  // Handle password reset view after clicking the link in the email
  if (isPasswordRecovery) {
    return (
      <UpdatePassword
        title="Create your new password"
        description="You have been redirected from a reset link. Enter your new password below."
        onDone={() => {
          setIsPasswordRecovery(false);
          // Log out the user so they can log in with their new password
          logout().then(() => navigate('/'));
          window.location.hash = ''; // Clean up URL
        }}
      />
    );
  }

  // If not connected -> Show Login
  if (!session) {
    return <Auth />;
  }

  // --- REST OF THE APPLICATION (CONNECTED MODE) ---

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visibleTasks = tasks.filter(t => (t.type || 'pro') === mode);

  const handleAddTask = (e) => {
    e.preventDefault();
    addTaskHook(input, mode);
    setInput('');
  };

  const handleDeleteTask = (id) => {
    setConfirmation({
      message: `Do you really want to delete this task?`,
      onConfirm: async () => {
        // Close the details modal if it's open for this task
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask(null);
        }
        await deleteTaskHook(id);
      }
    });
  };

  const handleClearCompleted = async (columnId) => {
    await clearCompletedTasks(columnId, mode);
  };

  // Drag & Drop
  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragOver = (_event) => {
    // To simplify state management and ensure correct position calculation,
    // all drag logic is now handled in `onDragEnd`. `onDragOver` is kept
    // for potential future use, like custom visual feedback during drag.
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (over && active.id !== over.id) {
      // Let the useTasks hook handle all the logic for moving and persisting.
      // It will optimistically update the UI and then send the request.
      moveTask(active, over);
    }
  };

  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) };
  
  const isPro = mode === 'pro';

  return (
    <div className="p-4 md:p-8 bg-[#586A7A] min-h-screen font-sans flex flex-col">
      {showChangePassword && (
        <UpdatePassword
          title="Change your password"
          description="Enter a new secure password for your account."
          onDone={() => setShowChangePassword(false)}
        />
      )}

      {/* Confirmation Modal */}
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
      
      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal 
          key={selectedTask.id}
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
                <button onClick={() => setMode('perso')} className={`px-4 py-1.5 rounded-sm text-sm font-bold flex items-center gap-2 transition-all ${!isPro ? 'bg-white text-black shadow-[2px_2px_0px_0px_#00000080]' : 'text-black/70'}`}><Home size={16} /> Personal</button>
                
                {/* Separator */}
                <div className="w-px h-4 bg-black/20 mx-1"></div>

                {/* SETTINGS MENU */}
                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)} 
                    className={`p-1.5 rounded-sm transition-colors flex items-center justify-center ${showSettingsMenu ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] z-50 flex flex-col animate-in fade-in zoom-in duration-200">
                      <button 
                        onClick={() => { setShowChangePassword(true); setShowSettingsMenu(false); }} 
                        className="p-3 text-left hover:bg-[#89CFF0] flex items-center gap-3 border-b-2 border-black transition-colors font-medium"
                      >
                        <KeyRound size={18} /> <span>Password</span>
                      </button>
                      <button 
                        onClick={() => { handleLogout(); setShowSettingsMenu(false); }} 
                        className="p-3 text-left hover:bg-red-100 text-red-600 flex items-center gap-3 transition-colors font-medium"
                      >
                        <LogOut size={18} /> <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
               <h1 className={`text-2xl font-bold flex gap-2 items-center text-black`}>
                  <img src="/favicon.svg" alt="Logo" className="w-8 h-8" /> My Vibecodé Kanban
               </h1>
               <div className="flex items-center gap-2 text-black/80 text-sm mt-1">
                 {loading ? <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={14}/> Synchronizing...</span> : <span>{visibleTasks.filter(t => !t.completed).length} tasks to do</span>}
               </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <form onSubmit={handleAddTask} className="flex gap-2 items-center w-full md:w-auto">
              <input value={input} onChange={e => setInput(e.target.value)} className="bg-white p-3 rounded-none w-full md:w-80 outline-none border-2 border-black focus:shadow-[2px_2px_0px_0px_#000] transition-none" placeholder={`New ${isPro ? 'Pro' : 'Personal'} task...`} />
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

        {/* Add the assistant here, it will be positioned "fixed" on top of everything */}
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
