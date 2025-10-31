import { Router } from "express";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validate";
import { sessionStartSchema, sessionEndSchema, activeSessionQuerySchema, sessionEndParamsSchema } from "../schemas/session.schemas";
import { broadcast } from '../utils/sse';
import { rateLimiter } from "../middleware/redisRateLimiter";
import { AuthenticatedRequest } from "../types";

const router = Router();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || "dev_jwt_secret_change_me", (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate a random class code
const generateClassCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Start a new session
router.post("/start", authenticateToken, rateLimiter({ windowMs: 60000, max: 5, keyGenerator: (req) => `sessions:${req.user?.id || req.ip}` }), validate(sessionStartSchema, 'body'), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    if (role !== 'FACULTY') {
      return res.status(403).json({ error: 'Only faculty can start sessions' });
    }

    const { courseId, lat, lng, radiusM = 100, durationMinutes = 60 } = req.body;

    // Check if course exists and faculty has permission
    const course = await prisma.courses.findFirst({
      where: { 
        id: courseId,
        faculty_id: id 
      }
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Check if there's already an active session for this course
    const existingSession = await prisma.class_sessions.findFirst({
      where: { 
        course_id: courseId,
        is_active: true 
      }
    });
    
    if (existingSession) {
      return res.status(400).json({ error: 'Active session already exists for this course' });
    }

    // Generate unique class code
    let classCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      classCode = generateClassCode();
      const existing = await prisma.class_sessions.findFirst({
        where: { class_code: classCode }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique class code' });
    }

    const session = await prisma.class_sessions.create({
      data: {
        course_id: courseId,
        class_code: classCode!,
        start_time: new Date(),
        end_time: new Date(Date.now() + durationMinutes * 60 * 1000),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: parseInt(radiusM),
        created_by: id
      },
      include: {
        course: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// End a session
// Validate the URL param `id` using params schema, then end session
router.post("/end/:id", authenticateToken, validate(sessionEndParamsSchema, 'params'), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const sessionId = parseInt(req.params.id);
    
    if (role !== 'FACULTY') {
      return res.status(403).json({ error: 'Only faculty can end sessions' });
    }

    // Check if session exists and faculty has permission
    const session = await prisma.class_sessions.findFirst({
      where: { 
        id: sessionId,
        created_by: id,
        is_active: true 
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Active session not found or access denied' });
    }

    const updatedSession = await prisma.class_sessions.update({
      where: { id: sessionId },
      data: { 
        is_active: false,
        end_time: new Date()
      },
      include: {
        course: {
          select: { id: true, code: true, name: true }
        },
        attendance: {
          select: { id: true, student_id: true, submitted_at: true }
        }
      }
    });

    // Inform any live viewers this session ended
    try { broadcast(sessionId, 'sessionEnded', { sessionId }); } catch (err) {}
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Server-Sent Events endpoint: clients can subscribe to live updates for a session
// SSE: clients can subscribe to live updates for a session. EventSource can't send Authorization header,
// so accept token via query param `?token=` or via Authorization header.
router.get('/live/:id', (req: any, res: any) => {
  const sessionId = parseInt(req.params.id, 10);

  const tokenFromQuery = req.query && (req.query.token as string | undefined);
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split && authHeader.split(' ')[1]) || tokenFromQuery;

  if (!token) return res.status(401).json({ error: 'Access token required for live updates' });

  let user: any = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "dev_jwt_secret_change_me");
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // Only faculty or admin can subscribe to live faculty views
  if (!user || (user.role !== 'FACULTY' && user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Add listener and remove on close
  const remove = addListenerSafe(sessionId, res);
  req.on('close', () => remove());
});

// Helper to avoid importing addListener directly in this file (for readability)
import { addListener as addListenerSafe } from '../utils/sse';

// Get active sessions
router.get("/active", authenticateToken, validate(activeSessionQuerySchema, 'query'), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    let sessions;
    if (role === 'ADMIN') {
      sessions = await prisma.class_sessions.findMany({
        where: { is_active: true },
        include: {
          course: {
            select: { id: true, code: true, name: true }
          },
          faculty: {
            select: { id: true, name: true, email: true }
          },
          attendance: {
            select: { id: true, student_id: true, submitted_at: true }
          }
        },
        orderBy: { start_time: 'desc' }
      });
    } else if (role === 'FACULTY') {
      sessions = await prisma.class_sessions.findMany({
        where: { 
          is_active: true,
          created_by: id 
        },
        include: {
          course: {
            select: { id: true, code: true, name: true }
          },
          attendance: {
            select: { id: true, student_id: true, submitted_at: true }
          }
        },
        orderBy: { start_time: 'desc' }
      });
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// Get session attendance records
router.get("/:id/attendance", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const sessionId = parseInt(req.params.id);
    
    // Check if session exists and user has permission
    const session = await prisma.class_sessions.findFirst({
      where: { id: sessionId },
      include: {
        course: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Faculty can only see their own sessions, admin can see all
    if (role === 'FACULTY' && session.created_by !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await prisma.attendance_records.findMany({
      where: { session_id: sessionId },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching session attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

export default router;