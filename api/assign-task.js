// api/assign-task.js
import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { assignee_name, department, due_date, task_content } = req.body;

  if (!assignee_name || !department || !due_date || !task_content) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // 1. First, update the user's department in the users table
    await client.execute({
      sql: "UPDATE users SET department = ? WHERE name = ?",
      args: [department, assignee_name]
    });

    // 2. Then create the task
    await client.execute({
      sql: `INSERT INTO assigned_tasks 
            (assignee_name, department, due_date, task_content, status, progress) 
            VALUES (?, ?, ?, ?, 'Pending', 0)`,
      args: [assignee_name, department, due_date, task_content]
    });

    return res.status(201).json({ 
      message: 'Task assigned and department updated successfully' 
    });
  } catch (error) {
    console.error('Assignment error:', error);
    return res.status(500).json({ error: 'Failed to assign task' });
  }
}