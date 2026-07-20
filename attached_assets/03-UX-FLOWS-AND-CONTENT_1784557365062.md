# UX Flows, Badges & Content

## UX principles (apply to every screen you build)

- Minimize patient effort — never ask them to retype something already known/uploaded.
- Keep the questionnaire short (~10-12 questions).
- Doctor dashboard must be scannable in seconds, before or during a short appointment.
- Operational status (admin view) is strictly separated from clinical content (doctor view) — this is a privacy requirement, not just an information-architecture preference.
- Warnings, never blocks, when labs are missing.
- Design mobile-first, for an older patient demographic (large touch targets, plain language, one-question-per-screen where it helps).
- Summaries must read as deterministic/explainable, and must clearly separate current patient-reported data from stored history.
- No PDF-centric doctor workflow.

## Patient flow (build these as sequential screens/states)

1. **Message received** — clear message: clinic name, appointment context, preparation link.
2. **Identity verification** — enter full DOB (+ OTP per `02`) before anything else is shown.
3. **Preparation guidance** — appointment-type-specific guidance on recommended/required labs and freshness, if configured.
4. **Questionnaire start** — short explanation: this helps the doctor prepare, it does not replace the consultation.
5. **Prefilled fields** — stable fields shown prefilled and editable.
6. **Medication confirmation** — for each previously reported medication: confirm / edit dose / stop / mark unsure. Never silently carried forward.
7. **Visit-specific questions** — symptoms, reason for visit, current concerns, weight, etc. — always answered fresh, never prefilled.
8. **Upload step** — upload lab documents, or pick a lab status. Never blocked.
9. **Warnings** — plain language, explains consequence without alarming the patient.
10. **Save/submit** — can save and return until lock; confirmation message explains the doctor will review it.
11. **Edit before appointment** — returning via the same link reopens the current saved state.
12. **After lock** — clear message that changes require contacting the clinic; no dead-end error screens.

## Patient content rules

- Serbian Latin script throughout.
- No technical/legal jargon in the patient-facing flow.
- Warn that missing labs may reduce how much the doctor can assess — never imply the patient can't attend.
- State plainly that data is shared with the doctor to help them prepare.
- Large touch targets; avoid long forms and repeated fields.
- OCR-flagged old lab dates → ask for confirmation, don't force manual date re-entry as the only option.

## Clinic admin/reception flow

| Screen/task | Required behavior |
|---|---|
| Create invitation | Enter name, phone, DOB, appointment date/time, type |
| Possible-duplicate warning | Shown before proceeding when identity match is weak |
| Send link | System sends + records status |
| Resend link | Available anytime for lost/undelivered links |
| Edit appointment | Update date/time, type, phone (before lock) |
| Reschedule | Same link stays valid, questionnaire data preserved |
| Cancel | Link deactivated, appointment marked cancelled |
| Status view | Not opened / opened / in progress / submitted / lab status / warnings — never clinical content |

## Doctor dashboard flow

| Screen/area | Requirement |
|---|---|
| Morning email | Brief, links to dashboard, no clinical detail in the email body |
| Daily overview | Today's appointments, time order, name/time/status/lab-status/warning badges |
| Search/date nav | Navigate other dates / find a patient |
| Patient detail header | Identity, appointment time/type, prep status, lab status, lock state |
| Current questionnaire | Readable sectioned display, not a raw form dump |
| Uploaded documents | List + view/download; doctor reviews source docs manually |
| Templated summaries | Two sections/tabs: Current Visit Summary; Current Visit + Relevant History Summary |
| Copy interaction | Copy button per summary section, formatting preserved for pasting into external report tools |
| Historical timeline | Prior appointments, prior questionnaire snapshots, prior uploads — no advanced graphs in MVP |
| Read-only boundary | No editing of patient-entered data anywhere in this view |

## Dashboard status badges

| Badge | Meaning | Visible to |
|---|---|---|
| Not opened | Patient hasn't opened the link | Admin, doctor |
| Opened | Patient opened + verified | Admin, doctor |
| In progress | Started, not yet submitted/saved final | Admin, doctor |
| Submitted | Submitted or saved usable answers | Admin, doctor |
| Locked | Locked for the appointment | Admin, doctor, patient (if opening link) |
| Labs uploaded | Digital lab file(s) present | Admin sees status only; doctor sees the documents |
| Will bring physical | Patient will bring results in person | Admin, doctor |
| Results pending | Not ready yet | Admin, doctor |
| No results | None available | Admin, doctor |
| Strong warning | Required/recommended labs may be missing | Patient, admin, doctor |

## Templated summary UX

- Visually separate summaries from raw questionnaire answers.
- Current Visit Summary: concise, copy-paste-ready.
- Current Visit + History Summary: can be longer, includes longitudinal context.
- Show a generated timestamp (= latest questionnaire save time) on each summary.
- Make clear the summary comes from patient-reported/stored data, not doctor-verified data.
- Represent missing info cleanly — never hide it, never invent it.
- No "AI-generated" label needed (summaries are deterministic/template-based, not LLM output — do not blur this distinction).

## Accessibility & mobile

- Mobile-first, usable one-handed.
- Readable type size for older patients; avoid dense pages.
- Large, clearly labeled buttons.
- Errors state what happened and how to fix it.
- Upload instructions in plain text, with optional visual examples.
- Doctor dashboard must work on phone, tablet, and desktop.

## UX copy examples (Serbian — use/adapt these, don't invent a different tone)

| Context | Copy |
|---|---|
| DOB verification | "Radi vaše privatnosti, unesite datum rođenja da biste otvorili upitnik." |
| Missing labs warning | "Za ovaj tip pregleda obično su potrebni skoriji laboratorijski nalazi. Bez njih, doktor možda neće moći da završi kompletnu procenu. Možete nastaviti ako dolazite iz drugog razloga ili ćete nalaze doneti lično." |
| Old lab warning | "Ovaj nalaz izgleda stariji nego što je preporučeno. Potvrdite da li je ovo najnoviji nalaz koji imate." |
| Medication confirmation | "Prošli put ste naveli da uzimate ovaj lek. Da li ga i dalje uzimate u istoj dozi?" |
| Locked questionnaire | "Ovaj upitnik je zaključan jer je vreme pregleda počelo. Kontaktirajte kliniku ako je nešto važno potrebno ispraviti." |
| Not-EMR notice | "Ovaj formular pomaže vašem doktoru da se pripremi za pregled. On ne zamenjuje medicinski pregled ili zvaničnu evidenciju klinike." |

## Open UX questions to flag back to the product owner (do not silently decide these)

- Exact final questionnaire wording/ordering
- Exact final Serbian summary template wording/terminology
- Whether uploads need an instructional video vs. text/visual guidance only
- Exact dashboard density on phone vs. desktop
- How much historical context shows by default vs. collapsed
- Whether the patient sees a submission-confirmation summary (without full historical access)

Read `04-COMPLIANCE-CONSTRAINTS.md` last, before writing any code that touches
consent, retention, or hosting.
