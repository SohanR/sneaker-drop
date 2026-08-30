import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@sneaker-drop/contracts";

export function notFound(_req: Request, res: Response<ApiErrorResponse>) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found", requestId: res.locals.requestId }
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
) {
  console.error({ requestId: res.locals.requestId, error });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: res.locals.requestId }
  });
}

