# System architecture and design decisions

| | |
|---|---|
| Subject | YHDP Exam Platform, release R1.0: backend service and reference web client |
| Audience | Engineers and technical reviewers |
| Normative sources | `docs/handover/` (product specification), `openapi.yaml` (API contract) |
| Related documents | `docs/data-model.md`, `docs/web-client.md`, `docs/ministry-dashboard.md`, `docs/development.md` |

File names of the form `01`–`09` refer to the numbered files in `docs/handover/`. Requirement identifiers (FR-…, NFR-…) are defined in `docs/handover/02-requirements.md`.

## 1. Scope

This document specifies the structure of the implemented system, the rules each component enforces, and the design decisions behind them. It describes the system as built. Product intent, release planning and screen designs are specified in `docs/handover/` and are not repeated here.

The repository contains:

- a backend service that implements the R1.0 API contract on one PostgreSQL database;
- a reference web client that exercises every learner operation the backend implements, and a read-only ministry dashboard;
- seed data, a synthetic cohort generator, and the test suites.

The native iOS and Android applications are outside this repository. They consume the same contract.

## 2. System context

```
 learner (web client, native app)      reviewer / admin / ministry viewer (web)
              │                                        │
              └──────────── HTTPS, JSON and SSE ───────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │  Backend service (/v1)    │
                     │  api → services → engine  │
                     │               └→ repo     │
                     │  chat pipeline → gateway ─┼──► model provider (external API)
                     └─────────────┬─────────────┘
                                   │ SQL
                     ┌─────────────▼─────────────┐
                     │  PostgreSQL 16            │
                     │  knowledge base, question │
                     │  bank, blueprint, learner │
                     │  records, logs            │
                     └───────────────────────────┘
```

One database holds all persistent state. One module (`backend/app/gateway.py`) performs all model calls. No other component communicates with an external system.

## 3. Technology

| Layer | Technology | Notes |
|---|---|---|
| Backend | Python 3.13, FastAPI, Pydantic 2 | Synchronous handlers |
| Database access | psycopg 3, connection pool, hand-written SQL | No ORM |
| Schema management | Alembic, forward-only revisions written in SQL | `backend/migrations/versions/` |
| Database | PostgreSQL 16 (`pgvector/pgvector:pg16` image) | Full-text search by `tsvector`; no vector column at this revision |
| Model access | Anthropic SDK behind the gateway | Model identifiers are configuration |
| Scheduling of revision cards | `fsrs` library | Interval capped at the exam date |
| Staff passwords | Argon2 (`argon2-cffi`) | |
| Spreadsheet export | `openpyxl` | Ministry dashboard only |
| Web client | TypeScript 6, React 19, React Router 7, Vite 8 | No state library, no chart library |
| Tests | pytest; Node test runner; Playwright driving Chrome | Section 15 |

## 4. Backend structure

```
backend/
  config.yaml          all tunable values
  config/pregate.yaml  versioned patterns of the clinical-advice pre-gate
  migrations/          schema revisions 0001–0012
  app/
    schemas/           typed request and response models; the contract is generated from them
    api/               one router per domain; HTTP, authentication, role checks
    services/          one function per use case; owns the transaction
    engine/            pure rules; no database access
    repo/              all SQL
    chat/              pre-gate, normalisation, retrieval, post-check, pipeline, trace, model slots
    prompts/           versioned prompt texts
    gateway.py         the only module that calls a model
    events.py          activity-log writer
    cli.py             administrative commands
  seed/                blueprint, demonstration content, loaders, cohort generator
  tests/
```

### 4.1 Layer rule

| Layer | Responsibility | Prohibited |
|---|---|---|
| `api` | HTTP binding, authentication, role check, request and response shapes | SQL, business rules |
| `services` | One use case in one transaction; calls `engine` and `repo` | HTTP concerns |
| `engine` | Functions from plain data to plain data | Opening a connection, reading the clock |
| `repo` | SQL statements | Business rules |

