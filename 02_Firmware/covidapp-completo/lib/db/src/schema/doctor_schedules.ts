import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const doctorSchedulesTable = pgTable("doctor_schedules", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => usersTable.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
});
