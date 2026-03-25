import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password, email, fullName } = req.body;

    if (!username || !password || !email) {
      res.status(400).json({ error: "Usuario, contraseña y correo son requeridos" });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Este usuario ya está registrado" });
      return;
    }

    const existingEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      res.status(400).json({ error: "Este correo ya está registrado" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({ username, password: hashedPassword, email, fullName: fullName || null })
      .returning();

    req.session.userId = user.id;
    req.session.username = user.username;

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName },
      message: "Usuario registrado exitosamente",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName },
      message: "Sesión iniciada exitosamente",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Sesión cerrada exitosamente" });
  });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    res.json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
