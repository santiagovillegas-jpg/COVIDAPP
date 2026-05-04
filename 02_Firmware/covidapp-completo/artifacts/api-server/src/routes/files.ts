import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, patientFilesTable, userStorageTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const STORAGE_DIR = path.resolve(process.cwd(), "uploads/storage");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/avi",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
];

function makeUploader(dest: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Tipo de archivo no permitido"));
    },
  });
}

const uploadToPatient = makeUploader(UPLOADS_DIR);
const uploadToStorage = makeUploader(STORAGE_DIR);

function getFileType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT FILES  (therapist → specific patient)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/files/patients/:patientId — therapist directly uploads to patient
router.post("/patients/:patientId", requireAuth, uploadToPatient.single("file"), async (req, res) => {
  try {
    if (req.session.role !== "therapist" && req.session.role !== "superadmin") {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(403).json({ error: "Solo los terapeutas pueden enviar archivos a pacientes" }); return;
    }
    if (!req.file) { res.status(400).json({ error: "No se recibió ningún archivo" }); return; }

    const patientId = Number(req.params.patientId);
    const [therapist] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    const [file] = await db.insert(patientFilesTable).values({
      patientId,
      therapistId: req.session.userId!,
      therapistName: therapist?.fullName || "Terapeuta",
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType: getFileType(req.file.mimetype),
      description: req.body.description || null,
    }).returning();

    res.status(201).json(file);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("File upload error:", err);
    res.status(500).json({ error: "Error al subir el archivo" });
  }
});

// GET /api/files/patients/:patientId — list sent files
// Access: the specific patient + the specific therapist who uploaded + superadmin
router.get("/patients/:patientId", requireAuth, async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const isSuperAdmin = req.session.role === "superadmin";
    const isOwnerPatient = req.session.userId === patientId;

    const files = await db.select().from(patientFilesTable)
      .where(eq(patientFilesTable.patientId, patientId))
      .orderBy(patientFilesTable.uploadedAt);

    if (isSuperAdmin || isOwnerPatient) {
      res.json(files); return;
    }
    // Therapist: only files they sent
    if (req.session.role === "therapist") {
      res.json(files.filter(f => f.therapistId === req.session.userId));
      return;
    }
    res.status(403).json({ error: "Sin permiso" });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener archivos" });
  }
});

// GET /api/files/my — patient's own received files (sent by their therapist)
router.get("/my", requireAuth, async (req, res) => {
  try {
    const files = await db.select().from(patientFilesTable)
      .where(eq(patientFilesTable.patientId, req.session.userId!))
      .orderBy(patientFilesTable.uploadedAt);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener archivos" });
  }
});

// GET /api/files/:fileId/download — download a patient file
// Access: the specific patient + the specific therapist who sent it + superadmin
router.get("/:fileId/download", requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.fileId);
    const [file] = await db.select().from(patientFilesTable)
      .where(eq(patientFilesTable.id, fileId)).limit(1);

    if (!file) { res.status(404).json({ error: "Archivo no encontrado" }); return; }

    const isSuperAdmin = req.session.role === "superadmin";
    const isOwnerPatient = req.session.userId === file.patientId;
    const isSenderTherapist = req.session.userId === file.therapistId;

    if (!isSuperAdmin && !isOwnerPatient && !isSenderTherapist) {
      res.status(403).json({ error: "Sin permiso para acceder a este archivo" }); return;
    }

    const filePath = path.join(UPLOADS_DIR, file.fileName);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Archivo no encontrado en disco" }); return; }

    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader("Content-Type", file.mimeType);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: "Error al descargar archivo" });
  }
});

