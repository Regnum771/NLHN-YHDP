# Changelog

## 13/10/2026 — public repository

- This package is published with the source code. Personal names are replaced by roles ("Project coordinator"; "Kỹ sư 1", the engineer who owns the agentic core and the schema; "Kỹ sư 2", the app engineer), and the links to the private live sources are removed. Nothing else in the package changed.
- The design of what is built is documented beside it: `docs/architecture.md`, `docs/data-model.md`, `docs/web-client.md`, `docs/ministry-dashboard.md`, `docs/development.md`. References in this package to the earlier internal design notes now point to those files.
- The ministry dashboard page shows two blocks that are not in `mock/AdminOverview`: "Chi phí vận hành" and "Hiệu quả trên đầu học viên". Their amounts are illustrative constants in the web client, labelled "Số liệu minh hoạ"; they are not served by the backend and are not in the Excel file (`docs/ministry-dashboard.md` §6.3).

## 13/10/2026 — phase 6B: the ministry dashboard

- Implemented: `GET /v1/admin/dashboard/overview` and `GET /v1/admin/dashboard/export` (roles `ministry_viewer`, `admin`). 48 of 55 operations. No migration; a `dashboard:` block in `backend/config.yaml`.
- "Quản lý cấp Bộ · Tổng quan toàn quốc" is the page `/quan-ly` of the web client, with a staff sign-in at `/quan-ly/dang-nhap`, after `mock/AdminOverview`: filters (Kỳ, Cơ sở đào tạo, Đối tượng, Vùng), five tiles, weekly active learners and retention, "Cần chú ý", "Câu đúng theo miền", "Ngân hàng câu hỏi", "An toàn câu trả lời AI", "Theo cơ sở đào tạo", "Vận hành và tuân thủ", and "Xuất Excel" (one sheet per block, the same figures, each download in the audit log).
- Every figure is computed from the operational tables on each request. A group under 10 learners is withheld ("–"), and a filter selecting fewer shows only a notice; outcome figures use learners with a current research consent; a deleted account is not counted; "Dữ liệu mẫu" is shown whenever a learner in view is synthetic.
- "Cần chú ý" is three rules with thresholds in configuration (a visible school under 60% activation; round-2 review median over 7 days; error reports open over 14 days), each line a template filled with the numbers that triggered it. The mock's hand-written lines and its backup reminder are not reproduced.
- Not built: uptime, incidents and backups; "Chỉ tiêu theo thuyết minh"; the PDF report; the release filter; "Chi tiết" (`AdminLearning`, R2); the sentence under the chart and the blind-evaluation footnote.
- New open issues 34–40 (the NFR-07 measure, the 10-per-issue minimum, operations figures, "Chỉ tiêu theo thuyết minh", four choices the dashboard makes where the design leaves one, comparing two views, and what a withdrawn consent does to past months).
- After review: `openapi.yaml`: `region` of a school row and of a hidden school may be null (a school with no region on record no longer breaks the view); every share is rounded to three decimals; the chart's last week is counted whole although the month ends inside it; an account closed but kept under its pseudonym is not counted; a learner who withdrew research consent is out of every outcome figure, past months included.

## 12/10/2026 — phase 7B: the Hỏi đáp screens

- Hỏi đáp shows what phase 7A made real: "Gia sư đang làm" with the stages as they run; the chip "Đã tra N nguồn · kiểm tra M nhận định" that opens the steps; the notice of a removed claim; "Đã tìm ở:" with the nearest chapter and a disabled "Gửi chuyên gia · R2"; the queue position; the suggestion box (AI star) whose buttons act only on a tap; "Hữu ích"; a list of past conversations. The conversation is in the address (`?s=`), so a reload keeps it.
- "Hỏi gia sư · từ câu quiz" is a full screen, opened from a practice item and from the unit's chat icon: the context card, a starter question, "Làm câu tương tự" (the answer's practice suggestion) and "Quay lại bài luyện". "Giải thích thêm" in a unit stays the one-tap sheet.
- `openapi.yaml`: a message of the history carries `trace`, the steps of that answer in their done form.
- Not built: table answers (none are produced in R1.0), "Báo lỗi" (reports are phase 8), the declined answer's follow-up question.

