import { Router } from "express";
import { db, usersTable, doctorSchedulesTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, lte, ne, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

export const THERAPY_TO_SPECIALIZATION: Record<string, string[]> = {
  "Terapia Física": ["Fisioterapia"],
  "Terapia del Habla": ["Fonoaudiología"],
  "Terapia Ocupacional": ["Terapia Ocupacional"],
  "Terapia Cognitiva": ["Psicología", "Neuropsicología"],
  "Psicología": ["Psicología"],
  "Medicina General": ["Medicina General"],
};

export const SPECIALIZATION_TO_LABEL: Record<string, string> = {
  "Fisioterapia": "Fisioterapeuta",
  "Fonoaudiología": "Fonoaudiólogo(a)",
  "Terapia Ocupacional": "Terapeuta Ocupacional",
  "Psicología": "Psicólogo(a)",
  "Neuropsicología": "Neuropsicólogo(a)",
  "Medicina General": "Médico General",
};

router.get("/", async (_req, res) => {
  try {
    const doctors = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      specialization: usersTable.specialization,
      jobTitle: usersTable.jobTitle,
      department: usersTable.department,
      role: usersTable.role,
    }).from(usersTable)
      .where(inArray(usersTable.role, ["therapist", "superadmin"]));

    const medicalDoctors = doctors.filter(d => d.specialization);
    res.json(medicalDoctors);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener doctores" });
  }
});

router.get("/by-therapy/:therapyType", async (req, res) => {
  try {
    const therapyType = decodeURIComponent(req.params.therapyType);
    const specializations = THERAPY_TO_SPECIALIZATION[therapyType];
    if (!specializations) {
      res.json([]); return;
    }

    const doctors = await db.select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      specialization: usersTable.specialization,
      jobTitle: usersTable.jobTitle,
      department: usersTable.department,
    }).from(usersTable)
      .where(and(
        inArray(usersTable.role, ["therapist", "superadmin"]),
        inArray(usersTable.specialization, specializations),
      ));

    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar doctores" });
  }
});

router.get("/:id/schedules", async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const schedules = await db.select().from(doctorSchedulesTable)
      .where(eq(doctorSchedulesTable.doctorId, doctorId))
      .orderBy(doctorSchedulesTable.dayOfWeek);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener horarios" });
  }
});

router.get("/:id/availability", async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const dateStr = req.query.date as string;
    if (!dateStr) { res.status(400).json({ error: "Parámetro date requerido (YYYY-MM-DD)" }); return; }

    const date = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay();

    const schedules = await db.select().from(doctorSchedulesTable)
      .where(and(
        eq(doctorSchedulesTable.doctorId, doctorId),
        eq(doctorSchedulesTable.dayOfWeek, dayOfWeek),
      ));

    if (schedules.length === 0) {
      res.json({ available: false, slots: [], message: "El doctor no atiende este día" }); return;
    }

    const startOfDay = new Date(dateStr + "T00:00:00Z");
    const endOfDay = new Date(dateStr + "T23:59:59Z");

    const existingAppointments = await db.select({
      appointmentDate: appointmentsTable.appointmentDate,
    }).from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.doctorId, doctorId),
        gte(appointmentsTable.appointmentDate, startOfDay),
        lte(appointmentsTable.appointmentDate, endOfDay),
        ne(appointmentsTable.status, "cancelled"),
      ));

    const bookedTimes = new Set(
      existingAppointments.map(a => {
        const d = new Date(a.appointmentDate);
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      })
    );

    const slots: { time: string; available: boolean }[] = [];

    for (const sched of schedules) {
      const [startH, startM] = sched.startTime.split(":").map(Number);
      const [endH, endM] = sched.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const duration = sched.slotDurationMinutes;

      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const h = Math.floor(m / 60);
        const mi = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
        slots.push({
          time: timeStr,
          available: !bookedTimes.has(timeStr),
        });
      }
    }

    res.json({ available: true, slots });
  } catch (err) {
    console.error("Availability error:", err);
    res.status(500).json({ error: "Error al obtener disponibilidad" });
  }
});

