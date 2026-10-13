# Web client: user interface and interaction design

| | |
|---|---|
| Subject | Reference web client of the YHDP Exam Platform (`web/`): learner application and ministry dashboard page |
| Audience | Front-end engineers, designers and technical reviewers |
| Normative sources | `docs/handover/06-screens.md`, `docs/handover/mock/`, `docs/handover/screenshots/`, `openapi.yaml` |
| Related documents | `docs/architecture.md`, `docs/ministry-dashboard.md` |

Mock names in `code style` (for example `SessionCards`) refer to files `docs/handover/mock/<name>.dc.html`.

## 1. Scope

This document specifies the implemented user interface: navigation, the content and states of each screen, interaction rules, visual tokens, client structure and verification. Layout and copy of the target design are defined by the handover package; the mock HTML is a visual reference and is not production code.

**Fidelity.** The implemented screens are functionally complete: correct content, states, Vietnamese copy and colours, in a plain layout. Close conformance to the mock layouts is a subsequent pass.

**Role of the client.** The web client is a reference implementation of the contract and a demonstration vehicle. The R1.0 product for learners is the native application, which is outside this repository.

## 2. Design constraints

| # | Constraint | Source |
|---|---|---|
| C1 | **Only real work is shown.** Every number, line and step comes from the learner's stored records or from the response to the current request. No step, count or delay is simulated | `AGENTS.md` |
| C2 | **No prediction of an examination outcome.** No predicted score, pass line, probability or trend arrow on any screen | FR-LRN-26 |
| C3 | **A suggestion never writes silently.** A proposed action takes effect only after the learner activates it | `AGENTS.md` |
| C4 | **Reasons are stated.** The order of the session, each practice item and each card expose the reason the server supplies | `06` |
| C5 | **Every factual answer carries page-level citations**; a citation opens the source excerpt | `AGENTS.md` |
| C6 | **The AI mark** (gold star) appears only on "Đề xuất từ gia sư", the adaptation screen and a hint that a model wrote | `06`, open issue 23 |
| C7 | User-interface copy is Vietnamese. Dates are `dd/mm/yyyy`. Numbers use a comma decimal and a dot for thousands | `AGENTS.md` |
| C8 | Mobile first: design base 360–390 px; touch targets at least 44 × 44 px; nothing depends on hover | `AGENTS.md` |
| C9 | Accessibility: native buttons, links and inputs with labels; icon-only buttons have an accessible name; text contrast at least 4.5:1; every chart has a text equivalent | `AGENTS.md` |

## 3. Visual tokens

Defined once in `web/src/theme.css`.

| Token | Value | Use |
|---|---|---|
| `--primary` | `#1E7A4F` | Ministry of Health green, darkened so that white text reaches 5.3:1 |
| `--primary-dark`, `--primary-tint` | `#17603E`, `#E3F2E9` | Pressed states, tinted surfaces |
| `--learning`, `--learning-dark`, `--learning-tint` | `#B4530A`, `#8F4207`, `#FDF3E4` | Wrong answers and "low" markers. Orange is used; red never is |
| `--new`, `--new-tint` | `#1F5FAD`, `#EAF1FA` | New cards |
| `--ai-gold`, `--ai-gold-on-dark`, `--ai-gold-bg` | `#B97A14`, `#E8B04F`, `#FBF3E2` | The AI mark and tutor suggestion boxes only |
| `--moh-red`, `--moh-gold` | `#9C0C02`, `#DD9A33` | The sign-in header only |
| `--bg`, `--surface`, `--ink`, `--text-2`, `--text-3` | `#F5F6F3`, `#FFFFFF`, `#15201C`, `#3B4541`, `#58635F` | Page, card, text levels |
| `--border`, `--border-input`, `--divider`, `--soft` | `#DCE1DD`, `#C9D0CC`, `#E6EAE7`, `#ECEFEC` | Lines and fills |
| `--chart-1` … `--chart-3` | `#D4EDDF`, `#A6DDBF`, `#5BB283` | Heat-map steps, light to dark; the darkest step is `--primary` |
| `--forget`, `--forget-on-dark` | `#F2C894`, `#F2B36B` | "Will be forgotten without review" in memory charts |
| `--r-control`, `--r-card`, `--r-pill` | 12 px, 16 px, 999 px | Corner radii |
| `--ui` | Be Vietnam Pro | Interface text |
| `--reading` | Literata | Long-form reading text |

