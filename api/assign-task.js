import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { assignee_name, department, due_date, task_content } = req.body;

  try {
    await client.execute({
      sql: `INSERT INTO tasks (assignee_name, department, due_date, task_content, status, progress, assigned_date) 
            VALUES (?, ?, ?, ?, 'Pending', 0, CURRENT_TIMESTAMP)`,
      args: [assignee_name, department, due_date, task_content]
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message });
  }
}