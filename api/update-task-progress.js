import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, progress, status } = req.body;

  try {
    // We target the specific task ID to update its progress
    await client.execute({
      sql: "UPDATE tasks SET progress = ?, status = ? WHERE id = ?",
      args: [progress, status, id]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Database Update Error:", error);
    return res.status(500).json({ error: error.message });
  }
}