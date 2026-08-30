import { Router } from "express";
import jwt from "jsonwebtoken";
import { getRealtimeConfig } from "../config/realtime.js";
import { requireBuyer } from "../middleware/buyer-auth.js";

export const realtimeRoutes = Router();

realtimeRoutes.post("/token", requireBuyer, (_req, res) => {
  const config = getRealtimeConfig();
  const buyer = res.locals.buyerSession;
  const token = jwt.sign({ scope: "realtime" }, config.secret, {
    subject: buyer.id,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: config.expiresInSeconds
  });
  res.json({ data: { token, expiresIn: config.expiresInSeconds } });
});
