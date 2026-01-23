import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { assignee_name } = req.query;
  try {
    let result;
    if (assignee_name) {
      // For Employee View
      result = await client.execute({
        sql: "SELECT * FROM tasks WHERE assignee_name = ? ORDER BY id DESC",
        args: [assignee_name]
      });
    } else {
      // For Admin View
      result = await client.execute("SELECT * FROM tasks ORDER BY id DESC");
    }
    return res.status(200).json(result.rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}