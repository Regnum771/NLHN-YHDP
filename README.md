# YHDP Exam Platform

Backend service and reference web client of an AI-assisted preparation platform for the Vietnamese national licensing examination in preventive medicine (Y học dự phòng, YHDP).

The platform answers questions only from vetted sources with page-level citations, serves expert-approved questions in practice and mock examinations, schedules revision by spaced repetition, and reports national aggregates to the Ministry of Health. The product specification is in `docs/handover/`.

## Status

| Item | State |
|---|---|
| Release target | R1.0 |
| API contract | `openapi.yaml`, version 1 draft; 48 of 55 operations implemented |
| Not implemented | Error reports, the expert review workbench and the administrative import (their routes answer `501`) |
| Clients | Reference web client (learner application; ministry dashboard at `/quan-ly`). The native applications are outside this repository |
| Content | Demonstration content only: 31 passages, 42 questions, 23 glossary terms. Not expert-reviewed; not taken from licensed textbooks |

## Architecture

```
web client ──HTTP/SSE──► backend (FastAPI)  ──SQL──► PostgreSQL 16
                          api → services → engine
                                   └→ repo
                          chat pipeline → model gateway ──► model provider
```

- **Layered backend.** `api` binds HTTP and checks roles; `services` own one transaction per use case; `engine` holds pure rules; `repo` holds all SQL.
- **Contract generated from code.** `openapi.yaml` is exported from the typed models; a test fails on drift.
- **Single model gateway.** `backend/app/gateway.py` is the only module that calls a model. Provider and model are configuration.
- **Deterministic before generative.** Schedules, priorities, session composition and recommendations are computed by rules; a model only phrases cited answers and tutor text.

## Product rules enforced in code

| Rule | Enforcement |
|---|---|
| Human in the loop | No code path approves content. Database triggers require two passing review decisions from different reviewers |
| Approved items only | Quizzes, practice sets, the diagnostic and mock examinations serve approved questions only; revision cards are built from approved items only |
| Cited answers | Each claim must quote a retrieved passage; a claim that fails the post-check is removed; if none survives the answer is `insufficient_evidence` |
| No clinical advice | Patient-specific questions are declined before any model call (FR-LRN-05) |
| No outcome prediction | No pass probability or predicted score in any payload or screen (FR-LRN-26) |
| Pseudonymity | Prompts and logs carry pseudonymous learner identifiers only; no learner data trains a model (NFR-15, NFR-16) |
| Small groups withheld | Dashboard figures resting on fewer than 10 learners are not returned |

## Quick start

Requires Python 3.13, Node.js 22 and Docker (or a local PostgreSQL 16).

```bash
cp .env.example .env                 # set ANTHROPIC_API_KEY for live model calls
docker compose up -d                 # PostgreSQL on port 5433

cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # macOS/Linux: .venv/bin/python
.venv/Scripts/python -m app.cli migrate
.venv/Scripts/python -m app.cli seed
.venv/Scripts/python -m uvicorn app.main:app --port 8000

cd ../web                            # in a second terminal
npm install
npm run dev                          # http://localhost:5173
```

Sign in with the activation code `DEMO-0001` (a development fixture), give the service consent, and select a học phần.

A mock server that needs neither database nor model key is available with `APP_MODE=mock`. The ministry dashboard requires the sample cohort. Both are described in `docs/development.md`.

## Verification

```bash
cd backend && .venv/Scripts/python -m pytest -q      # rules, pipeline, safety suite, API, contract (15–35 min)
cd web && npm test                                   # pure modules
cd web && npm run build                              # type check and bundle
cd web && npm run rehearse                           # end-to-end, headless Chrome, against a running backend
```

## Repository layout

```
backend/app/api/         /v1 routers
backend/app/services/    use cases, one transaction each
backend/app/engine/      pure rules: Elo, priority, cards, FSRS scheduling, session, assembly, blueprint check, dashboard
backend/app/repo/        SQL
backend/app/schemas/     contract models
backend/app/chat/        pre-gate, normalisation, retrieval, post-check, pipeline, trace
backend/app/gateway.py   model gateway and replay cache
backend/migrations/      schema revisions
backend/seed/            blueprint, demonstration content, cohort generator
backend/tests/           pytest suites
web/src/                 web client (screens, components, pure modules)
web/e2e/                 rehearsal scripts
openapi.yaml             API contract (generated)
docs/                    documentation
```

## Documentation

| Document | Content |
|---|---|
| `docs/architecture.md` | System architecture, component rules, chat pipeline, learning engine, design decisions, known limitations |
| `docs/data-model.md` | Database design: tables, keys, integrity rules, schema revisions |
| `docs/web-client.md` | User-interface and interaction design of the web client |
| `docs/ministry-dashboard.md` | Dashboard figures, privacy rules, export, sample cohort |
| `docs/development.md` | Installation, execution, commands, mock server, verification |
| `docs/handover/` | Product specification: scope, requirements, target architecture, algorithms, screens, acceptance, open issues |
| `docs/reference/core_issues.md` | Transcription of the examination blueprint (54 core issues) |
| `CLAUDE.md`, `docs/handover/AGENTS.md` | Instructions and non-negotiable rules for coding agents |

## Limitations

The principal limitations at this revision are keyword-only retrieval, a lexical first-tier post-check, a pattern-based pre-gate, demonstration content that covers three topics, and the absence of monitoring and backups. The full list is in `docs/architecture.md`, section 17. Undecided product questions are tracked in `docs/handover/09-open-issues.md`; values that depend on them are configuration, not code.
