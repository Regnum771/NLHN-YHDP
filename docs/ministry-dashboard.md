# Ministry dashboard and sample cohort

| | |
|---|---|
| Subject | "Quản lý cấp Bộ · Tổng quan toàn quốc": aggregate endpoints, spreadsheet export, web page, and the synthetic cohort that populates them |
| Audience | Engineers, data analysts and technical reviewers |
| Requirements | FR-ADM-15, FR-ADM-16, FR-LRN-26, NFR-07 |
| Related documents | `docs/architecture.md`, `docs/data-model.md`, `docs/handover/mock/AdminOverview.dc.html` |

## 1. Scope

The dashboard presents national aggregates of use, learning outcomes, content review, answer safety and compliance to the roles `ministry_viewer` and `admin`. It is read-only. This document defines each figure, the privacy rules applied to it, the two operations that serve it, the page, and the generator of the sample data on which it is demonstrated.

## 2. Computation model

Each request executes aggregate SQL over the operational tables with the selected filters. There are no snapshot tables, no scheduled jobs and no roll-ups. At the planned scale (about 5 000 learners) one view is computed within one request, and every filter combination is available. The page states when its figures were computed.

| Module | Role |
|---|---|
| `repo/dashboard.py` | SQL only: raw counts and value lists per group |
| `engine/dashboard.py` | Pure rules: suppression, consent restriction, medians, retention, alert rules |
| `services/dashboard.py` | Assembles one view from the two above |
| `services/dashboard_export.py` | Renders that view as an `.xlsx` file |
| `api/dashboard.py` | The two operations |

## 3. Filters and time

| Filter | Definition |
|---|---|
| Kỳ | A calendar month `YYYY-MM` in the configured local time zone. Default: the last complete month. Options: every month from the first activity to the current month |
| Cơ sở đào tạo | One training institution. An institution below the suppression minimum is not offered |
| Đối tượng | `student` or `graduate` |
| Vùng | Region of the institution |

A week starts on Monday, local time. There is no release filter: no record states which release produced an event.

## 4. Figures

"Consenting" denotes learners whose research consent was given before the end of the period and has not been withdrawn since.

| Block | Figure | Definition |
|---|---|---|
| KPI tiles | Học viên hoạt động trong tháng | Learners with any `activity_event` in the period; change on the previous month; share of accounts issued |
| | Tài khoản đã kích hoạt | Activation codes activated by the end of the period, of codes issued by then |
| | Câu luyện tập đã làm | `unit_response` and `practice_response` events in the period; mean per active learner |
| | Lượt thi thử | Attempts submitted in the period on forms of kind `mock`, `demo_short` and `assembled`; median score, consenting learners |
| | Câu trả lời AI có trích dẫn | The citation share of the answer-safety block, against the NFR-07 target |
| Học viên hoạt động mỗi tuần | Chart | Active learners per week for the 12 weeks ending with the last week of the period |
| | Quay lại sau 1 / 4 / 8 tuần | Of learners whose first activity is at least N + 1 weeks before the end of the period: the share with any activity in the 7 days that start N weeks after it |
| Cần chú ý | At most four lines | Three rules with configured thresholds: activation rate of a visible institution below 60 %; round-2 review median above 7 days; error reports open longer than 14 days. Each line is a template filled with the numbers that triggered it |
| Câu đúng theo miền | Eight bars | Share correct per học phần on mock-examination responses in the period, consenting learners. Marked low below 60 %. Questions with no core issue are not shown |
| Ngân hàng câu hỏi | Status counts | Latest version of each question: Đã duyệt (`approved`); Đang duyệt (`prescreen`, `in_review_r1`, `in_review_r2`, `needs_revision`); Nháp (`draft`); Loại (`rejected`). `retired` is not counted |
| | Vấn đề cốt lõi có ≥ 10 câu đã duyệt | Core issues with at least `min_approved_per_issue` approved questions, of 54 |
| | Duyệt vòng 1 / vòng 2 (trung vị) | Days from the transition into the round to that round's decision, for decisions made in the period |
| | Hai vòng cùng kết luận | Of items whose round-2 decision falls in the period, the share where it equals the round-1 decision |
| | Báo lỗi từ học viên | Error reports created in the period, and the number resolved |
| An toàn câu trả lời AI | Header | Assistant messages in the period, with the distinct model and corpus versions |
| | Khẳng định có trích dẫn đến trang | Claims kept by the post-check ÷ claims checked, over messages that carry claim counts |
| | Từ chối vì thiếu bằng chứng; Từ chối tư vấn ca bệnh cụ thể | Share of answers in state `insufficient_evidence`; in state `declined` |
| | Bị hậu kiểm trích dẫn gắn cờ | Share of answered messages with at least one claim removed |
| | Báo lỗi trên 1.000 câu trả lời | Error reports of target type `answer` in the period ÷ assistant messages × 1 000 |
| Theo cơ sở đào tạo | One row per visible institution | Region; accounts issued; activated and rate (marked low below 60 %); mean weekly active learners over the weeks of the period; mock attempts; median score, consenting; median change from first to latest mock among consenting learners with two or more attempts |
| Vận hành và tuân thủ | Độ trễ một lượt hỏi đáp (P95) | 95th percentile of `latency_ms` in the period, against the configured target |
| | Đồng ý dùng dữ liệu cho nghiên cứu | Learners with a research consent current at the end of the period, and their share of activated learners |
| | Rút đồng ý / yêu cầu xóa dữ liệu | Consents withdrawn and deletion requests made in the period; median days from request to completion |

