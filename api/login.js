import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get email and password FIRST
  const { email, password } = req.body;

  // NOW you can safely log it
  console.log("Login attempt for:", email);

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Create database client
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Query the database
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1",
      args: [email, password]
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Don't send password back to client (security)
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json({ 
        message: "Login successful", 
        user: userWithoutPassword 
      });
    } else {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }
  } catch (e) {
    console.error("Database error:", e);
    return res.status(500).json({ 
      error: "Server error occurred",
      details: e.message 
    });
  }
}