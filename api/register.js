import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { name, email, password } = req.body;

  try {
    await client.execute({
      sql: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'employee')",
      args: [name, email, password]
    });
    res.status(200).json({ message: "User registered successfully!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}