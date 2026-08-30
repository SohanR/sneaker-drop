import type { NextFunction, Request, Response } from "express";
import { getAuthConfig } from "../config/auth.js";
import { AppError } from "../errors/app-error.js";
import { findActiveBuyerSession } from "../services/session-service.js";

export async function requireBuyer(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.signedCookies?.[getAuthConfig().sessionCookieName];
    if (typeof token !== "string") throw new AppError(401, "BUYER_SESSION_REQUIRED", "Buyer session cookie is required");
    res.locals.buyerSession = await findActiveBuyerSession(token);
    next();
  } catch (error) {
    next(error);
  }
}

