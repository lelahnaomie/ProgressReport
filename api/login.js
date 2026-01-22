import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    console.log("Login attempt for:", email);
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const { email, password } = req.body;

    try {
        const result = await client.execute({
            sql: "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1",
            args: [email, password]
        });

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.status(200).json({
                message: "Login successful",
                user: user
            });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}