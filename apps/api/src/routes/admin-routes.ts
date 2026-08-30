import { Router } from "express";
import { z } from "zod";
import { loginAdmin } from "../services/admin-auth-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200)
});

export const adminRoutes = Router();

adminRoutes.post("/login", asyncHandler(async (req, res) => {
  const input = parse(loginSchema, req.body);
  const result = await loginAdmin(input.username, input.password);
  res.json({ data: { accessToken: result.token, tokenType: "Bearer", expiresIn: result.expiresIn } });
}));

