import { Router } from "express";
import { db, usersTable, appointmentsTable, notificationsTable } from "@workspace/db";
import { eq, ne, count } from "drizzle-orm";

const router = Router();

function requireNonMedical(req: any, res: any, next: any) {
  if (!req.session.userId) { res.status(401).json({ error: "No autenticado" }); return; }
  if (!["nonmedical_admin", "superadmin"].includes(req.session.role || "")) {
    res.status(403).json({ error: "Acceso denegado" }); return;
  }
  next();
}

// GET /api/nonmedical-admin/stats
router.get("/stats", requireNonMedical, async (req, res) => {
  try {
    const patients = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        email: usersTable.email,
        insuranceCompany: usersTable.insuranceCompany,
        insuranceNumber: usersTable.insuranceNumber,
        entryMethod: usersTable.entryMethod,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "patient"))
      .orderBy(usersTable.createdAt);

    const [{ value: totalAppointments }] = await db
      .select({ value: count() })
      .from(appointmentsTable);

    const [{ value: totalNotifications }] = await db
      .select({ value: count() })
      .from(notificationsTable);

    res.json({
      totalPatients: patients.length,
      totalAppointments,
      totalNotifications,
      patients,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
