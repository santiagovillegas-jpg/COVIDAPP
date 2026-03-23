import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("medical_center"),
  address: text("address"),
  phone: text("phone"),
  mapsUrl: text("maps_url"),
  schedule: text("schedule"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  linkedToAll: boolean("linked_to_all").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
