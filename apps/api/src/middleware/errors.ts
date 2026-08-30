import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@sneaker-drop/contracts";
import { AppError } from "../errors/app-error.js";

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
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, requestId: res.locals.requestId, details: error.details }
    });
    return;
  }
  console.error({ requestId: res.locals.requestId, error });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: res.locals.requestId }
  });
}
