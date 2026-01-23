import { createClient } from "@libsql/client/web";

export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Extract data from the body BEFORE using it
        const { email, password } = req.body || {};
        

        // 3. Log for debugging (now safe because email is defined)
        console.log("Login attempt for:", email);

        // 4. Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // 5. Initialize the database client
        const client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        // 6. Execute the query
        const result = await client.execute({
            sql: "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1",
            args: [email, password]
        });

        // 7. Check results
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Remove password from user object before sending to frontend for safety
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
        // This sends the actual error message back to your frontend
        return res.status(500).json({ error: e.message });
    }
}