## 12/10/2026 — backend phase 7A: the chat contract

- Implemented: `POST /v1/chat/suggestions/{suggestion_id}/accept` and `POST /v1/messages/{message_id}/rating`. 46 of 53 operations. No migration.
- The answer stream now sends what `openapi.yaml` already described: `step` events for the stages that ran (glossary lookup, search, reading, the check; in the order they run, each once as running and once as done), `status: queued` with the real position when a turn waits for the model, and a `final` event with `trace_summary`, `clarify_options`, `searched`, `nearest_chapter` and `suggestions`. History returns the same.
- As built, where the handover leaves a choice: 4 model calls at once and a 60-second wait before "Hệ thống đang bận…"; one topic per answer for suggestions (the cited topic with the most wrong answers in 14 days), at most 3 questions, counted among the questions a set would ask now; the notice "Đã bỏ K ý vì không tìm được nguồn trong giáo trình." without the short topic; clarification by the expert flag only (not by multi-sense retrieval); a sense named by a synonym counts as named.
- `openapi.yaml`: new documented refusals. `POST /chat/sessions`: 409 `not_answered`, `tutor_unavailable` (with `question_id`). `POST /chat/suggestions/{id}/accept`: 409 `nothing_to_practise`, `tomorrow_taken`. Not documented yet (404 and 422 are not listed per route): `message_not_found`, `not_a_clarification` on a message with `clarifies_message_id`; `suggestion_not_found`; `message_not_found` on rating.
- A turn that ended before the documents were weighed (model unreachable, system busy, an unexpected failure) now says "Chưa trả lời được câu hỏi này lúc này." with the reason as its notice, instead of saying the documents do not cover the question. Its state stays `insufficient_evidence`.
- Open issue 30 is resolved for chat and "Giải thích thêm": a turn holds no database connection while it waits or while the model answers. The hint still holds its request's connection during its one model call.
- Glossary entries may carry `ambiguous` and `sense_group`; the seed flags "tỷ lệ mắc" as a fixture.

## 12/10/2026 — the AI mark on a hint, options shuffled in practice sets

- `openapi.yaml`: `Hint` gains `generated` (boolean, required): true when a model wrote the hint, false when it is the pointer to the source written by code. The web client shows the AI star and "Gợi ý do AI viết" on a generated hint only (PO decision, 12/10/2026).
- A practice set shows each question's options in an order of its own, drawn from the set and the question, so it is the same on every reload and the authored first option is no longer the usual answer (PO decision, 12/10/2026). Answers are still sent and graded by option key. No migration. Unit quizzes keep the authored order.

## 12/10/2026 — web client: the learner screens of the 11/10 design

- The web client now shows every learner screen that has a backend: Chọn học phần, Trang chủ ("Ôn nhanh", "Đề xuất từ gia sư"), Phiên hôm nay (thẻ ôn, luyện điểm yếu, "Gia sư đang điều chỉnh", học tiếp), "Gợi ý" in a unit, Bộ thẻ, Ôn thẻ, Tiến độ · Năng lực and Nhịp học. Functional first: content, states, copy and colours; the layouts are plain and a later pass matches the mocks. No backend change.
- As built, where the handover leaves a choice: Chọn học phần is shown while the server's `diagnostic_prompt_dismissed` is false, so once per learner; "Luyện" on a priority topic opens its học phần in Luyện tập (the contract cannot build a practice set on a topic at the learner's request); the memory curve is captioned as the learner's most reviewed card, which is what the server sends.
- Not shown, because nothing backs it yet: "Hỏi gia sư · từ câu quiz" as a full screen and "Làm câu tương tự", the chat work trace and suggestions, the filters by domain and level, the domain × exam grid, the difficulty indicator.
- Mock copy not used, because the screen cannot stand behind it: "phủ đều các miền" on the diagnostic card; "Câu càng đòi hỏi vận dụng, bạn càng hay sai." on Năng lực; "12 thẻ vừa chạm ngưỡng nhớ" on Nhịp học (the real count of cards due today is shown).
- New open issue 33: the card rating labels differ between `SessionCards` and `Cards`. The same is true of the button that turns the card ("Lật thẻ" in the session, "Hiện đáp án" in deck mode); each screen follows its own mock.

