import { Router } from "express";
import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../schemas/auth.schemas";

const router = Router();

router.post("/login", validate(loginSchema), async (req: any, res: any) => {
  const { email, password } = req.body;
  try {
    console.log("/api/auth/login payload", { email, pwLen: password.length });
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          // allow login using username
          { name: email },
        ],
      },
    });
    console.log("/api/auth/login user", user ? { id: user.id, email: user.email, name: user.name, role: user.role, pwLen: user.password?.length } : null);
    if (!user || !user.password) return res.status(401).json({ error: "Invalid credentials" });
    const isBcrypt = await bcrypt.compare(password, user.password).catch(() => false);
    const isPlain = user.password === password;
    const isMatch = isBcrypt || isPlain;
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "dev_jwt_secret_change_me", { expiresIn: "7d" });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error("/api/auth/login error", e);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Temporary debug route to verify seeded users (do not enable in production)
router.get("/debug", async (_req: any, res: any) => {
  const users = await prisma.users.findMany({ select: { id: true, email: true, role: true } });
  res.json(users);
});

// Route to register new users
router.post("/register", validate(registerSchema), async (req: any, res: any) => {
  const { email, name, role, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const user = await prisma.users.create({ 
      data: { email, name, role, password: hashed } 
    });

    return res.json({ 
      id: user.id, 
      email: user.email,
      name: user.name, 
      role: user.role 
    });
  } catch (e) {
    console.error("/api/auth/register error", e);
    return res.status(500).json({ error: "Registration failed" });
  }
});

export default router;


