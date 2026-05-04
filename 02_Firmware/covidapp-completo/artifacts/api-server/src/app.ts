import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcryptjs";
import { db, usersTable, doctorSchedulesTable } from "@workspace/db";
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

    const PWD = "123456789";

    // 1. SUPERADMIN — acceso total al sistema
    await seedAccount({
      username: "admin",
      password: PWD,
      email: "admin@covida.edu.co",
      fullName: "Administrador General COVIDA",
      role: "superadmin",
      jobTitle: "Director de Sistemas",
      department: "Dirección General",
    });

    // 2. ADMIN MÉDICO — fisioterapeuta
    await seedAccount({
      username: "adminmedico",
      password: PWD,
      email: "adminmedico@covida.edu.co",
      fullName: "Dr. Carlos Martínez",
      role: "therapist",
      jobTitle: "Fisioterapeuta",
      department: "Terapia Física",
      specialization: "Fisioterapia",
    });

    // 3. ADMIN NO MÉDICO — coordinación clínica, estadísticas
    await seedAccount({
      username: "adminnomedico",
      password: PWD,
      email: "adminnomedico@covida.edu.co",
      fullName: "Coordinadora Clínica COVIDA",
      role: "nonmedical_admin",
      jobTitle: "Coordinadora Clínica",
      department: "Coordinación",
    });

    // 4. ADMIN ADMINISTRATIVO — secretaría y finanzas
    await seedAccount({
      username: "adminadmin",
      password: PWD,
      email: "adminadmin@covida.edu.co",
      fullName: "Secretaria Administrativa COVIDA",
      role: "nonmedical_admin",
      jobTitle: "Secretaria",
      department: "Administración",
    });

    // 5. TERAPEUTA — Fonoaudiólogo
    await seedAccount({
      username: "terapeuta1",
      password: PWD,
      email: "terapeuta1@covida.edu.co",
      fullName: "Dra. Laura Gómez",
      role: "therapist",
      jobTitle: "Fonoaudióloga",
      department: "Terapia del Habla",
      specialization: "Fonoaudiología",
    });

    // 6. PSICÓLOGO
    await seedAccount({
      username: "psicologo1",
      password: PWD,
      email: "psicologo1@covida.edu.co",
      fullName: "Dr. Andrés Moreno",
      role: "therapist",
      jobTitle: "Psicólogo Clínico",
      department: "Psicología",
      specialization: "Psicología",
    });

    // 7. TERAPEUTA OCUPACIONAL
    await seedAccount({
      username: "terapeuta2",
      password: PWD,
      email: "terapeuta2@covida.edu.co",
      fullName: "Dra. Valentina Ríos",
      role: "therapist",
      jobTitle: "Terapeuta Ocupacional",
      department: "Terapia Ocupacional",
      specialization: "Terapia Ocupacional",
    });

    // 8. PACIENTES DE PRUEBA
    await seedAccount({
      username: "paciente1",
      password: PWD,
      email: "paciente1@covida.edu.co",
      fullName: "María Gómez Restrepo",
      role: "patient",
    });
    await seedAccount({
      username: "paciente2",
      password: PWD,
      email: "paciente2@covida.edu.co",
      fullName: "Juan David López",
      role: "patient",
    });
    await seedAccount({
      username: "paciente3",
      password: PWD,
      email: "paciente3@covida.edu.co",
      fullName: "Ana Sofía Ramírez",
      role: "patient",
    });

    // ── Seed default schedules for doctors (Mon-Fri, 8am-5pm, 30-min slots) ──
    const doctorUsernames = ["adminmedico", "terapeuta1", "psicologo1", "terapeuta2"];
    for (const uname of doctorUsernames) {
      const [u] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.username, uname)).limit(1);
      if (!u) continue;
      const existingScheds = await db.select({ id: doctorSchedulesTable.id })
        .from(doctorSchedulesTable).where(eq(doctorSchedulesTable.doctorId, u.id)).limit(1);
      if (existingScheds.length > 0) continue;
      for (let day = 1; day <= 5; day++) {
        await db.insert(doctorSchedulesTable).values({
          doctorId: u.id,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "17:00",
          slotDurationMinutes: 30,
        });
      }
      console.log(`📅 Horario creado para ${uname} (Lun-Vie 8:00-17:00)`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  ACCESOS (contraseña: 123456789)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Superadmin         → admin");
    console.log("  Fisioterapeuta     → adminmedico");
    console.log("  Fonoaudióloga      → terapeuta1");
    console.log("  Psicólogo          → psicologo1");
    console.log("  T. Ocupacional     → terapeuta2");
    console.log("  Admin No Médico    → adminnomedico");
    console.log("  Admin Admin.       → adminadmin");
    console.log("  Paciente 1         → paciente1");
    console.log("  Paciente 2         → paciente2");
    console.log("  Paciente 3         → paciente3");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (err) {
    console.error("Error seeding accounts:", err);
  }
}

seedAll();
startReminderCron();

export default app;
