/* global process */
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to read .env
const readEnv = () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '../.env');
  
  try {
    const data = fs.readFileSync(envPath, 'utf8');
    const env = {};
    data.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const firstEqualIndex = trimmedLine.indexOf('=');
      if (firstEqualIndex !== -1) {
        const key = trimmedLine.substring(0, firstEqualIndex).trim();
        const value = trimmedLine.substring(firstEqualIndex + 1).trim();
        if (key && value) {
          env[key] = value;
        }
      }
    });
    return env;
  } catch (error) {
    console.error('Error reading .env file:', error);
    process.exit(1);
  }
};

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const SECRET_KEY = env.VITE_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !SECRET_KEY) {
  console.error('Missing environment variables. Please check .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const encrypt = (text) => {
  if (!text) return text;
  // If it already looks encrypted (starts with U2FsdGVkX1 - Salted__ in Base64), skip
  // Note: This is a heuristic. If a user actually typed this specific string, it would be skipped.
  // But for migration purposes, it's a reasonable safety check.
  if (text.startsWith('U2FsdGVkX1')) return text; 

  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (e) {
    console.error('Encryption error:', e);
    return text;
  }
};

const migrate = async () => {
  console.log('Starting encryption migration...');
  
  // Fetch all tasks
  const { data: tasks, error } = await supabase.from('tasks').select('*');
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log(`Found ${tasks.length} tasks.`);
  let updatedCount = 0;

  for (const task of tasks) {
    let needsUpdate = false;
    let newTitle = task.title;
    
    // Check Title
    if (task.title && !task.title.startsWith('U2FsdGVkX1')) {
      newTitle = encrypt(task.title);
      needsUpdate = true;
    }

    // Check Subtasks
    let newSubtasks = task.subtasks;
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const encryptedSubtasks = task.subtasks.map(st => {
        if (st.title && !st.title.startsWith('U2FsdGVkX1')) {
          needsUpdate = true;
          return { ...st, title: encrypt(st.title) };
        }
        return st;
      });
      if (needsUpdate) {
        newSubtasks = encryptedSubtasks;
      }
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ title: newTitle, subtasks: newSubtasks })
        .eq('id', task.id);
      
      if (updateError) {
        console.error(`Failed to update task ${task.id}:`, updateError);
      } else {
        updatedCount++;
        // process.stdout.write('.');
      }
    }
  }

  console.log(`\nMigration complete. Updated ${updatedCount} tasks.`);
};

migrate();
