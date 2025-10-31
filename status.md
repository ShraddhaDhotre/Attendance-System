# AttendEase – Simplified PRD

## Overview
Role-based attendance system with secure authentication, dynamic data handling, and real-time session tracking.  
Users: **Admin**, **Faculty**, **Student**

---

## Goals
- Secure, location-based attendance tracking  
- Role-based dashboards  
- Real-time updates  
- Dynamic API integration (no static data)

---

## Backend (Express + Prisma + MySQL)
- Use environment variables for all configs (`.env`)
- Implement JWT authentication and role-based access
- APIs:  
  - `/auth/*` → login/register  
  - `/courses/*` → course CRUD  
  - `/sessions/*` → start/end sessions  
  - `/attendance/*` → submit and fetch records  
- Use dynamic database queries — no hardcoded values
- Validate all inputs and handle errors properly
 
Status: Backend features implemented and wired to frontend where applicable. Key points:
- JWT auth endpoints implemented (`/api/auth/login`, `/api/auth/register`). Frontend now uses `VITE_API_URL` and `apiFetch` to call them.
- Course CRUD endpoints implemented and protected by RBAC. Public listing `/api/courses/public` available for student discovery.
- Session management implemented (`/api/sessions/start`, `/api/sessions/end`, `/api/sessions/active`) with class code generation and expiry times.
- Attendance submission implemented (`/api/attendance/submit`) with geofence Haversine validation, anti-replay unique constraint, and rate limiting (Redis-backed with memory fallback).
- Zod validation applied to key endpoints. Error handling improved across routes.

---

## Frontend (React + TypeScript + Vite)
- Connect all pages dynamically to backend APIs
- Remove static data; fetch everything from the server
- Implement role-based dashboards:
  - Admin → manage users, courses, reports  
  - Faculty → start/end sessions, view attendance  
  - Student → submit attendance, view history  
- Use React Router for protected routes  
- Use `.env` for API base URL (no hardcoded localhost)

Status: Frontend now uses `src/utils/api.ts` which reads `import.meta.env.VITE_API_URL` to build requests. `AuthContext` uses `apiFetch` and stores token/user in `localStorage`.
Student and Faculty dashboards now call backend endpoints via `apiFetch`. Some UI placeholders remain (instructor names, schedules) because an explicit enrollment model and scheduling metadata are not present in the DB schema yet.

---

## Core Requirements
- Everything must be **dynamic**, not static  
- All constants, URLs, and secrets go in `.env`  
- Code must update real files, not this PRD  
- Frontend and backend must be connected via API  

Status: Achieved for core flows: login, start/end sessions, submit attendance, fetch attendance history, list courses. Environment variable examples added (`.env.example` at project root and `Backend/.env.example`).

---

## Non-Functional Targets
- Secure auth (JWT + bcrypt)  
- Fast API (<200ms typical response)  
- Accessible UI (responsive, WCAG AA)  
- Error handling and logging throughout  

---

## Testing
- Test all API endpoints (auth, course, attendance)  
- Test role-based login/logout  
- Validate geolocation-based attendance  
- End-to-end test: Admin → Faculty → Student flow  

Status: Basic integration tests added under `Backend/tests/session-attendance.test.ts` using Jest + Supertest covering session start, attendance submit, duplicate prevention, and session end. Running tests locally requires a configured test database and proper `DATABASE_URL` in environment.
