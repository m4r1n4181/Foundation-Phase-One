/**
 * Document upload routes (patient-facing).
 * Lab results and ultrasound documents.
 * Access-restricted: patients upload their own; doctors view (in /doctor routes).
 * Every upload event is audit logged.
 *
 * Phase 1: upload metadata is recorded; actual file storage is stubbed.
 * Phase 2: wire to S3 with server-side encryption (SSE-S3 or SSE-KMS).
 */
import { Router } from "express";
import { db, uploadedDocumentsTable, appointmentsTable, AUDIT_ACTIONS } from "../lib/db";
import { eq } from "drizzle-orm";
import { requirePatientAuth } from "../middlewares/authenticate";
import { writeAuditLog, linkAuditCtx } from "../services/audit";
import { extractClientIp } from "../middlewares/audit-middleware";
import { config, } from "../lib/config";
import { ALLOWED_UPLOAD_MIME_TYPES } from "@workspace/db";
import crypto from "crypto";
import { z } from "zod";

const router = Router();

const uploadMetaSchema = z.object({
  originalFileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  fileSizeBytes: z.number().int().positive(),
  documentType: z.string().optional(),
  labStatus: z.enum([
    "uploaded_digitally",
    "will_bring_physical",
    "results_pending",
    "no_results_available",
    "not_required",
  ]).optional(),
});

/**
 * POST /api/uploads/:appointmentId
 * Patient uploads a lab/ultrasound document.
 *
 * Phase 1 implementation:
 *   - Validates file metadata
 *   - Generates a storage key (not yet written to S3)
 *   - Creates the DB record
 *   - Returns a presigned upload URL stub
 *
 * Phase 2: replace stub with real presigned S3 PUT URL.
 */
router.post("/:appointmentId", requirePatientAuth, async (req, res, next) => {
  try {
    const { appointmentId } = req.params as Record<string, string>;
    const ip = extractClientIp(req);
    const linkId = req.patientSession!.sub;

    if (req.patientSession!.appointmentId !== appointmentId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [appointment] = await db
      .select({ status: appointmentsTable.status, scheduledAt: appointmentsTable.scheduledAt })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, appointmentId))
      .limit(1);

    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const isLocked =
      appointment.status === "locked" ||
      (appointment.status !== "reopened" && new Date(appointment.scheduledAt) <= new Date());

    if (isLocked) {
      res.status(409).json({ error: "Questionnaire is locked", code: "QUESTIONNAIRE_LOCKED" });
      return;
    }

    const parse = uploadMetaSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request", issues: parse.error.issues });
      return;
    }
    const { originalFileName, mimeType, fileSizeBytes, documentType } = parse.data;

    if (fileSizeBytes > config.MAX_UPLOAD_SIZE_BYTES) {
      res.status(413).json({
        error: "File too large",
        code: "FILE_TOO_LARGE",
        maxBytes: config.MAX_UPLOAD_SIZE_BYTES,
      });
      return;
    }

    // Generate a storage key — opaque, non-guessable, not derived from patient data
    const storageKey = `appointments/${appointmentId}/docs/${crypto.randomBytes(24).toString("hex")}`;

    const [doc] = await db
      .insert(uploadedDocumentsTable)
      .values({
        appointmentId,
        originalFileName,
        mimeType,
        fileSizeBytes,
        storageKey,
        documentType: documentType ?? null,
      })
      .returning({
        id: uploadedDocumentsTable.id,
        originalFileName: uploadedDocumentsTable.originalFileName,
        mimeType: uploadedDocumentsTable.mimeType,
        fileSizeBytes: uploadedDocumentsTable.fileSizeBytes,
        documentType: uploadedDocumentsTable.documentType,
        uploadedAt: uploadedDocumentsTable.uploadedAt,
      });

    await writeAuditLog({
      ctx: linkAuditCtx(linkId, ip),
      action: AUDIT_ACTIONS.DOCUMENT_UPLOAD,
      targetType: "document",
      targetId: doc.id,
      outcome: "success",
      context: { appointmentId, mimeType, fileSizeBytes },
    });

    res.status(201).json({
      document: doc,
      // Phase 2: this will be a signed S3 PUT URL for the actual file upload
      uploadUrl: null,
      _note: "File storage not yet wired — Phase 2. Record created in DB.",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/uploads/:appointmentId — list uploads for patient's own appointment
 */
router.get("/:appointmentId", requirePatientAuth, async (req, res, next) => {
  try {
    const { appointmentId } = req.params as Record<string, string>;

    if (req.patientSession!.appointmentId !== appointmentId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const docs = await db
      .select({
        id: uploadedDocumentsTable.id,
        originalFileName: uploadedDocumentsTable.originalFileName,
        mimeType: uploadedDocumentsTable.mimeType,
        fileSizeBytes: uploadedDocumentsTable.fileSizeBytes,
        documentType: uploadedDocumentsTable.documentType,
        uploadedAt: uploadedDocumentsTable.uploadedAt,
        ocrExtractedDate: uploadedDocumentsTable.ocrExtractedDate,
        // storageKey excluded
      })
      .from(uploadedDocumentsTable)
      .where(eq(uploadedDocumentsTable.appointmentId, appointmentId));

    res.json(docs);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/uploads/:appointmentId/status
 * Save the patient's declaration when there is no digital file to upload.
 */
router.post("/:appointmentId/status", requirePatientAuth, async (req, res, next) => {
  try {
    const { appointmentId } = req.params as Record<string, string>;
    const linkId = req.patientSession!.sub;
    const ip = extractClientIp(req);

    if (req.patientSession!.appointmentId !== appointmentId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const parse = z.object({
      labStatus: z.enum([
        "uploaded_digitally",
        "will_bring_physical",
        "results_pending",
        "no_results_available",
        "not_required",
      ]),
    }).safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: "Invalid lab status", issues: parse.error.issues });
      return;
    }

    const [appointment] = await db
      .select({ status: appointmentsTable.status, scheduledAt: appointmentsTable.scheduledAt })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, appointmentId))
      .limit(1);

    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const isLocked =
      appointment.status === "locked" ||
      (appointment.status !== "reopened" && new Date(appointment.scheduledAt) <= new Date());

    if (isLocked) {
      res.status(409).json({ error: "Preparation is locked", code: "QUESTIONNAIRE_LOCKED" });
      return;
    }

    await db
      .update(appointmentsTable)
      .set({ labStatus: parse.data.labStatus, updatedAt: new Date() })
      .where(eq(appointmentsTable.id, appointmentId));

    await writeAuditLog({
      ctx: linkAuditCtx(linkId, ip),
      action: AUDIT_ACTIONS.DOCUMENT_UPLOAD,
      targetType: "appointment",
      targetId: appointmentId,
      outcome: "success",
      context: { labStatus: parse.data.labStatus, declarationOnly: true },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
