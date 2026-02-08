import React, { useMemo } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Eraser } from 'lucide-react'
import { TaskCard, CompletedTaskCard } from './TaskCard'

// --- COLUMN COMPONENT ---
export const KanbanColumn = React.memo(function KanbanColumn({
  col,
  tasks,
  deleteTask,
  toggleTask,
  updateTitle,
  clearCompleted,
  openTaskModal,
}) {
  const { setNodeRef } = useSortable({ id: col.id, data: { type: 'Column', col } })

  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks])
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks])

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#E0EBDD] rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-[500px] flex flex-col min-w-[280px] md:min-w-0 snap-center`}
    >
      <div
        className={`flex justify-between items-center p-2 border-b-2 border-black ${col.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-black text-sm uppercase tracking-wide">{col.title}</h2>
          <span className="bg-white/80 border border-black px-2 py-0.5 rounded-sm text-xs font-bold">
            {activeTasks.length}
          </span>
        </div>
        {completedTasks.length > 0 && (
          <button
            onClick={() => clearCompleted(col.id)}
            className="text-xs flex items-center gap-1 bg-white hover:bg-red-100 text-black px-2 py-1 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none"
          >
            <Eraser size={14} /> Clean
          </button>
        )}
      </div>
      <div className="flex-1 p-4">
        <SortableContext
          items={activeTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              deleteTask={deleteTask}
              toggleTask={toggleTask}
              updateTitle={updateTitle}
              openTaskModal={openTaskModal}
            />
          ))}
        </SortableContext>
      </div>
      {completedTasks.length > 0 && (
        <div className="mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px bg-black/30 flex-1 border-t border-dashed border-black/40 opacity-50"></div>
            <span className="text-xs font-medium text-black/50 uppercase">
              Completed ({completedTasks.length})
            </span>
            <div className="h-px bg-black/30 flex-1 border-t border-dashed border-black/40 opacity-50"></div>
          </div>
          <div className="opacity-80">
            {completedTasks.map((task) => (
              <CompletedTaskCard
                key={task.id}
                task={task}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
