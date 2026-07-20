import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";

export const questionnaireStatusEnum = pgEnum("questionnaire_status", [
  "not_started",
  "in_progress",
  "saved",      // patient saved but not submitted
  "submitted",  // patient submitted (still editable until lock)
  "locked",     // auto-locked at appointment start time
  "reopened",   // manually reopened by staff/doctor
]);

/**
 * Questionnaire answers are stored as JSON (config-driven, schema_version tracked).
 * This allows the questionnaire schema to evolve without DB migrations.
 * The JSON structure is validated at the application layer against the active schema version.
 *
 * IMPORTANT: questionnaire data is PATIENT-REPORTED, not verified clinical fact.
 * This must be reflected in all UI copy and summary labeling.
 */
export const questionnairesTable = pgTable("questionnaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().unique().references(() => appointmentsTable.id),
  // Config-driven schema version — allows questionnaire to evolve across endocrine conditions (NFR-012)
  schemaVersion: text("schema_version").notNull().default("thyroid_v1"),
  // Answers stored as JSON; structure defined by schemaVersion
  // Field: patient-reported, never treated as verified clinical data
  answers: jsonb("answers").notNull().default({}),
  status: questionnaireStatusEnum("status").notNull().default("not_started"),
  // Consent recorded before questionnaire opens (required per compliance)
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  savedAt: timestamp("saved_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  reopenedAt: timestamp("reopened_at", { withTimezone: true }),
  reopenedByUserId: text("reopened_by_user_id"), // staff/doctor who reopened
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionnaireRelations = relations(questionnairesTable, ({ one }) => ({
  appointment: one(appointmentsTable, {
    fields: [questionnairesTable.appointmentId],
    references: [appointmentsTable.id],
  }),
}));

export const insertQuestionnaireSchema = createInsertSchema(questionnairesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectQuestionnaireSchema = createSelectSchema(questionnairesTable);

export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Questionnaire = typeof questionnairesTable.$inferSelect;
