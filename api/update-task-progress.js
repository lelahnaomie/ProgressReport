import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { id, progress, status, update_note } = req.body;

  if (!id || progress === undefined || !status) {
    return res.status(400).json({ error: 'id, progress, and status are required' });
  }

  try {
    await client.execute({
      sql: `UPDATE tasks 
            SET progress = ?, status = ?, update_note = ? 
            WHERE id = ?`,
      args: [progress, status, update_note || null, id]
    });

    return res.status(200).json({ 
      success: true,
      message: 'task progress updated successfully'
    });
  } catch (error) {
    console.error('database update error:', error);
    return res.status(500).json({ error: error.message });
  }
}