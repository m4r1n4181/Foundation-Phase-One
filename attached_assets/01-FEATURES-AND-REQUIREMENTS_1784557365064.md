# Features & Requirements

This file merges the PRD Core Features, the Functional Requirements doc, and
the Acceptance Criteria into one buildable reference. Feature IDs (F-),
functional requirement IDs (FR-) and acceptance criteria (AC-) are kept as-is
from the source docs so they stay traceable if the client refers to them.

## Feature list

| ID | Feature | Notes |
|---|---|---|
| F-01 | Clinic Admin Appointment Invitation | Manual entry in MVP: name, phone, DOB, appointment date/time, appointment type. No scheduling-system integration in MVP. |
| F-02 | Patient Identity Matching | Match by phone + full DOB. Exact match auto-links. Weak match (e.g. name only) → duplicate warning for staff, never auto-merge. |
| F-03 | Magic Link + Date-of-Birth Verification | Patient access = magic link + DOB check. SMS OTP is required in addition per legal review (see `04`) — treat DOB-only as insufficient for real patient data. |
| F-04 | Patient Questionnaire | Thyroid-specific, ~10–12 questions, universal core + conditional branches by appointment type / prior data. |
| F-05 | Patient Editing and Locking | Editable until appointment start time (default lock point). Staff/doctor can reopen. |
| F-06 | Lab/Document Upload and Lab Status | PDF/JPEG/PNG upload, size-limited, OR patient declares status (bring physical / pending / none / not required). Never blocks submission. |
| F-07 | Automated Preparation Reminders & Warnings | Reminders driven by appointment timing + completion/lab status. Missing required labs → strong warning, never a block. |
| F-08 | Doctor Dashboard | Mobile+desktop read-only dashboard. Email notification is just an entry point, not the primary interface. |
| F-09 | Patient Detail & Historical Timeline | Current questionnaire, uploads, lab status/warnings, summaries, basic timeline of prior appointments/uploads. No advanced trend graphs in MVP. |
| F-10 | Deterministic Templated Summaries | Two variants: Current Visit Summary, Current Visit + Relevant History Summary. Template-based, Serbian, medical/Latin terminology. Regenerates on every save/submit. No versioning. |
| F-11 | Role-Based Access Control | Doctor = full clinical read, no edit. Admin/reception = operational status only. Least-privilege. |
| F-12 | Audit Logging | Every access to clinical content + every sensitive action logged: who, when, what role, what action, what object. |
| F-13 | Stage 0 & Pilot Measurement Support | Track questionnaire completion, lab-status-known-before-visit, consultation duration, doctor-reported effort. |
| F-14 | Compliance Operations Support | Support (even if manual/ops-process for MVP) data access/deletion/correction/consent requests. |

## Functional requirements

### Appointment invitation & identity (F-01, F-02)
- Admin creates invitation with: full name, phone number, full DOB, appointment date/time, appointment type.
- Creating/sending the invitation creates the appointment record and generates the secure link.
- Staff can resend the link, edit date/time/type/phone before lock, and deactivate the link (cancellation or mistake).
- Cancelling an appointment deactivates the link and excludes that appointment's data from doctor clinical views/longitudinal history **by default**.
- Rescheduling keeps the same link valid and preserves already-entered questionnaire data; reminder/lock timing updates to the new time.
- Exact phone+DOB match → auto-link to existing patient profile.
- Weaker match (e.g. same name or same phone only) → "possible duplicate" warning shown to staff; never silently merged.

### Patient access (F-03)
- Access = magic link → DOB verification → (per legal review) SMS OTP → questionnaire.
- Magic links: cryptographically signed, time-limited, rate-limited, deactivated on cancellation.
- Repeated failed DOB verification → temporary rate-limit/block, per configured retry limits.
- Link validity window: effectively until the appointment (per legal answer — do not build a short expiry like 24-48h).