Services receive the database connection and the current time as parameters. This makes every rule testable without a database and allows the cohort generator to replay history with a backdated clock (`docs/ministry-dashboard.md`, section 7).

### 4.2 Execution modes

| Variable | Values | Effect |
|---|---|---|
| `APP_ENV` | `dev`, `test`, `production` | `seed`, `reset-dev` and the cohort generator run only when the value is explicitly `dev` or `test`. An unset value is not treated as a development environment |
| `APP_MODE` | `real`, `mock` | In `mock` mode every route returns the example of its response model, and no database or model key is required |

At start-up in `real` mode the service refuses to run when the database is unreachable or when schema revisions are pending; the message names the command to execute.

## 5. API contract

### 5.1 Generation and drift control

The contract is `openapi.yaml` at the repository root. It is generated from the models in `backend/app/schemas/` and the routes in `backend/app/api/` by `python -m app.cli export-openapi`, and it is committed. It is never edited by hand. The test suite fails when:

- the generated schema differs from the committed file;
- an example does not validate against its own model;
- a route declares neither its accepted roles nor `public`.

### 5.2 Conventions

- All routes are under `/v1`.
- Errors: `{"error": {"code", "message_vi", "details"}}`.
- Collections: an object with `items`, and `next_cursor` when paginated (`?cursor=&limit=`).
- Response objects are open; request bodies are closed; every field the server sends is marked required. Fields can therefore be added without breaking generated clients.
- `Idempotency-Key` is honoured on unit responses, practice-set responses, exam answers and card reviews. A repeated key returns the stored response and performs no second write.
- Server-sent events: the chat and explanation streams emit `status`, `step`, `answer` and `final`. Each event is a model in the contract; the endpoint description states the order (section 9.2).

### 5.3 Implementation status

The contract defines 55 operations. 48 are implemented. The remaining seven answer `501 not_implemented` in `real` mode: `POST /reports`, the four review-workbench operations under `/review`, and the two administrative import operations under `/admin/users/import`. The authoritative list is `backend/tests/contract/operations.py`.

### 5.4 Mock server

The mock server is the same application started with `APP_MODE=mock`. Request bodies are validated; path identifiers are ignored. The chat and explanation streams replay a scripted event sequence selected by the header `X-Mock-State` (`answered`, `insufficient_evidence`, `declined`, `needs_clarification`, `queued`). A generic OpenAPI mock (Prism) was rejected because it cannot emit a stepwise SSE stream, and chat is the operation a client most needs to exercise.

### 5.5 Deviations from the draft API (`07`)

| Deviation | Reason |
|---|---|
| `POST /auth/staff/login`, `POST /auth/logout` added | The draft has no staff sign-in; sign-out must revoke tokens |
| `POST /units/{id}/advance` added | Moves past a content item |
| `GET /practice-sets/{id}`, `POST …/responses`, `POST …/complete` added | One mechanism serves the session's practice step, an accepted chat suggestion and "Làm câu tương tự" |
| `POST /admin/users/import/{batch_id}/confirm` added | Preview and confirmation are separate actions |
| `/review/queue` accepts `type`; review operations accept learning-content items | `03` routes AI-drafted content through the same review path |
| `/modules` filters by `group`, not `domain` | A học phần is a blueprint group (`docs/data-model.md`, section 3.2) |
| Practice feedback carries `rationales` (one per option) | Same shape as unit feedback |
| `POST /cards/{id}/reviews` returns the next due time and the remaining count | Interval previews are delivered with each card by `/cards/due` |
| `exam_form.kind` includes `demo_short` and `assembled` | `demo_short` is temporary: the demonstration form is too small to satisfy the blueprint ranges. `assembled` is the per-learner form of section 7.6 |
| `GET /admin/dashboard/overview` has no `release` parameter | No record states which release produced an event |
| `GET /admin/dashboard/export` accepts `format=xlsx` only | No PDF report is produced |

## 6. Authentication, authorisation and privacy

### 6.1 Sign-in and tokens

