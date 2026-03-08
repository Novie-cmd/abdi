import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    barcode_id TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT CHECK(type IN ('IN', 'OUT')),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );
`);

// Seed some dummy data if empty
const employeeCount = db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number };
if (employeeCount.count === 0) {
  const insert = db.prepare("INSERT INTO employees (id, name, position, barcode_id) VALUES (?, ?, ?, ?)");
  insert.run("EMP001", "Budi Santoso", "Staff IT", "BARCODE-001");
  insert.run("EMP002", "Siti Aminah", "Administrasi", "BARCODE-002");
  insert.run("EMP003", "Ahmad Fauzi", "Keamanan", "BARCODE-003");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/employees", (req, res) => {
    const employees = db.prepare("SELECT * FROM employees").all();
    res.json(employees);
  });

  app.get("/api/attendance/today", (req, res) => {
    const attendance = db.prepare(`
      SELECT a.*, e.name 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE date(a.timestamp) = date('now', 'localtime')
      ORDER BY a.timestamp DESC
    `).all();
    res.json(attendance);
  });

  app.post("/api/attendance/scan", (req, res) => {
    const { barcode } = req.body;
    const employee = db.prepare("SELECT * FROM employees WHERE barcode_id = ?").get(barcode) as any;

    if (!employee) {
      return res.status(404).json({ error: "Barcode tidak terdaftar" });
    }

    // Check last status for today
    const lastStatus = db.prepare(`
      SELECT type FROM attendance 
      WHERE employee_id = ? AND date(timestamp) = date('now', 'localtime')
      ORDER BY timestamp DESC LIMIT 1
    `).get(employee.id) as any;

    const nextType = lastStatus?.type === "IN" ? "OUT" : "IN";

    const insert = db.prepare("INSERT INTO attendance (employee_id, type) VALUES (?, ?)");
    insert.run(employee.id, nextType);

    res.json({ 
      success: true, 
      employee: employee.name, 
      type: nextType,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
