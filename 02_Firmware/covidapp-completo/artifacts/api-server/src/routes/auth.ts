import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

async function checkDuplicates(username: string, email: string, res: any): Promise<boolean> {
  const existing = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
    .from(usersTable).where(or(eq(usersTable.username, username), eq(usersTable.email, email))).limit(1);
  if (existing.length > 0) {
    if (existing[0].username === username) {
      res.status(400).json({ error: "Este nombre de usuario ya está registrado" });
    } else {
      res.status(400).json({ error: "Este correo electrónico ya está registrado" });
    }
    return true;
  }
  return false;
}

// POST /api/auth/register — registro de pacientes
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, fullName, insuranceCompany, insuranceNumber, entryMethod } = req.body;

    if (!username || !password || !email) {
      res.status(400).json({ error: "Usuario, contraseña y correo son requeridos" }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" }); return;
    }
    if (await checkDuplicates(username, email, res)) return;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      username, password: hashedPassword, email,
      fullName: fullName || null,
      role: "patient",
      insuranceCompany: insuranceCompany || null,
      insuranceNumber: insuranceNumber || null,
      entryMethod: entryMethod || null,
    }).returning();

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role },
      message: "Cuenta de paciente creada exitosamente",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/register-staff — registro de personal (terapeutas, secretarias, admin no médico)
// Solo superadmin puede crear cuentas de personal
router.post("/register-staff", requireAuth, async (req, res) => {
  try {
    if (req.session.role !== "superadmin") {
      res.status(403).json({ error: "Solo el superadministrador puede registrar personal" }); return;
    }

    const {
      username, password, email, fullName, role,
      jobTitle, department, specialization, licenseNumber, phone,
    } = req.body;

    const allowedRoles = ["therapist", "nonmedical_admin"];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: `Rol inválido. Roles permitidos: ${allowedRoles.join(", ")}` }); return;
    }
    if (!username || !password || !email || !role) {
      res.status(400).json({ error: "username, password, email y role son requeridos" }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" }); return;
    }
    if (await checkDuplicates(username, email, res)) return;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      username, password: hashedPassword, email,
      fullName: fullName || null,
      role,
      jobTitle: jobTitle || null,
      department: department || null,
      specialization: specialization || null,
      licenseNumber: licenseNumber || null,
      phone: phone || null,
    }).returning();

    const { password: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, message: `Cuenta de ${role === "therapist" ? "terapeuta" : "administrativo"} creada exitosamente` });
  } catch (err) {
    console.error("Register staff error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Usuario y contraseña son requeridos" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) { res.status(401).json({ error: "Usuario o contraseña incorrectos" }); return; }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) { res.status(401).json({ error: "Usuario o contraseña incorrectos" }); return; }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      user: {
        id: user.id, username: user.username, email: user.email,
        fullName: user.fullName, role: user.role,
      },
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
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!user) { res.status(401).json({ error: "No autenticado" }); return; }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
