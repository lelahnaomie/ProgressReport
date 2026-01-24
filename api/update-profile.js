import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, name, email, department } = req.body;

  try {

    const userResult = await client.execute({
      sql: "SELECT department FROM users WHERE id = ?",
      args: [id]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentDeptInDb = userResult.rows[0].department;

    const finalDepartment = (currentDeptInDb && currentDeptInDb !== "") 
                             ? currentDeptInDb 
                             : department;


    await client.execute({
      sql: `UPDATE users 
            SET name = ?, email = ?, department = ? 
            WHERE id = ?`,
      args: [name, email,finalDepartment, id]
    });

    
    return res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully",
      locked: !!currentDeptInDb 
    });

  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({ error: error.message });
  }
}