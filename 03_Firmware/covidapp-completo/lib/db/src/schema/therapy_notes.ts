import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const therapyNotesTable = pgTable("therapy_notes", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => usersTable.id),
  patientId: integer("patient_id").notNull().references(() => usersTable.id),
  therapyType: text("therapy_type").notNull(),
  noteType: text("note_type").notNull().default("session"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TherapyNote = typeof therapyNotesTable.$inferSelect;