## 4. Layout

- **Learner application.** A single column in a 390 px frame on wide screens; full width on a phone. A tab bar with five tabs (Trang chủ, Hỏi đáp, Luyện tập, Thi thử, Tiến độ) is shown on top-level screens and hidden inside flows (session, unit, examination, card review).
- **Ministry dashboard.** Outside the phone frame: a sidebar and a content column. Below 600 px the sidebar becomes a top bar and the school table becomes a list of cards.

## 5. Navigation

| Route | Screen | Mock | Tab bar |
|---|---|---|---|
| `/dang-nhap` | Sign-in by activation code | `Login` | no |
| `/dong-y` | Consent: service (required), research (optional) | – | no |
| `/chon-hoc-phan` | Chọn học phần | `Focus` | no |
| `/` | Trang chủ | `Main` | yes |
| `/phien` | Dispatcher: opens the first unfinished step, or "Xong phiên hôm nay" | – | no |
| `/phien/the` | Session step 1: thẻ ôn | `SessionCards` | no |
| `/phien/luyen` | Session step 2: luyện điểm yếu | `SessionQuiz` | no |
| `/phien/dieu-chinh` | Gia sư đang điều chỉnh | `SessionAdapting` | no |
| `/luyen-tap/:unitId?phien=1` | Session step 3: the unit with the session header | `Unit` | no |
| `/hoi-dap` | Hỏi đáp | `Chat` | yes |
| `/hoi-dap/tu-cau-hoi/:questionId` | Hỏi gia sư, opened from a quiz item | `ChatQuiz` | no |
| `/luyen-tap` | Luyện tập; `?hp=<module id>` opens that học phần | `Modules` | yes |
| `/luyen-tap/bo-the` | Bộ thẻ | `Decks` | yes |
| `/luyen-tap/on-the` | Ôn thẻ | `Cards` | no |
| `/luyen-tap/bo-cau/:setId` | Bộ câu luyện (a practice set opened by identifier) | `SessionQuiz` | no |
| `/luyen-tap/:unitId` | Unit | `Unit` | no |
| `/thi-thu` | Thi thử, with attempt history | `Exams` | yes |
| `/thi-thu/:formId/quy-dinh` | Quy định | `ExamRules` | no |
| `/thi-thu/lam-bai/:attemptId` | Làm bài | `Exam` | no |
| `/thi-thu/ket-qua/:attemptId` | Kết quả | `Results` | no |
| `/thi-thu/ket-qua/:attemptId/:questionId` | Xem lại | `AnswerReview` | no |
| `/tien-do` | Tiến độ · Năng lực | `ProgressSkills` | yes |
| `/tien-do/nhip-hoc` | Tiến độ · Nhịp học | `ProgressRhythm` | yes |
| `/quan-ly/dang-nhap` | Staff sign-in | – | – |
| `/quan-ly` | Quản lý cấp Bộ · Tổng quan toàn quốc | `AdminOverview` | – |

**Guards.** A signed-out learner is sent to `/dang-nhap`. A learner without a current service consent is sent to `/dong-y`. While `diagnostic_prompt_dismissed` is false (read once per application load from `GET /me`), the learner is sent to `/chon-hoc-phan`; leaving that screen by either button sets the flag, so the screen is shown once per learner on any device.

**Sessions.** The learner session and the staff session are stored under separate keys (`yhdp.session`, `yhdp.staff`), so both can be open in one browser.

## 6. Common interaction rules

