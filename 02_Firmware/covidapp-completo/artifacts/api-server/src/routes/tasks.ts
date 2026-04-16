import { Router } from "express";
import { db, patientTasksTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

function isStaff(req: any) {
  return ["superadmin", "therapist", "nonmedical_admin"].includes(req.session.role || "");
}

// GET patient's own tasks
router.get("/my", async (req, res) => {
  try {
    const tasks = await db
      .select({
        id: patientTasksTable.id,
        title: patientTasksTable.title,
        description: patientTasksTable.description,
        howTo: patientTasksTable.howTo,
        dueDate: patientTasksTable.dueDate,
        status: patientTasksTable.status,
        createdAt: patientTasksTable.createdAt,
        assignedByName: usersTable.fullName,
      })
      .from(patientTasksTable)
      .innerJoin(usersTable, eq(patientTasksTable.assignedById, usersTable.id))
      .where(eq(patientTasksTable.patientId, req.session.userId!))
      .orderBy(patientTasksTable.dueDate);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// GET patient's tasks (by admin)
router.get("/patient/:patientId", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const patientId = parseInt(req.params.patientId);
    const tasks = await db
      .select({
        id: patientTasksTable.id,
        title: patientTasksTable.title,
        description: patientTasksTable.description,
        howTo: patientTasksTable.howTo,
        dueDate: patientTasksTable.dueDate,
        status: patientTasksTable.status,
        createdAt: patientTasksTable.createdAt,
        assignedByName: usersTable.fullName,
      })
      .from(patientTasksTable)
      .innerJoin(usersTable, eq(patientTasksTable.assignedById, usersTable.id))
      .where(eq(patientTasksTable.patientId, patientId))
      .orderBy(patientTasksTable.dueDate);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST — assign task to patient
router.post("/", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const { patientId, title, description, howTo, dueDate } = req.body;
    if (!patientId || !title || !description) {
      res.status(400).json({ error: "patientId, title y description son requeridos" }); return;
    }

    const [task] = await db.insert(patientTasksTable).values({
      assignedById: req.session.userId!,
      patientId,
      title,
      description,
      howTo: howTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();

    const assigner = await db.select({ fullName: usersTable.fullName, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    const assignerName = assigner[0]?.fullName || assigner[0]?.username || "Tu terapeuta";

    await db.insert(notificationsTable).values({
      userId: patientId,
      title: `Nueva tarea asignada: ${title}`,
      message: `${assignerName} te ha asignado una nueva tarea: "${title}". ${dueDate ? `Fecha límite: ${new Date(dueDate).toLocaleDateString("es-CO")}.` : ""}`,
      type: "task_assigned",
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT — patient marks task as done, or admin updates
router.put("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) { res.status(400).json({ error: "status requerido" }); return; }

    const [task] = await db.select().from(patientTasksTable).where(eq(patientTasksTable.id, id)).limit(1);
    if (!task) { res.status(404).json({ error: "Tarea no encontrada" }); return; }

    const isOwner = task.patientId === req.session.userId;
    if (!isOwner && !isStaff(req)) { res.status(403).json({ error: "Acceso denegado" }); return; }

    const [updated] = await db.update(patientTasksTable).set({ status, updatedAt: new Date() }).where(eq(patientTasksTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    if (!isStaff(req)) { res.status(403).json({ error: "Solo personal médico" }); return; }
    const id = parseInt(req.params.id);
    await db.delete(patientTasksTable).where(eq(patientTasksTable.id, id));
    res.json({ message: "Tarea eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