- **Learner.** `POST /auth/activate {code, device}` returns an access token (30 min) and a rotating refresh token (30 days). The first use of an activation code creates the learner; later uses sign the same learner in on another device.
- **Staff.** `POST /auth/staff/login {email, password}`. Accounts are created by `python -m app.cli create-staff`.
- **Token format.** Opaque random strings, stored as hashes in `auth_token`. Revocation is immediate and no signing key exists. A refresh token presented twice revokes its token family: that device is signed out, other devices are unaffected.
- **Rate limit.** Failed sign-ins are counted per socket peer address (`auth.max_failures` within `auth.failure_window_minutes`; default 5 in 15 min). Beyond the limit the address receives `429` for the remainder of the window. Behind a reverse proxy the service must be started with `--forwarded-allow-ips <proxy address>`; the wildcard value must not be used.

### 6.2 Roles

| Routers | Accepted roles |
|---|---|
| home, session, modules, units, practice, chat, exams, cards, progress, reports, account | `learner` |
| review | `reviewer`, `admin` |
| admin (import) | `admin` |
| admin (dashboard) | `ministry_viewer`, `admin` |

### 6.3 Consent gate

Until a learner holds a current `service` consent, every learner route except the authentication, consent and `/me` routes answers `403 consent_required`. The `research` consent is optional, is withdrawable independently, and gates nothing in the learner application. It restricts which learners contribute to outcome figures on the ministry dashboard.

### 6.4 Pseudonymity (NFR-15, NFR-16)

`learner.pseudonym_id` is the only learner identifier in prompts, chat logs, activity events, error reports and the gateway log. Name and contact data are held in `learner_identity`. The safety suite scans every prompt passed to the gateway for names and activation codes. No learner data is used to train or fine-tune a model.

### 6.5 Account deletion

`DELETE /me` records a `deletion_request`, revokes all tokens and erases the `learner_identity` row in one transaction. The treatment of learning records is `account_deletion.learning_records`: `erase` (default) or `keep_pseudonymous`. In `erase` mode rows keyed by `learner_id` are removed by cascade and rows keyed by pseudonym are removed by the deletion service. `activity_event` is append-only and is retained; after erasure its pseudonym resolves to no person. Retention periods are undecided (open issue 13).

## 7. Learning engine

All numeric parameters are in `backend/config.yaml`. The algorithms are specified in `05`; this section states what is implemented.

### 7.1 Single response path

Every answer, from a unit, a practice set, the diagnostic or a mock exam, is recorded by one service. In one transaction it writes the `item_response`, updates learner ability θ and item difficulty b (Elo), applies the card rule, recomputes topic priority and writes the activity event.

### 7.2 Rules

| Rule | Module | Summary |
|---|---|---|
| Ability and difficulty | `engine/elo.py` | Elo update of θ per competency code and b per question version; a new question version restarts b from its difficulty label |
| Topic priority | `engine/priority.py` | Topics of the learner's focus học phần rank first; within each group the order is by blueprint weight × (1 − mastery), descending. A topic with fewer than `mastery.min_responses` responses is unassessed and takes `priority.neutral_mastery` |
| Revision cards | `engine/cards.py`, `engine/scheduler.py` | A card is created by rule from a wrong answer, at most one per learner and question, and only from an approved item. FSRS schedules it; no card falls due after the exam date |
| Practice set | `services/practice.py` | A fixed list of approved questions on one competency; the version of each question is recorded when the set is built |
| Daily session | `engine/session.py` | Section 7.3 |
| Adaptation summary | `engine/adaptation.py` | Section 7.4 |
| Memory display | `engine/memory.py` | Recall is the mean FSRS retrievability over reviewed cards; cards never reviewed are excluded |
| Exam assembly | `engine/assembly.py` | Section 7.6 |
| Blueprint check | `engine/blueprint.py` | Section 7.5 |
| Hint leak check | `engine/hint.py` | Section 7.7 |

### 7.3 Daily session