- The question-bank block covers the whole bank regardless of the institution, audience and region filters; the page states this.
- A median score is returned as a share correct, with the form size when every attempt behind it has the same size. The page shows "27/40" when the size is present and a percentage otherwise.
- Shares leave the server rounded to three decimals.

## 5. Privacy rules

Applied in `engine/dashboard.py`.

| # | Rule |
|---|---|
| P1 | **Aggregates only.** No learner identifier, pseudonym or name appears in any payload or file |
| P2 | **Small groups are withheld.** An institution row, a học phần bar or an outcome figure resting on fewer than `dashboard.suppression_min` learners (default 10) is returned as `null` and displayed as "–". A filter combination that selects fewer activated learners returns `suppressed: true` and no figures. A withheld institution still counts in national totals and is named below the table with its region and size |
| P3 | **Outcome figures use consenting learners only:** accuracy per học phần, median scores, first-to-latest change. Each carries the number of learners it rests on. Usage counts use every learner |
| P4 | **No prediction.** No pass rate, pass line or predicted score. The payload is covered by the no-prediction test |
| P5 | **Sample-data label.** `sample_data` is true when any learner in scope is synthetic. The page shows "Dữ liệu mẫu" and the export carries the label on every sheet |
| P6 | **Deleted accounts** are not counted, whether their records were erased or retained under the pseudonym |

**Residual disclosure.** Usage counts of a withheld institution can be derived by subtracting the visible rows from the national totals. Rounding of shares prevents exact recovery of outcome counts but not of usage counts (open issue 39). A consent withdrawal removes a learner from past periods as well, so the figures of a past month can change (open issue 40).

## 6. Operations, export and page

### 6.1 Operations

| Operation | Returns |
|---|---|
| `GET /v1/admin/dashboard/overview?period=&school=&audience=&region=` | `period`, `computed_at`, `sample_data`, `suppressed`, `suppression_min`, the selected filters, the filter options, and one member per block of section 4. Figures are raw numbers; the client formats them. A withheld figure is `null`; withheld institutions are listed separately |
| `GET /v1/admin/dashboard/export?format=xlsx&…` | The same view as an `.xlsx` file |

The file is produced from the same service result as the JSON payload and therefore cannot disagree with the page. It has one sheet per block. Each sheet begins with the title, period, filters, time computed, the suppression note and, when applicable, "Dữ liệu mẫu". Figures are stored as numbers. Each download writes an `audit_log` row (`dashboard_export`: actor, time, filters).

### 6.2 Page

- `/quan-ly/dang-nhap`: staff sign-in by e-mail address and password.
- `/quan-ly`: the page, laid out after `AdminOverview`. Filters are native `select` elements. The weekly chart is inline SVG; its accessible label states the real first and last values. A withheld figure shows "–" and a footnote states the reason. A suppressed view shows only a notice. "Xuất Excel" downloads with the signed-in session.

### 6.3 Illustrative cost blocks

"Chi phí vận hành" and "Hiệu quả trên đầu học viên" are not part of the handover design and are not backed by the server. The monthly amounts are fictitious constants in `web/src/dashboardCost.ts`. The per-learner figures divide those amounts by the real counts of the view. Both blocks carry the label "Số liệu minh hoạ", are not shown under an institution, audience or region filter (the amounts are national), and are absent from the export. Of the four cost components, model cost could be derived from the per-turn cost the backend already records; the others require a data source that does not exist.

### 6.4 Not presented

Availability, incidents and backups (no monitoring exists; open issue 36); "Chỉ tiêu theo thuyết minh" (requires ingestion; open issue 37); a PDF report; the release filter; the "Chi tiết" link (`AdminLearning`, R2); the commentary sentence under the chart and the blind-evaluation footnote of the mock, which have no data behind them.

## 7. Sample cohort

### 7.1 Purpose

The demonstration content covers one học phần and a ten-question form, which cannot populate a national view. The generator therefore creates a flagged sample question bank and a synthetic cohort whose history is produced **by the production services** with a backdated clock. Elo updates, cards, priorities and activity events in the sample are consequently the output of production code.

### 7.2 Invocation

```
python -m seed.cohort --learners 300 --weeks 12 --seed 42 [--end YYYY-MM-DD]
```

