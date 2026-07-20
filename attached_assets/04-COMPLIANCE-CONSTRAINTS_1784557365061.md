# Compliance & Legal Constraints → Build Requirements

Source: founder-answered legal Q&A (`Pitanja_za_advokate.docx`). These are
already-decided answers, not open questions — treat them as requirements,
not suggestions. Serbian data protection law (aligned with GDPR) treats
health data as a special category, so these are stricter than a typical
consumer-app build.

## Roles between the company and the clinic

- The company is the **data processor**; the clinic is the **data controller**, for the clinic-patient relationship. (For the company's own future use cases, the company may be a controller instead — keep this distinction as a config/contract-level concept, not something the code needs to branch on.)
- A signed Data Processing Agreement (DPA) is required with the clinic **before** any real patient data is processed. This is a legal/business precondition to going live, not a code task — but it means: **do not point a production deployment at real patient data until the product owner confirms the DPA is signed.**
- A DPO (Data Protection Officer) is required for the company given health-data processing. Not a code task, but relevant context for compliance docs the platform may need to reference/link.
- Pilot use (unpaid) needs its own agreement, separate from a future commercial agreement — again a legal/business task, not code, but confirms the product should be explicitly labeled as a pilot/reference deployment during MVP.

## Legal basis & consent

- Health data = special category data → stricter handling required throughout.
- **Explicit patient consent is required.** Build a first-step consent screen, before the questionnaire, that clearly explains what will be collected and how it will be used — a bare checkbox alone is not sufficient; the explanation must be genuinely informative, not boilerplate.
- Consent must also cover: reminders sent via appointment-booking channels (Viber/SMS) tied to the visit and document collection.
- The platform must have its own **Privacy Policy** (separate document, linked/shown before the questionnaire) covering:
  - what data is collected and why
  - that this is not the official medical record
  - that only the doctor sees clinical content, not admin/reception staff
  - patient rights: access, correction, deletion, export, consent withdrawal
  - retention periods (see below)

## Magic link / authentication requirements

- Magic-link-only or magic-link+DOB-only is **not sufficient** for real health data — add SMS OTP as an additional verification step (see `02-DATA-MODEL-ROLES-AUTH.md`).
- Link validity: effectively until the appointment (not a short expiry window).
- Link may allow editing previously entered data (e.g. height, medications) — but any such edit must go through the same verification procedure, not a shortcut.
- Sending links via Viber/SMS: acceptable since the clinic already holds the patient's phone number from booking, but requires that the patient has given consent at booking time to be contacted this way.

## Access control

- Only the doctor sees medical/clinical content. Admin/reception see operational status only (already reflected in `02`'s RBAC matrix).
- Lab status itself (e.g. "results pending") counts as health-adjacent information — treat it with the same access restriction as other clinical content, not as neutral operational metadata, when in doubt.
- Minimum roles needed: **admin, nurse, patient, doctor** — build the role system to support all four even though `nurse` isn't fully scoped yet (see `02`).
- MFA/OTP for doctor and staff: worth having, treat as a should-have default-on, not yet mandated as an absolute legal requirement.
- Every access to patient data must be audit logged (already required in `02`).

## Retention

- Retain questionnaires **long-term** — the product needs this to ask a returning patient "has anything changed" on a later visit. Do not build automatic deletion of questionnaire history.
- Uploaded lab documents: retain only until processed, then follow the retention policy the company sets.
- Access/audit logs: retain **always**, no deletion.
- The **company** (not the clinic) decides retention periods, and informs patients via the Privacy Policy. Keep retention values configurable, not hardcoded per clinic.
- If an appointment is cancelled, whether the entered questionnaire can still be kept for audit purposes is unresolved in the legal doc — default to "excluded from clinical views, but not necessarily hard-deleted" (matches `02`'s soft-exclude approach).

## Data residency & hosting

- Data may be hosted in the EU. Hosting in Serbia is also being considered as potentially simpler/legally safer.
- Whichever cloud provider is used, treat the **region as a configuration value** — do not hardcode a specific AWS region in a way that would require a code change to move data residency later.
- Cross-border transfer questions (outside Serbia, outside EU/EEA) are still open — do not architect around an assumption that data can freely leave a given region.

## Document uploads

- Lab results/ultrasound images need protection at least equal to (likely stronger than) regular questionnaire data: encrypted at rest and in transit, access-restricted, and every document open/view event audit logged.
- Special consent for uploading medical documentation should be covered by the same consent flow as the rest of the questionnaire — don't build a second separate consent step for uploads specifically unless later told otherwise.

## OCR / automated document reading

- Automatically reading a date off a lab document (for freshness warnings) is acceptable **if disclosed** as part of the general consent/notice, not hidden.
- OCR output must be clearly non-authoritative: never present it as if a clinician reviewed it. UX copy must reflect this (see `03`).
- Prefer treating OCR output as transient (used to generate a one-time warning) rather than a permanently stored, browsable field, unless product later decides otherwise.

## Templated (non-AI) summaries

- A deterministic templated summary counts as a presentation of the patient's own answers, not a new independent medical document — but it must be clearly labeled as not being an official medical report/interpretation (already reflected in `01`/`03`).
- It's fine for the summary to use standard medical terminology/phrasing as long as it contains no clinical interpretation.
- Regenerate from structured answers each time rather than storing a long-lived "final" copy — matches the "no summary versioning" rule in `01`/`02`.

## Phase 2 / LLM (do not build now, but design so this isn't a rewrite later)

- Sending real patient data to an LLM provider is out of scope for MVP and requires a **separate legal review** before it happens.
- If/when it happens: anonymization/pseudonymization is being considered as a mitigation, but does not automatically remove all legal obligations. An LLM provider would need an EU region and must not retain prompts or train on the data. This would also need to be reflected in the clinic contract.
- Practical implication for MVP code: keep any future "send this data to a summarization service" integration point cleanly separable (e.g. a distinct service boundary/interface) so it can be added later without touching the deterministic-summary code path.

## Security incidents

- The platform should have a basic incident-response capability from day one: the ability to know quickly (via audit logs) who accessed what, so a breach can be scoped. There's a regulatory notification obligation (to Serbia's data protection commissioner, "Poverenik") in certain cases — this is a business/legal process, but it depends on the audit logging being complete and queryable, which is a hard MVP requirement (see `02`).

## Documents needed before working with real patients (business/legal tasks, not code — track as blockers to production go-live)

- Data Processing Agreement (with the clinic)
- Privacy Policy
- Terms of Use
- Patient Notice (short in-flow version of the Privacy Policy)
- Consent Form
- Data Retention Policy
- Access Control Policy
- Incident Response Policy
- DPIA (Data Protection Impact Assessment) — required given health-data processing

## Pilot / Stage 0 testing

- Prefer **dummy/synthetic data** for the pre-legal-setup usability prototype (Stage 0) rather than real patients, where feasible.
- If real patients do participate in Stage 0, they must know they're part of a pilot, and their standard right to attend their appointment is unaffected by their platform participation either way.

---

**Summary for the coding agent:** none of the above blocks writing MVP code
today, but three things directly change what you build versus a "simple"
version: (1) SMS OTP is mandatory on top of magic-link+DOB, (2) audit logging
must be complete and queryable from day one, not an afterthought, and (3)
admin/reception access to clinical content must be enforced server-side, not
just hidden in the UI. Everything else here (DPA, Privacy Policy, DPIA, etc.)
is a business/legal deliverable to track as a go-live blocker, not a coding
task.
