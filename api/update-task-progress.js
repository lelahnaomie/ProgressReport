import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { id, progress, status, update_note } = req.body;
  try {
    // 1. Update the main task progress
    await client.execute({
      sql: "UPDATE tasks SET progress = ?, status = ? WHERE id = ?",
      args: [progress, status, id]
    });
    // 2. (Optional) Log to a history table if you have one
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}