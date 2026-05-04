# COVIDAPP — Fundación COVIDA

Sistema de gestión terapéutica para la Fundación de Rehabilitación COVIDA, Universidad del Quindío, Armenia, Colombia.

## Arquitectura

- **Frontend:** React + Vite + TailwindCSS → `/artifacts/covidapp`
- **Backend:** Express.js + Drizzle ORM + PostgreSQL → `/artifacts/api-server`
- **DB:** Drizzle ORM con push migrations → `/lib/db`
- **API client:** Auto-generado → `/lib/api-client-react`

## Roles y Credenciales

| Rol | Usuario | Contraseña | Ruta |
|---|---|---|---|
| Superadmin | `admin` | `123456789` | `/admin` |
| Terapeuta | `terapeuta1` | `terapeuta123` | `/terapeuta` |
| Admin No Médico | `admininfo` | `admininfo123` | `/admininfo` |
| Paciente | (registro) | (registro) | `/bienvenida` |

## Tablas de Base de Datos

- `users` — usuarios con perfil extendido (datos personales, médicos, laborales)
- `appointments` — citas con detección de conflictos (±30 min)
- `notifications` — notificaciones in-app
- `therapist_patients` — asignación terapeuta↔paciente
- `therapy_notes` — notas clínicas de sesiones
- `resources` — centros médicos y farmacias
- `patient_tasks` — tareas asignadas por terapeutas
- `medications` — recetas y medicamentos activos

## Rutas API

- `/api/auth/*` — registro pacientes, registro staff (admin→therapist/nonmedical_admin), login, logout, me
- `/api/appointments/*` — CRUD citas + conflicto check + horario por día
- `/api/notifications/*` — notificaciones
- `/api/therapist/*` — gestión de pacientes, notas, inscripción terapias, trazabilidad
- `/api/nonmedical-admin/stats` — estadísticas e info de pacientes
- `/api/admin/*` — gestión de usuarios (superadmin)
- `/api/profile` — perfil de usuario (GET, PUT, GET /:id)
- `/api/resources/*` — centros médicos y farmacias (CRUD admin, lectura todos)
- `/api/tasks/*` — tareas (asignación por staff, completar por paciente)
- `/api/medications/*` — recetas (prescribir por staff, ver por paciente)

## Páginas Frontend

### Paciente
- `/bienvenida` — Dashboard con citas y tareas
- `/citas` — Gestión de citas
- `/tareas` — Tareas asignadas por terapeuta
- `/medicamentos` — Medicamentos y recetas activas + impresión nota farmacia
- `/historial` — Historial médico
- `/telemedicina` — Videollamada via Jitsi Meet
- `/recursos` — Centros médicos y farmacias
- `/perfil` — Perfil y preferencias

### Personal Médico (Terapeuta)
- `/terapeuta` — Panel con tabs: Notas, Inscribir Terapia, Tareas, Medicamentos, Trazabilidad
- `/recursos` — Gestión de centros médicos
- `/telemedicina` — Videollamada

### Admin No Médico
- `/admininfo` — Estadísticas + tabla pacientes con seguro y método de ingreso
- `/recursos` — Gestión de centros médicos

### Superadmin
- `/admin` — Panel de administración de usuarios
- `/personal` — Registro y gestión de personal (terapeutas, secretarias, etc.)
- Acceso a todos los paneles

## Funcionalidades Clave

- **Detección de conflictos de citas:** No permite 2 citas en ±30 min del mismo horario
- **Recordatorios automáticos:** Cron job cada hora, envía email 48h y 24h antes de citas
- **Notificaciones:** Push in-app + email (Gmail SMTP) en: asignación terapeuta, nueva nota, terapia inscrita, tarea asignada, medicamento prescrito
- **Telemedicina:** Jitsi Meet integrado (sin instalación, hasta 50 participantes, cifrado)
- **PDF farmacia:** Paciente puede imprimir nota con sus medicamentos activos
- **Trazabilidad médica:** Línea de tiempo cronológica de todas las notas clínicas
- **Perfil extendido:** Grupo sanguíneo, alergias, contacto emergencia, datos laborales para staff
- **Registro de staff:** Solo superadmin puede registrar terapeutas y admin no médico

## Seguridad
- Contraseñas hasheadas con bcrypt
- Sesiones con express-session (HTTP-only cookies)
- Validación de roles en cada endpoint
- HTTPS proporcionado por proxy de Replit (SSL en tránsito)

## Email (SMTP)
- Gmail SMTP via variables: `GMAIL_USER` + `GMAIL_APP_PASSWORD`
- SMS/WhatsApp requieren Twilio (servicio de pago externo)

## Footer
"©️ 2025 Universidad del Quindío | Alpha build v0.0.1" — presente en todas las páginas.
