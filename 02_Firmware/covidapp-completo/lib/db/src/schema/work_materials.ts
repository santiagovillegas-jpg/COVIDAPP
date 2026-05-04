import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const workMaterialsTable = pgTable("work_materials", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull(),
  therapistName: text("therapist_name"),
  therapyType: text("therapy_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
