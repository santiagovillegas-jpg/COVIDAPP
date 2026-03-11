import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.session.userId!))
      .orderBy(notificationsTable.createdAt);

    res.json(notifications.reverse());
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

router.put("/read-all", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.userId, req.session.userId!));

    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Error al marcar notificaciones" });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [notification] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, req.session.userId!),
        ),
      )
      .returning();

    if (!notification) {
      res.status(404).json({ error: "Notificación no encontrada" });
      return;
    }

    res.json(notification);
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Error al marcar notificación" });
  }
});

export default router;
