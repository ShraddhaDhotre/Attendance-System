import { z } from "zod";

export const sessionStartSchema = z.object({
  courseId: z.number().int().positive(),
  lat: z.preprocess((v: any) => (typeof v === 'string' ? parseFloat(v) : v), z.number().min(-90).max(90)),
  lng: z.preprocess((v: any) => (typeof v === 'string' ? parseFloat(v) : v), z.number().min(-180).max(180)),
  radiusM: z.preprocess(
    (v: any) => (typeof v === 'string' ? parseInt(v as string, 10) : v), 
    z.number().int().min(10).max(1000)
  ).default(100),
  durationMinutes: z.number().int().min(15).max(180).default(60),
});

export const sessionEndSchema = z.object({
  sessionId: z.number().int().positive(),
});

// Schema for querying active sessions
export const activeSessionQuerySchema = z.object({
  courseId: z.number().int().positive().optional(),
});
