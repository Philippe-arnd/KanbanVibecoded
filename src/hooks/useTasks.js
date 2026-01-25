import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { arrayMove } from '@dnd-kit/sortable';

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
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erreur chargement:', error.message);
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
      subtasks: []
    };
    
    // Optimistic update
    setTasks(prev => [...prev, newTask]);

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, columnId: 'today', type: mode, user_id: user.id, subtasks: [] }])
      .select();
    
    if (data) {
        setTasks(prev => prev.map(t => t.id === tempId ? data[0] : t));
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
    const { error } = await supabase.from('tasks').update({ title: newTitle }).eq('id', id);
    if (error) console.error("Error updating title:", error);
  };

  const updateTask = async (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    const { error } = await supabase.from('tasks').update({ 
        title: updatedTask.title,
        subtasks: updatedTask.subtasks 
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

  const moveTask = async (activeId, overId, columns) => {
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Case 1: Dropped over a column
    const isOverColumn = columns.some(c => c.id === overId);
    if (isOverColumn) {
       if (activeTask.columnId !== overId) {
         setTasks(prev => prev.map(t => t.id === activeId ? { ...t, columnId: overId } : t));
         await supabase.from('tasks').update({ columnId: overId }).eq('id', activeId);
       }
       return;
    }

    // Case 2: Dropped over another task
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
      if (activeTask.columnId !== overTask.columnId) {
        // Move to new column
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, columnId: overTask.columnId } : t));
        await supabase.from('tasks').update({ columnId: overTask.columnId }).eq('id', activeId);
      } else {
        // Reorder within same column (just local state reorder for now, assuming no specific order field in DB yet)
        // If DB has 'order' field, we would update it here. For now, we rely on array order.
        // Note: Without an 'order' field in DB, the reordering won't persist on refresh if we sort by something else.
        // But fulfilling the current logic:
        const oldIndex = tasks.findIndex(t => t.id === activeId);
        const newIndex = tasks.findIndex(t => t.id === overId);
        setTasks(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  return {
    tasks,
    setTasks,
    loading,
    addTask,
    deleteTask,
    toggleTask,
    updateTaskTitle,
    updateTask,
    clearCompletedTasks,
    moveTask
  };
}
