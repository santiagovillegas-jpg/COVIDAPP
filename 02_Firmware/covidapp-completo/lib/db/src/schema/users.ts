import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: text("role").notNull().default("patient"),
  insuranceCompany: text("insurance_company"),
  insuranceNumber: text("insurance_number"),
  entryMethod: text("entry_method"),
  // Extended profile fields
  phone: text("phone"),
  address: text("address"),
  birthdate: text("birthdate"),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  bloodType: text("blood_type"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  allergies: text("allergies"),
  preferredLanguage: text("preferred_language").default("es"),
  emailNotifications: text("email_notifications").default("true"),
  // Staff-specific
  jobTitle: text("job_title"),
  department: text("department"),
  specialization: text("specialization"),
  licenseNumber: text("license_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
