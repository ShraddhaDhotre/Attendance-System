import { Router } from "express";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validate";
import { attendanceSubmitSchema } from "../schemas/attendance.schemas";
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

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Submit attendance
router.post("/submit", authenticateToken, rateLimiter({ windowMs: 60000, max: 3, keyGenerator: (req) => `attendance:${req.user.id}` }), validate(attendanceSubmitSchema, 'body'), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    if (role !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can submit attendance' });
    }

    const { classCode, lat, lng, deviceInfo } = req.body;

    // Find active session with the given class code
    const session = await prisma.class_sessions.findFirst({
      where: { 
        class_code: classCode.toUpperCase(),
        is_active: true 
      },
      include: {
        course: true
      }
    });
    
    if (!session) {
      return res.status(400).json({ error: 'Invalid class code or session not active' });
    }

    // Check if session has expired
    if (session.end_time && new Date() > new Date(session.end_time)) {
      return res.status(400).json({ error: 'Session has expired' });
    }



    // Verify geolocation (check if student is within the allowed radius)
    const distance = calculateDistance(
      parseFloat(lat), 
      parseFloat(lng), 
      session.lat, 
      session.lng
    );
    
    const isVerified = distance <= session.radius_m;
    
    if (!isVerified) {
      return res.status(400).json({ 
        error: `Location verification failed. You are ${Math.round(distance)}m away from the classroom (max: ${session.radius_m}m)` 
      });
    }

    // Check if student already submitted attendance for this session
    const existingAttendance = await prisma.attendance_records.findFirst({
      where: { 
        session_id: session.id,
        student_id: id 
      }
    });
    
    if (existingAttendance) {
      return res.status(400).json({ error: 'Attendance already submitted for this session' });
    }

    // Create attendance record
    const attendance = await prisma.attendance_records.create({
      data: {
        session_id: session.id,
        student_id: id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        is_verified: true,
        device_info: deviceInfo ? JSON.stringify(deviceInfo) : null
      },
      include: {
        session: {
          include: {
            course: {
              select: { code: true, name: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Attendance submitted successfully',
      attendance: {
        id: attendance.id,
        course: attendance.session.course,
        submitted_at: attendance.submitted_at,
        is_verified: attendance.is_verified
      }
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ error: 'Failed to submit attendance' });
  }
});

// Get student's attendance history
router.get("/student/:studentId", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const studentId = parseInt(req.params.studentId);
    
    // Students can only see their own attendance, faculty/admin can see any student's
    if (role === 'STUDENT' && studentId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (role !== 'STUDENT' && role !== 'FACULTY' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await prisma.attendance_records.findMany({
      where: { student_id: studentId },
      include: {
        session: {
          include: {
            course: {
              select: { id: true, code: true, name: true }
            }
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get attendance for a specific session
router.get("/session/:sessionId", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const sessionId = parseInt(req.params.sessionId);
    
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
    
    if (role !== 'FACULTY' && role !== 'ADMIN') {
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