| Rule | Specification |
|---|---|
| Load states | Every screen has three states: loading, load error with "Thử lại", and content |
| Failed action | Shown as an inline alert; the learner's input is kept |
| Idempotent submission | An idempotency key is created when an item or card is shown and is sent with its answer or rating |
| Locked choice | A choice that has been sent is not changed. When the reply is lost, the options (or the other ratings) are locked and the retry sends the same choice, because the server may already hold it |
| Resumption | A flow resumes at the first unanswered item after a reload; an answered item shows its stored feedback |
| Token refresh | One refresh at a time; a request that receives `401 token_expired` is retried once with the new token. The session ends only when the server refuses a refresh |
| Wrong answers | Marked in orange with the correct option named; never red |
| Collapsed detail | "Nguồn" and "Vì sao …?" are links, collapsed by default, that expand in place |

## 7. Screens of the learner application

### 7.1 Chọn học phần

- **Data:** `GET /modules`, `GET /me`, `PATCH /me` (`focus_module_ids`, `diagnostic_prompt_dismissed`).
- **Content:** one selectable card per học phần (short name; "N chủ đề" or "Sắp có"); multiple selection; the current focus is preselected; a count line.
- **Actions:** "Làm bài đánh giá năng lực" saves and opens the rules of the diagnostic form. "Bỏ qua, vào học ngay" saves and opens the first unfinished unit of the first selected học phần that has one, or Home. Both are disabled until one card is selected. Opened later from "Đổi học phần", the screen has one button, "Lưu".

### 7.2 Trang chủ

- **Data:** `GET /home`; `GET /session/today` when the quick-review count is zero.
- **Content:** greeting; avatar button opening a sheet with "Đổi học phần" and "Đăng xuất"; a primary tile "Ôn nhanh N câu" leading to `/phien`; the next mock examination or "Đang làm dở · Làm tiếp"; "✦ Đề xuất từ gia sư", shown only when the server sends suggestions; "Tiếp tục" with recent units and conversations.
- **Rules:** when N is 0 the primary tile states what remains of the session, or "Đã xong phiên hôm nay"; it never promises a step that does not exist. A tutor suggestion is a link; nothing is applied until the learner acts on the screen it opens (C3).

### 7.3 Phiên hôm nay

A shared header shows a close button, the title, a count label ("Thẻ 2/8", "Câu 3/6") and one segment per step the session has. "Vì sao thứ tự này?" expands the reason of each step as sent by the server (C4).

| Step | Data | Behaviour |
|---|---|---|
| 1 Thẻ ôn | `GET /cards/due`, `POST /cards/{id}/reviews`, `PATCH /cards/{id}` | Each card of the loaded queue is shown once: front, "Lật thẻ", back, four ratings with the next interval under each. The back offers "Nguồn" and "Vì sao ôn câu này?". The card menu offers "Tạm ẩn thẻ này". The closing screen reports cards done, cards recalled, cards that return today, and cards due tomorrow |
| 2 Luyện điểm yếu | `GET /session/today/practice`, `POST …/responses`, `POST …/complete` | One runner serves this step and a practice set opened by identifier. Result dots (correct, wrong, current, to come); the chip "Vì sao câu này?"; after the answer: verdict, "Giải thích của chuyên gia", the rationale of the chosen option, citation chips, "Hỏi gia sư về câu này", and a worked example when the server sends one. The panel for the next item never states "harder" or "easier" (R1.1) |
| Gia sư đang điều chỉnh | The summary returned by `complete` | Dark full screen with the AI mark. Each line is shown only when the server sent it: responses graded, competencies updated, cards created, and the next day's priority. Lines are revealed within 3 s in total; "Bỏ qua" shows all at once; with reduced motion nothing animates. Reloaded on an unfinished set, the screen returns to `/phien` and never closes the set |
| 3 Học tiếp | Unit operations | The unit screen with the session header. Finishing the unit returns to `/phien` |

### 7.4 Unit