// DELETE /api/files/:fileId — delete a patient file
// Access: the therapist who sent it + superadmin
router.delete("/:fileId", requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.fileId);
    const [file] = await db.select().from(patientFilesTable)
      .where(eq(patientFilesTable.id, fileId)).limit(1);
    if (!file) { res.status(404).json({ error: "Archivo no encontrado" }); return; }

    const isSuperAdmin = req.session.role === "superadmin";
    const isSender = req.session.userId === file.therapistId;
    if (!isSuperAdmin && !isSender) {
      res.status(403).json({ error: "Solo quien subió el archivo puede eliminarlo" }); return;
    }

    const filePath = path.join(UPLOADS_DIR, file.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.delete(patientFilesTable).where(eq(patientFilesTable.id, fileId));
    res.json({ message: "Archivo eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar archivo" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL STORAGE  (any authenticated user — patient, therapist, admin)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/files/storage — upload to own personal storage
router.post("/storage", requireAuth, uploadToStorage.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No se recibió ningún archivo" }); return; }

    const [file] = await db.insert(userStorageTable).values({
      userId: req.session.userId!,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType: getFileType(req.file.mimetype),
      description: req.body.description || null,
    }).returning();

    res.status(201).json(file);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("Storage upload error:", err);
    res.status(500).json({ error: "Error al subir el archivo" });
  }
});

// GET /api/files/storage — list own storage files
router.get("/storage", requireAuth, async (req, res) => {
  try {
    const files = await db.select().from(userStorageTable)
      .where(eq(userStorageTable.userId, req.session.userId!))
      .orderBy(userStorageTable.uploadedAt);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener almacenamiento" });
  }
});

// GET /api/files/storage/:id/download — download own storage file
// Access: only the owner + superadmin
router.get("/storage/:id/download", requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const [file] = await db.select().from(userStorageTable)
      .where(eq(userStorageTable.id, fileId)).limit(1);

    if (!file) { res.status(404).json({ error: "Archivo no encontrado" }); return; }

    const isSuperAdmin = req.session.role === "superadmin";
    const isOwner = req.session.userId === file.userId;
    if (!isSuperAdmin && !isOwner) {
      res.status(403).json({ error: "Sin permiso para acceder a este archivo" }); return;
    }

    const filePath = path.join(STORAGE_DIR, file.fileName);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Archivo no encontrado en disco" }); return; }

    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader("Content-Type", file.mimeType);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: "Error al descargar archivo" });
  }
});

// DELETE /api/files/storage/:id — delete own storage file
router.delete("/storage/:id", requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const [file] = await db.select().from(userStorageTable)
      .where(eq(userStorageTable.id, fileId)).limit(1);
    if (!file) { res.status(404).json({ error: "Archivo no encontrado" }); return; }

    const isSuperAdmin = req.session.role === "superadmin";
    const isOwner = req.session.userId === file.userId;
    if (!isSuperAdmin && !isOwner) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    const filePath = path.join(STORAGE_DIR, file.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.delete(userStorageTable).where(eq(userStorageTable.id, fileId));
    res.json({ message: "Archivo eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar archivo" });
  }
});

// POST /api/files/storage/:id/send-to/:patientId
// Only therapists can send a storage file to a patient registered under them
router.post("/storage/:id/send-to/:patientId", requireAuth, async (req, res) => {
  try {
    if (req.session.role !== "therapist" && req.session.role !== "superadmin") {
      res.status(403).json({ error: "Solo los terapeutas pueden enviar archivos a pacientes" }); return;
    }

    const fileId = Number(req.params.id);
    const patientId = Number(req.params.patientId);

    const [storageFile] = await db.select().from(userStorageTable)
      .where(eq(userStorageTable.id, fileId)).limit(1);
    if (!storageFile) { res.status(404).json({ error: "Archivo no encontrado en tu almacenamiento" }); return; }
    if (storageFile.userId !== req.session.userId) {
      res.status(403).json({ error: "Solo puedes enviar tus propios archivos" }); return;
    }

    // Copy file from storage to uploads dir for the patient
    const srcPath = path.join(STORAGE_DIR, storageFile.fileName);
    const destFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(storageFile.fileName)}`;
    const destPath = path.join(UPLOADS_DIR, destFileName);
    if (!fs.existsSync(srcPath)) { res.status(404).json({ error: "Archivo no encontrado en disco" }); return; }
    fs.copyFileSync(srcPath, destPath);

    const [therapist] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    const [sent] = await db.insert(patientFilesTable).values({
      patientId,
      therapistId: req.session.userId!,
      therapistName: therapist?.fullName || "Terapeuta",
      fileName: destFileName,
      originalName: storageFile.originalName,
      mimeType: storageFile.mimeType,
      fileSize: storageFile.fileSize,
      fileType: storageFile.fileType,
      description: storageFile.description,
    }).returning();

    res.status(201).json(sent);
  } catch (err) {
    console.error("Send storage file error:", err);
    res.status(500).json({ error: "Error al enviar archivo" });
  }
});

export default router;
