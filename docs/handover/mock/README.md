# Mock screens

Each `*.dc.html` file is one board from the Claude Design canvas (private; page "Thiết kế hiện tại"). `canvas.json` lists every board with its title, size, position and page. PNG renders are in `../screenshots/` (same base name). Snapshot: 11/10/2026, canvas version 34.

These files are **visual and behavioural references**, not production code. Re-implement them in the app's own components; copy Vietnamese UI copy, spacing, colours and states from them.

## Reading the format

- Markup lives inside `<x-dc> … </x-dc>`; fonts and global CSS (incl. animation keyframes) inside `<helmet>`.
- `{{ name }}` is a value filled from `renderVals()` in the `<script type="text/x-dc">` block at the bottom (`class Component extends DCLogic`). That script holds the sample data and small state machines.
- `<sc-for list="{{ items }}" as="x">` repeats its children; `<sc-if value="{{ flag }}">` shows them conditionally.
- `data-props` on the script tag declares "Tweaks": enum switches for screen states. Each option is a state the real screen must support (e.g. `Chat.dc.html` → `state`, 9 options).
- `href="X.dc.html"` links show the intended navigation.
- Sample content (names, questions, numbers, page numbers, school codes) is illustrative and not medically reviewed. One learner runs through all screens: Nguyễn Thu Hà, today Saturday 10/10/2026, exam 01/03/2027.

## Files — current design

| File | Screen | Phase |
|---|---|---|
| Login | Đăng nhập (Bộ Y tế header, activation code) | R1.0 |
| Focus | Chọn học phần, diagnostic or skip | R1.0 |
| Main | Trang chủ: "Ôn nhanh N câu", next mock, "Đề xuất từ gia sư", continue | R1.0 |
| SessionCards | Phiên · bước 1: card review (build reasons collapsed, see `06-screens.md` rule 6) | R1.0 |
| SessionQuiz | Phiên · bước 2: weak-spot practice, "Vì sao câu này?", "Hỏi gia sư về câu này" | R1.0 |
| SessionAdapting | Gia sư đang điều chỉnh (≈ 3 s, CSS animation, "Phát lại hiệu ứng" is for demos only) | R1.0 |
| Unit | Phiên · bước 3 / unit: content + quiz, remediation, tutor sheet | R1.0 |
| Modules | Luyện tập: thẻ ôn shortcut, học phần list and filters | R1.0 |
| QuizAI | AI-assisted practice item | R2 |
| Practice | Freeform item with rubric grading | R1.1 |
| ProgressSkills | Tiến độ · Năng lực | R1.0 |
| ProgressRhythm | Tiến độ · Nhịp học (memory curve, recall by học phần) | R1.0 |
| Schedule | Lịch ôn tập (Tweak: R1 / R2) | R1.1 |
| Chat | Hỏi đáp, Tweak `state` with 9 states; source and conversation sheets | R1.0 (state 9: R2) |
| ChatQuiz | Hỏi gia sư opened from a quiz item | R1.0 |
| ChatPlan | Study-plan proposal from free time | R2 |
| Exams, ExamRules, Exam, Results, AnswerReview | Thi thử flow | R1.0 |
| Decks, Cards | Bộ thẻ, Ôn thẻ | R1.0 (simple) |
| DeckDetail, Browser, DeckSettings | Deck overview, browser, settings | R1.1 |
| DesktopChat | Desktop chat with source panel | R1.1 |
| Review | Bàn thẩm định (expert review item) | R1.0 |
| AdminOverview | Quản lý cấp Bộ · Tổng quan toàn quốc | R1.1 / R2 |
| AdminLearning | Quản lý cấp Bộ · Kết quả học tập | R2 |

## Files — explorations (`explorations/`)

Boards from the canvas page "Hướng thông minh" (directions A–E). Reference only; see the table at the end of `06-screens.md`.