## 12/10/2026 — backend phase 5B

- Implemented: `GET /v1/progress/skills`, `GET /v1/progress/rhythm`, `GET /v1/decks`, `PATCH /v1/cards/{card_id}`, `POST /v1/items/{question_id}/hint`. 44 of 53 operations. No migration.
- Definitions the handover leaves open, as built: "recall rate" is the share of reviews in the last 30 days rated "Khó" or better; a card is "mastered" when its FSRS stability reaches 21 days (the due date is not used, because it is held back to the exam date); a "study day" is a day with an answer, a card review, an exam or a question to the tutor, not a day the app was only opened; "Ôn N thẻ" counts cards, and its ratio is the cards recalled when first shown that day; the priorities list only topics that have a question to practise.
- The hint is checked in code: a reply is replaced by a pointer to the source when it points at an option (by key or position, to choose it or rule it out), contains the correct option's text or every other option's, or gives a number the question does not give. No hint during a running exam or after the question is answered.
- `openapi.yaml`: the hint route documents `hint_unavailable` (409). Nothing else changed.
- Left out, to follow: the learner's daily caps on the review queue (`new_cards_per_day`, `max_reviews_per_day`) and the group × exam grid (open issue 20).

## 12/10/2026 — backend phase 5A

- The daily session ("Phiên hôm nay"), practice sets and the adaptation summary are implemented; Home returns "Ôn nhanh N câu" and "Đề xuất từ gia sư" from rule events. 39 of 53 operations.
- A practice set records the version of each question it serves.
- Opening Home builds the day's session, as opening "Phiên hôm nay" does: whichever comes first. A line under "Đề xuất từ gia sư" is shown for one visit.
- "Tomorrow" in the adaptation summary is about tomorrow's practice step: it is said only when the set's own answers change that step's topic. `05-algorithms.md` §13 does not define it; `docs/architecture.md` §7.4 now does.
- A wrong practice answer shows a worked example but inserts nothing, so Home's "Thêm N ví dụ vào lộ trình" counts unit insertions only.
- `openapi.yaml`: the two practice response routes document `set_completed` (409), and the Home example carries the sentences the server sends. Nothing else changed.
- Migrations 0009 and 0010: versions on practice sets; one answer per question of a set.

## 12/10/2026 — phase 4B, web client

- The reference web client runs against the `/v1` backend: sign-in by activation code, consent, tokens with one refresh at a time, the 11/10 colour tokens.
- `openapi.yaml` names the code behind every documented 409 (seven operations, five of which had none documented), and no longer documents one on `POST /v1/attempts/{attempt_id}/submit`, which never returns it. Apart from that route's summary nothing else in the contract changed. Open issue 32 is resolved.

## 12/10/2026 — backend phase 4A

- The kickoff demo's learner flows are implemented under `/v1` on the new schema: 21 more operations (32 of 53). The contract did not change.
- Unit answers, exam starts and hand-ins, card reviews, chat and tutor turns and Home visits are written to the activity log under the learner's pseudonym. Exam answers are not logged one by one: the hand-in is.
- "Đề tự ráp" sits behind `exam.assembled_enabled`.
- The kickoff demo's routes and their orchestration code are removed. The web client is re-pointed in plan 4B.
- An exam attempt records the version of each question it serves (migration 0008), so a question edited or retired mid-attempt is still shown, scored and reviewed as the learner saw it, and an unapproved draft is never shown in its place.
- `09-open-issues.md`: issues 29–32, raised by the review of this phase.

