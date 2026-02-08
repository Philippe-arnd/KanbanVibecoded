import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, CheckSquare, Square, GripVertical, Eraser } from 'lucide-react'

export function TaskDetailsModal({ task, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(task.title)
  // Ensure subtasks is an array. If it's null/undefined, default to empty array.
  // If it's a JSON string (from DB), parse it (handled by parent usually, but good to be safe if passed raw).
  // Assuming parent passes a clean object.
  const [subtasks, setSubtasks] = useState(Array.isArray(task.subtasks) ? task.subtasks : [])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const modalRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    onUpdate({ ...task, title: newTitle, subtasks })
  }

  const addSubtask = (e) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return

    const newSubtask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle,
      completed: false,
    }

    const updatedSubtasks = [...subtasks, newSubtask]
    setSubtasks(updatedSubtasks)
    setNewSubtaskTitle('')
    onUpdate({ ...task, title, subtasks: updatedSubtasks })
  }

  const toggleSubtask = (subtaskId) => {
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    setSubtasks(updatedSubtasks)
    onUpdate({ ...task, title, subtasks: updatedSubtasks })
  }

  const deleteSubtask = (subtaskId) => {
    const updatedSubtasks = subtasks.filter((st) => st.id !== subtaskId)
    setSubtasks(updatedSubtasks)
    onUpdate({ ...task, title, subtasks: updatedSubtasks })
  }

  const updateSubtaskTitle = (subtaskId, newTitle) => {
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, title: newTitle } : st
    )
    setSubtasks(updatedSubtasks)
    onUpdate({ ...task, title, subtasks: updatedSubtasks })
  }

  const completedCount = subtasks.filter((st) => st.completed).length
  const progress = subtasks.length === 0 ? 0 : Math.round((completedCount / subtasks.length) * 100)

  const handleDeleteTask = () => {
    onDelete(task.id)
    // The parent now handles showing a confirmation and closing this modal.
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="bg-white w-full max-w-lg rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-start p-4 border-b-2 border-black bg-[#FFC8A2]">
          <div className="flex-1 mr-4">
            <label className="block text-xs font-bold text-black/50 uppercase tracking-wide mb-1">
              Task
            </label>
            <textarea
              value={title}
              onChange={(e) => {
                handleTitleChange(e)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.target.blur()
                }
              }}
              rows={1}
              className="w-full bg-transparent text-xl font-bold text-black placeholder-black/30 outline-none border-b-2 border-transparent focus:border-black transition-colors resize-none overflow-hidden break-words whitespace-pre-wrap"
              placeholder="Task title"
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            {completedCount > 0 && (
              <button
                onClick={() => {
                  const updatedSubtasks = subtasks.filter((st) => !st.completed)
                  setSubtasks(updatedSubtasks)
                  onUpdate({ ...task, title, subtasks: updatedSubtasks })
                }}
                className="text-black/60 hover:text-red-600 transition-colors bg-white/50 hover:bg-white p-1 rounded-sm border-2 border-transparent hover:border-black"
                title="Clear completed subtasks"
              >
                <Eraser size={20} />
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              className="text-black/60 hover:text-red-600 transition-colors bg-white/50 hover:bg-white p-1 rounded-sm border-2 border-transparent hover:border-black"
              title="Delete task"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-black/60 hover:text-black transition-colors bg-white/50 hover:bg-white p-1 rounded-sm border-2 border-transparent hover:border-black"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-black uppercase">Checklist</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black/60">
                  {progress}% ({completedCount}/{subtasks.length})
                </span>
              </div>
            </div>
            <div className="h-3 w-full bg-black/10 border-2 border-black rounded-full overflow-hidden">
              <div
                className="h-full bg-[#88D8B0] transition-all duration-300 ease-out border-r-2 border-black"
                style={{ width: `${progress}%`, display: progress === 0 ? 'none' : 'block' }}
              ></div>
            </div>
          </div>

          {/* Add Subtask Form */}
          <form onSubmit={addSubtask} className="flex gap-2 mb-4">
            <input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a subtask..."
              className="flex-1 bg-white border-2 border-black p-2 text-sm font-medium outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-none placeholder-black/30"
            />
            <button
              type="submit"
              className="bg-black text-white p-2 border-2 border-black hover:bg-black/80 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Plus size={20} />
            </button>
          </form>

          {/* Subtasks List */}
          <div className="space-y-3 mb-6">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="group flex items-start gap-3 bg-gray-50 p-2 border-2 border-transparent hover:border-black/10 hover:bg-white transition-colors"
              >
                <button
                  onClick={() => toggleSubtask(subtask.id)}
                  className={`flex-shrink-0 transition-colors mt-1 ${subtask.completed ? 'text-[#88D8B0]' : 'text-black/20 hover:text-black/40'}`}
                >
                  {subtask.completed ? (
                    <CheckSquare size={20} className="text-black fill-[#88D8B0]" />
                  ) : (
                    <Square size={20} className="text-black" />
                  )}
                </button>
                <textarea
                  value={subtask.title}
                  onChange={(e) => {
                    updateSubtaskTitle(subtask.id, e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.target.blur()
                    }
                  }}
                  rows={1}
                  className={`flex-1 bg-transparent outline-none text-sm font-medium resize-none overflow-hidden break-words whitespace-pre-wrap ${subtask.completed ? 'text-black/40 line-through' : 'text-black'}`}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }
                  }}
                />
                <button
                  onClick={() => deleteSubtask(subtask.id)}
                  className="opacity-0 group-hover:opacity-100 text-black/20 hover:text-red-500 transition-all p-1 mt-0.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
