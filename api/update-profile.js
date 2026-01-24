// api/update-profile.js
import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, name, email } = req.body;

  if (!id || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute({
      sql: "UPDATE users SET name = ?, email = ? WHERE id = ?",
      args: [name, email, id]
    });

    return res.status(200).json({ 
      message: "Profile updated successfully",
      user: { id, name, email }
    });
  } catch (error) {
    console.error("Profile update error:", error);
    
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Email already in use" });
    }
    
    return res.status(500).json({ error: "Failed to update profile" });
  }
}