### Questionnaire (F-04, F-05)
- ~10-12 question groups, universal thyroid core + conditional sub-questions by appointment type/prior data (see questionnaire content below).
- Stable/low-risk fields (name, DOB, sex, height) may be prefilled from patient profile.
- Medication-like fields (current therapy, other medications, allergies) must never be silently reused — patient must actively confirm/edit/remove/mark-unknown each previously-reported item.
- Patient can save and resume until lock. Default lock = scheduled appointment start time. Staff/doctor can reopen a locked questionnaire; latest saved answers on reopen become the new visible data (no versioning required).
- Treat questionnaire data everywhere (UI copy, data model, summaries) as **patient-reported**, not verified clinical fact.

### Uploads & lab status (F-06, F-07)
- Upload formats: PDF, JPEG, PNG, within a configured size limit.
- Lab status options (exactly these five): uploaded digitally / will bring physical results / results pending-not ready / no results available / not required for this appointment.
- Basic upload validation: file type, size, likely-unreadable image detection where feasible.
- Optional lightweight OCR/date-extraction for freshness warnings only — advisory, never treated as clinical interpretation, never blocks anything.
- If detected lab date looks old (configurable freshness threshold per appointment type), ask the patient to confirm it's still their latest result — do not force manual re-entry as the only path.
- Missing required/recommended labs (config per appointment type) → strong warning, submission never blocked.
- Reminders fire based on appointment timing + questionnaire completion + lab/document status.

