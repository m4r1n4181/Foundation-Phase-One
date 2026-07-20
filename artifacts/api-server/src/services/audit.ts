/**
 * Audit log service — append-only, retained indefinitely per legal requirement.
 * Use this in every route that touches clinical content or performs a sensitive action.
 * Failures are logged but never thrown — audit logging must not break the happy path.
 */
import { db, auditLogTable, AUDIT_ACTIONS } from "../lib/db";
import type { InsertAuditLog, AuditAction } from "@workspace/db";
import { logger } from "../lib/logger";

export interface AuditContext {
  actorType: InsertAuditLog["actorType"];
  actorUserId?: string;
  actorLinkId?: string;
  actorRole?: string;
  actorIp?: string;
}

export interface AuditEvent {
  ctx: AuditContext;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  outcome: InsertAuditLog["outcome"];
  context?: Record<string, unknown>;
}

/**
 * Write an audit log entry.
 * This function swallows errors — a failure here MUST NOT break the request.
 * However it does log the failure so it can be investigated.
 */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      actorType: event.ctx.actorType,
      actorUserId: event.ctx.actorUserId ?? null,
      actorLinkId: event.ctx.actorLinkId ?? null,
      actorRole: event.ctx.actorRole ?? null,
      actorIp: event.ctx.actorIp ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      outcome: event.outcome,
      context: event.context ?? null,
    });
  } catch (err) {
    // Audit log failures are critical — log loudly but do not propagate
    logger.error({ err, event }, "AUDIT LOG WRITE FAILED — investigate immediately");
  }
}

/**
 * Build audit context from a staff/doctor user.
 */
export function userAuditCtx(
  userId: string,
  role: string,
  ip?: string
): AuditContext {
  return { actorType: "user", actorUserId: userId, actorRole: role, actorIp: ip };
}

/**
 * Build audit context from a patient preparation link.
 */
export function linkAuditCtx(linkId: string, ip?: string): AuditContext {
  return { actorType: "patient_link", actorLinkId: linkId, actorRole: "patient", actorIp: ip };
}

/**
 * Build audit context for an unauthenticated access attempt.
 */
export function unauthAuditCtx(ip?: string): AuditContext {
  return { actorType: "unauthenticated", actorIp: ip };
}

/**
 * Build audit context for system-initiated actions (auto-lock, reminders).
 */
export function systemAuditCtx(): AuditContext {
  return { actorType: "system", actorRole: "system" };
}

export { AUDIT_ACTIONS };
