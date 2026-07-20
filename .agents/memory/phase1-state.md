---
name: Phase 1 foundation state
description: What was built in Phase 1, what's stubbed, what's blocked before Phase 2
---

## Built and running (Phase 1 complete)

- DB schema pushed: users, patients, appointments, preparation_links, questionnaires, uploaded_documents, summaries (with unique constraint on appointmentId+variant), audit_log
- All API routes wired and typechecking clean: auth, patient-auth, appointments, questionnaires, uploads, doctor, admin
- RBAC enforced server-side (403, not hidden UI)
- Audit log service (append-only, swallows errors, logs loudly)
- Deterministic summary generator (Serbian, both variants, upserts)
- Questionnaire schema defined data-driven in lib/questionnaire-schema.ts (thyroid_v1, extensible)
- Secrets: JWT_SECRET, MAGIC_LINK_SECRET set; SESSION_SECRET available

## Stubbed (Phase 2 wires real implementations)

- SMS: SMS_PROVIDER=stub — OTP logged to console, never sent. Wire Twilio or AWS SNS via config before real patient data.
- File storage: STORAGE_PROVIDER=stub — document metadata recorded in DB but no file written to S3. storageKey generated but uploadUrl returns null.
- MFA/TOTP: login returns requiresMfa: true but TOTP verification not implemented. DB fields and flag exist.
- Email dispatch: invitation link email and morning doctor summary email are // TODO stubs.
- Signed S3 download URLs: getSignedDownloadUrl() returns null stub in doctor.ts.
- BullMQ reminder jobs: appointment reminder engine not started.
- Questionnaire auto-lock background job: lock checked on read but no scheduled enforcement at appointment time.

## Phase 2 prerequisite decisions needed from product owner

- Exact final questionnaire wording/ordering in Serbian (currently in spec but not final)
- Exact final summary template wording
- Upload instructions: instructional video vs text/visual only
- Dashboard density: phone vs desktop
- Historical context default state: collapsed or expanded
- Whether patient sees submission-confirmation summary

**Why:** These are product/legal decisions that must not be silently resolved in code.
