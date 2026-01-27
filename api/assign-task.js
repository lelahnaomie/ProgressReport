// api/assign-task.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { assignee_name, department, due_date, task_content } = req.body;

  if (!assignee_name || !department || !due_date || !task_content) {
    return res.status(400).json({ error: 'all fields are required' });
  }

  try {
    // insert into tasks table (not assigned_tasks)
    await client.execute({
      sql: `INSERT INTO tasks 
            (assignee_name, department, due_date, task_content, assigned_date, status, progress) 
            VALUES (?, ?, ?, ?, datetime('now'), 'Pending', 0)`,
      args: [assignee_name, department, due_date, task_content]
    });

    // optionally update user's department if they don't have one
    await client.execute({
      sql: "UPDATE users SET department = ? WHERE name = ? AND (department IS NULL OR department = '')",
      args: [department, assignee_name]
    });

    return res.status(201).json({ 
      message: 'task assigned successfully' 
    });
  } catch (error) {
    console.error('assign task error:', error);
    return res.status(500).json({ 
      error: 'failed to assign task',
      details: error.message 
    });
  }
}