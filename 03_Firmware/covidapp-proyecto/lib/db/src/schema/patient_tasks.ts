import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const patientTasksTable = pgTable("patient_tasks", {
  id: serial("id").primaryKey(),
  assignedById: integer("assigned_by_id").notNull().references(() => usersTable.id),
  patientId: integer("patient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  howTo: text("how_to"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
