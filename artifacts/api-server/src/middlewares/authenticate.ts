/**
 * Authentication middleware for staff/doctor routes.
 * Validates JWT from Authorization header and attaches user context to request.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyStaffToken, type StaffTokenPayload } from "../services/auth";
import { verifyPatientSession, type PatientSessionPayload } from "../services/patient-auth";
import { logger } from "../lib/logger";

// Extend Express request with auth context
declare global {
  namespace Express {
    interface Request {
      user?: StaffTokenPayload;
      patientSession?: PatientSessionPayload;
    }
  }
}

/**
 * Require a valid staff JWT. Attaches req.user.
 */
export function requireStaffAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", code: "MISSING_TOKEN" });
    return;
  }
  const token = header.slice(7);
  try {
    req.user = verifyStaffToken(token);
    next();
  } catch (err) {
    logger.warn({ err }, "Staff JWT verification failed");
    res.status(401).json({ error: "Unauthorized", code: "INVALID_TOKEN" });
  }
}

/**
 * Require a valid patient session JWT. Attaches req.patientSession.
 */
export function requirePatientAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", code: "MISSING_TOKEN" });
    return;
  }
  const token = header.slice(7);
  try {
    req.patientSession = verifyPatientSession(token);
    next();
  } catch (err) {
    logger.warn({ err }, "Patient session JWT verification failed");
    res.status(401).json({ error: "Unauthorized", code: "INVALID_TOKEN" });
  }
}

/**
 * Accept either staff OR patient auth — used on endpoints that serve both.
 */
export function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", code: "MISSING_TOKEN" });
    return;
  }
  const token = header.slice(7);

  // Try staff token first
  try {
    req.user = verifyStaffToken(token);
    return next();
  } catch {
    // Not a staff token — try patient session
  }

  try {
    req.patientSession = verifyPatientSession(token);
    return next();
  } catch (err) {
    logger.warn({ err }, "Auth verification failed for both staff and patient");
    res.status(401).json({ error: "Unauthorized", code: "INVALID_TOKEN" });
  }
}
