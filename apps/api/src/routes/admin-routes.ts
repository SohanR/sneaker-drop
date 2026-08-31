import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth.js";
import { loginAdmin } from "../services/admin-auth-service.js";
import { runLastItemRaceTest } from "../services/race-condition-test-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200)
});

const raceConditionTestSchema = z.object({
  concurrency: z.coerce.number().int().min(100).max(200).default(100)
});

export const adminRoutes = Router();

adminRoutes.post("/login", asyncHandler(async (req, res) => {
  const input = parse(loginSchema, req.body);
  const result = await loginAdmin(input.username, input.password);
  res.json({ data: { accessToken: result.token, tokenType: "Bearer", expiresIn: result.expiresIn } });
}));

adminRoutes.post("/race-condition-test", requireAdmin, asyncHandler(async (req, res) => {
  const input = parse(raceConditionTestSchema, req.body ?? {});
  const result = await runLastItemRaceTest(input.concurrency, res.locals.admin.sub);
  res.json({ data: result });
}));
