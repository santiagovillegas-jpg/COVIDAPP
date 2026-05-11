import { Router } from "express";
import { db, appointmentsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { sendAppointmentReminderEmail } from "../lib/email.js";

const router = Router();
router.use(requireAuth);

function isStaff(req: any) {
  return ["superadmin", "therapist", "nonmedical_admin"].includes(req.session.role || "");
}

// GET /api/appointments — paciente ve sus citas; admin ve todas
router.get("/", async (req, res) => {
  try {
    if (isStaff(req)) {
      const all = await db
        .select({
          id: appointmentsTable.id,
          userId: appointmentsTable.userId,
          therapyType: appointmentsTable.therapyType,
          therapistName: appointmentsTable.therapistName,
          appointmentDate: appointmentsTable.appointmentDate,
          status: appointmentsTable.status,
          notes: appointmentsTable.notes,
          reminderSent: appointmentsTable.reminderSent,
          patientName: usersTable.fullName,
          patientUsername: usersTable.username,
        })
        .from(appointmentsTable)
        .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
        .orderBy(appointmentsTable.appointmentDate);
      return res.json(all);
    }

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.userId, req.session.userId!))
      .orderBy(appointmentsTable.appointmentDate);
    res.json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// GET /api/appointments/schedule/:date — agenda del día (admin)
router.get("/schedule/:date", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const date = new Date(req.params.date);
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const appts = await db
      .select({
        id: appointmentsTable.id,
        userId: appointmentsTable.userId,
        therapyType: appointmentsTable.therapyType,
        therapistName: appointmentsTable.therapistName,
        appointmentDate: appointmentsTable.appointmentDate,
        status: appointmentsTable.status,
        notes: appointmentsTable.notes,
        patientName: usersTable.fullName,
        patientUsername: usersTable.username,
      })
      .from(appointmentsTable)
      .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
      .where(and(
        gte(appointmentsTable.appointmentDate, startOfDay),
        lte(appointmentsTable.appointmentDate, endOfDay),
        ne(appointmentsTable.status, "cancelled"),
      ))
      .orderBy(appointmentsTable.appointmentDate);
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/appointments/check-conflict — verificar disponibilidad antes de crear
router.get("/check-conflict", async (req, res) => {
  try {
    const { appointmentDate, excludeId } = req.query;
    if (!appointmentDate) { res.status(400).json({ error: "appointmentDate requerido" }); return; }

    const target = new Date(appointmentDate as string);
    const windowStart = new Date(target.getTime() - 30 * 60000);
    const windowEnd = new Date(target.getTime() + 30 * 60000);

    let query: any = and(
      gte(appointmentsTable.appointmentDate, windowStart),
      lte(appointmentsTable.appointmentDate, windowEnd),
      ne(appointmentsTable.status, "cancelled"),
    );
    if (excludeId) {
      query = and(query, ne(appointmentsTable.id, parseInt(excludeId as string)));
    }

    const conflicts = await db.select({
      id: appointmentsTable.id,
      appointmentDate: appointmentsTable.appointmentDate,
      therapyType: appointmentsTable.therapyType,
      therapistName: appointmentsTable.therapistName,
    }).from(appointmentsTable).where(query);

    res.json({ hasConflict: conflicts.length > 0, conflicts });
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { therapyType, therapistName, appointmentDate, reminderEmail, notes } = req.body;

    if (!therapyType || !appointmentDate) {
      res.status(400).json({ error: "Tipo de terapia y fecha son requeridos" }); return;
    }

    const target = new Date(appointmentDate);
    const windowStart = new Date(target.getTime() - 30 * 60000);
    const windowEnd = new Date(target.getTime() + 30 * 60000);

    const conflicts = await db.select({ id: appointmentsTable.id })
      .from(appointmentsTable)
      .where(and(
        gte(appointmentsTable.appointmentDate, windowStart),
        lte(appointmentsTable.appointmentDate, windowEnd),
        ne(appointmentsTable.status, "cancelled"),
      ));

    if (conflicts.length > 0) {
      res.status(409).json({
        error: "Ya existe una cita en esa franja horaria (± 30 minutos). Por favor seleccione otro horario.",
        conflict: true,
      }); return;
    }

    const [appointment] = await db.insert(appointmentsTable).values({
      userId: req.session.userId!,
      therapyType,
      therapistName: therapistName || null,
      appointmentDate: target,
      reminderEmail: reminderEmail || null,
      notes: notes || null,
      status: "pending",
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.session.userId!,
      title: "Cita programada",
      message: `Se programó una cita de ${therapyType} para el ${target.toLocaleDateString("es-CO", { dateStyle: "full" })} a las ${target.toLocaleTimeString("es-CO", { timeStyle: "short" })}.`,
      type: "appointment_created",
      appointmentId: appointment.id,
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ error: "Error al crear cita" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, req.session.userId!)))
      .limit(1);
    if (!appointment) { res.status(404).json({ error: "Cita no encontrada" }); return; }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener cita" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { therapyType, therapistName, appointmentDate, reminderEmail, notes, status } = req.body;

    const [existing] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, req.session.userId!)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Cita no encontrada" }); return; }

    if (appointmentDate) {
      const target = new Date(appointmentDate);
      const windowStart = new Date(target.getTime() - 30 * 60000);
      const windowEnd = new Date(target.getTime() + 30 * 60000);

      const conflicts = await db.select({ id: appointmentsTable.id })
        .from(appointmentsTable)
        .where(and(
          gte(appointmentsTable.appointmentDate, windowStart),
          lte(appointmentsTable.appointmentDate, windowEnd),
          ne(appointmentsTable.status, "cancelled"),
          ne(appointmentsTable.id, id),
        ));

      if (conflicts.length > 0) {
        res.status(409).json({ error: "Conflicto de horario. Seleccione otro horario.", conflict: true }); return;
      }
    }

    const [updated] = await db.update(appointmentsTable).set({
      ...(therapyType && { therapyType }),
      ...(therapistName !== undefined && { therapistName }),
      ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
      ...(reminderEmail !== undefined && { reminderEmail }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
    }).where(eq(appointmentsTable.id, id)).returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar cita" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, req.session.userId!)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Cita no encontrada" }); return; }

    await db.insert(notificationsTable).values({
      userId: req.session.userId!,
      title: "Cita cancelada",
      message: `Se canceló la cita de ${existing.therapyType} del ${existing.appointmentDate.toLocaleDateString("es-CO")}.`,
      type: "appointment_cancelled",
      appointmentId: id,
    });

    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));
    res.json({ message: "Cita eliminada exitosamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar cita" });
  }
});

router.post("/:id/send-reminder", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, req.session.userId!)))
      .limit(1);
    if (!appointment) { res.status(404).json({ error: "Cita no encontrada" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    const targetEmail = appointment.reminderEmail || user?.email;

    if (!targetEmail) {
      res.status(400).json({ error: "No hay correo electrónico para enviar el recordatorio" }); return;
    }

    const result = await sendAppointmentReminderEmail(
      targetEmail, appointment.therapyType, appointment.appointmentDate,
      appointment.therapistName, user?.fullName || user?.username,
    );

    if (result.success) {
      await db.update(appointmentsTable).set({ reminderSent: true }).where(eq(appointmentsTable.id, id));
      await db.insert(notificationsTable).values({
        userId: req.session.userId!,
        title: "Recordatorio enviado",
        message: `Se envió recordatorio de ${appointment.therapyType} al correo ${targetEmail}.`,
        type: "appointment_reminder",
        appointmentId: id,
      });
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (err) {
    res.status(500).json({ error: "Error al enviar recordatorio" });
  }
});

export default router;
