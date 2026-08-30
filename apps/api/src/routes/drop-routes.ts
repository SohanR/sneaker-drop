import { Router } from "express";
import { requireAdmin } from "../middleware/admin-auth.js";
import { createDrop, listDashboardDrops } from "../services/drop-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createDropSchema } from "../utils/drop-input.js";
import { parse } from "../utils/validation.js";

export const dropRoutes = Router();

dropRoutes.get("/", asyncHandler(async (_req, res) => {
  const drops = await listDashboardDrops();
  res.json({ data: drops });
}));

dropRoutes.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const input = parse(createDropSchema, req.body);
  const drop = await createDrop(input, res.locals.admin.sub);
  res.status(201).json({ data: drop });
}));
