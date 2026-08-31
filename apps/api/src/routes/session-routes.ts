import { Router } from "express";
import { z } from "zod";
import { getAuthConfig } from "../config/auth.js";
import { requireBuyer } from "../middleware/buyer-auth.js";
import { createBuyerSession, endBuyerSession } from "../services/session-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const createSchema = z.object({
  displayUsername: z.string().trim().regex(/^[A-Za-z0-9_.-]{3,50}$/)
});

export const sessionRoutes = Router();

sessionRoutes.post("/", asyncHandler(async (req, res) => {
  const input = parse(createSchema, req.body);
  const { token, session } = await createBuyerSession(input.displayUsername);
  const config = getAuthConfig();
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: config.sessionTtlSeconds * 1000,
    path: "/"
  });
  res.status(201).json({ data: { id: session.id, displayUsername: session.displayUsername, expiresAt: session.expiresAt } });
}));

sessionRoutes.get("/current", requireBuyer, (req, res) => {
  const session = res.locals.buyerSession;
  res.json({ data: { id: session.id, displayUsername: session.displayUsername, expiresAt: session.expiresAt } });
});

sessionRoutes.delete("/current", requireBuyer, asyncHandler(async (_req, res) => {
  const config = getAuthConfig();
  await endBuyerSession(res.locals.buyerSession.id);
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.status(204).end();
}));
