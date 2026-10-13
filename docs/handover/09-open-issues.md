# 09 — Open issues

Do not hard-code around these. Put the value in configuration and leave a TODO with the issue number.

| # | Issue | Owner / due | Affects |
|---|---|---|---|
| 1 | Legal entity that publishes the app (ĐH Y Hà Nội, NHIC or Viện CNTT); D-U-N-S and store accounts | Project coordinator · this week | Store accounts, bundle IDs, privacy policy |
| 2 | Model API provider for R1, its no-training terms; whether security level 3 applies to R1 hosting | Kỹ sư 1, Project coordinator · 31/10 | Model gateway config, NFR-15/16/19 |
| 3 | Minimum number of approved questions and mock forms for R1.0 | PI · 23/10 | FR-LRN-11, FR-ADM-08, content loading |
| 4 | Expert time: review 23/11–13/12; golden set 200–300 items | Project coordinator · 31/10 | D3, D4 |
| 5 | How CV3.2 is measured: definition of "misinformation" (≤ 8 %); κ protocol | PI + experts | NFR-13 |
| 6 | Spaced-repetition algorithm: FSRS (proposed) vs SM-2 / interval table | Team · kickoff | `05-algorithms.md` §5 |
| 7 | Bloom: 3 levels (proposed); label UI wording | Team + experts | FR-CNT-13, filters |
| 8 | `MIN_RESPONSES` before a topic counts as assessed | Team | FR-LRN-37, `05-algorithms.md` §2 |
| 9 | Latency targets in the proposal disagree (CV4.3 < 1.5 s, CV5.7 < 3 s, acceptance P95 < 15 s); spec uses P95 < 15 s | PI | NFR-01–03 |
| 10 | R2 inference hosting: 2 on-site GPU machines vs rented cloud GPUs | PI | NFR-06, NFR-19 |
| 11 | A/B/C question tiers still in CV4.2, 5.5, 6.2, 6.4 though dropped | PI | FR-LRN-15, FR-CNT-20 |
| 12 | Escalation queue owner (experts vs lecturers) and response time | PI | FR-LRN-29 (R2) |
| 13 | Undefined values: blueprint tolerance, licensed excerpt length, data retention periods | PI / BYT | FR-ADM-08, FR-LRN-03, data groups |
| 14 | Ethics approval before any pilot or survey data is collected | PI | Analytics, research export |
| 15 | Textbook formats (born-digital vs scanned; Vietnamese vs mixed) — test OCR on the worst documents first | Project coordinator, TTS · 31/10 | Ingestion |
| 16 | Proposed R1.0 / R1.1 split of R1 requirements (`01-scope-and-plan.md`) | Team · 23/10 | Everything |
| 17 | Consent model: proposed two consents — service (required) and research use of logs (optional, withdrawable separately) | PI + ethics | FR-ADM-03, research export |
| 18 | National exam date to use as the default `exam_date` | Project coordinator | FSRS interval cap, review calendar |
| 19 | Managing body and funding source for the login acknowledgement line; managing-unit name; permission to use the Bộ Y tế emblem | PI, Project coordinator | `Login`, store listing |
| 20 | Domain breakdown in Tiến độ · Năng lực pulls FR-LRN-13 into R1 — PO to confirm | PO | `ProgressSkills` |
| 21 | Daily-time setting (trim the session to N minutes) in R1.1 as the bridge to the R2 plan proposal | PO + team | `05-algorithms.md` §11, `ChatPlan` |
| 22 | Expert-maintained list of ambiguous glossary terms that trigger chat clarification | Experts | `04-agentic-core.md` chat UX |
| 23 | The gold AI star: `06-screens.md` rule 5 reserves it for tutor or model content, but R1.0 fills "✦ Đề xuất từ gia sư" from rule events only | PO | `Main` |
| 24 | Học phần are the 8 blueprint groups in the backend, while the mock screens show a subject-based list (Dịch tễ học cơ bản, Tiêm chủng mở rộng, …) | PO + team | `Modules`, `Focus`, `Main`, content |
| 25 | Core issues 20–21 are loaded as group 4 (bệnh lý truyền nhiễm); the transcription in `docs/reference/core_issues.md` asks for a check against the original | Project coordinator | Blueprint seed, mock-form gate |
| 26 | The blueprint gives weights per group as min–max ranges; the per-topic weight used for priority is derived as the range midpoint ÷ the number of issues in the group | Team + experts | `05-algorithms.md` §3 |
| 27 | The blueprint weights only Áp dụng, Phân tích and Đánh giá, so mock forms are limited to Bloom bands 2–3 and recall items stay in practice and cards | Team + experts | Open issue 7, exam assembly |
| 28 | The competency tree is provisional (it mirrors the blueprint: 8 groups, 54 core issues) until the QĐ 2755/QĐ-BYT tree is available | PI | Mastery, priority, dashboards |
| 29 | Exam assembly picks greedily: when a topic has few unseen questions it can end with more review questions than the mix asks for although a split that meets both the topics and the mix exists (seen: 5 new / 5 review where 7 / 3 was reachable) | Team + experts | `05-algorithms.md` §7, `backend/app/engine/assembly.py` (R1.1) |
| 30 | A chat or tutor answer holds one database connection for the whole model call (up to about 40 s). With more learners asking at once than the pool has connections (10), every other request waits. To be bounded by the model concurrency limit and queue of backend phase 7, or by releasing the connection during the call. **Mostly resolved 12/10/2026 (phase 7A):** chat and "Giải thích thêm" take one of `gateway.max_concurrent` model slots, wait in a line of at most `gateway.max_waiting`, and hold a connection only while they read or write. Still open: the tutor's hint makes its one model call while holding its request's connection, outside the line | Team | NFR-01–03, `04-agentic-core.md`, `docs/architecture.md` §9.6 |
| 31 | Priority is ranked over all 54 core issues, but only three topics have content yet, so exam results name topics the learner cannot study (for example "Dự phòng HIV") | Team + content | `Results`, content v2 |
| 32 | Error codes the backend returns with 409 that `openapi.yaml` does not document on their routes: `form_unavailable` and `no_attempts_left` (start an attempt), `attempt_open` (results, answer review), `not_current_item` (unit answer), `not_answered` (explain). To add at the next contract change. **Resolved 12/10/2026:** documented in `openapi.yaml` | Team | `openapi.yaml`, web client |
| 33 | Card rating labels disagree: `06-screens.md` and the `SessionCards` mock say "Quên · Khó · Nhớ · Dễ"; the `Cards` mock and the API description say "Học lại · Khó · Tốt · Dễ"; `06-screens.md` also says both screens use the same card component. The web client keeps "Học lại · Khó · Tốt · Dễ" (one constant) until this is settled | PO, Design | `SessionCards`, `Cards`, web client |
| 34 | NFR-07 speaks of "displayed claims" carrying a citation, but a displayed claim has by construction passed the post-check. The ministry dashboard reports claims kept ÷ claims checked ("Khẳng định có trích dẫn đến trang") until the measure is defined | PI | NFR-07, `AdminOverview`, `backend/app/services/dashboard.py` |
| 35 | "Vấn đề cốt lõi có ≥ 10 câu đã duyệt" on the ministry dashboard uses the mock's number; the minimum per core issue is not decided (see issue 3). It is `dashboard.min_approved_per_issue` in `backend/config.yaml` | PI | `AdminOverview`, FR-ADM-08 |
| 36 | Operations figures on the ministry dashboard (uptime, incidents, last backup and restore test) are not shown: nothing measures them yet. They wait for monitoring and the hosting decision (see issue 2) | Kỹ sư 1, Project coordinator | `AdminOverview`, FR-ADM-19, NFR-19 |
| 37 | "Chỉ tiêu theo thuyết minh" (pages digitised, passages with metadata, glossary terms, knowledge-table records) is not shown on the ministry dashboard: the counts come from ingestion, which is not built | Team | `AdminOverview`, ingestion |
| 38 | Choices made by the ministry dashboard where the design leaves one: mock scores count forms of kind `mock`, `demo_short` and `assembled` (as the learner's own Tiến độ does); "open over 14 days" is counted from a report's current status, because no status history is kept; deletion requests are counted nationally under every filter, because a deleted account has no school; the legend "Dưới 60% câu đúng" is fixed copy although the threshold is configuration | PO + team | `AdminOverview`, `backend/app/repo/dashboard.py` |
| 39 | The ministry dashboard hides a group under 10 learners, but two views can still be compared: national totals minus the visible schools give a hidden school's usage counts (accounts, attempts, weekly activity), and a region minus its only visible school gives the rest. Shares are rounded to three decimals so outcome figures cannot be recovered exactly. Whether to withhold a view whose complement is a group of 1–9 learners (complementary suppression) is not decided | PI + ethics | `AdminOverview`, FR-ADM-16 |
| 40 | Outcome figures on the ministry dashboard use learners whose research consent was given before the period's end and has not been withdrawn since, so a withdrawal also removes a learner from past months and a past month's figures can change. The count "Đồng ý dùng dữ liệu cho nghiên cứu" stays as it stood at the period's end. To confirm with the consent text | PI + ethics | `AdminOverview`, open issue 17 |

Assumptions in this package: FR-LRN-05 (decline clinical advice) and FR-ADM-19 (backups) are in R1.0 for safety; model tiers follow the post-council decision (7–8B / 13–15B / 24–32B).
