import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, workMaterialsTable, usersTable, appointmentsTable } from "@workspace/db";
import { eq, and, inArray, ne, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const MATERIALS_DIR = path.resolve(process.cwd(), "uploads/materials");
if (!fs.existsSync(MATERIALS_DIR)) fs.mkdirSync(MATERIALS_DIR, { recursive: true });

const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MATERIALS_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de archivo no permitido"));
  },
});

function getFileType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function isStaff(req: any) {
  return ["superadmin", "therapist"].includes(req.session.role || "");
}

router.get("/", async (req, res) => {
  try {
    if (isStaff(req)) {
      const materials = await db.select().from(workMaterialsTable)
        .orderBy(workMaterialsTable.uploadedAt);
      res.json(materials); return;
    }

    const now = new Date();
    const patientAppts = await db.select({ therapyType: appointmentsTable.therapyType })
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.userId, req.session.userId!),
        ne(appointmentsTable.status, "cancelled"),
      ));

    const therapyTypes = [...new Set(patientAppts.map(a => a.therapyType))];

    if (therapyTypes.length === 0) {
      res.json([]); return;
    }

    const materials = await db.select().from(workMaterialsTable)
      .where(inArray(workMaterialsTable.therapyType, therapyTypes))
      .orderBy(workMaterialsTable.uploadedAt);

    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ error: "Error al obtener materiales" });
  }
});

router.post("/", upload.single("file"), async (req: any, res) => {
  try {
    if (!isStaff(req)) {
      res.status(403).json({ error: "Solo personal médico puede subir materiales" }); return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Archivo requerido" }); return;
    }

    const { title, description, therapyType } = req.body;
    if (!title || !therapyType) {
      fs.unlinkSync(file.path);
      res.status(400).json({ error: "Título y tipo de terapia son requeridos" }); return;
    }

    const [user] = await db.select({ fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);

    const [material] = await db.insert(workMaterialsTable).values({
      therapistId: req.session.userId!,
      therapistName: user?.fullName || null,
      therapyType,
      title,
      description: description || null,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileType: getFileType(file.mimetype),
    }).returning();

    res.status(201).json(material);
  } catch (err) {
    console.error("Upload material error:", err);
    res.status(500).json({ error: "Error al subir material" });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [material] = await db.select().from(workMaterialsTable)
      .where(eq(workMaterialsTable.id, id)).limit(1);

    if (!material) {
      res.status(404).json({ error: "Material no encontrado" }); return;
    }

    if (!(await checkMaterialAccess(req, material))) {
      res.status(403).json({ error: "No tiene acceso a este material" }); return;
    }

    const filePath = path.join(MATERIALS_DIR, material.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Archivo no encontrado en disco" }); return;
    }

    res.setHeader("Content-Type", material.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(material.originalName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Error al descargar material" });
  }
});

async function checkMaterialAccess(req: any, material: any): Promise<boolean> {
  if (isStaff(req)) return true;
  const patientAppts = await db.select({ therapyType: appointmentsTable.therapyType })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.userId, req.session.userId!),
      ne(appointmentsTable.status, "cancelled"),
    ));
  const therapyTypes = [...new Set(patientAppts.map(a => a.therapyType))];
  return therapyTypes.includes(material.therapyType);
}

router.get("/:id/preview", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [material] = await db.select().from(workMaterialsTable)
      .where(eq(workMaterialsTable.id, id)).limit(1);

    if (!material) {
      res.status(404).json({ error: "Material no encontrado" }); return;
    }

    if (!(await checkMaterialAccess(req, material))) {
      res.status(403).json({ error: "No tiene acceso a este material" }); return;
    }

    if (material.mimeType === "image/svg+xml") {
      res.status(403).json({ error: "Tipo de archivo no soportado para preview" }); return;
    }

    const filePath = path.join(MATERIALS_DIR, material.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Archivo no encontrado en disco" }); return;
    }

    res.setHeader("Content-Type", material.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Error al previsualizar" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!isStaff(req)) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    const id = Number(req.params.id);
    const [material] = await db.select().from(workMaterialsTable)
      .where(eq(workMaterialsTable.id, id)).limit(1);

    if (!material) {
      res.status(404).json({ error: "Material no encontrado" }); return;
    }

    const isOwner = material.therapistId === req.session.userId;
    const isSuperAdmin = req.session.role === "superadmin";
    if (!isOwner && !isSuperAdmin) {
      res.status(403).json({ error: "Solo puedes eliminar tus propios materiales" }); return;
    }

    const filePath = path.join(MATERIALS_DIR, material.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.delete(workMaterialsTable).where(eq(workMaterialsTable.id, id));
    res.json({ message: "Material eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar material" });
  }
});

export default router;
