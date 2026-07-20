/**
 * Role-Based Access Control middleware.
 * Enforced at the API layer — not just hidden in the UI.
 * Admin/reception MUST receive 403 (not a hidden button) on clinical-content endpoints.
 *
 * Permission model from RBAC matrix in 02-DATA-MODEL-ROLES-AUTH.md:
 *   doctor      — full clinical read, no write on patient data
 *   clinic_admin — operational status only, NEVER clinical content
 *   nurse       — role slot exists, permissions TBD (treated as clinic_admin for now)
 *   patient     — own record only, via preparation link
 */
import type { Request, Response, NextFunction } from "express";

export type StaffRole = "doctor" | "clinic_admin" | "nurse";

/**
 * Require that the authenticated staff user has one of the allowed roles.
 * Must be used AFTER requireStaffAuth.
 */
export function requireRole(...allowedRoles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized", code: "NOT_AUTHENTICATED" });
      return;
    }
    if (!allowedRoles.includes(req.user.role as StaffRole)) {
      res.status(403).json({
        error: "Forbidden",
        code: "INSUFFICIENT_ROLE",
        required: allowedRoles,
        actual: req.user.role,
      });
      return;
    }
    next();
  };
}

/**
 * Doctor-only access guard. Use on all clinical-content endpoints.
 * Admin/reception attempting to access these endpoints receives 403.
 */
export const doctorOnly = requireRole("doctor");

/**
 * Admin/reception operational guard (also allows doctor).
 * Use for operational status endpoints.
 */
export const staffOnly = requireRole("doctor", "clinic_admin", "nurse");

/**
 * Admin/reception guard (excludes doctor — for invitation management).
 * Doctors currently cannot create invitations unless also acting as admin.
 */
export const adminOnly = requireRole("clinic_admin", "nurse");

/**
 * Clinical content guard — explicitly blocks admin/reception.
 * Applies to: questionnaire answers, uploaded documents, summaries, historical timeline.
 * This is a privacy requirement enforced server-side, not a UI-only restriction.
 */
export const clinicalContentGuard = requireRole("doctor");

/**
 * Verify that a staff user owns or has access to a specific patient's data.
 * For doctors: access to all (audit logged).
 * For admin: access to operational fields only (enforced by route handler — this helper
 * provides the ownership check primitive for doctors viewing a specific patient).
 */
export function assertDoctorAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "doctor") {
    res.status(403).json({
      error: "Forbidden",
      code: "CLINICAL_CONTENT_RESTRICTED",
      message: "Clinical content is accessible to doctors only.",
    });
    return;
  }
  next();
}
