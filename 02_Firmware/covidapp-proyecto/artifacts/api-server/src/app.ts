import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "./routes/index.js";
import { startReminderCron } from "./lib/reminder-cron.js";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "covidapp-secret-key-2025",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use("/api", router);

interface SeedAccount {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: string;
  jobTitle?: string;
  department?: string;
  specialization?: string;
}

async function seedAccount(account: SeedAccount) {
  const { username, password, email, fullName, role, jobTitle, department, specialization } = account;
  const hashed = await bcrypt.hash(password, 10);

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(usersTable).values({
      username, password: hashed, email, fullName, role,
      jobTitle: jobTitle || null,
      department: department || null,
      specialization: specialization || null,
    });
    console.log(`✅ [${role}] Creado → ${username} : ${password}`);
  } else {
    await db.update(usersTable).set({
      password: hashed, role, fullName,
      jobTitle: jobTitle || null,
      department: department || null,
      specialization: specialization || null,
    }).where(eq(usersTable.username, username));
    console.log(`🔄 [${role}] Actualizado → ${username} : ${password}`);
  }
}

async function seedAll() {
  try {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  COVIDAPP — Cuentas de Administración");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1. SUPERADMIN — acceso total al sistema
    await seedAccount({
      username: "admin",
      password: "Admin2025*",
      email: "admin@covida.edu.co",
      fullName: "Administrador General COVIDA",
      role: "superadmin",
      jobTitle: "Director de Sistemas",
      department: "Dirección General",
    });

    // 2. ADMIN MÉDICO — terapeuta, panel clínico
    await seedAccount({
      username: "adminmedico",
      password: "Medico2025*",
      email: "adminmedico@covida.edu.co",
      fullName: "Dr. Carlos Martínez",
      role: "therapist",
      jobTitle: "Terapeuta Físico",
      department: "Terapia Física",
      specialization: "Fisioterapia Neurológica",
    });

    // 3. ADMIN NO MÉDICO — coordinación clínica, estadísticas
    await seedAccount({
      username: "adminnomedico",
      password: "NoMedico2025*",
      email: "adminnomedico@covida.edu.co",
      fullName: "Coordinadora Clínica COVIDA",
      role: "nonmedical_admin",
      jobTitle: "Coordinadora Clínica",
      department: "Coordinación",
    });

    // 4. ADMIN ADMINISTRATIVO — secretaría y finanzas
    await seedAccount({
      username: "adminadmin",
      password: "Administrativo2025*",
      email: "adminadmin@covida.edu.co",
      fullName: "Secretaria Administrativa COVIDA",
      role: "nonmedical_admin",
      jobTitle: "Secretaria",
      department: "Administración",
    });

    // Mantener cuentas de prueba previas (retrocompatibilidad)
    await seedAccount({
      username: "terapeuta1",
      password: "terapeuta123",
      email: "terapeuta1@covida.edu.co",
      fullName: "Dr. Luis Pérez",
      role: "therapist",
      jobTitle: "Terapeuta del Habla",
      department: "Terapia del Habla",
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  ACCESOS:");
    console.log("  Superadmin      → admin / Admin2025*");
    console.log("  Admin Médico    → adminmedico / Medico2025*");
    console.log("  Admin No Médico → adminnomedico / NoMedico2025*");
    console.log("  Admin Admin.    → adminadmin / Administrativo2025*");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (err) {
    console.error("Error seeding accounts:", err);
  }
}

seedAll();
startReminderCron();

export default app;
