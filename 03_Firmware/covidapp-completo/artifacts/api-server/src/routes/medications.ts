import { Router } from "express";
import { db, medicationsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

function isStaff(req: any) {
  return ["superadmin", "therapist", "nonmedical_admin"].includes(req.session.role || "");
}

// GET patient's own medications
router.get("/my", async (req, res) => {
  try {
    const meds = await db
      .select({
        id: medicationsTable.id,
        medicineName: medicationsTable.medicineName,
        dosage: medicationsTable.dosage,
        frequency: medicationsTable.frequency,
        routeOfAdmin: medicationsTable.routeOfAdmin,
        startDate: medicationsTable.startDate,
        endDate: medicationsTable.endDate,
        instructions: medicationsTable.instructions,
        isActive: medicationsTable.isActive,
        createdAt: medicationsTable.createdAt,
        prescribedByName: usersTable.fullName,
      })
      .from(medicationsTable)
      .innerJoin(usersTable, eq(medicationsTable.prescribedById, usersTable.id))
      .where(eq(medicationsTable.patientId, req.session.userId!))
      .orderBy(medicationsTable.createdAt);
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// GET medications for patient (by staff)
router.get("/patient/:patientId", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const patientId = parseInt(req.params.patientId);
    const meds = await db
      .select({
        id: medicationsTable.id,
        medicineName: medicationsTable.medicineName,
        dosage: medicationsTable.dosage,
        frequency: medicationsTable.frequency,
        routeOfAdmin: medicationsTable.routeOfAdmin,
        startDate: medicationsTable.startDate,
        endDate: medicationsTable.endDate,
        instructions: medicationsTable.instructions,
        isActive: medicationsTable.isActive,
        createdAt: medicationsTable.createdAt,
        prescribedByName: usersTable.fullName,
      })
      .from(medicationsTable)
      .innerJoin(usersTable, eq(medicationsTable.prescribedById, usersTable.id))
      .where(eq(medicationsTable.patientId, patientId))
      .orderBy(medicationsTable.createdAt);
    res.json(meds);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST — prescribe medication
router.post("/", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const { patientId, medicineName, dosage, frequency, routeOfAdmin, startDate, endDate, instructions } = req.body;
    if (!patientId || !medicineName || !dosage || !frequency || !startDate) {
      res.status(400).json({ error: "Campos requeridos: patientId, medicineName, dosage, frequency, startDate" }); return;
    }

    const [med] = await db.insert(medicationsTable).values({
      prescribedById: req.session.userId!,
      patientId,
      medicineName,
      dosage,
      frequency,
      routeOfAdmin: routeOfAdmin || "oral",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      instructions: instructions || null,
    }).returning();

    const prescriber = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    await db.insert(notificationsTable).values({
      userId: patientId,
      title: `Nueva medicación prescrita: ${medicineName}`,
      message: `${prescriber[0]?.fullName || "Tu médico"} te ha recetado ${medicineName} ${dosage} — ${frequency}.`,
      type: "medication",
    });

    res.status(201).json(med);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT — update/deactivate medication
router.put("/:id", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const id = parseInt(req.params.id);
    const { medicineName, dosage, frequency, routeOfAdmin, startDate, endDate, instructions, isActive } = req.body;

    const [updated] = await db.update(medicationsTable).set({
      ...(medicineName && { medicineName }),
      ...(dosage && { dosage }),
      ...(frequency && { frequency }),
      ...(routeOfAdmin && { routeOfAdmin }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(instructions !== undefined && { instructions }),
      ...(isActive !== undefined && { isActive }),
    }).where(eq(medicationsTable.id, id)).returning();

    if (!updated) { res.status(404).json({ error: "Medicación no encontrada" }); return; }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
