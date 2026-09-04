/**
 * Deterministic templated summary generation service.
 * Template-based, NOT LLM-generated. Serbian language, medical/Latin terminology.
 * Summaries regenerate on every questionnaire save/submit; only the latest is stored.
 *
 * Two variants:
 *   1. current_visit — concise, copy-paste-ready
 *   2. current_visit_plus_history — includes longitudinal context from prior visits
 *
 * Summary structure (per doctor + spec):
 *   - Pregled specijaliste – internista-endokrinologa
 *   - Anamneza: glavne tegobe
 *   - Sadašnja bolest
 *   - Terapija koju pacijent uzima
 *   - Lična anamneza
 *   - Ranije bolesti i operacije
 *   - Porodična anamneza
 *   - Objektivno ← empty, doctor-entered
 *   - UZ štitaste žlezde ← empty, doctor-entered
 *   - Laboratorijski nalazi ← status/facts only, no interpretation
 *   - Dg / Th / Kontrola ← empty, doctor-entered
 *
 * IMPORTANT: Never auto-generate clinical interpretation, diagnosis, therapy recommendations.
 * Data is patient-reported — label it as such, never as verified clinical fact.
 */
import { db, questionnairesTable, summariesTable, appointmentsTable, patientsTable, AUDIT_ACTIONS } from "../lib/db";
import { eq, and, ne } from "drizzle-orm";
import { writeAuditLog, systemAuditCtx } from "./audit";

interface QuestionnaireAnswers {
  symptoms?: string;
  diagnosisHistory?: string;
  ultrasoundHistory?: string;
  currentTherapy?: Array<{ name: string; dose: string; frequency: string }>;
  otherMedications?: Array<{ name: string; dose: string; frequency: string }>;
  additionalSymptoms?: string;
  allergies?: Array<{ type: string; allergen: string }>;
  lifestyleHabits?: { smoking?: string; alcohol?: string; other?: string };
  otherConditions?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  [key: string]: unknown;
}

function formatMedications(meds?: Array<{ name: string; dose: string; frequency: string }>): string {
  if (!meds || meds.length === 0) return "– navodi da ne uzima lekove";
  return meds.map((m) => `${m.name} ${m.dose} ${m.frequency}`).join(", ");
}

function formatAllergies(allergies?: Array<{ type: string; allergen: string }>): string {
  if (!allergies || allergies.length === 0) return "– navodi da nije alergičan/na";
  return allergies.map((a) => `${a.type}${a.allergen ? ` (${a.allergen})` : ""}`).join(", ");
}

function renderCurrentVisitSummary(
  answers: QuestionnaireAnswers,
  patientName: string,
  appointmentType: string,
  generatedAt: Date
): string {
  const lines: string[] = [];
  const currentTherapy = (answers.currentTherapy ?? answers.current_thyroid_therapy) as QuestionnaireAnswers["currentTherapy"];
  const otherMedications = (answers.otherMedications ?? answers.other_medications) as QuestionnaireAnswers["otherMedications"];
  const allergies = (
    answers.allergies ??
    (answers.has_allergies === true
      ? [{ type: "alergija", allergen: String(answers.allergies_list ?? "") }]
      : undefined)
  ) as QuestionnaireAnswers["allergies"];
  const lifestyleHabits = (
    answers.lifestyleHabits ?? { smoking: answers.smoking, alcohol: answers.alcohol }
  ) as QuestionnaireAnswers["lifestyleHabits"];
  const diagnosisHistory = answers.diagnosisHistory ?? answers.diagnosis_history;
  const ultrasoundHistory = answers.ultrasoundHistory ?? (
    answers.has_ultrasound === true
      ? String(answers.ultrasound_findings ?? "ultrazvuk rađen")
      : answers.has_ultrasound === false
        ? "ultrazvuk nije rađen"
        : undefined
  );
  const additionalSymptoms = answers.additionalSymptoms ?? [
    answers.cardiac_symptoms === true ? "kardiovaskularni simptomi" : "",
    answers.musculoskeletal_symptoms === true ? "bolovi u kostima, zglobovima ili mišićima" : "",
  ].filter(Boolean).join(", ");
  const familyHistory = answers.familyHistory ?? (
    answers.has_family_history === true
      ? String(answers.family_history_details ?? "pozitivna porodična anamneza")
      : answers.has_family_history === false
        ? "negira relevantnu porodičnu anamnezu"
        : undefined
  );

  lines.push("PREGLED SPECIJALISTE – INTERNISTA-ENDOKRINOLOGA");
  lines.push(`Tip pregleda: ${appointmentType}`);
  lines.push(`Datum generisanja sažetka: ${generatedAt.toLocaleDateString("sr-Latn-RS")}`);
  lines.push("NAPOMENA: Ovaj sažetak sadrži isključivo podatke koje je pacijent sam uneo. Ne zamenjuje medicinski pregled niti zvaničnu evidenciju klinike.");
  lines.push("");

  lines.push("ANAMNEZA: GLAVNE TEGOBE");
  lines.push(answers.symptoms || "– pacijent nije naveo tegobe");
  lines.push("");

  lines.push("SADAŠNJA BOLEST");
  lines.push(`Dijagnoza štitaste žlezde: ${diagnosisHistory || "– nije navedeno"}`);
  lines.push(`UZ štitaste žlezde: ${ultrasoundHistory || "– nije navedeno"}`);
  lines.push(`Dodatni simptomi: ${additionalSymptoms || "– nije navedeno"}`);
  lines.push("");

  lines.push("TERAPIJA KOJU PACIJENT UZIMA");
  lines.push(`Terapija štitnjače: ${formatMedications(currentTherapy)}`);
  lines.push(`Ostali lekovi: ${formatMedications(otherMedications)}`);
  lines.push(`Alergije: ${formatAllergies(allergies)}`);
  lines.push("");

  lines.push("LIČNA ANAMNEZA");
  const habits = lifestyleHabits;
  lines.push(`Pušenje: ${habits?.smoking || "– nije navedeno"}`);
  lines.push(`Alkohol: ${habits?.alcohol || "– nije navedeno"}`);
  lines.push(`Ostalo: ${habits?.other || "– nije navedeno"}`);
  lines.push(`Ostale dijagnoze: ${answers.otherConditions || "– nije navedeno"}`);
  lines.push("");

  lines.push("RANIJE BOLESTI I OPERACIJE");
  lines.push(answers.surgicalHistory || "– pacijent nije naveo hirurške zahvate");
  lines.push("");

  lines.push("PORODIČNA ANAMNEZA");
  lines.push(familyHistory || "– pacijent nije naveo porodičnu anamnezu");
  lines.push("");

  lines.push("OBJEKTIVNO");
  lines.push("(Popunjava lekar tokom pregleda)");
  lines.push("");

  lines.push("UZ ŠTITASTE ŽLEZDE");
  lines.push("(Popunjava lekar tokom pregleda)");
  lines.push("");

  lines.push("LABORATORIJSKI NALAZI");
  lines.push("(Status naveden u upitniku — za detalje pogledati priložene nalaze)");
  lines.push("");

  lines.push("Dg / Th / Kontrola");
  lines.push("(Popunjava lekar tokom pregleda)");

  return lines.join("\n");
}

