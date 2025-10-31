import { z } from "zod";

const emailSchema = z.string().email().min(3).max(255).toLowerCase().trim();
const passwordSchema = z.string().min(6).max(72); // bcrypt max is 72 bytes

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(2).max(100).trim(),
  password: passwordSchema,
  role: z.enum(["ADMIN", "FACULTY", "STUDENT"]).default("STUDENT"),
});