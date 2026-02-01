import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { tasks } from "./db/schema.js";
import { eq, and } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", process.env.BETTER_AUTH_URL];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Allow in production if needed, or refine based on domain
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

app.use(express.json());

// Healthcheck for Coolify
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// Auth routes
app.all(/\/api\/auth\/.*/, toNodeHandler(auth));

// Middleware to check session
const getSession = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        req.user = session.user;
        next();
    } catch (e) {
        console.error("Session check error", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Tasks API
app.get("/api/tasks", getSession, async (req, res) => {
    try {
        const userTasks = await db.select().from(tasks).where(eq(tasks.userId, req.user.id));
        // Sort by position? Client does it but good to have consistent order
        userTasks.sort((a, b) => a.position - b.position);
        res.json(userTasks);
    } catch (e) {
        console.error("Get tasks error", e);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

app.post("/api/tasks", getSession, async (req, res) => {
    try {
        const newTask = { ...req.body, userId: req.user.id };
        const result = await db.insert(tasks).values(newTask).returning();
        res.json(result);
    } catch (e) {
        console.error("Create task error", e);
        res.status(500).json({ error: "Failed to create task" });
    }
});

app.put("/api/tasks/:id", getSession, async (req, res) => {
    try {
        const { id } = req.params;
        // Security check: ensure task belongs to user
        const existing = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, req.user.id)));
        if (!existing.length) {
            return res.status(403).json({ error: "Forbidden or Not Found" });
        }
        
        // Remove userId from body to prevent ownership transfer via update
        const { userId, ...updateData } = req.body;

        const result = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
        res.json(result);
    } catch (e) {
        console.error("Update task error", e);
        res.status(500).json({ error: "Failed to update task" });
    }
});

app.delete("/api/tasks/:id", getSession, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, req.user.id)));
        if (!existing.length) {
            return res.status(403).json({ error: "Forbidden or Not Found" });
        }
        
        await db.delete(tasks).where(eq(tasks.id, id));
        res.json({ success: true });
    } catch (e) {
        console.error("Delete task error", e);
        res.status(500).json({ error: "Failed to delete task" });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../dist")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
    // If it's an API request that didn't match, don't serve index.html
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "Not Found" });
    }
    res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

