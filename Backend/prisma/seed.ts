import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const facPass = await bcrypt.hash("faculty123", 10);
  const stuPass = await bcrypt.hash("student123", 10);

  // Create users
  const admin = await prisma.users.upsert({
    where: { email: "admin@ae.test" },
    update: {},
    create: { email: "admin@ae.test", name: "Admin", role: "ADMIN", password: adminPass },
  });

  const faculty = await prisma.users.upsert({
    where: { email: "faculty@ae.test" },
    update: {},
    create: { email: "faculty@ae.test", name: "Faculty", role: "FACULTY", password: facPass },
  });

  const student = await prisma.users.upsert({
    where: { email: "student@ae.test" },
    update: {},
    create: { email: "student@ae.test", name: "Student", role: "STUDENT", password: stuPass },
  });

  // Create sample courses
  const course1 = await prisma.courses.upsert({
    where: { code: "CS101" },
    update: {},
    create: {
      code: "CS101",
      name: "Introduction to Programming",
      faculty_id: faculty.id,
      semester: "Fall 2024"
    },
  });

  const course2 = await prisma.courses.upsert({
    where: { code: "CS201" },
    update: {},
    create: {
      code: "CS201",
      name: "Data Structures",
      faculty_id: faculty.id,
      semester: "Fall 2024"
    },
  });

  console.log("Seed data created successfully!");
  console.log("Users:", { admin: admin.email, faculty: faculty.email, student: student.email });
  console.log("Courses:", { course1: course1.code, course2: course2.code });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


