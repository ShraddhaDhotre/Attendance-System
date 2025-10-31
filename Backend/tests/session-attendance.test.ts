import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import app from '../src/index';
import { prisma } from '../src/utils/prisma';

const TEST_FACULTY = {
  id: 1,
  email: 'test.faculty@example.com',
  name: 'Test Faculty',
  role: 'FACULTY',
};

const TEST_STUDENT = {
  id: 2,
  email: 'test.student@example.com',
  name: 'Test Student',
  role: 'STUDENT',
};

describe('Session and Attendance Flow', () => {
  let facultyToken: string;
  let studentToken: string;
  let courseId: number;
  let sessionId: number;
  let classCode: string;

  beforeAll(async () => {
    // Generate test tokens
    facultyToken = jwt.sign(TEST_FACULTY, process.env.JWT_SECRET || 'dev_jwt_secret_change_me');
    studentToken = jwt.sign(TEST_STUDENT, process.env.JWT_SECRET || 'dev_jwt_secret_change_me');

    // Create test course
    const course = await prisma.courses.create({
      data: {
        code: 'TEST101',
        name: 'Test Course',
        semester: '2025-1',
        faculty_id: TEST_FACULTY.id,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.attendance_records.deleteMany({ where: {} });
    await prisma.class_sessions.deleteMany({ where: {} });
    await prisma.courses.deleteMany({ where: { id: courseId } });
  });

  describe('Session Management', () => {
    it('should allow faculty to start a session', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          courseId,
          lat: 0,
          lng: 0,
          radiusM: 100,
          durationMinutes: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('class_code');
      expect(res.body.is_active).toBe(true);

      sessionId = res.body.id;
      classCode = res.body.class_code;
    });

    it('should not allow student to start a session', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId,
          lat: 0,
          lng: 0,
          radiusM: 100,
        });

      expect(res.status).toBe(403);
    });

    it('should list active sessions', async () => {
      // If a session was already created by previous test, use it; otherwise create one.
      let createdSessionId = sessionId;
      if (!createdSessionId) {
        const createRes = await request(app)
          .post('/api/sessions/start')
          .set('Authorization', `Bearer ${facultyToken}`)
          .send({
            courseId,
            lat: 0,
            lng: 0,
            radiusM: 100,
            durationMinutes: 60,
          });

        expect(createRes.status).toBe(201);
        createdSessionId = createRes.body.id;
      }

      // Now check active sessions
      const res = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // There should be at least one active session for this faculty
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      // Verify one of the returned sessions matches the created one
      const found = res.body.find((s: any) => s.id === createdSessionId);
      expect(found).toBeDefined();
    });
  });

  describe('Attendance Submission', () => {
    it('should allow student to submit attendance within radius', async () => {
      const res = await request(app)
        .post('/api/attendance/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classCode,
          lat: 0.0001, // Very close to session location
          lng: 0.0001,
          deviceInfo: {
            userAgent: 'test-agent',
            platform: 'test',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Attendance submitted successfully');
    });

    it('should not allow duplicate attendance submission', async () => {
      const res = await request(app)
        .post('/api/attendance/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classCode,
          lat: 0,
          lng: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Attendance already submitted for this session');
    });

    it('should reject attendance outside radius', async () => {
      const res = await request(app)
        .post('/api/attendance/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classCode,
          lat: 1, // Far from session location
          lng: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Location verification failed');
    });
  });

  describe('Session End', () => {
    it('should allow faculty to end session', async () => {
      const res = await request(app)
        .post(`/api/sessions/end/${sessionId}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ sessionId });

      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
      expect(res.body).toHaveProperty('end_time');
    });

    it('should not accept attendance after session ends', async () => {
      const res = await request(app)
        .post('/api/attendance/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classCode,
          lat: 0,
          lng: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid class code or session not active');
    });
  });
});