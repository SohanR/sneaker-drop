import { Router } from "express";
import { requireCron } from "../middleware/cron-auth.js";
import { sweepExpiredReservations } from "../services/expiration-service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const cronRoutes = Router();

cronRoutes.get("/expire-reservations", requireCron, asyncHandler(async (_req, res) => {
  const result = await sweepExpiredReservations();
  res.json({ data: result });
}));
