import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid API environment: ${z.prettifyError(parsed.error)}`);
}

export const env = {
  ...parsed.data,
  corsAllowedOrigins: parsed.data.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
};

