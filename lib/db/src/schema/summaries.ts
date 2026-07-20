import { pgTable, uuid, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";

export const summaryVariantEnum = pgEnum("summary_variant", [
  "current_visit",              // Current Visit Summary — concise, copy-paste-ready
  "current_visit_plus_history", // Current Visit + Relevant History Summary
]);

/**
 * Only the LATEST generated summary is stored per (appointment, variant).
 * No versioning/history of summaries (per spec). On each questionnaire save/submit,
 * the existing summary is overwritten (upsert on appointmentId + variant).
 *
 * Summaries are deterministic/template-based — NOT LLM-generated.
 * They must be clearly labeled as patient-reported, not doctor-verified.
 *
 * Section structure (Serbian, co-designed with doctor):
 *   - Pregled specijaliste – internista-endokrinologa
 *   - Anamneza: glavne tegobe
 *   - Sadašnja bolest
 *   - Terapija koju pacijent uzima
 *   - Lična anamneza
 *   - Ranije bolesti i operacije
 *   - Porodična anamneza
 *   - Objektivno (empty — doctor-entered)
 *   - UZ štitaste žlezde (empty — doctor-entered)
 *   - Laboratorijski nalazi (status/facts only, no interpretation)
 *   - Dg / Th / Kontrola (empty — doctor-entered)
 */
export const summariesTable = pgTable(
  "summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").notNull().references(() => appointmentsTable.id),
    variant: summaryVariantEnum("variant").notNull(),
    // Rendered summary content (Serbian, template-based, deterministic)
    content: text("content").notNull(),
    // Timestamp = latest questionnaire save/submit time that triggered generation
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    // Schema version used to generate (for traceability if template changes)
    templateVersion: text("template_version").notNull().default("thyroid_v1"),
  },
  (t) => [
    // Only the latest summary is stored per (appointment, variant) — enforced here
    unique("summaries_appointment_variant_unique").on(t.appointmentId, t.variant),
  ]
);

export const summaryRelations = relations(summariesTable, ({ one }) => ({
  appointment: one(appointmentsTable, {
    fields: [summariesTable.appointmentId],
    references: [appointmentsTable.id],
  }),
}));

export const insertSummarySchema = createInsertSchema(summariesTable).omit({
  id: true,
  generatedAt: true,
});
export const selectSummarySchema = createSelectSchema(summariesTable);

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summariesTable.$inferSelect;
