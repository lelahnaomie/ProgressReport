// api/assign-task.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  console.log('assign-task called with method:', req.method);
  console.log('request body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { assignee_name, department, due_date, task_content } = req.body;

  console.log('parsed data:', { assignee_name, department, due_date, task_content });

  if (!assignee_name || !department || !due_date || !task_content) {
    console.error('missing fields:', { assignee_name, department, due_date, task_content });
    return res.status(400).json({ 
      error: 'all fields are required',
      received: { assignee_name, department, due_date, task_content }
    });
  }

  try {
    console.log('attempting to insert task...');
    
    // CHANGE 'tasks' to your actual table name if different
    const result = await client.execute({
      sql: `INSERT INTO tasks 
            (assignee_name, department, due_date, task_content, assigned_date, status, progress) 
            VALUES (?, ?, ?, ?, datetime('now'), 'Pending', 0)`,
      args: [assignee_name, department, due_date, task_content]
    });

    console.log('insert successful:', result);

    return res.status(201).json({ 
      message: 'task assigned successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('database error:', error);
    console.error('error details:', error.message);
    console.error('error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'failed to assign task',
      details: error.message,
      code: error.code
    });
  }
}