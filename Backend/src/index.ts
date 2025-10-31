import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import authRouter from "./routes/auth";
import coursesRouter from "./routes/courses";
import sessionsRouter from "./routes/sessions";
import attendanceRouter from "./routes/attendance";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", () => {});

// Basic request logging
app.use((req: any, _res: any, next: any) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req: any, res: any) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/attendance", attendanceRouter);

// 404 handler
app.use((req: any, res: any, _next: any) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const port = Number(process.env.PORT || 4000);

// Only start server when not running under test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`API listening on :${port}`);
  });
}

// Export app and server for testing
export { app, server };
export default app;
