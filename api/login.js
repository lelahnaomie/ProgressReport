import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body || {};
        console.log("Login attempt for:", email);

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const dbUrl = process.env.TURSO_DATABASE_URL.replace("libsql://", "https://");

        const client = createClient({
            url: dbUrl,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        const result = await client.execute({
            sql: "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1",
            args: [email, password]
        });

        if (result.rows.length > 0) {
            const user = result.rows[0];
            delete user.password; 
            return res.status(200).json({
                message: "Login successful",
                user: user
            });
        } else {
            return res.status(401).json({ error: "Invalid email or password" });
        }

    } catch (e) {
        console.error("Database or Server Error:", e);
        return res.status(500).json({ error: e.message });
    }
}