The session is built on the first read of the learner's local day (`local_timezone`) and stored, so that its practice set and stated reasons do not change during the day. It has at most three steps:

1. **Cards:** cards due when the session is built, overdue first, up to the daily review limit.
2. **Practice:** `session.practice_items` approved questions on the competency with the most wrong answers in the last `wrong_window_days`, excluding questions seen in the last `seen_window_days`. Ties are broken by topic weight. A topic the learner added from chat for that day replaces the selection.
3. **Continue:** the unfinished unit of the highest-priority học phần.

A step with no input is omitted. When fewer eligible questions exist than requested, the real count is served. Each step carries a reason in Vietnamese, produced from a template filled with the rule's inputs; it is never model output. Read operations build the session; write operations never do.

### 7.4 Adaptation summary

On completion of a practice set the engine compares stored state before and after the set and returns up to four lines: responses graded, competencies whose θ changed, cards created, and whether the topic of the next day's practice step changed. A line whose result is zero or false is omitted. The stored summary is the only source of the "Gia sư đang điều chỉnh" screen; the client adds no line and no simulated delay.

### 7.5 Examinations

- The deadline is held by the server. Questions and options are shuffled per attempt. Autosave is idempotent; an attempt past its deadline is submitted before any further request on it is answered.
- An attempt fixes the version of each question when it starts (`exam_attempt.question_versions`). A question retired or edited during the attempt is scored and shown in that version.
- **Blueprint check.** For a form the check reports the share of questions per core-issue group and per examination competency against the blueprint ranges, and the cognitive bands. For a form of kind `mock` the seed fails when any share is outside its range, when any item is of band 1, or when any item lacks a core issue or competency component. Forms of kind `diagnostic` and `demo_short` are reported but not gated.

### 7.6 Assembled examination ("Đề tự ráp")

Enabled by `exam.assembled_enabled`; the handover plan assigns automatic assembly to R1.1. The rule is deterministic for a given history.

1. Each approved question is classified by the learner's latest answer to it: *new*, *wrong* or *review*.
2. The target mix is `assembly.mix` (default 50 % new, 30 % wrong, 20 % review). A class with too few questions yields its share to the others.
3. Each topic's share is blueprint weight × (1 − mastery) × a completed-content factor (`assembly.unstudied_factor` for a topic whose unit the learner has not finished).
4. New questions are chosen closest to a probability `assembly.target_p` of a correct answer under Elo; wrong and review questions are chosen by longest time since last seen.
5. When the topic split and the mix cannot both be met, the topic split takes precedence.

Blueprint tolerance, difficulty spread and Bloom constraints of the full R1.1 design are not implemented.

### 7.7 Tutor

- **Explanation** (`POST /items/{id}/explain`): one model call grounded in the source passages of the item. The expert explanation is shown before any model text.
- **Hint** (`POST /items/{id}/hint`): available only before the learner answers and never during an examination. Code replaces a model hint with a templated pointer to the source when the hint names an option, contains the text of the correct option (or of every other option), or states a number the question does not state. The response field `generated` distinguishes a model-written hint from the pointer.

## 8. Content lifecycle and human in the loop

Statuses: `draft → prescreen → in_review_r1 → in_review_r2 → approved`, with `needs_revision`, `rejected` and `retired`. Questions and learning-content items share the lifecycle.

- No code path sets `approved`. The database enforces this (`docs/data-model.md`, section 5): approval is reached only from `in_review_r2`, and only when the latest decisions of round 1 and round 2 are both `pass` and come from different reviewers.
- Only approved questions are served by quizzes, practice sets, the diagnostic and examinations. Revision cards are built only from approved items.
- An approved item is immutable. An edit creates a new version. Nothing is hard-deleted.
- Model output always enters as `draft`.
- The demonstration content is approved by the seed through recorded review decisions of two demonstration reviewer accounts, with the comment "Dữ liệu demo – chưa thẩm định". The review-workbench operations are not yet implemented (section 5.3).

