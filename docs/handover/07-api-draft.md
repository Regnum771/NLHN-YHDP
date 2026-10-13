# 07 — API draft (to be frozen as OpenAPI v1 by 31/10)

Proposed REST + SSE surface for R1.0, grouped by screen. JSON, UTF-8. Auth: bearer token after activation. All learner IDs inside the core and logs are pseudonymous. Names are suggestions; the agreed `openapi.yaml` supersedes this file. A mock server generated from the OpenAPI file must be live by 06/11 so the app is never blocked.

## Auth, consent, profile

| Method | Path | Purpose | Screen |
|---|---|---|---|
| POST | `/auth/activate` | Exchange activation code (+ device info) for tokens | Sign in |
| POST | `/auth/refresh` | Refresh token | — |
| GET | `/consent/current` | Current consent text and version | Consent |
| POST | `/consent` | Record consent (version, timestamp); withdrawal = `DELETE /consent` | Consent, Account |
| GET / PATCH | `/me` | Profile, focus học phần, exam date, card settings, diagnostic-prompt dismissed | Focus, Home, Account |
| GET | `/me/data` | Export own data | Account |
| DELETE | `/me` | Request account deletion | Account |

## Home and học phần

| Method | Path | Purpose | Screen |
|---|---|---|---|
| GET | `/home` | Greeting name, quick-review count ("Ôn nhanh N câu"), next mock, `tutor_suggestions[]` (≤ 3: `{kind: cards_created \| example_added \| practice_added, text_vi, action}` from rule events), recent sessions (3–4) | Home |
| GET | `/session/today` | Steps `[{kind: cards \| practice \| continue, count, minutes, reason_vi}]` and total minutes | Home, session |
| GET | `/session/today/practice` | The weak-spot item set with `reason_vi` per item ("Vì sao câu này?") | Session step 2 |
| POST | `/session/today/practice/responses` | Answer → `{correct, explanation, rationale, citations, next: {kind: same_type \| harder (R1.1) \| easier (R1.1) \| done}, card_created}` | Session step 2 |
| POST | `/session/today/practice/complete` | → adaptation summary `{graded, mastery_updated, cards_created, tomorrow}` (`05-algorithms.md` §13) | Gia sư đang điều chỉnh |
| GET | `/modules?q=&status=&domain=&core_issue=&level=` | Học phần cards with progress and topic counts | Luyện tập, Focus |
| GET | `/modules/{id}` | Units and progress | Luyện tập |
| GET | `/units/{id}/next` | Next item (content / quiz / remediation) with reason when inserted | Unit |
| POST | `/units/{id}/responses` | Submit an answer → `{correct, explanation, rationales, citations, remediation_inserted, card_created}` | Unit |
| POST | `/items/{question_id}/explain` (SSE) | "Giải thích thêm" (tutor, after answering) — same states and citations as chat | Unit |
| POST | `/items/{question_id}/hint` | "Gợi ý" (before answering); never reveals the correct option | Unit |

## Chat

| Method | Path | Purpose | Screen |
|---|---|---|---|
| GET / POST | `/chat/sessions` | List / create sessions (optional `module_id` or `question_id` context) | Ask |
| GET | `/chat/sessions/{id}/messages` | History | Ask |
| POST | `/chat/sessions/{id}/messages` (SSE) | Ask. Events: `status` (`queued` + position), `step` (`{id, kind, label_vi, status}` per real tool call), `answer` (text or table + citations), `final` (`state`: answered \| insufficient_evidence \| declined \| needs_clarification \| plan_proposal (R2); `format`: text \| table \| calc (R1.1); `trace_summary {sources, claims_checked, claims_removed}`; `clarify_options[]`; `searched[]`; `suggestions[]`; `plan` (R2)) | Ask |
| POST | `/chat/suggestions/{id}/accept` | Run a suggestion (practise similar approved items, add to tomorrow's session) after the learner taps it | Ask |
| POST | `/plans/{id}/apply` | R2: apply a proposed plan (writes schedule, session length, reminder) | Ask → Lịch ôn tập |
| GET | `/passages/{id}` | Source excerpt: text (licence-limited), document, chapter, page | Source view |
| POST | `/messages/{id}/rating` | `{helpful: true \| false}` (mock shows a single "Hữu ích" toggle) | Ask |

## Reports

| Method | Path | Purpose |
|---|---|---|
| POST | `/reports` | `{target_type: question \| answer \| card \| content, target_id, reason: wrong_content \| wrong_citation \| broken_item \| inappropriate \| other, note, context}` → enters the review queue |

## Exams

| Method | Path | Purpose | Screen |
|---|---|---|---|
| GET | `/exams` | Diagnostic + mock forms: question count, time, attempts left; history | Exam list |
| POST | `/exams/{form_id}/attempts` | Start: server sets `deadline_at`; returns shuffled questions and option orders | Exam rules → Taking exam |
| PUT | `/attempts/{id}/answers/{question_id}` | Autosave `{chosen, flagged}` (idempotent) | Taking exam |
| GET | `/attempts/{id}` | Resume after reconnect (answers, remaining time) | Taking exam |
| POST | `/attempts/{id}/submit` | Submit (server auto-submits at deadline) | Taking exam |
| GET | `/attempts/{id}/results` | Score, per-item status, "updated revision" summary (new cards, priority changes) | Results |
| GET | `/attempts/{id}/items/{question_id}` | Learner answer, correct answer, explanation, citations | Answer review |

## Cards and progress

| Method | Path | Purpose | Screen |
|---|---|---|---|
| GET | `/cards/due?limit=` | Due queue (server-scheduled, FSRS) | Card review |
| POST | `/cards/{id}/reviews` | `{rating: 1–4}` → next due; returns preview intervals for the 4 buttons | Card review |
| PATCH | `/cards/{id}` | Suspend / unsuspend (bury until tomorrow: R1.1) | Card review |
| GET | `/decks` | Decks by học phần with new / learning / due counts | Deck list |
| GET | `/progress/skills?scope=latest3\|all` | Coverage, top 3 to prioritise, mock scores, domain × exam grid (if FR-LRN-13 confirmed), cognitive levels | Tiến độ · Năng lực |
| GET | `/progress/rhythm` | Time this week, 8-week minutes, recall stats, recall by học phần now / +7 days, 7-day due forecast, week activity | Tiến độ · Nhịp học |

## Review workbench (web)

| Method | Path | Purpose |
|---|---|---|
| GET | `/review/queue?round=&domain=&flag=` | Items awaiting review |
| GET | `/review/items/{question_id}?version=` | Item, rationales, linked passages, history |
| POST | `/review/items/{question_id}/decisions` | `{round, decision: pass \| revise \| reject, comment}` (comment required unless pass) |
| GET | `/review/reports` | Learner error reports with context |
| POST | `/admin/users/import` | CSV import → preview with error rows → confirm → activation codes |

## Ministry dashboard (read-only, R1.1 / R2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard/overview?period=&school=&audience=&region=&release=` | Aggregates for "Tổng quan toàn quốc"; groups < 10 suppressed server-side |
| GET | `/admin/dashboard/learning?...` | R2: score distribution, cognitive levels, domain × school, weakest core issues (consented learners only) |
| GET | `/admin/dashboard/export?format=xlsx\|pdf` | Export of the current view |

## Conventions

- Errors: `{error: {code, message_vi, details}}`; Vietnamese message for display.
- Pagination: `?cursor=&limit=`.
- Idempotency key header on POSTs that create records from the app (exam answers, card reviews) to survive retries.
- Every chat/tutor response includes `model_version`, `prompt_version`, `corpus_version` in the server log (not necessarily in the client payload).