- Requires `APP_ENV=dev` or `test` and a seeded database.
- Refuses to run when synthetic learners already exist: the activity log is append-only, so a second run cannot remove the first.
- A full run performs on the order of 300 000 service calls and takes most of an hour. The generator commits once per learner and day.

### 7.3 Order of generation

| Step | Writes | Method |
|---|---|---|
| 1 Sample bank | About 600 approved placeholder questions over the 54 core issues, some issues kept below 10; further items in draft, in review and rejected; one 40-question form of kind `mock` | The generator's own writer. Stems read "Câu mẫu 17 · nhóm 3" and contain no medical text. Each question cites the placeholder passage of its core issue in one sample document. The form passes the blueprint gate |
| 2 People | Six coded institutions (CSĐT A–F) with regions; F has 8 learners, to exercise suppression; E has a low activation rate, to trigger the alert; activation batches with unused codes; learners with audience and a hidden ability; consents, about one third without research consent | Activation and consent through the production services |
| 3 History | Per learner and day: Home visit, daily session, card reviews, practice sets, units, mock attempts on the sample form | The production services with a backdated clock |
| 4 Withdrawals and deletions | A few research-consent withdrawals and account deletions | The production account service |
| 5 Review history | Backdated `status_transition` and `review_decision` rows by the two demonstration reviewers, with a spread of durations and some differing round-2 decisions | The seed's approval path, so the approval trigger still decides what becomes approved |
| 6 Chat log and error reports | Chat sessions and messages with a spread of states, claim counts, latencies and versions; error reports, some resolved, some old and open | Written directly as log records. No model is called |

The approved sample bank is dated before the first learner, so no learner is served an item before its approval.

### 7.4 Answer model

An answer is correct with the probability the Elo model gives for the learner's hidden ability and the item's hidden difficulty; a wrong answer selects a distractor at random. Ability rises slightly with each item practised, which produces the first-to-latest change. A card is recalled with a fixed probability per learner that rises with ability. Each learner has an activity rate and a drop-out probability, which produce the weekly curve and the retention figures. All parameters are in `backend/seed/cohort/params.py`.

### 7.5 Determinism

The run is deterministic for a given seed and end date: each learner's draws are keyed on the learner's position in the cohort. One residue remains: an examination attempt shuffles its questions with an unseeded generator (production behaviour), so card identifiers, the pairing of cards and questions in the due queue, and Elo values differ between runs. Counts and scores do not.

### 7.6 Isolation of sample data

| Measure | Effect |
|---|---|
| `is_synthetic` on organisations, learners, questions, forms, the sample document, events and chat messages | Every synthetic row is identifiable |
| Search, its term statistics and the source sheet skip passages of a synthetic document | A placeholder passage is not part of the corpus |
| The queries that select questions or forms from a pool skip synthetic rows for a learner who is not synthetic | A real learner is never served a placeholder item; a test asserts this |
| The event writer sets `is_synthetic` from the learner row at insertion | The log refuses updates, so the flag cannot be set afterwards |
| The generator refuses to run in production | Sample data cannot enter a production database |

## 8. Configuration

```yaml
dashboard:
  suppression_min: 10
  min_approved_per_issue: 10      # open issue 3: the minimum is not decided
  low_share: 0.6                  # accuracy and activation rate are marked low below this
  cited_claims_target: 0.95       # NFR-07
  chat_latency_target_s: 15
  alerts:
    activation_rate_min: 0.6
    review_r2_target_days: 7
    report_open_days: 14
```

## 9. Verification

| Test | Guards |
|---|---|
| Suppression at 9 and 10 learners; suppression of a whole view; outcome figures restricted to consenting learners (pure) | P2, P3 |
| Learner and reviewer tokens are refused; no pseudonym or name in the payload | Access, P1 |
| The dashboard payload in the no-prediction test | P4, FR-LRN-26 |
| A small cohort run (20 learners, 2 weeks) completes; no real learner is served a synthetic question | Section 7.6 |
| Contract tests (drift, examples, roles) | Both operations |
| `npm run rehearse:dashboard` (34 checks) | The page: sign-in, filters, suppression notice, export, phone-sized layout, sign-out |

**Not verified automatically:** the arithmetic of retention, medians, alert thresholds and month boundaries; the content of the export; determinism of the generator. An error in one of these is detectable only by reading the page against the parameters of the cohort.

## 10. Open issues

| Issue (`09`) | Subject |
|---|---|
| 34 | NFR-07 refers to "displayed claims"; a displayed claim has by construction passed the post-check. The dashboard reports claims kept ÷ claims checked until the measure is defined |
| 35 | The minimum of 10 approved questions per core issue is the mock's number; it is undecided (issue 3) |
| 36 | Operations figures await monitoring and the hosting decision (issue 2) |
| 37 | "Chỉ tiêu theo thuyết minh" awaits ingestion |
| 38 | Choices made where the design leaves one, including which form kinds count as mock attempts |
| 39 | Usage counts of a withheld institution are derivable by subtraction |
| 40 | A consent withdrawal changes the outcome figures of past periods |