## 9. Chat pipeline

### 9.1 Stages

| # | Stage | Module | Behaviour |
|---|---|---|---|
| 1 | Pre-gate | `chat/pregate.py` | Declines patient-specific clinical advice (FR-LRN-05) by pattern, before any model call |
| 2 | Normalisation | `chat/normalise.py` | Case and diacritic folding; expansion of glossary synonyms and abbreviations (FR-LRN-01) |
| 3 | Clarification | `chat/clarify.py` | A query containing a glossary term flagged `ambiguous` is answered with its senses as ready questions; no retrieval and no model call occur |
| 4 | Retrieval | `chat/retrieval.py` | PostgreSQL full-text search selects candidate passages. They are ordered, and judged sufficient or not, by IDF-weighted coverage: the share of the question's content terms and glossary concepts the passage contains (`retrieval.top_k`, `min_score`, `heading_boost`) |
| 5 | Generation | `chat/pipeline.py` | One model call through the gateway; the model returns claims, each with passage references and a quotation |
| 6 | Post-check, tier 1 | `chat/postcheck.py` | Deterministic: each claim must cite retrieved passages, quote at least three words found in each cited passage, and use only numbers found in them. A failing claim is removed |
| 7 | Post-check, tier 2 | `chat/pipeline.py` | A second model call judges whether each quotation supports its claim. Disabled by default (`postcheck.tier2_enabled`) |

The answer text is released to the client only after the post-check. If no claim survives, the result is `insufficient_evidence`. A code filter removes any statement that predicts an examination outcome (FR-LRN-26).

### 9.2 Result states and events

Final states: `answered`, `insufficient_evidence`, `declined`, `needs_clarification`.

Event order: `status: queued` (only when the request waited) → `step` events → `status: answering` → `status: checking_sources` → the `check` step → `answer` → `final`. A step is sent once as `running` and once as `done`, with the same identifier.

### 9.3 Work trace

`chat/trace.py` emits a step only for a stage that executed: `lookup_glossary`, `search`, `read`, `get_item`, `check`. Labels are templates filled with real values. At most `chat.max_steps` steps are sent. The list is stored in `chat_message.trace`, and a test asserts that every stored step corresponds to a stage that ran. The summary reports the distinct passages cited, the claims checked and the claims removed.

### 9.4 Suggestions

After an answer, a rule proposes practice when the cited passages belong to a competency the learner answered wrongly within `suggestions.window_days`. The model never receives the learner's record. A suggestion is stored as a proposal and writes nothing else. `POST /chat/suggestions/{id}/accept` creates the practice set or the addition to the next day's session. One topic per day can be added from chat (`409 tomorrow_taken` otherwise).

### 9.5 Chat opened from a quiz item

A session created with `question_id` requires the learner's answer to that item and is refused while the item is part of a running examination. The first answer uses the tutor prompt, addresses the option the learner chose, and is grounded in the source passages of the item. Later turns use the standard pipeline.

### 9.6 Concurrency

`gateway.max_concurrent` model calls run at once (default 4). A further turn waits and is told its real position. It ends with a "system busy" notice after `gateway.queue_timeout_s`, or immediately when `gateway.max_waiting` turns already wait. A chat or tutor turn holds a database connection only while it reads or writes, never while it waits or while the model answers. The queue is local to one server process.

### 9.7 Logging (FR-ADM-14, FR-CNT-08)

Every chat and tutor turn records the model version, prompt version and corpus version, latency, token counts and cost, under the pseudonymous identifier.

## 10. Model gateway

- `backend/app/gateway.py` is the only module that imports a model SDK. The task-to-model mapping, reasoning effort, time-out, retry count and list prices are under `gateway` in `config.yaml`. Changing provider or model is a configuration change.
- Prompts, tool schemas and limits are written for the capability floor of a local 7–8 B parameter model, although R1.0 uses a hosted API.
- **Replay cache.** Replies are stored under `.replay/`, keyed by model, prompt version and exact prompt. `DEMO_REPLAY` selects the behaviour: `0` always calls the model; `1` serves the cached reply when a call fails; `prefer` serves the cached reply when one exists.
- **Failure behaviour.** On time-out or provider error, and after one retry on invalid JSON, the turn ends as `insufficient_evidence` with a connection notice. A partial answer is never shown.
- Tests use a scripted gateway and never call a provider.

