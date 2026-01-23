import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Tweak: Ensure the URL uses https for the serverless environment
    const url = process.env.TURSO_DATABASE_URL?.replace("libsql://", "https://");

    const client = createClient({
        url: url,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const { user_id, department, start_date, end_date, task_summary, employee_name } = req.body;

    try {
        await client.execute({
            // Added 'status' to the columns and values
            sql: `INSERT INTO reports (user_id, department, start_date, end_date, task_summary, employee_name, submit_date, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                user_id, 
                department, 
                start_date, 
                end_date, 
                task_summary, 
                employee_name, 
                new Date().toISOString(),
                'Pending' // Explicitly setting the initial status
            ]
        });
        return res.status(200).json({ success: true });
    } catch (error) {
    console.error("FULL DATABASE ERROR:", error); // This will show the real problem in Vercel logs
    return res.status(500).json({ 
        error: error.message, 
        code: error.code 
    });
}
}