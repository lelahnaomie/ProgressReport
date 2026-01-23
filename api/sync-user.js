import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { name, email, role, password } = req.body;
  try {
    await client.execute({
      sql: "INSERT OR IGNORE INTO users (name, email, role, password) VALUES (?, ?, ?, ?)",
      args: [name, email, role, password]
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}