import { z } from "zod";

const courseCodeSchema = z.string()
  .min(2, "Course code must be at least 2 characters")
  .max(10, "Course code must be at most 10 characters")
  .toUpperCase()
  .trim();

const courseNameSchema = z.string()
  .min(3, "Course name must be at least 3 characters")
  .max(100, "Course name must be at most 100 characters")
  .trim();

const semesterSchema = z.string()
  .min(3, "Semester must be at least 3 characters")
  .max(20, "Semester must be at most 20 characters")
  .trim();

export const createCourseSchema = z.object({
  code: courseCodeSchema,
  name: courseNameSchema,
  faculty_id: z.number().int().positive(),
  semester: semesterSchema,
});

export const updateCourseSchema = z.object({
  code: courseCodeSchema.optional(),
  name: courseNameSchema.optional(),
  faculty_id: z.number().int().positive().optional(),
  semester: semesterSchema.optional(),
}).refine((data: any) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});