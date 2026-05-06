import { Router } from "express";
import { db, appointmentsTable, notificationsTable, usersTable, doctorSchedulesTable } from "@workspace/db";
import { eq, and, gte, lte, ne, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { sendAppointmentReminderEmail } from "../lib/email.js";
import { THERAPY_TO_SPECIALIZATION } from "./doctors.js";

const router = Router();
router.use(requireAuth);

function isStaff(req: any) {
  return ["superadmin", "therapist", "nonmedical_admin"].includes(req.session.role || "");
}

async function getDoctorSlotDuration(doctorId: number, dayOfWeek: number): Promise<number> {
  const [sched] = await db.select({ slotDurationMinutes: doctorSchedulesTable.slotDurationMinutes })
    .from(doctorSchedulesTable)
    .where(and(
      eq(doctorSchedulesTable.doctorId, doctorId),
      eq(doctorSchedulesTable.dayOfWeek, dayOfWeek),
    )).limit(1);
  return sched?.slotDurationMinutes || 30;
}

async function checkDoctorConflict(doctorId: number, appointmentDate: Date, excludeId?: number): Promise<boolean> {
  const dayOfWeek = appointmentDate.getDay();
  const duration = await getDoctorSlotDuration(doctorId, dayOfWeek);

  const windowStart = new Date(appointmentDate.getTime() - (duration - 1) * 60000);
  const windowEnd = new Date(appointmentDate.getTime() + (duration - 1) * 60000);

  let conditions: any[] = [
    eq(appointmentsTable.doctorId, doctorId),
    gte(appointmentsTable.appointmentDate, windowStart),
    lte(appointmentsTable.appointmentDate, windowEnd),
    ne(appointmentsTable.status, "cancelled"),
  ];
  if (excludeId) conditions.push(ne(appointmentsTable.id, excludeId));

  const conflicts = await db.select({ id: appointmentsTable.id })
    .from(appointmentsTable).where(and(...conditions));
  return conflicts.length > 0;
}

async function validateDoctorAndSchedule(doctorId: number, therapyType: string, appointmentDate: Date): Promise<string | null> {
  const [doctor] = await db.select({
    id: usersTable.id,
    role: usersTable.role,
    specialization: usersTable.specialization,
  }).from(usersTable).where(eq(usersTable.id, doctorId)).limit(1);

  if (!doctor) return "Doctor no encontrado";
  if (!["therapist", "superadmin"].includes(doctor.role)) return "El usuario seleccionado no es personal médico";

  const allowedSpecs = THERAPY_TO_SPECIALIZATION[therapyType];
  if (allowedSpecs && doctor.specialization && !allowedSpecs.includes(doctor.specialization)) {
    return `El doctor no tiene la especialización requerida para ${therapyType}`;
  }

  const dayOfWeek = appointmentDate.getUTCDay();
  const schedules = await db.select().from(doctorSchedulesTable)
    .where(and(
      eq(doctorSchedulesTable.doctorId, doctorId),
      eq(doctorSchedulesTable.dayOfWeek, dayOfWeek),
    ));

  if (schedules.length === 0) return "El doctor no atiende este día";

  const apptH = appointmentDate.getUTCHours();
  const apptM = appointmentDate.getUTCMinutes();
  const apptMinutes = apptH * 60 + apptM;

  const inSchedule = schedules.some(s => {
    const [sH, sM] = s.startTime.split(":").map(Number);
    const [eH, eM] = s.endTime.split(":").map(Number);
    return apptMinutes >= sH * 60 + sM && apptMinutes + s.slotDurationMinutes <= eH * 60 + eM;
  });

  if (!inSchedule) return "El horario seleccionado está fuera del horario de atención del doctor";
  return null;
}

router.get("/", async (req, res) => {
  try {
    if (isStaff(req)) {
      const all = await db
        .select({
          id: appointmentsTable.id,
          userId: appointmentsTable.userId,
          doctorId: appointmentsTable.doctorId,
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
        doctorId: appointmentsTable.doctorId,
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

router.get("/check-conflict", async (req, res) => {
  try {
    const { appointmentDate, doctorId, excludeId } = req.query;
    if (!appointmentDate) { res.status(400).json({ error: "appointmentDate requerido" }); return; }

    const target = new Date(appointmentDate as string);
    const docId = doctorId ? parseInt(doctorId as string) : null;
    const excId = excludeId ? parseInt(excludeId as string) : undefined;

    if (docId) {
      const hasConflict = await checkDoctorConflict(docId, target, excId);
      res.json({ hasConflict, conflicts: [] });
    } else {
      const windowStart = new Date(target.getTime() - 30 * 60000);
      const windowEnd = new Date(target.getTime() + 30 * 60000);

      let conditions: any[] = [
        gte(appointmentsTable.appointmentDate, windowStart),
        lte(appointmentsTable.appointmentDate, windowEnd),
        ne(appointmentsTable.status, "cancelled"),
      ];
      if (excId) conditions.push(ne(appointmentsTable.id, excId));

      const conflicts = await db.select({
        id: appointmentsTable.id,
        appointmentDate: appointmentsTable.appointmentDate,
        therapyType: appointmentsTable.therapyType,
        therapistName: appointmentsTable.therapistName,
      }).from(appointmentsTable).where(and(...conditions));

      res.json({ hasConflict: conflicts.length > 0, conflicts });
    }
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { therapyType, therapistName, appointmentDate, reminderEmail, notes, doctorId } = req.body;

    if (!therapyType || !appointmentDate) {
      res.status(400).json({ error: "Tipo de terapia y fecha son requeridos" }); return;
    }

    const target = new Date(appointmentDate);

    if (doctorId) {
      const validationError = await validateDoctorAndSchedule(doctorId, therapyType, target);
      if (validationError) {
        res.status(400).json({ error: validationError }); return;
      }

      const hasConflict = await checkDoctorConflict(doctorId, target);
      if (hasConflict) {
        res.status(409).json({
          error: "Este doctor ya tiene una cita en esa franja horaria. Seleccione otro horario.",
          conflict: true,
        }); return;
      }
    }

    let resolvedTherapistName = therapistName;
    if (doctorId && !therapistName) {
      const [doc] = await db.select({ fullName: usersTable.fullName })
        .from(usersTable).where(eq(usersTable.id, doctorId)).limit(1);
      resolvedTherapistName = doc?.fullName || null;
    }

    const [appointment] = await db.insert(appointmentsTable).values({
      userId: req.session.userId!,
      doctorId: doctorId || null,
      therapyType,
      therapistName: resolvedTherapistName || null,
      appointmentDate: target,
      reminderEmail: reminderEmail || null,
      notes: notes || null,
      status: "pending",
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.session.userId!,
      title: "Cita programada",
      message: `Se programó una cita de ${therapyType}${resolvedTherapistName ? ` con ${resolvedTherapistName}` : ""} para el ${target.toLocaleDateString("es-CO", { dateStyle: "full" })} a las ${target.toLocaleTimeString("es-CO", { timeStyle: "short" })}.`,
      type: "appointment_created",
      appointmentId: appointment.id,
    });

    if (doctorId) {
      await db.insert(notificationsTable).values({
        userId: doctorId,
        title: "Nueva cita agendada",
        message: `Un paciente ha agendado ${therapyType} para el ${target.toLocaleDateString("es-CO", { dateStyle: "full" })} a las ${target.toLocaleTimeString("es-CO", { timeStyle: "short" })}.`,
        type: "appointment_created",
        appointmentId: appointment.id,
      });
    }

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
    const { therapyType, therapistName, appointmentDate, reminderEmail, notes, status, doctorId } = req.body;

    const [existing] = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Cita no encontrada" }); return; }

    const isOwner = existing.userId === req.session.userId;
    const isDoctor = existing.doctorId === req.session.userId;
    const isStaffUser = isStaff(req);
    const isSuperAdmin = req.session.role === "superadmin";
    if (!isOwner && !isDoctor && !isSuperAdmin) {
      res.status(403).json({ error: "Sin permiso para modificar esta cita" }); return;
    }

    if (isOwner && !isStaffUser && !isSuperAdmin) {
      const allowedPatientStatuses = ["cancelled"];
      if (status && !allowedPatientStatuses.includes(status)) {
        res.status(403).json({ error: "Los pacientes solo pueden cancelar sus citas" }); return;
      }
      if (doctorId !== undefined || therapyType || appointmentDate) {
        res.status(403).json({ error: "Los pacientes no pueden modificar doctor, tipo de terapia o fecha. Cancele y cree una nueva cita." }); return;
      }
    }

    if (appointmentDate && (doctorId || existing.doctorId)) {
      const target = new Date(appointmentDate);
      const docId = doctorId || existing.doctorId;
      const tType = therapyType || existing.therapyType;

      const validationError = await validateDoctorAndSchedule(docId, tType, target);
      if (validationError) {
        res.status(400).json({ error: validationError }); return;
      }

      const hasConflict = await checkDoctorConflict(docId, target, id);
      if (hasConflict) {
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
      ...(doctorId !== undefined && { doctorId }),
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
      .where(eq(appointmentsTable.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Cita no encontrada" }); return; }

    const isOwner = existing.userId === req.session.userId;
    const isDoctor = existing.doctorId === req.session.userId;
    const isStaff = req.session.role === "superadmin" || req.session.role === "therapist" || req.session.role === "nonmedical_admin";
    if (!isOwner && !isDoctor && !isStaff) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    if (existing.status === "cancelled") {
      res.status(400).json({ error: "Esta cita ya está cancelada" }); return;
    }

    if (isOwner && !isStaff && !isDoctor) {
      const now = new Date();
      const apptDate = new Date(existing.appointmentDate);
      const hoursUntil = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < 24) {
        res.status(400).json({ error: "Solo puedes cancelar citas con al menos 24 horas de anticipación" }); return;
      }
    }

    await db.update(appointmentsTable)
      .set({ status: "cancelled" })
      .where(eq(appointmentsTable.id, id));

    await db.insert(notificationsTable).values({
      userId: existing.userId,
      title: "Cita cancelada",
      message: `Se canceló la cita de ${existing.therapyType} del ${existing.appointmentDate.toLocaleDateString("es-CO")}.`,
      type: "appointment_cancelled",
      appointmentId: id,
    });

    res.json({ message: "Cita cancelada exitosamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al cancelar cita" });
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
