import { Router } from "express";
import { db, appointmentsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { sendAppointmentReminderEmail } from "../lib/email.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
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

router.post("/", async (req, res) => {
  try {
    const { therapyType, therapistName, appointmentDate, reminderEmail, notes } = req.body;

    if (!therapyType || !appointmentDate) {
      res.status(400).json({ error: "Tipo de terapia y fecha son requeridos" });
      return;
    }

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        userId: req.session.userId!,
        therapyType,
        therapistName: therapistName || null,
        appointmentDate: new Date(appointmentDate),
        reminderEmail: reminderEmail || null,
        notes: notes || null,
        status: "pending",
      })
      .returning();

    await db.insert(notificationsTable).values({
      userId: req.session.userId!,
      title: "Cita programada",
      message: `Se programó una cita de ${therapyType} para el ${new Date(appointmentDate).toLocaleDateString("es-CO")}`,
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

    if (!appointment) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }

    res.json(appointment);
  } catch (err) {
    console.error("Get appointment error:", err);
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

    if (!existing) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }

    const [updated] = await db
      .update(appointmentsTable)
      .set({
        ...(therapyType && { therapyType }),
        ...(therapistName !== undefined && { therapistName }),
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
        ...(reminderEmail !== undefined && { reminderEmail }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      })
      .where(eq(appointmentsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("Update appointment error:", err);
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

    if (!existing) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }

    await db.insert(notificationsTable).values({
      userId: req.session.userId!,
      title: "Cita cancelada",
      message: `Se canceló la cita de ${existing.therapyType} del ${existing.appointmentDate.toLocaleDateString("es-CO")}`,
      type: "appointment_cancelled",
      appointmentId: id,
    });

    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));

    res.json({ message: "Cita eliminada exitosamente" });
  } catch (err) {
    console.error("Delete appointment error:", err);
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

    if (!appointment) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);

    const targetEmail = appointment.reminderEmail || user?.email;

    if (!targetEmail) {
      res.status(400).json({ error: "No hay correo electrónico para enviar el recordatorio" });
      return;
    }

    const result = await sendAppointmentReminderEmail(
      targetEmail,
      appointment.therapyType,
      appointment.appointmentDate,
      appointment.therapistName,
      user?.fullName || user?.username,
    );

    if (result.success) {
      await db
        .update(appointmentsTable)
        .set({ reminderSent: true })
        .where(eq(appointmentsTable.id, id));

      await db.insert(notificationsTable).values({
        userId: req.session.userId!,
        title: "Recordatorio enviado",
        message: `Se envió un recordatorio de ${appointment.therapyType} al correo ${targetEmail}`,
        type: "appointment_reminder",
        appointmentId: id,
      });

      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (err) {
    console.error("Send reminder error:", err);
    res.status(500).json({ error: "Error al enviar recordatorio" });
  }
});

export default router;
