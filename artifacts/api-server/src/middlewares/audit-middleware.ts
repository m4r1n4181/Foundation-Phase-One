/**
 * Audit middleware helpers — attach audit context to request lifecycle.
 * Use writeAuditLog from services/audit.ts in route handlers for precise event logging.
 * This middleware handles request-level metadata (IP extraction, etc.).
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Extract the real client IP from the request.
 * Respects X-Forwarded-For if behind a trusted proxy.
 */
export function extractClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const ips = Array.isArray(xff) ? xff[0] : xff;
    return ips.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Middleware that attaches a getAuditIp() helper to the request.
 * Call this early in the middleware chain.
 */
export function auditIpMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  (req as Request & { getAuditIp: () => string }).getAuditIp = () =>
    extractClientIp(req);
  next();
}

declare global {
  namespace Express {
    interface Request {
      getAuditIp?: () => string;
    }
  }
}
