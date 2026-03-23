import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const therapistPatientsTable = pgTable("therapist_patients", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => usersTable.id),
  patientId: integer("patient_id").notNull().references(() => usersTable.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export type TherapistPatient = typeof therapistPatientsTable.$inferSelect;
