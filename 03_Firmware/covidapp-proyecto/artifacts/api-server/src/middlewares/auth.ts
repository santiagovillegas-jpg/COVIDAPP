import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  if (!["admin", "superadmin", "nonmedical_admin", "therapist"].includes(req.session.role || "")) {
    res.status(403).json({ error: "Acceso denegado: se requiere rol administrador" });
    return;
  }
  next();
}
