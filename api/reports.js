// api/reports.js
import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // ===== SUBMIT REPORT (POST) =====
    if (req.method === 'POST') {
      const { action, user_id, employee_name, department, start_date, end_date, task_summary, id, status } = req.body;

      // Submit new report
      if (action === 'submit') {
        if (!user_id || !employee_name || !department || !start_date || !end_date || !task_summary) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        await client.execute({
          sql: `INSERT INTO reports 
                (user_id, employee_name, department, start_date, end_date, task_summary, status, submit_date) 
                VALUES (?, ?, ?, ?, ?, ?, 'Pending', datetime('now'))`,
          args: [user_id, employee_name, department, start_date, end_date, task_summary]
        });

        return res.status(201).json({ message: 'Report submitted successfully' });
      }

      // Update report status (Approve/Reject)
      if (action === 'updateStatus' || status) {
        if (!id || !status) {
          return res.status(400).json({ error: 'Report ID and status are required' });
        }

        await client.execute({
          sql: "UPDATE reports SET status = ? WHERE id = ?",
          args: [status, id]
        });

        return res.status(200).json({ message: 'Report status updated' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    // ===== GET REPORTS (GET) =====
    if (req.method === 'GET') {
      const { user_id, role } = req.query;

      let sql = "SELECT * FROM reports ORDER BY submit_date DESC";
      let args = [];

      // If employee, filter by their user_id
      if (role === 'employee' && user_id) {
        sql = "SELECT * FROM reports WHERE user_id = ? ORDER BY submit_date DESC";
        args = [user_id];
      }

      const result = await client.execute({
        sql: sql,
        args: args
      });

      return res.status(200).json(result.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Reports API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}