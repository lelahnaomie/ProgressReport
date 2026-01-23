import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, employee_name, department, start_date, end_date, task_summary } = req.body;

  try {
    await client.execute({
      sql: `INSERT INTO reports (user_id, employee_name, department, start_date, end_date, task_summary, status, submit_date) 
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)`,
      args: [user_id, employee_name, department, start_date, end_date, task_summary]
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}