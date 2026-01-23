import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    const { user_id, role } = req.query;

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL.replace("libsql://", "https://"),
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
        let result;
        if (role === 'admin') {
            // Admin sees everything
            result = await client.execute("SELECT * FROM reports ORDER BY id DESC");
        } else {
            // Employee sees only theirs
            result = await client.execute({
                sql: "SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC",
                args: [user_id]
            });
        }
        return res.status(200).json(result.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}