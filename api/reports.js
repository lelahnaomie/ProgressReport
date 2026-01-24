import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // 1. Enforce POST method for all reporting actions 🛡️
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { action, user_id, id, status, employee_name, department, start_date, end_date, task_summary } = req.body;

  try {
    // --- 📥 ACTION: SUBMIT ---
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

    // --- 🔍 ACTION: GET ---
    else if (action === 'getReports') {
      // SECURITY: Fetch the user's actual role from the DB instead of trusting the request body 👮
      const userResult = await client.execute({
        sql: "SELECT role FROM users WHERE id = ? LIMIT 1",
        args: [user_id]
      });

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const userRole = userResult.rows[0].role;

      // Admins see everything; Employees only see their own reports 👁️
      const result = userRole === 'admin' 
        ? await client.execute("SELECT * FROM reports ORDER BY id DESC")
        : await client.execute({ 
            sql: "SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC", 
            args: [user_id] 
          });
          
      return res.status(200).json(result.rows);
    }

    // --- ✅ ACTION: UPDATE STATUS ---
    else if (action === 'updateStatus') {
      // SECURITY: Verify the requester is actually an admin before allowing the update 🚫
      const adminCheck = await client.execute({
        sql: "SELECT role FROM users WHERE id = ? LIMIT 1",
        args: [user_id] // This should be the ID of the person trying to perform the update
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