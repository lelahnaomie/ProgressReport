import { createClient } from '@libsql/client';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { action, user_id, id, status, employee_name, department, start_date, end_date, task_summary } = req.body;

  try {
    
    if (action === 'submit') {
      if (!user_id || !employee_name || !task_summary) {
        return res.status(400).json({ error: "Missing required report fields" });
      }

      await client.execute({
        sql: `INSERT INTO reports (user_id, employee_name, department, start_date, end_date, task_summary, status, submit_date) 
              VALUES (?, ?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)`,
        args: [user_id, employee_name, department, start_date, end_date, task_summary]
      });
      return res.status(200).json({ success: true, message: "Report submitted" });
    }

    else if (action === 'getReports') {

      const userResult = await client.execute({
        sql: "SELECT role FROM users WHERE id = ? LIMIT 1",
        args: [user_id]
      });

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const userRole = userResult.rows[0].role;

      const result = userRole === 'admin' 
        ? await client.execute("SELECT * FROM reports ORDER BY id DESC")
        : await client.execute({ 
            sql: "SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC", 
            args: [user_id] 
          });
          
      return res.status(200).json(result.rows);
    }

    else if (action === 'updateStatus') {
      const adminCheck = await client.execute({
        sql: "SELECT role FROM users WHERE id = ? LIMIT 1",
        args: [user_id] 
      });

      if (adminCheck.rows[0]?.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized: Admins only" });
      }

      await client.execute({ 
        sql: "UPDATE reports SET status = ? WHERE id = ?", 
        args: [status, id] 
      });
      return res.status(200).json({ success: true, message: "Status updated" });
    }

    else {
      return res.status(400).json({ error: "Invalid action" });
    }

  } catch (e) {
    console.error("Database Error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}