### Doctor dashboard & summaries (F-08, F-09, F-10)
- Doctor gets a lightweight email notification linking to the dashboard (no PDF, no full clinical detail in the email body beyond what's safe).
- Daily view: today's appointments in time order, with patient name, time, status, lab status, warning badges.
- Patient detail: current questionnaire (readable sections), uploaded documents (viewable), lab status/warnings, both summary variants, basic historical timeline (prior appointment dates, prior questionnaire snapshots, prior uploads).
- Summaries regenerate automatically on every save/submit of the questionnaire; only the latest is shown.
- Summary template structure to build toward (co-designed with the doctor, populate only what's deterministically derivable — leave clinical-judgment sections empty/marked doctor-entered):
  - Pregled specijaliste – internista-endokrinologa
  - Anamneza: glavne tegobe
  - Sadašnja bolest
  - Terapija koju pacijent uzima
  - Lična anamneza
  - Ranije bolesti i operacije
  - Porodična anamneza
  - Objektivno *(leave empty — doctor-entered)*
  - UZ štitaste žlezde *(leave empty — doctor-entered)*
  - Laboratorijski nalazi *(status/facts only, no interpretation)*
  - Dg / Th / Kontrola *(leave empty — doctor-entered)*
- Never auto-generate: objective exam findings, ultrasound interpretation, diagnosis, therapy recommendation, follow-up recommendation, clinical conclusions.
- Doctor has full read access, zero edit rights on patient-entered data, in MVP.

### Access control & audit (F-11, F-12)
- Admin/reception: operational status only (not opened / opened / in progress / submitted / locked / lab-status label / warning flags). No access to questionnaire content or documents — enforce server-side.
- Doctor: full read access to everything clinical, no write access to patient data.
- Every access to clinical content and every sensitive action (link creation/deactivation, DOB verification attempts, questionnaire save/submit, upload, doctor view, cancellation/reschedule, role/access change) is logged with: user identity, timestamp, action, affected object, role/context.

### Measurement & ops support (F-13, F-14)
- Track (at minimum): questionnaire completion rate, lab-status-known-before-visit rate, consultation duration, doctor self-reported documentation effort/repetitive-questioning (simple form/field is fine for MVP).
- Provide an operational (can be manual/ops-process, doesn't need a full self-service UI) path for data access/export/correction/deletion/consent requests.

### Cross-cutting
- The product must explicitly state it is not the official medical record/EMR.

## Thyroid questionnaire — draft clinical scope (to implement as the initial schema)

1. Current symptoms/complaints (free examples: fatigue, mood changes, weight changes, sleepiness, forgetfulness, reduced energy, hair loss, dry skin, swelling of face/hands/legs)
2. Diagnosis history (when autoimmune thyroid disease diagnosed, if applicable)
3. Thyroid ultrasound history (done? nodules/cysts detected?)
4. Thyroid therapy (medication, dose, frequency — e.g. levothyroxine/Euthyrox)
5. Other medication therapy (name, dose, frequency)
6. Additional symptoms (palpitations, skipped heartbeats, shortness of breath, dizziness, fainting, bone/joint/muscle pain)
7. Allergies (food/medication, allergen if applicable)
8. Lifestyle habits (smoking, alcohol, other substances)
9. Other diagnosed conditions
10. Surgical history
11. Family history (diabetes, heart disease, MI, stroke, malignant disease — who/what if yes)

Plus a **separate, clearly optional** preferences section (not counted toward
the 10-12 clinical questions): preferred communication channel
(Viber/SMS/other), whether they want prep guidance on what to bring, whether
they need help with the digital flow, digital vs physical document handling
preference.

Conditional logic rule: never ask a follow-up detail question when the parent
answer is negative (e.g. no allergy details if "no allergies").

Build the questionnaire schema as data/config (JSON or DB-driven), not
hardcoded form markup — this is required for reuse into other endocrine
conditions later (see NFR-013 below).

## Key data states (model these explicitly)

| Object | States |
|---|---|
| Appointment | draft invitation, link sent, opened, questionnaire in progress, submitted, locked, reopened, rescheduled, cancelled |
| Lab status | uploaded digitally, will bring physical results, results pending/not ready, no results available, not required |
| Questionnaire | not started, in progress, saved, submitted, locked, reopened |
| Summary | not generated, generated from latest saved data |
| Link | active, deactivated, expired |
| Patient match | new patient, auto-linked exact match, possible duplicate — needs review |

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-001 | Security | Encrypt all patient data at rest and in transit |
| NFR-002 | Security | Magic links signed, time-bound, non-guessable, rate-limited |
| NFR-003 | Security | MFA for doctor/staff accounts (mandatory unless legal/security says otherwise) |
| NFR-004 | Privacy | Least-privilege, role-based access everywhere |
| NFR-005 | Privacy | Support GDPR/Serbian personal-data-rights workflows (access, correction, deletion, export) |
| NFR-006 | Compliance | Hosting/data residency must be a config decision, approved before real patient data flows through it |
| NFR-007 | Auditability | Audit logs include user identity, timestamp, action, affected object, access context |
| NFR-008 | Performance | Patient questionnaire loads <3s on typical 4G |
| NFR-009 | Availability | Target 99% availability during clinic working hours |
| NFR-010 | Localization | Serbian Latin script throughout; medical/Latin terminology in summaries where appropriate |
| NFR-011 | Accessibility | Reasonable effort toward WCAG 2.1 AA, especially for older patients |
| NFR-012 | Maintainability | Questionnaire schema + summary templates configurable without code changes |

## Acceptance criteria (build test cases against these)

- AC-001 Valid invitation submission → appointment created + link sent
- AC-002 Correct DOB on valid link → questionnaire opens
- AC-003 Repeated wrong DOB → access denied/rate-limited
- AC-004 Matching phone+DOB → new appointment links to existing patient
- AC-005 Weak match only → duplicate warning shown to staff
- AC-006 Prior medication shown → patient must actively confirm/edit/remove/mark-unknown
- AC-007 Valid upload within size limit → stored and associated with appointment
- AC-008 No digital labs → alternate lab status selectable, submission still allowed
- AC-009 Missing required/recommended labs → strong warning shown, submission not blocked
- AC-010 OCR detects old lab date → advisory confirmation prompt shown
- AC-011 Save completes → summaries regenerate
- AC-012 Doctor opens dashboard with appointments today → sees daily list + statuses
- AC-013 Doctor opens patient detail → sees intake, uploads, lab status, warnings, summaries, basic history
- AC-014 Admin opens appointment → sees operational status only, cannot open clinical content
- AC-015 Appointment time reached → questionnaire auto-locks
- AC-016 Staff/doctor reopens locked questionnaire, patient saves → latest data/summary visible
- AC-017 Appointment cancelled → link deactivated, data excluded from clinical views by default
- AC-018 Appointment rescheduled → same link valid, data preserved
- AC-019 Any clinical content access → audit log entry created
- AC-020 Stage 0 usability failure → pilot does not start until revised (process gate, not code — but the platform must be usable enough for this test to run)

Read `02-DATA-MODEL-ROLES-AUTH.md` next.
