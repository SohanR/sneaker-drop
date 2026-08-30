import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { verifyAdminToken } from "../services/admin-auth-service.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new AppError(401, "ADMIN_TOKEN_REQUIRED", "Admin bearer token is required"));
  try {
    res.locals.admin = verifyAdminToken(header.slice(7));
    next();
  } catch (error) {
    next(error);
  }
}