## 12/10/2026 — backend phase 3

- Sign-in (activation code for learners, e-mail and password for staff), opaque rotating tokens, roles, the consent gate and the learner's account are implemented.
- The contract gained one documented response: 409 on `POST /v1/consent`, returned when the consent version sent is no longer the current one. Nothing else in `openapi.yaml` changed.
- On account deletion the activity log is kept as pseudonymous records; everything else of the learner is erased (default) or kept under the pseudonym (`account_deletion.learning_records`).
- The consent texts in `backend/config.yaml` are placeholders until the legal texts of deliverable D1 exist (open issue 17).

## 11/10/2026 — backend phase 2

- The database is built by migrations (`backend/migrations/`) to the data model in `docs/data-model.md`. `03-architecture-and-data-flow.md` is unchanged; where the two differ, §8 of that file lists the difference.
- The blueprint is loaded from `backend/seed/blueprint.yaml`, a transcription of `docs/reference/core_issues.md`: 54 core issues in 8 groups and 4 competencies with 13 components.

## 11/10/2026 — backend design

- `09-open-issues.md`: issues 23–28, raised while designing the R1.0 backend (`docs/architecture.md`).
- `CLAUDE.md` moved to the repository root; the blueprint transcription is at `docs/reference/core_issues.md`.
- The API contract is now `openapi.yaml` at the repository root (v1 draft, generated from the backend). It supersedes `07-api-draft.md`; its deviations from that file are listed in `docs/architecture.md` §5.5.

## 11/10/2026 — design review sync (canvas version 34)

The PO asked that the product look smart: adaptive questions, revision cards and the tutor visible on screen. Changes since the 09/10 package:

**Screens**
- New Home (`Main`): "Ôn nhanh N câu" tile, next mock, "✦ Đề xuất từ gia sư", continue list. Replaces the old Home with the diagnostic prompt.
- New daily session: `SessionCards` → `SessionQuiz` → `SessionAdapting` → `Unit`.
- New "Gia sư đang điều chỉnh" screen after a practice set (real results only, ≈ 3 s, skippable).
- Chat redesigned with 9 states (work trace, post-check notice, table answers, clarification, searched sources, suggestions, chat from quiz, plan proposal R2); new boards `ChatQuiz`, `ChatPlan`.
- `Progress` replaced by `ProgressSkills` (Năng lực) and `ProgressRhythm` (Nhịp học, with memory curve and recall by học phần).
- New `Login` with the Bộ Y tế header; new ministry dashboards `AdminOverview`, `AdminLearning`.
- Card reasons and sources collapse by default ("Nguồn", "Vì sao ôn câu này?", "Đường ghi nhớ").

**Visual**
- Palette moved to Bộ Y tế green (`#1E7A4F`); red only on login; gold only for the AI star; orange for wrong answers.

**Docs**
- `06-screens.md` rewritten (inventory, chat states, tokens, "making the system visible" rules, explorations).
- `04-agentic-core.md`: chat UX contract, `needs_clarification` state, R2 plan path.
- `05-algorithms.md`: §11 daily session, §12 memory display, §13 adaptation summary.
- `07-api-draft.md`: session, chat SSE `step` events and payload fields, progress split, ministry dashboard endpoints.
- `01-scope-and-plan.md`: phases of the new features and a fallback if S3 slips.
- `08-quality-and-acceptance.md`: honesty checks for traces and summaries.
- `09-open-issues.md`: issues 19–22.
- Screenshots re-rendered; `screenshots/chat-states/` and `screenshots/explorations/` added.

**Not updated:** `diagrams/` PNGs (site maps predate these changes; the mermaid chart in `06-screens.md` is authoritative). `02-requirements.md` and `03-architecture-and-data-flow.md` are unchanged.