Content items and quiz items alternate. On a quiz item, before the answer, "Gợi ý" requests a hint once per item shown and displays it with citation chips in the tutor sheet; a hint a model wrote carries "Gợi ý do AI viết". After the answer the button is replaced by "Giải thích thêm". A wrong answer inserts a worked example with its reason. The closing screen reports "Đã tạo N thẻ ôn từ câu sai" and offers "Ôn ngay".

### 7.5 Hỏi đáp

- **Data:** `POST /chat/sessions`, `POST …/messages` (SSE), `GET …/messages`, `GET /passages/{id}`, `POST /messages/{id}/rating`, `POST /chat/suggestions/{id}/accept`.
- **While a turn runs:** "Gia sư đang làm" lists the steps the server reports, each first as running and then as done. A queued turn shows its real position.

| Final state | Presentation |
|---|---|
| `answered` | The answer with a citation chip per claim; a chip "Đã tra N nguồn · kiểm tra M nhận định" that expands the stored trace; "Hữu ích" rating; "Giải thích thêm"; when the server proposes them, "Luyện N câu đã duyệt" and "Thêm vào phiên ngày mai", each of which acts only when tapped |
| `needs_clarification` | The question is asked back; the senses of the ambiguous term are offered as ready questions |
| `declined` | A notice that patient-specific advice is not given |
| `insufficient_evidence` | A notice, the list of documents and ranges searched, and the nearest chapter when one came close |

A citation chip opens the source sheet: the excerpt, the document and the page. Every source of the demonstration corpus shows the label "Tài liệu demo – chưa thẩm định".

**From a quiz item.** "Hỏi gia sư về câu này" opens a full-screen conversation about that item. Its first answer explains the option the learner chose. "Quay lại bài luyện" returns to the item.

### 7.6 Luyện tập, Bộ thẻ, Ôn thẻ

- **Luyện tập:** the list of học phần and their units with a status filter, and a "Thẻ ôn" shortcut ("N thẻ đến hạn hôm nay · K bộ thẻ", from `GET /decks`).
- **Bộ thẻ:** "Hôm nay" with the sums Mới / Đang học / Đến hạn; the button "Ôn N thẻ", absent when N is 0; one row per học phần with its three counts.
- **Ôn thẻ:** the card component of session step 1 over the whole due queue, reloaded after each rating, so that a card rated "Học lại" returns when its step is due.

The rating labels are "Học lại · Khó · Tốt · Dễ", held in one constant; the mocks disagree on them (open issue 33).

### 7.7 Thi thử

| Screen | Behaviour |
|---|---|
| Thi thử | Forms with size and duration; "Làm tiếp" while time remains on a running attempt; "Làm bài mới"; "Lịch sử làm bài" with date, time and duration. For an assembled form the card states its composition before the start |
| Quy định | Rules of the form and "Bắt đầu" |
| Làm bài | Countdown held by the server; question navigator; flag; autosave per answer; resumption after reload; a warning at `exam.warning_seconds`; automatic submission at the deadline |
| Kết quả | Score as "x/N"; "+N thẻ ôn từ câu sai"; topics whose priority rose. No prediction wording (C2) |
| Xem lại | Each question with the chosen and correct options, the expert explanation and the source |

### 7.8 Tiến độ

Both tabs share a header: "Còn N ngày đến kỳ thi" and a two-part switch.

**Năng lực** (`GET /progress/skills?scope=latest3|all`):

- coverage "x / 54 vấn đề cốt lõi đã luyện", per học phần;
- "Cần ưu tiên": up to three topics with "a/b câu đúng" and "Luyện";
- "Điểm cả đề": one bar per submitted mock, oldest first, with score and date. No line through the bars, no arrow, no pass line (C2);
- "Theo mức nhận thức": three bars.

**Nhịp học** (`GET /progress/rhythm`):

