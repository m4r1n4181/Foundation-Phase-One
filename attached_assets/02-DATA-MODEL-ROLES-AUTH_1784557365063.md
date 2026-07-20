# Data Model, Roles, Auth & Audit

## Entities (build as the initial schema — adjust field names to your ORM conventions)

- **Patient**: identity (name, phone, full DOB, sex, height, other stable fields), created_at, list of appointments, duplicate-review flag
- **Appointment**: patient_id (nullable until matched), doctor_id, appointment_type, scheduled_at, status (see state list in `01`), link (1:1), questionnaire (1:1), lab_status, uploaded_documents (1:many)
- **PreparationLink**: appointment_id, signed token, status (active/deactivated/expired), created_at, DOB-verification attempt count
- **Questionnaire**: appointment_id, schema_version, answers (JSON, config-driven — see `01` conditional-logic rule), status, saved_at, submitted_at, locked_at
- **UploadedDocument**: appointment_id, file_type, file_size, storage_key (encrypted object storage), ocr_extracted_date (nullable, advisory only), uploaded_at
- **Summary**: appointment_id, variant (`current_visit` | `current_visit_plus_history`), generated_at, content (regenerated on each save/submit — do not version/store history of summaries, only the latest)
- **User** (staff-side): role (`doctor` | `clinic_admin` | `nurse`* | future roles), auth credentials, MFA status
  - \* `nurse` is not yet confirmed as needed (open question in PRD/legal doc) — implement the role enum as extensible, don't hardcode a two-role system
- **AuditLogEntry**: actor (user or patient-link), role, action, target_object_type, target_object_id, timestamp, outcome (success/denied)

## RBAC matrix

| Action | Patient (own record) | Clinic admin/reception | Doctor |
|---|---|---|---|
| Create/edit/cancel/resend appointment invitation | ✗ | ✓ | ✗ (unless also acting as admin) |
| View operational status (opened/submitted/lab-status label) | own only | ✓ | ✓ |
| View questionnaire answers | own only (before lock, via link) | ✗ — never | ✓ |
| View uploaded documents | own only | ✗ — never | ✓ |
| View summaries | ✗ | ✗ | ✓ |
| Edit questionnaire | own only, before lock | ✗ | ✗ |
| Reopen a locked questionnaire | ✗ | ✓ | ✓ |
| View historical timeline | ✗ | ✗ | ✓ |

Enforce this at the API authorization layer (middleware/guard checking role +
ownership), not only by hiding UI elements. Admin/reception must get a 403,
not just a hidden button, if they try to hit a clinical-content endpoint.

## Patient authentication flow (custom — not standard username/password)

1. Patient receives message (Viber/SMS/email per clinic config) with a secure preparation link.
2. Patient opens link → prompted for full date of birth.
3. On correct DOB → **SMS OTP step** (required — see rationale below) → questionnaire opens.
4. Failed DOB or OTP attempts are rate-limited; repeated failures temporarily block access.
5. Link stays valid effectively until the appointment (not a short 24-48h expiry) and is deactivated immediately on cancellation.
6. Link permits editing up to the lock point (default = appointment start time); reopening after lock is a staff/doctor action, not self-service.

Rationale for requiring OTP in addition to DOB: this was explicitly raised in
legal review — a magic link + DOB-only model was flagged as insufficient for
real health data, and the resolution was "add OTP" (in addition to a required
privacy-policy/consent step before the questionnaire). Build DOB-only as a
*fallback for the Stage 0 usability pre-test with dummy data only* if the OTP
integration isn't ready yet — do not use DOB-only as the model for real
patient data.

## Staff/doctor authentication

- Standard authenticated login (email/password or SSO via your auth library).
- MFA mandatory or strongly required — build it as available/toggleable, default ON.

## Audit logging — what must be logged

At minimum, log: admin actions (create/edit/resend/cancel invitation),
patient link access attempts (including failed DOB/OTP attempts), every
questionnaire save/submit, every upload, every doctor view of clinical
content, cancellations/reschedules, link deactivation, and any role/access
change. Each entry: who (or "unauthenticated attempt"), role, timestamp,
action, target object, outcome.

Audit logs themselves: retain indefinitely (per legal answer — "always" for
access logs). Do not build a log-rotation/deletion job for these by default.

## Retention — build these as configurable, not hardcoded, but use these as MVP defaults

| Data | Default retention approach |
|---|---|
| Questionnaire answers | Keep long-term (used to detect changes across visits for a returning patient) — do not auto-delete |
| Uploaded lab/ultrasound files | Retain until processed by the doctor for that visit, then follow the retention policy the company sets (config value, not hardcoded) |
| Access/audit logs | Always — never auto-delete |
| Generated summaries | No history needed — only the latest per appointment is stored/shown |
| Cancelled appointment data | Excluded from doctor clinical views/history **by default**; whether it's hard-deleted or just excluded is a pending legal/company decision — implement as a soft-exclude flag first, add hard-delete only if later required |

Retention duration is a **company decision communicated to patients via the
privacy policy**, not something the clinic dictates — keep this configurable
per deployment, not per clinic.

## What NOT to build in MVP (auth/data related)

- Do not send any patient health data to any third-party LLM/AI provider. This is explicitly Phase 2+, pending separate legal review, and only after Serbia/EU-region confirmation of the provider.
- Do not build persistent OCR storage of extracted text beyond what's needed for the transient freshness-warning check.
- Do not build a self-hosted-vs-API LLM decision into MVP infra — irrelevant until Phase 2.

Read `03-UX-FLOWS-AND-CONTENT.md` next.
