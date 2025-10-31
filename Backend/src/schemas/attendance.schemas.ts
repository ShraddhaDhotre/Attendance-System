import { z } from "zod";

export const attendanceSubmitSchema = z.object({
  classCode: z.string().min(6).max(6).toUpperCase().trim(),
  lat: z.preprocess(
    (v: any) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number().min(-90).max(90)
  ),
  lng: z.preprocess(
    (v: any) => (typeof v === 'string' ? parseFloat(v) : v),
    z.number().min(-180).max(180)
  ),
  deviceInfo: z.object({
    userAgent: z.string().max(500),
    platform: z.string().max(50),
    screenSize: z.string().max(20).optional(),
  }).optional(),
});

