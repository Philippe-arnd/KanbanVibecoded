import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { arrayMove } from '@dnd-kit/sortable';
import { encrypt, decrypt } from '../utils/crypto';

export function useTasks(session) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [session]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*').order('position', { ascending: true });
      if (error) throw error;
      
      const decryptedData = (data || []).map(task => ({
        ...task,
        title: decrypt(task.title),
        subtasks: (task.subtasks || []).map(st => ({
          ...st,
          title: decrypt(st.title)
        }))
      }));

      setTasks(decryptedData);
    } catch (error) {
      console.error('Error loading tasks:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const addTask = async (title, mode) => {
    if (!title.trim() || !session?.user) return;
    
    const user = session.user;
    const tempId = Date.now().toString();
    const newTask = { 
      id: tempId, 
      title, 
      columnId: 'today', 
      completed: false, 
      type: mode,
      user_id: user.id,
      subtasks: [],
      position: Date.now()
    };
    
    // Optimistic update
    setTasks(prev => [...prev, newTask]);

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: encrypt(title), columnId: 'today', type: mode, user_id: user.id, subtasks: [] }])
      .select();
    
    if (data) {
        // We use the local title because data[0].title is encrypted (or we'd need to decrypt it)
        const savedTask = data[0];
        setTasks(prev => prev.map(t => t.id === tempId ? { ...savedTask, title: title, subtasks: [] } : t));
    } else if (error) {
        console.error("Error adding task:", error);
        // Revert on error could be implemented here
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error("Error deleting task:", error);
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t));
    
    const encryptedSubtasks = updatedSubtasks.map(st => ({
      ...st,
      title: encrypt(st.title)
    }));

    const { error } = await supabase.from('tasks').update({ subtasks: encryptedSubtasks }).eq('id', taskId);
    if (error) console.error("Error deleting subtask:", error);
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    if (error) console.error("Error toggling task:", error);
  };

  const updateTaskTitle = async (id, newTitle) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
    const { error } = await supabase.from('tasks').update({ title: encrypt(newTitle) }).eq('id', id);
    if (error) console.error("Error updating title:", error);
  };

  const updateTask = async (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    
    const taskToSave = {
      title: encrypt(updatedTask.title),
      subtasks: (updatedTask.subtasks || []).map(st => ({
        ...st,
        title: encrypt(st.title)
      }))
    };

    const { error } = await supabase.from('tasks').update({ 
        title: taskToSave.title,
        subtasks: taskToSave.subtasks 
    }).eq('id', updatedTask.id);
    if (error) console.error("Error updating task:", error);
  };

  const clearCompletedTasks = async (columnId, mode) => {
    const tasksToDelete = tasks.filter(t => (t.type || 'pro') === mode && t.columnId === columnId && t.completed);
    const idsToDelete = tasksToDelete.map(t => t.id);
    
    setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));
    const { error } = await supabase.from('tasks').delete().in('id', idsToDelete);
    if (error) console.error("Error clearing completed tasks:", error);
  };

  const moveTask = (active, over) => {
    setTasks(originalTasks => {
      const activeId = active.id;
      const overId = over.id;

      const oldIndex = originalTasks.findIndex(t => t.id === activeId);
      const newIndex = originalTasks.findIndex(t => t.id === overId);

      const isOverAColumn = over.data.current?.type === 'Column';

      if (oldIndex === -1 || (!isOverAColumn && newIndex === -1)) {
        return originalTasks;
      }

      // 1. Determine the new column ID and perform the reorder for optimistic UI
      const newColumnId = isOverAColumn ? overId : originalTasks[newIndex].columnId;
      const reorderedTasks = arrayMove(originalTasks, oldIndex, newIndex);

      // 2. Calculate new position
      const tasksInNewColumn = reorderedTasks.filter(t => t.columnId === newColumnId || t.id === activeId);
      const finalIndexInColumn = tasksInNewColumn.findIndex(t => t.id === activeId);

      const prevTask = tasksInNewColumn[finalIndexInColumn - 1];
      const nextTask = tasksInNewColumn[finalIndexInColumn + 1];

      let newPosition;
      if (tasksInNewColumn.length === 1) {
        newPosition = Date.now();
      } else if (finalIndexInColumn === 0) {
        newPosition = nextTask.position / 2;
      } else if (finalIndexInColumn === tasksInNewColumn.length - 1) {
        newPosition = prevTask.position + 1000;
      } else {
        newPosition = (prevTask.position + nextTask.position) / 2;
      }

      // 3. Create the final tasks array with the updated task
      const finalTasks = reorderedTasks.map(t => 
        t.id === activeId ? { ...t, columnId: newColumnId, position: newPosition } : t
      );
      
      // 4. Asynchronously persist the change
      persistTaskMove(activeId, newColumnId, newPosition, originalTasks);

      // 5. Return the new state for an optimistic update
      return finalTasks;
    });
  };

  const persistTaskMove = async (taskId, newColumnId, newPosition, originalTasks) => {
    const { error } = await supabase.from('tasks').update({ columnId: newColumnId, position: newPosition }).eq('id', taskId);
    if (error) {
      console.error("Error moving task:", error);
      setTasks(originalTasks); // Revert on error
    }
  };

  return {
    tasks,
    setTasks,
    loading,
    addTask,
    deleteSubtask,
    deleteTask,
    toggleTask,
    updateTaskTitle,
    updateTask,
    clearCompletedTasks,
    moveTask,
  };
}