import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  try {
    const result = await client.execute("SELECT name FROM users WHERE role = 'employee'");
    const names = result.rows.map(row => row.name);
    return res.status(200).json(names);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}