function renderHistorySummary(
  answers: QuestionnaireAnswers,
  patientName: string,
  appointmentType: string,
  generatedAt: Date,
  priorAppointments: Array<{ scheduledAt: Date; appointmentType: string }>
): string {
  const current = renderCurrentVisitSummary(answers, patientName, appointmentType, generatedAt);

  const historyLines: string[] = ["", "RELEVANTNA ANAMNEZA – PRETHODNI PREGLEDI"];
  if (priorAppointments.length === 0) {
    historyLines.push("– nema prethodnih pregleda u sistemu");
  } else {
    for (const appt of priorAppointments) {
      historyLines.push(
        `• ${appt.scheduledAt.toLocaleDateString("sr-Latn-RS")} — ${appt.appointmentType}`
      );
    }
  }

  return current + historyLines.join("\n");
}

/**
 * Generate (or regenerate) both summary variants for an appointment.
 * Called after every questionnaire save/submit.
 * Only the latest summary is stored (upsert on appointmentId + variant).
 */
export async function generateSummaries(appointmentId: string): Promise<void> {
  const [questionnaire] = await db
    .select()
    .from(questionnairesTable)
    .where(eq(questionnairesTable.appointmentId, appointmentId))
    .limit(1);

  if (!questionnaire) return;

  const [appointment] = await db
    .select({
      id: appointmentsTable.id,
      patientId: appointmentsTable.patientId,
      invitedFullName: appointmentsTable.invitedFullName,
      appointmentType: appointmentsTable.appointmentType,
      scheduledAt: appointmentsTable.scheduledAt,
    })
    .from(appointmentsTable)
    .where(eq(appointmentsTable.id, appointmentId))
    .limit(1);

  if (!appointment) return;

  // Prior appointments for history summary (excluded cancelled, chronological)
  const priorAppointments = appointment.patientId
    ? await db
        .select({
          scheduledAt: appointmentsTable.scheduledAt,
          appointmentType: appointmentsTable.appointmentType,
        })
        .from(appointmentsTable)
        .where(
          and(
            eq(appointmentsTable.patientId, appointment.patientId),
            ne(appointmentsTable.id, appointmentId),
            eq(appointmentsTable.excludedFromClinicalViews, false)
          )
        )
    : [];

  const answers = (questionnaire.answers ?? {}) as QuestionnaireAnswers;
  const now = new Date();

  const currentVisitContent = renderCurrentVisitSummary(
    answers,
    appointment.invitedFullName,
    appointment.appointmentType,
    now
  );

  const historyContent = renderHistorySummary(
    answers,
    appointment.invitedFullName,
    appointment.appointmentType,
    now,
    priorAppointments
  );

  // Upsert both variants (latest only — no versioning)
  for (const [variant, content] of [
    ["current_visit", currentVisitContent],
    ["current_visit_plus_history", historyContent],
  ] as const) {
    await db
      .insert(summariesTable)
      .values({ appointmentId, variant, content, generatedAt: now })
      .onConflictDoUpdate({
        target: [summariesTable.appointmentId, summariesTable.variant],
        set: { content, generatedAt: now },
      });
  }

  await writeAuditLog({
    ctx: systemAuditCtx(),
    action: AUDIT_ACTIONS.SUMMARY_GENERATE,
    targetType: "summary",
    targetId: appointmentId,
    outcome: "success",
    context: { variants: ["current_visit", "current_visit_plus_history"] },
  });
}