## 11. Deterministic before generative

Facts that must be exact (schedules, thresholds, counts, reasons for a recommendation) are read from database tables or computed by rules; a model only phrases text where a model is used at all. In R1.0 the session reasons, the "Đề xuất từ gia sư" list on Home, the adaptation summary, the suggestions and the dashboard alerts are all rule output.

## 12. Ministry dashboard

Specified in `docs/ministry-dashboard.md`. Each request computes its aggregates from the operational tables with the filters applied; there are no snapshot tables and no scheduled jobs.

## 13. Error handling

| Situation | Behaviour |
|---|---|
| Model time-out or provider error | Replay cache per `DEMO_REPLAY`; otherwise `insufficient_evidence` with a notice |
| Model returns invalid JSON | One retry with the same prompt, then `insufficient_evidence` |
| Hint fails the leak check | Templated pointer to the source section |
| Request on a submitted attempt | `409 attempt_closed` |
| Request on an attempt past its deadline | Automatic submission, then the answer |
| No current service consent | `403 consent_required` |
| Role not accepted by the route | `403 forbidden` |
| Missing, expired or revoked token | `401 unauthenticated` or `401 token_expired` |
| Repeated `Idempotency-Key` | The stored response; no second write |
| Excess failed sign-ins | `429 rate_limited` |
| Invalid request body | `422` with `message_vi` and field details |
| Unknown identifier | `404` with `message_vi` |
| Operation not implemented, `real` mode | `501 not_implemented` |
| Database unreachable or revisions pending | The service does not start |

## 14. Configuration

| Source | Content |
|---|---|
| `.env` | `APP_ENV`, `DATABASE_URL`, `DATABASE_URL_TEST` (must differ from `DATABASE_URL`), `ANTHROPIC_API_KEY`, `DEMO_REPLAY` |
| `backend/config.yaml` | Every tunable value, grouped by concern: `auth`, `consent`, `account_deletion`, `activity`, `elo`, `mastery`, `priority`, `fsrs`, `gateway`, `retrieval`, `postcheck`, `chat`, `suggestions`, `exam`, `memory`, `session`, `assembly`, `dashboard` |
| `backend/config/pregate.yaml` | Versioned patterns of the pre-gate |

A value that depends on an undecided question carries a comment `TODO open issue N` referring to `09`. Such values must not be hard-coded elsewhere.

## 15. Verification

| Suite | Scope |
|---|---|
| Rules (pure) | Elo, mastery threshold, priority, card rule, FSRS cap, examination deadline, assembly, blueprint check, session builder, adaptation builder, memory display, suggestion rule, trace builder, hint leak check, post-check tier 1, pre-gate, dashboard suppression |
| Contract | Drift, example validity, role declaration, mock mode answers every route |
| API integration | Per domain on a separate test database with the scripted gateway, including SSE event order per final state and idempotent retries |
| Safety | Patient-specific prompts are declined; out-of-corpus prompts end as `insufficient_evidence`; no prediction wording in any learner payload or contract example; no name or activation code in any prompt; every served question is approved; the approval trigger rejects an approval without two passing decisions from different reviewers; a suggestion writes nothing before acceptance |
| Cohort | A small generator run; no real learner is served a synthetic question |
| Web client | Type check, lint, build; unit tests of the pure modules; two end-to-end rehearsal scripts against a running backend |

Commands are listed in `docs/development.md`.

## 16. Design decisions

