import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Circle, Trash2, CheckCircle2, ListTodo } from 'lucide-react'

// --- COMPOSANT CARTE ---
export const TaskCard = React.memo(function TaskCard({
  task,
  toggleTask,
  isOverlay,
  openTaskModal,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  if (isOverlay) {
    return (
      <div className="bg-white p-3 rounded-none shadow-none border-2 border-black cursor-grabbing rotate-3 scale-105 z-50 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <span className="text-sm text-black font-medium break-words">{task.title}</span>
        </div>
      </div>
    )
  }

  const subtasksCount = Array.isArray(task.subtasks) ? task.subtasks.length : 0
  const completedSubtasksCount =
    subtasksCount > 0 ? task.subtasks.filter((st) => st.completed).length : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 mb-3 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none group relative touch-manipulation"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleTask(task.id)}
          className="text-black/60 hover:text-black transition-colors flex-shrink-0"
        >
          <Circle size={20} />
        </button>
        <div className="flex-1 min-h-[24px]">
          <div className="flex justify-between items-center gap-2">
            <span
              onClick={() => openTaskModal(task)}
              className="text-sm text-black font-medium break-words block cursor-pointer hover:text-indigo-600 transition-colors"
              title="Click to view details"
            >
              {task.title}
            </span>
            {subtasksCount > 0 && (
              <div
                onClick={() => openTaskModal(task)}
                className="flex items-center gap-1 text-[10px] font-bold text-black/50 bg-black/5 px-1.5 py-0.5 border border-black/10 rounded-sm flex-shrink-0 h-fit cursor-pointer hover:bg-black/10 hover:text-black transition-colors"
                title="View details"
              >
                <ListTodo size={12} />
                <span>
                  {completedSubtasksCount}/{subtasksCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// --- COMPOSANT TÂCHE TERMINÉE ---
export const CompletedTaskCard = React.memo(function CompletedTaskCard({
  task,
  deleteTask,
  toggleTask,
}) {
  return (
    <div className="bg-black/5 p-3 mb-2 rounded-none border-2 border-dashed border-black/20 opacity-75 group flex items-center gap-3">
      <button
        onClick={() => toggleTask(task.id)}
        className="text-green-600 hover:text-black transition-colors flex-shrink-0"
      >
        <CheckCircle2 size={20} />
      </button>
      <div className="flex-1">
        <span className="text-sm text-black/60 font-medium break-words line-through decoration-black/40">
          {task.title}
        </span>
      </div>
      <button onClick={() => deleteTask(task.id)} className="text-black/30 hover:text-red-500">
        <Trash2 size={16} />
      </button>
    </div>
  )
})
