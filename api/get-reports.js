import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { user_id, role } = req.query;
  try {
    const result = role === 'admin' 
      ? await client.execute("SELECT * FROM reports ORDER BY id DESC")
      : await client.execute({ sql: "SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC", args: [user_id] });
    return res.status(200).json(result.rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}