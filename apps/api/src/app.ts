import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import type { HealthResponse } from "@sneaker-drop/contracts";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requestId } from "./middleware/request-id.js";
import { openApiDocument } from "./openapi.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestId);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.corsAllowedOrigins, credentials: true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/v1/health", (_req, res) => {
  const response: HealthResponse = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
    version: "0.1.0"
  };
  res.json(response);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));
app.use(notFound);
app.use(errorHandler);

export default app;

