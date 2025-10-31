import { PrismaClient } from "@prisma/client";
// Export prisma as `any` to avoid TypeScript issues in editor when backend
// dev dependencies are not installed in the workspace root (VSCode TS server
// sometimes resolves types from the wrong node_modules). At runtime this is
// still a real PrismaClient instance.
export const prisma: any = new PrismaClient();


