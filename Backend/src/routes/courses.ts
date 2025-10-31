import { Router } from "express";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { validate } from "../middleware/validate";
import { createCourseSchema, updateCourseSchema } from "../schemas/course.schemas";

const router = Router();

// Public endpoint to list courses (development convenience)
router.get("/public", async (req: any, res: any) => {
  try {
    const courses = await prisma.courses.findMany({
      select: { id: true, code: true, name: true, semester: true }
    });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching public courses:', error, (error && (error as any).stack) ? (error as any).stack : 'no-stack');
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

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

// Get all courses (for admin) or courses for specific faculty
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    let courses;
    if (role === 'ADMIN') {
      courses = await prisma.courses.findMany({
        include: {
          faculty: {
            select: { id: true, name: true, email: true }
          },
          sessions: {
            select: { id: true, class_code: true, is_active: true, start_time: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (role === 'FACULTY') {
      courses = await prisma.courses.findMany({
        where: { faculty_id: id },
        include: {
          faculty: {
            select: { id: true, name: true, email: true }
          },
          sessions: {
            select: { id: true, class_code: true, is_active: true, start_time: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Create new course
router.post("/", authenticateToken, validate(createCourseSchema), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    
    if (role !== 'ADMIN' && role !== 'FACULTY') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { code, name, faculty_id, semester } = req.body;
    


    // Faculty can only create courses for themselves
    const courseFacultyId = role === 'FACULTY' ? id : faculty_id;
    
    if (!courseFacultyId) {
      return res.status(400).json({ error: 'Faculty ID required' });
    }

    // Check if faculty exists
    const faculty = await prisma.users.findFirst({
      where: { id: courseFacultyId, role: 'FACULTY' }
    });
    
    if (!faculty) {
      return res.status(400).json({ error: 'Invalid faculty ID' });
    }

    const course = await prisma.courses.create({
      data: {
        code: code.toUpperCase(),
        name,
        faculty_id: courseFacultyId,
        semester
      },
      include: {
        faculty: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(course);
  } catch (error: any) {
    console.error('Error creating course:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
});

// Update course
router.put("/:id", authenticateToken, validate(updateCourseSchema), async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const courseId = parseInt(req.params.id!);
    
    if (role !== 'ADMIN' && role !== 'FACULTY') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { code, name, faculty_id, semester } = req.body;
    
    // Check if course exists and user has permission
    const existingCourse = await prisma.courses.findFirst({
      where: { id: courseId }
    });
    
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (role === 'FACULTY' && existingCourse.faculty_id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {};
    if (code) updateData.code = code.toUpperCase();
    if (name) updateData.name = name;
    if (semester) updateData.semester = semester;
    if (role === 'ADMIN' && faculty_id) updateData.faculty_id = faculty_id;

    const course = await prisma.courses.update({
      where: { id: courseId },
      data: updateData,
      include: {
        faculty: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(course);
  } catch (error: any) {
    console.error('Error updating course:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update course' });
    }
  }
});

// Delete course
router.delete("/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, id } = req.user;
    const courseId = parseInt(req.params.id!);
    
    if (role !== 'ADMIN' && role !== 'FACULTY') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if course exists and user has permission
    const existingCourse = await prisma.courses.findFirst({
      where: { id: courseId }
    });
    
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (role === 'FACULTY' && existingCourse.faculty_id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.courses.delete({
      where: { id: courseId }
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;