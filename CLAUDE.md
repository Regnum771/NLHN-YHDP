# YHDP Exam Platform

AI-assisted exam-prep platform for the national licensing exam in preventive medicine (YHDP). R1.0 = native iOS/Android app on the stores by 31/12/2026 plus a web review workbench for experts.

The specification, design handover and mock screens live in `docs/handover/`. Start with `docs/handover/README.md`; what changed in the last sync is in `docs/handover/CHANGELOG.md`. File names mentioned in the rules below are relative to `docs/handover/`.

@docs/handover/AGENTS.md

## Where to look

| Need | File |
|---|---|
| What ships when (R1.0 / R1.1 / R2), milestones, owners | `docs/handover/01-scope-and-plan.md` |
| Requirement IDs (cite them in commits, PRs, tests) | `docs/handover/02-requirements.md` |
| Architecture, data flow, data model | `docs/handover/03-architecture-and-data-flow.md` |
| Chat pipeline, tools, chat UX contract | `docs/handover/04-agentic-core.md` |
| Elo, FSRS, priority, daily session, memory display | `docs/handover/05-algorithms.md` |
| Screens, states, tokens, UI rules | `docs/handover/06-screens.md` + `docs/handover/mock/` + `docs/handover/screenshots/` |
| API draft (until `openapi.yaml` exists) | `docs/handover/07-api-draft.md` |
| Acceptance checks and tests | `docs/handover/08-quality-and-acceptance.md` |
| Open decisions: do not hard-code around them | `docs/handover/09-open-issues.md` |
| What is built: structure, rules, design decisions, limits | `docs/architecture.md` |
| The database as migrated | `docs/data-model.md` |
| The web client as built | `docs/web-client.md` |
| The ministry dashboard and the sample cohort | `docs/ministry-dashboard.md` |
| Setup, commands, mock server, tests | `docs/development.md` |

When a mock and a doc disagree, follow the precedence in `AGENTS.md`; if it does not settle it, add the conflict to `09-open-issues.md` instead of choosing.
