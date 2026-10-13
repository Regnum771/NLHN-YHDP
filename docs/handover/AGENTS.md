# Instructions for coding agents

## Precedence

1. `01-scope-and-plan.md` decides **what ships when**. Where it moves an "R1" requirement to R1.1, it overrides the release column in `02-requirements.md`.
2. `04-agentic-core.md` overrides the spec's "controlled conversation" constraint for R1 (no finite-state conversation manager in R1; see that file).
3. `02-requirements.md` is the requirement baseline (IDs are stable; cite them in commits, PRs and tests).
4. `06-screens.md` + `mock/` + `screenshots/` define layout, copy and states. Mock HTML is a **visual reference, not production code**. `mock/explorations/` is reference only, used where `06-screens.md` points to it.
5. `07-api-draft.md` is a draft; the frozen contract will be `openapi.yaml` in the repo once agreed.

If two sources conflict and the precedence above does not settle it, stop and raise it in `09-open-issues.md` instead of choosing.

## Non-negotiable rules (product safety)

- **Human in the loop.** Code must never move a question, explanation or learning-content item into an "approved" state. Only an expert action in the review workbench does that. AI output always lands as `draft` (status list in `03-architecture-and-data-flow.md`).
- **Only approved questions** in quizzes, the diagnostic and mock exams. Revision cards are built only from approved items.
- **Every factual answer carries page-level citations.** If the post-check cannot support a claim, drop the claim; if nothing survives, return `insufficient_evidence`. Never guess.
- **Decline patient-specific clinical advice** (FR-LRN-05) before any model call.
- **No exam-outcome prediction** anywhere: no pass probability, predicted score or anything implying it (FR-LRN-26).
- **No learner data trains any model.** No fine-tuning of generative models. Never send personal identifiers to an external model API (NFR-15, NFR-16). Use pseudonymous learner IDs in prompts and logs.
- **All model calls go through the model gateway** (one module). No direct SDK calls elsewhere. Switching provider or to a local model is configuration only.
- **Design to the capability floor.** Prompts, tool schemas and limits must work on a 7–8B local model, even though R1 uses a cloud API.
- **Deterministic before generative.** Exact facts (schedules, thresholds, indicators) come from database tables; the model only phrases them.
- **Show only real work.** Chat work traces, the adaptation screen, "Đề xuất từ gia sư" and "Đã cập nhật ôn tập" display real events from this request or attempt. No simulated steps, counts or delays.
- **Suggestions never write silently.** Any action proposed to the learner (practise, add to tomorrow, apply a plan) runs only after a tap; cards come only from approved items, never from chat text.
- **Licensed content.** Show excerpts only (length limit pending, see `09-open-issues.md`); no full-text download.

## Conventions

- UI copy is **Vietnamese** (take it from the mock). Colours and tokens: `06-screens.md` (Bộ Y tế green `#1E7A4F`; red `#9C0C02` only on login; gold only for the AI star; orange, never red, for wrong answers). Code, identifiers, comments and API fields in English.
- Mobile-first: design base 360–390 px wide; touch targets ≥ 44 × 44 px; nothing depends on hover.
- Dates shown as `dd/mm/yyyy`; Vietnamese number format (comma decimal) in learner-facing text.
- One PostgreSQL database with pgvector holds everything (knowledge base, glossary, question bank, competency framework, learner records).
- Every logged chat answer records model version, prompt version and corpus version (FR-ADM-14, FR-CNT-08).
- Question and content edits create a new version; nothing is hard-deleted (status `retired`).
- Accessibility: real buttons/links/inputs with labels; icon-only buttons have an accessible name; text contrast ≥ 4.5:1.

## Definition of done for a feature

- Requirement IDs referenced; acceptance criteria in `08-quality-and-acceptance.md` met where applicable.
- Unit tests for rules (Elo, FSRS, priority, exam assembly, post-check tier 1).
- Matches the mock screen and its states (see the "States / Tweaks" column in `06-screens.md`).
- No rule in "Non-negotiable rules" broken; logging fields present.
