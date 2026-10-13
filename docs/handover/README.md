# YHDP Exam Platform — Handover spec for coding agents

AI-assisted platform that helps final-year preventive-medicine (YHDP) students and recent graduates prepare for the national licensing exam run by HĐYKQG. It answers questions only from vetted textbooks with page citations, lets learners practise on expert-approved questions, sit mock exams, and review with spaced repetition.

This folder is the single handover package. Read `AGENTS.md` first, then the numbered files in order. `CHANGELOG.md` lists what changed in each sync. In a Claude Code repo, the root `CLAUDE.md` loads `AGENTS.md` automatically.

## What to build first

**R1.0** — native mobile app (iOS + Android) on the App Store and Google Play by the end of December 2026, plus a web review workbench for experts. Scope, milestones and owners: `01-scope-and-plan.md`.

## Contents

| File | What it holds |
|---|---|
| `AGENTS.md` | Non-negotiable rules, precedence between documents, conventions |
| `CHANGELOG.md` | What changed since the previous package |
| `01-scope-and-plan.md` | R1.0 / R1.1 / R2 scope, milestones, team, work breakdown |
| `02-requirements.md` | All functional and non-functional requirements (FR-LRN, FR-CNT, FR-ADM, NFR), with the phase each R1 item lands in |
| `03-architecture-and-data-flow.md` | System context, components, data-flow diagram (processes P1–P6, stores D1–D4), data groups, proposed data model |
| `04-agentic-core.md` | Chatbot (RAG + tools + two-tier post-check), model gateway, tutor, learning engine boundaries |
| `05-algorithms.md` | Elo (learner θ, item b), FSRS scheduling, mastery and priority, exam assembly, CTT item statistics, Bloom |
| `06-screens.md` | Navigation model, site maps, screen inventory mapped to mock files and screenshots, design tokens, UI rules |
| `07-api-draft.md` | Proposed REST/SSE endpoints per screen (draft; to be frozen as OpenAPI v1 by 31/10) |
| `08-quality-and-acceptance.md` | Acceptance metrics, evaluation sets, test expectations |
| `09-open-issues.md` | Decisions still pending; do not hard-code around them |
| `diagrams/` | PNG exports of the spec diagrams |
| `screenshots/` | PNG renders of every current mock (phone 390 px wide @2x, desktop 1440 px @2x); `chat-states/` one PNG per chat state; `explorations/` the "Hướng thông minh" boards |
| `mock/` | Source of every current mock (`*.dc.html`), `explorations/`, and the canvas index; see `mock/README.md` |

## Live sources (private; ask the project owner for access)

- Mock UI canvas (Claude Design)
- Requirements specification (doc, tabs "Requirements" and "Screen map")
- Stakeholder analysis
- Kickoff deck

This package is a snapshot taken on 11/10/2026 (canvas version 34). If a live source and this package disagree, the newer decision wins; flag the conflict rather than guessing.

## Glossary

| Term | Meaning |
|---|---|
| YHDP | Y học dự phòng — preventive medicine |
| HĐYKQG | Hội đồng Y khoa Quốc gia — national medical council that runs the licensing exam and its blueprint |
| Học phần | Study module; split into short topic units that interleave content and quiz items |
| 54 core issues | HĐYKQG's list of 54 "vấn đề cốt lõi" the exam covers |
| Blueprint / ma trận đề | Exam matrix: weights per core issue and cognitive level |
| Bài đánh giá năng lực | Diagnostic quiz (optional at onboarding) |
| Thi thử | Mock exam |
| Thẻ ôn | Revision card (spaced repetition) |
| Bàn thẩm định | Expert review workbench |
| CV x.y | Work package number in the approved project proposal (thuyết minh BM-02 v5.9) |
| R1.0 / R1.1 / R2 | Store release 12/2026 / follow-up before the March 2027 exam / full platform 2027–2028 |
| θ, b | Learner ability per topic, item difficulty (Elo) |
