/**
 * Global error handler middleware.
 * Catches unhandled errors, logs them, and returns a safe error response.
 * Never leaks internal details (stack traces, DB errors) to the client.
 */
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV === "development";

  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      statusCode,
    },
    "Unhandled request error"
  );

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error" : err.message,
    code: err.code ?? "INTERNAL_ERROR",
    ...(isDev && statusCode === 500 ? { stack: err.stack } : {}),
  });
}

/**
 * 404 handler — must be registered after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND", path: req.path });
}

/**
 * Helper to create typed app errors.
 */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
