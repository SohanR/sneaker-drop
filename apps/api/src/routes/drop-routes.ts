import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth.js";
import { createDrop, listDashboardDrops } from "../services/drop-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const createDropSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional(),
  imageUrl: z.url().optional(),
  price: z.number().finite().nonnegative().multipleOf(0.01),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  totalStock: z.number().int().nonnegative(),
  startsAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value))
});

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