// ── Doctor manages own schedule ──

router.get("/schedules/my", async (req, res) => {
  try {
    if (req.session.role !== "therapist" && req.session.role !== "superadmin") {
      res.status(403).json({ error: "Solo personal médico" }); return;
    }
    const schedules = await db.select().from(doctorSchedulesTable)
      .where(eq(doctorSchedulesTable.doctorId, req.session.userId!))
      .orderBy(doctorSchedulesTable.dayOfWeek);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener horarios" });
  }
});

router.post("/schedules", async (req, res) => {
  try {
    if (req.session.role !== "therapist" && req.session.role !== "superadmin") {
      res.status(403).json({ error: "Solo personal médico" }); return;
    }
    const { dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      res.status(400).json({ error: "dayOfWeek, startTime, endTime son requeridos" }); return;
    }

    const dow = Number(dayOfWeek);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      res.status(400).json({ error: "dayOfWeek debe ser 0-6 (Domingo-Sábado)" }); return;
    }

    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(startTime) || !timeRe.test(endTime)) {
      res.status(400).json({ error: "startTime y endTime deben tener formato HH:MM" }); return;
    }
    if (startTime >= endTime) {
      res.status(400).json({ error: "startTime debe ser anterior a endTime" }); return;
    }

    const duration = slotDurationMinutes ? Number(slotDurationMinutes) : 30;
    const allowedDurations = [15, 20, 30, 45, 60];
    if (!allowedDurations.includes(duration)) {
      res.status(400).json({ error: `slotDurationMinutes debe ser uno de: ${allowedDurations.join(", ")}` }); return;
    }

    const existing = await db.select().from(doctorSchedulesTable)
      .where(and(
        eq(doctorSchedulesTable.doctorId, req.session.userId!),
        eq(doctorSchedulesTable.dayOfWeek, dow),
      ));

    if (existing.length > 0) {
      const [updated] = await db.update(doctorSchedulesTable).set({
        startTime, endTime,
        slotDurationMinutes: duration,
      }).where(eq(doctorSchedulesTable.id, existing[0].id)).returning();
      res.json(updated); return;
    }

    const [schedule] = await db.insert(doctorSchedulesTable).values({
      doctorId: req.session.userId!,
      dayOfWeek: dow,
      startTime,
      endTime,
      slotDurationMinutes: duration,
    }).returning();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: "Error al guardar horario" });
  }
});

router.delete("/schedules/:id", async (req, res) => {
  try {
    if (req.session.role !== "therapist" && req.session.role !== "superadmin") {
      res.status(403).json({ error: "Solo personal médico" }); return;
    }
    const id = Number(req.params.id);
    const [sched] = await db.select().from(doctorSchedulesTable)
      .where(eq(doctorSchedulesTable.id, id)).limit(1);
    if (!sched || sched.doctorId !== req.session.userId) {
      res.status(404).json({ error: "Horario no encontrado" }); return;
    }
    await db.delete(doctorSchedulesTable).where(eq(doctorSchedulesTable.id, id));
    res.json({ message: "Horario eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar horario" });
  }
});

// Appointments for a specific doctor
router.get("/:id/appointments", async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const isSelf = req.session.userId === doctorId;
    const isSuperAdmin = req.session.role === "superadmin";
    if (!isSelf && !isSuperAdmin) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    const appts = await db.select({
      id: appointmentsTable.id,
      userId: appointmentsTable.userId,
      therapyType: appointmentsTable.therapyType,
      appointmentDate: appointmentsTable.appointmentDate,
      status: appointmentsTable.status,
      notes: appointmentsTable.notes,
      patientName: usersTable.fullName,
    }).from(appointmentsTable)
      .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
      .where(eq(appointmentsTable.doctorId, doctorId))
      .orderBy(appointmentsTable.appointmentDate);

    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

export default router;
