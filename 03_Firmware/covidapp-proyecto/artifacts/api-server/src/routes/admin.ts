import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        fullName: usersTable.fullName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "admin"))
      .orderBy(usersTable.createdAt);

    res.json(users);
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!["patient", "admin"].includes(role)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    const [updated] = await db
      .update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, role: usersTable.role });

    res.json(updated);
  } catch (err) {
    console.error("Admin update role error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
