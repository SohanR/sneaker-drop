import type { ZodType } from "zod";
import { AppError } from "../errors/app-error.js";

export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(422, "VALIDATION_ERROR", "Request validation failed", result.error.flatten());
  }
  return result.data;
}
