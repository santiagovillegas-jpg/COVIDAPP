import { db, appointmentsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { sendAppointmentReminderEmail } from "./email.js";

async function sendReminders(hoursAhead: number) {
  const now = new Date();
  const targetStart = new Date(now.getTime() + (hoursAhead - 0.5) * 3600000);
  const targetEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 3600000);

  const upcomingAppts = await db
    .select({
      id: appointmentsTable.id,
      userId: appointmentsTable.userId,
      therapyType: appointmentsTable.therapyType,
      therapistName: appointmentsTable.therapistName,
      appointmentDate: appointmentsTable.appointmentDate,
      reminderEmail: appointmentsTable.reminderEmail,
      reminderSent: appointmentsTable.reminderSent,
      userEmail: usersTable.email,
      userName: usersTable.fullName,
      username: usersTable.username,
    })
    .from(appointmentsTable)
    .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
    .where(and(
      gte(appointmentsTable.appointmentDate, targetStart),
      lte(appointmentsTable.appointmentDate, targetEnd),
      ne(appointmentsTable.status, "cancelled"),
    ));

  for (const appt of upcomingAppts) {
    const email = appt.reminderEmail || appt.userEmail;
    const label = hoursAhead === 48 ? "48 horas" : "24 horas";

    await db.insert(notificationsTable).values({
      userId: appt.userId,
      title: `⏰ Recordatorio: cita en ${label}`,
      message: `Tu cita de ${appt.therapyType} es en ${label}. Fecha: ${appt.appointmentDate.toLocaleDateString("es-CO", { dateStyle: "full" })} a las ${appt.appointmentDate.toLocaleTimeString("es-CO", { timeStyle: "short" })}.`,
      type: "appointment_reminder",
      appointmentId: appt.id,
    }).onConflictDoNothing();

    if (email) {
      try {
        await sendAppointmentReminderEmail(
          email,
          appt.therapyType,
          appt.appointmentDate,
          appt.therapistName,
          appt.userName || appt.username,
        );
        await db.update(appointmentsTable).set({ reminderSent: true }).where(eq(appointmentsTable.id, appt.id));
        console.log(`✅ Recordatorio ${label} enviado a ${email} para cita ${appt.id}`);
      } catch (err) {
        console.error(`❌ Error enviando recordatorio a ${email}:`, err);
      }
    }
  }
}

export function startReminderCron() {
  const INTERVAL_MS = 60 * 60 * 1000;

  async function runCron() {
    try {
      await sendReminders(48);
      await sendReminders(24);
    } catch (err) {
      console.error("Error en cron de recordatorios:", err);
    }
  }

  runCron();
  setInterval(runCron, INTERVAL_MS);
  console.log("⏰ Cron de recordatorios iniciado (cada hora, ventanas 24h y 48h)");
}
