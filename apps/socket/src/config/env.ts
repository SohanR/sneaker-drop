import "./load-env.js";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SOCKET_PORT: z.coerce.number().int().positive().default(3001),
  SOCKET_ALLOWED_ORIGINS: z.string().default("http://localhost:5173")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid socket environment: ${z.prettifyError(parsed.error)}`);

export const socketEnv = {
  ...parsed.data,
  allowedOrigins: parsed.data.SOCKET_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
};
