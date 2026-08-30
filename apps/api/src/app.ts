import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import type { HealthResponse } from "@sneaker-drop/contracts";
import { env } from "./config/env.js";
import { getAuthConfig } from "./config/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requestId } from "./middleware/request-id.js";
import { openApiV1Document } from "./openapi-v1.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { dropRoutes } from "./routes/drop-routes.js";
import { sessionRoutes } from "./routes/session-routes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestId);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.corsAllowedOrigins, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser(getAuthConfig().sessionSecret));

app.get("/api/v1/health", (_req, res) => {
  const response: HealthResponse = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
    version: "0.1.0"
  };
  res.json(response);
});

app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/drops", dropRoutes);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiV1Document));
app.get("/api/openapi.json", (_req, res) => res.json(openApiV1Document));
app.use(notFound);
app.use(errorHandler);

export default app;