- study time this week and the previous week; days studied;
- "8 tuần gần nhất": a 7 × 8 heat map with five levels by minutes (0, 1–15, 16–45, 46–75, over 75); each cell has an accessible name;
- "Đường ghi nhớ": the retention curve of the learner's real review dates, with a dashed projection "nếu không ôn", a 90 % guide and a "hôm nay" mark;
- "Trí nhớ": recall rate over 30 days and counts Mới / Đang học / Đã thuộc;
- recall per học phần now and after 7 days without review;
- cards due in each of the next 7 days; "Ôn N thẻ hôm nay";
- this week's activity.

All charts are inline SVG and CSS. Geometry is computed by pure functions (`web/src/charts.ts`).

## 8. Ministry dashboard page

Specified in `docs/ministry-dashboard.md`, section 6.

## 9. Client structure

| Path | Content |
|---|---|
| `web/src/api.ts` | Payload types mirroring the contract |
| `web/src/session.ts`, `client.ts` | Token storage, authorised fetch, single-flight refresh, for learner and staff sessions |
| `web/src/sse.ts`, `sseRead.ts` | Reading of server-sent events |
| `web/src/flow.ts`, `adaptation.ts`, `cardPass.ts`, `chatTurn.ts`, `charts.ts`, `format.ts`, `keys.ts`, `dashboard.ts`, `dashboardCost.ts` | Pure logic without React or the DOM: route selection for the session, adaptation lines, the tally of a card pass, chat turn state, chart geometry, formats, idempotency keys, dashboard formats |
| `web/src/components/` | Shared components: `SessionHeader`, `ReviewCard`, `PracticeRunner`, `AdaptationLines`, `AiStar`, `Conversation`, `ChatTurn`, `Answer`, `Charts`, `Sheet`, `TutorSheet`, `QuizOptions`, `TabBar`, `Status` |
| `web/src/screens/` | One file per screen; `screens/admin/` for the dashboard |
| `web/e2e/` | End-to-end rehearsal scripts |

The Vite development server proxies `/api` to the backend (`VITE_API_TARGET`, default `http://127.0.0.1:8000`) and strips the prefix, so that the application and the API share one origin.

**Token storage.** The web client keeps its tokens in `localStorage`; the native application will use the platform key store. Served over plain HTTP to another device, two tabs cannot coordinate a refresh, because the Web Locks API requires a secure context.

## 10. Verification

| Check | Command (in `web/`) | Scope |
|---|---|---|
| Unit tests | `npm test` | The pure modules of section 9 |
| Type check and build | `npm run build` | `tsc -b` and the production bundle |
| Learner rehearsal | `npm run rehearse`, `npm run rehearse:live` | The real interface in headless Chrome against a running backend, from sign-in to sign-out; `:live` adds the cited answer, the follow-up and the tutor. It empties the development database first. It asserts the absence of prediction wording on the progress screens |
| Dashboard rehearsal | `npm run rehearse:dashboard` | 34 checks from staff sign-in through filters, export and a phone-sized window; resets no database |

## 11. Not implemented

| Item | Reason |
|---|---|
| Account screen | The Home avatar offers "Đổi học phần" and "Đăng xuất" only |
| "Báo lỗi" sheets | `POST /reports` is not implemented |
| Review workbench | Its operations are not implemented |
| Filters by domain, core issue and level on Luyện tập | The list payload carries no such data |
| Group × examination grid on Tiến độ · Năng lực | Open issue 20 |
| Table and calculation answers in chat | Not produced by the pipeline |
| R1.1 screens: Lịch ôn tập, Tổng quan chủ đề, Duyệt thẻ, Cài đặt ôn tập; the difficulty indicator in practice | Scheduled for R1.1 |
| Desktop layouts of the learner application | The 390 px frame is kept |

## 12. Open points

| Point | Status |
|---|---|
| Card rating labels differ between the mocks and the contract | Open issue 33 |
| "Luyện" on a priority topic opens the học phần, because the contract has no operation that builds a practice set on a topic at the learner's request | To be decided with the contract |
| Use of the AI mark on "Đề xuất từ gia sư", which is rule output in R1.0 | Open issue 23 |
| Học phần are the eight blueprint groups; the mocks show a subject-based list | Open issue 24 |
