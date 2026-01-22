import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  // Add CORS headers if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Now you can log safely
  console.log("Login attempt for:", email);

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const result = await client.execute({
      sql: "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1",
      args: [email, password]
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Don't send password back to client
      delete user.password;
      
      res.status(200).json({ 
        message: "Login successful", 
        user: user 
      });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (e) {
    console.error("Database error:", e);
    res.status(500).json({ error: "Server error occurred" });
  }
}