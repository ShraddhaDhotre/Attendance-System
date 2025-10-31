import { Router } from 'express';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware to verify JWT token and admin role
const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_change_me', (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    req.user = user;
    next();
  });
};

// GET /api/admin/users - list users (admin only)
router.get('/users', authenticateAdmin, async (_req: any, res: any) => {
  try {
    const users = await prisma.users.findMany({ select: { id: true, email: true, name: true, role: true, created_at: true } });
    res.json(users);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// PUT /api/admin/users/:id - update user (admin only)
router.put('/users/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, email, role } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const updated = await prisma.users.update({ where: { id: userId }, data: updateData, select: { id: true, email: true, name: true, role: true, created_at: true } });
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating user:', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - delete user (admin only)
router.delete('/users/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const existing = await prisma.users.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    await prisma.users.delete({ where: { id: userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/reports/courses - per-course attendance summary
router.get('/reports/courses', authenticateAdmin, async (_req: any, res: any) => {
  try {
    const courses = await prisma.courses.findMany({ select: { id: true, code: true, name: true } });

    const data = await Promise.all(courses.map(async (course: any) => {
      const sessions = await prisma.class_sessions.findMany({ where: { course_id: course.id }, select: { id: true } });
      const sessionIds = sessions.map((s: any) => s.id);
      const attendanceCount = sessionIds.length ? await prisma.attendance_records.count({ where: { session_id: { in: sessionIds } } }) : 0;
      return { courseId: course.id, code: course.code, name: course.name, sessions: sessionIds.length, attendance: attendanceCount };
    }));

    res.json(data);
  } catch (err) {
    console.error('Error generating course reports:', err);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

export default router;
