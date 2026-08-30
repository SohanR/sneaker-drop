import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getCronConfig } from "../config/cron.js";
import { AppError } from "../errors/app-error.js";

export function requireCron(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = getCronConfig().secret;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    next(new AppError(401, "CRON_UNAUTHORIZED", "Cron authorization failed"));
    return;
  }
  next();
}

