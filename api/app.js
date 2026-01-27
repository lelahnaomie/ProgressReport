import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { action, email, password, name } = req.body || {};

  try {
    if (action === 'register') {
      if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await client.execute({
        sql: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'employee')",
        args: [name, email, hashedPassword]
      });

      return res.status(200).json({ message: "User registered successfully!" });
    } 

    else if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const result = await client.execute({
        sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
        args: [email]
      });

      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
          delete user.password; 
          return res.status(200).json({ message: "Login successful", user });
        }
      }
      return res.status(401).json({ error: "Invalid email or password" });
    } 

    else {
      return res.status(400).json({ error: "Invalid action" });
    }

  } catch (e) {
    if (e.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: e.message });
  }
}