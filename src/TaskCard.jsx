import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Circle, Trash2, CheckCircle2 } from 'lucide-react';

// --- COMPOSANT CARTE ---
export function TaskCard({ task, deleteTask, toggleTask, updateTitle, isOverlay }) {
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

// --- COMPOSANT TÂCHE TERMINÉE ---
export function CompletedTaskCard({ task, deleteTask, toggleTask }) {
  return (
    <div className="bg-black/5 p-3 mb-2 rounded-none border-2 border-dashed border-black/20 opacity-75 group flex items-start gap-3">
      <button onClick={() => toggleTask(task.id)} className="mt-1 text-green-600 hover:text-black transition-colors flex-shrink-0"><CheckCircle2 size={20} /></button>
      <div className="flex-1"><span className="text-sm text-black/60 font-medium break-words line-through decoration-black/40">{task.title}</span></div>
      <button onClick={() => deleteTask(task.id)} className="text-black/30 hover:text-red-500"><Trash2 size={16}/></button>
    </div>
  );
}