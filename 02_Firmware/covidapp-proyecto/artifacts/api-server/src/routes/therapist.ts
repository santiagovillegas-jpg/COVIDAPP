import { Router } from "express";
import { db, usersTable, therapistPatientsTable, therapyNotesTable, notificationsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function requireTherapist(req: any, res: any, next: any) {
  if (!req.session.userId) { res.status(401).json({ error: "No autenticado" }); return; }
  if (!["therapist", "superadmin"].includes(req.session.role || "")) {
    res.status(403).json({ error: "Solo terapeutas pueden acceder" }); return;
  }
  next();
}

// GET /api/therapist/patients — pacientes asignados al terapeuta
router.get("/patients", requireTherapist, async (req, res) => {
  try {
    const assignments = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        email: usersTable.email,
        insuranceCompany: usersTable.insuranceCompany,
        insuranceNumber: usersTable.insuranceNumber,
        entryMethod: usersTable.entryMethod,
        createdAt: usersTable.createdAt,
        assignedAt: therapistPatientsTable.assignedAt,
      })
      .from(therapistPatientsTable)
      .innerJoin(usersTable, eq(therapistPatientsTable.patientId, usersTable.id))
      .where(eq(therapistPatientsTable.therapistId, req.session.userId!));

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/therapist/available-patients — buscar pacientes no asignados
router.get("/available-patients", requireTherapist, async (req, res) => {
  try {
    const assigned = await db
      .select({ patientId: therapistPatientsTable.patientId })
      .from(therapistPatientsTable)
      .where(eq(therapistPatientsTable.therapistId, req.session.userId!));

    const assignedIds = assigned.map(a => a.patientId);

    const patients = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "patient"));

    const available = patients.filter(p => !assignedIds.includes(p.id));
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/therapist/patients/assign — asignar paciente
router.post("/patients/assign", requireTherapist, async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) { res.status(400).json({ error: "patientId requerido" }); return; }

    const existing = await db
      .select()
      .from(therapistPatientsTable)
      .where(and(
        eq(therapistPatientsTable.therapistId, req.session.userId!),
        eq(therapistPatientsTable.patientId, patientId)
      ))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "El paciente ya está asignado" });
      return;
    }

    await db.insert(therapistPatientsTable).values({
      therapistId: req.session.userId!,
      patientId,
    });

    const therapist = await db.select({ fullName: usersTable.fullName, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    const tName = therapist[0]?.fullName || therapist[0]?.username || "Tu terapeuta";

    await db.insert(notificationsTable).values({
      userId: patientId,
      title: "Nuevo terapeuta asignado",
      message: `${tName} ha sido asignado como tu terapeuta. ¡Bienvenido al proceso de rehabilitación!`,
      type: "assignment",
    });

    res.json({ message: "Paciente asignado exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// DELETE /api/therapist/patients/:id — remover asignación
router.delete("/patients/:id", requireTherapist, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    await db.delete(therapistPatientsTable).where(
      and(
        eq(therapistPatientsTable.therapistId, req.session.userId!),
        eq(therapistPatientsTable.patientId, patientId)
      )
    );
    res.json({ message: "Asignación removida" });
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/therapist/patients/:id/notes
router.get("/patients/:id/notes", requireTherapist, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const notes = await db
      .select()
      .from(therapyNotesTable)
      .where(and(
        eq(therapyNotesTable.patientId, patientId),
        eq(therapyNotesTable.therapistId, req.session.userId!)
      ))
      .orderBy(therapyNotesTable.createdAt);

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/therapist/patients/:id/notes
router.post("/patients/:id/notes", requireTherapist, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { therapyType, noteType, content } = req.body;

    if (!therapyType || !content) {
      res.status(400).json({ error: "therapyType y content son requeridos" });
      return;
    }

    const [note] = await db.insert(therapyNotesTable).values({
      therapistId: req.session.userId!,
      patientId,
      therapyType,
      noteType: noteType || "session",
      content,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: patientId,
      title: `Nueva nota de ${therapyType}`,
      message: `Tu terapeuta ha registrado una nueva nota en tu terapia de ${therapyType}.`,
      type: "therapy_note",
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/therapist/patients/:id/traceability — trazabilidad médica
router.get("/patients/:id/traceability", requireTherapist, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const notes = await db
      .select({
        id: therapyNotesTable.id,
        therapyType: therapyNotesTable.therapyType,
        noteType: therapyNotesTable.noteType,
        content: therapyNotesTable.content,
        createdAt: therapyNotesTable.createdAt,
        therapistName: usersTable.fullName,
      })
      .from(therapyNotesTable)
      .innerJoin(usersTable, eq(therapyNotesTable.therapistId, usersTable.id))
      .where(eq(therapyNotesTable.patientId, patientId))
      .orderBy(therapyNotesTable.createdAt);

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/therapist/patients/:id/enroll-therapy — inscribir terapia
router.post("/patients/:id/enroll-therapy", requireTherapist, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { therapyType, appointmentDate, notes: noteText } = req.body;

    if (!therapyType || !appointmentDate) {
      res.status(400).json({ error: "therapyType y appointmentDate son requeridos" });
      return;
    }

    const therapist = await db.select({ fullName: usersTable.fullName, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    const tName = therapist[0]?.fullName || therapist[0]?.username || "Tu terapeuta";

    const { appointmentsTable } = await import("@workspace/db");
    const [appt] = await db.insert(appointmentsTable).values({
      userId: patientId,
      therapyType,
      therapistName: tName,
      appointmentDate: new Date(appointmentDate),
      notes: noteText || null,
      status: "pending",
    }).returning();

    await db.insert(notificationsTable).values({
      userId: patientId,
      title: `Nueva terapia asignada: ${therapyType}`,
      message: `${tName} te ha inscrito en ${therapyType}. Fecha: ${new Date(appointmentDate).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}.`,
      type: "therapy_enrollment",
      appointmentId: appt.id,
    });

    await db.insert(therapyNotesTable).values({
      therapistId: req.session.userId!,
      patientId,
      therapyType,
      noteType: "enrollment",
      content: `Inscripción en ${therapyType}. Fecha programada: ${new Date(appointmentDate).toLocaleString("es-CO")}. ${noteText || ""}`.trim(),
    });

    res.status(201).json({ appointment: appt, message: "Terapia inscrita y notificación enviada al paciente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
