import { Router } from "express";
import { db, resourcesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

function isAdmin(req: any) {
  return ["superadmin", "therapist", "nonmedical_admin"].includes(req.session.role || "");
}

// GET all active resources (patients + staff)
router.get("/", async (req, res) => {
  try {
    const resources = await db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true))
      .orderBy(resourcesTable.type, resourcesTable.name);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// POST — admin creates resource
router.post("/", async (req, res) => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: "Solo administradores" }); return; }
    const { name, type, address, phone, mapsUrl, schedule, notes } = req.body;
    if (!name || !type) { res.status(400).json({ error: "name y type son requeridos" }); return; }

    const [resource] = await db.insert(resourcesTable).values({
      adminId: req.session.userId!,
      name, type, address, phone, mapsUrl, schedule, notes,
    }).returning();
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT — update resource
router.put("/:id", async (req, res) => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: "Solo administradores" }); return; }
    const id = parseInt(req.params.id);
    const { name, type, address, phone, mapsUrl, schedule, notes, isActive } = req.body;

    const [updated] = await db.update(resourcesTable).set({
      ...(name && { name }),
      ...(type && { type }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(mapsUrl !== undefined && { mapsUrl }),
      ...(schedule !== undefined && { schedule }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    }).where(eq(resourcesTable.id, id)).returning();

    if (!updated) { res.status(404).json({ error: "Recurso no encontrado" }); return; }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

// DELETE (soft)
router.delete("/:id", async (req, res) => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: "Solo administradores" }); return; }
    const id = parseInt(req.params.id);
    await db.update(resourcesTable).set({ isActive: false }).where(eq(resourcesTable.id, id));
    res.json({ message: "Recurso desactivado" });
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