| # | Decision | Rationale | Alternative rejected |
|---|---|---|---|
| D1 | Typed models first; the contract is exported from the code | The code cannot drift from the contract; examples are validated | Hand-maintained OpenAPI file |
| D2 | Hand-written SQL in one layer, no ORM | Aggregates, triggers and partial indexes are central to the design; SQL is reviewable as written | ORM models |
| D3 | Opaque, hashed, rotating tokens | Immediate revocation on sign-out and account deletion; no key management; lookup cost is negligible at this scale | Signed self-contained tokens |
| D4 | The mock server is the application in mock mode | One code base; SSE states can be scripted | Prism over the YAML file |
| D5 | Approval is enforced by database triggers as well as by services | The human-in-the-loop rule holds against any code path, including scripts and the seed | Service-level check only |
| D6 | One append-only activity log | One source for weekly activity, retention, study time, the research export and the Home list | A table per consumer |
| D7 | The clock is a parameter of every service | Deterministic tests; history can be generated through production code | Reading the system clock in services |
| D8 | Dashboard aggregates are computed per request | Any filter combination works; no staleness; adequate at about 5 000 learners | Snapshot tables and scheduled roll-ups |
| D9 | Suggestions and session reasons are rule output | Exact, explainable, and free of model cost; the learner's record is never sent to a model | Model-generated recommendations |
| D10 | A học phần is one of the eight blueprint groups | The blueprint is the only authoritative topic structure available | The subject-based list of the mock screens (open issue 24) |
| D11 | The competency tree mirrors the blueprint and is marked provisional | The official tree (QĐ 2755/QĐ-BYT) is not yet available; the same loader will replace it | Inventing a tree |
| D12 | Model calls are bounded by a slot queue, with no connection held during a call | A pool of ten connections must not be exhausted by slow model calls | One connection per streaming request |
| D13 | Keyword retrieval and a lexical post-check in R1.0 | Deterministic and inspectable; sufficient for the demonstration corpus | Dense retrieval and reranking (planned) |

## 17. Known limitations

- **Pre-gate.** A pattern list. It declines the phrasings in its test suite, not every phrasing. A clinical vignette written as an examination question is deliberately not declined.
- **Retrieval.** Keyword only; no dense vectors and no reranker. An out-of-corpus question that shares vocabulary with the corpus reaches the model.
- **Post-check tier 1.** It proves that a quotation exists in the cited passage, not that the quotation supports the claim. That judgement is tier 2, which is disabled by default.
- **No model tool loop.** The trace lists the stages code executed. Table and calculation answers are not produced (`format` is always `text`).
- **Content.** 31 passages, 42 questions and 23 glossary terms, written for demonstration from general textbook knowledge and public Ministry of Health sources. No text is taken from licensed textbooks and none has been expert-reviewed. The content covers core issues 1 and 4 and a foundation topic only. Every source is labelled "Tài liệu demo – chưa thẩm định".
- **Option order.** In the seed file the correct option is listed first for most questions. Examinations and practice sets shuffle options; unit quizzes show the authored order.
- **Practice sets** are fixed when built; item-by-item difficulty adaptation is R1.1.
- **Daily caps** set by the learner are not yet applied to the review queue.
- **Queue scope.** The model slot queue is per process. The tutor hint does not use it and holds its request's connection during its model call.
- **Rate limit.** Learners behind one NAT share one address and therefore one sign-in limit.
- **Monitoring, alerting and backups** (FR-ADM-18, FR-ADM-19) are not implemented; they depend on the hosting decision (open issue 2).

## 18. References

| Document | Content |
|---|---|
| `docs/handover/AGENTS.md` | Non-negotiable product rules and document precedence |
| `docs/handover/03-architecture-and-data-flow.md` | Target architecture and data flow of the whole platform |
| `docs/handover/04-agentic-core.md` | Target chat pipeline and chat UX contract |
| `docs/handover/05-algorithms.md` | Elo, FSRS, priority, daily session, memory display |
| `docs/handover/09-open-issues.md` | Undecided questions referred to by number in this document |
| `docs/reference/core_issues.md` | Transcription of the examination blueprint |
