import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const PUBLIC_FIELDS = {
  id: usersTable.id,
  username: usersTable.username,
  email: usersTable.email,
  fullName: usersTable.fullName,
  role: usersTable.role,
  phone: usersTable.phone,
  address: usersTable.address,
  birthdate: usersTable.birthdate,
  documentType: usersTable.documentType,
  documentNumber: usersTable.documentNumber,
  bloodType: usersTable.bloodType,
  emergencyContact: usersTable.emergencyContact,
  emergencyPhone: usersTable.emergencyPhone,
  allergies: usersTable.allergies,
  insuranceCompany: usersTable.insuranceCompany,
  insuranceNumber: usersTable.insuranceNumber,
  entryMethod: usersTable.entryMethod,
  preferredLanguage: usersTable.preferredLanguage,
  emailNotifications: usersTable.emailNotifications,
  jobTitle: usersTable.jobTitle,
  department: usersTable.department,
  specialization: usersTable.specialization,
  licenseNumber: usersTable.licenseNumber,
  createdAt: usersTable.createdAt,
};

router.get("/", async (req, res) => {
  try {
    const [user] = await db.select(PUBLIC_FIELDS).from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

router.put("/", async (req, res) => {
  try {
    const allowed = [
      "fullName", "phone", "address", "birthdate", "documentType", "documentNumber",
      "bloodType", "emergencyContact", "emergencyPhone", "allergies",
      "insuranceCompany", "insuranceNumber", "entryMethod",
      "preferredLanguage", "emailNotifications",
      "jobTitle", "department", "specialization", "licenseNumber",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key] || null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No hay campos para actualizar" }); return;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.session.userId!)).returning();
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// Admin: ver perfil de cualquier usuario
router.get("/:id", async (req, res) => {
  try {
    const role = req.session.role || "";
    if (!["superadmin", "therapist", "nonmedical_admin"].includes(role)) {
      res.status(403).json({ error: "Acceso denegado" }); return;
    }
    const [user] = await db.select(PUBLIC_FIELDS).from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1);
    if (!user) { res.status(404).json({ error: "No encontrado" }); return; }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
