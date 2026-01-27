// api/get-tasks.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { assignee_name } = req.query;

  try {
    let sql = "SELECT * FROM tasks ORDER BY assigned_date DESC";
    let args = [];

    // if assignee_name is provided, filter by it
    if (assignee_name) {
      sql = "SELECT * FROM tasks WHERE assignee_name = ? ORDER BY assigned_date DESC";
      args = [assignee_name];
    }

    const result = await client.execute({
      sql: sql,
      args: args
    });

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('get tasks error:', error);
    return res.status(500).json({ error: 'failed to fetch tasks' });
  }
}