# Development and operation guide

| | |
|---|---|
| Subject | Installation, execution, data management and verification of the YHDP Exam Platform backend and web client |
| Audience | Engineers |
| Related documents | `docs/architecture.md`, `docs/data-model.md`, `docs/ministry-dashboard.md` |

Commands are given for a POSIX shell. On Windows the virtual-environment interpreter is `.venv/Scripts/python`; on macOS and Linux it is `.venv/bin/python`. In this document `python` denotes that interpreter, and backend commands are run from `backend/`.

## 1. Prerequisites

| Component | Version |
|---|---|
| Python | 3.13 |
| Node.js | 22 |
| PostgreSQL | 16, by Docker (`docker compose`) or a local installation |
| Google Chrome | Required by the end-to-end rehearsal scripts only |

## 2. Installation

```bash
cp .env.example .env            # set ANTHROPIC_API_KEY for live model calls
docker compose up -d            # PostgreSQL on port 5433: databases yhdp_demo and yhdp_demo_test

cd backend
python -m venv .venv            # the system Python 3.13
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m app.cli migrate
.venv/Scripts/python -m app.cli seed

cd ../web
npm install
```

Without Docker, create the two databases on a local PostgreSQL 16 and set `DATABASE_URL` and `DATABASE_URL_TEST` in `.env`.

Use `127.0.0.1`, not `localhost`, in database URLs on Windows with Docker Desktop: `localhost` resolves to `::1` first and a connection can stall for 30 s.

## 3. Execution

```bash
cd backend && python -m uvicorn app.main:app --port 8000
cd web && npm run dev            # http://localhost:5173
```

The first screen is the sign-in. The activation code of the seeded learner is `DEMO-0001`. It is a development fixture defined in `backend/config.yaml`, not a secret.

**Second instance.** A second checkout or database can run beside the first: start its backend on another port, start Vite with `VITE_API_TARGET=http://127.0.0.1:<port>` and `--port <port>`, and give it its own `DATABASE_URL`.

## 4. Environment variables

| Variable | Values | Purpose |
|---|---|---|
| `APP_ENV` | `dev`, `test`, `production` | `seed`, `reset-dev` and the cohort generator run only when the value is explicitly `dev` or `test` |
| `APP_MODE` | `real` (default), `mock` | Section 6 |
| `DATABASE_URL` | PostgreSQL URL | Development or production database |
| `DATABASE_URL_TEST` | PostgreSQL URL | Test database; must differ from `DATABASE_URL`, because the test session rebuilds it |
| `ANTHROPIC_API_KEY` | Key | Model provider credential |
| `DEMO_REPLAY` | `0`, `1`, `prefer` | Section 8 |

## 5. Database commands

| Command | Effect | Environments |
|---|---|---|
| `python -m app.cli migrate` | Applies pending schema revisions; safe to repeat | All |
| `python -m app.cli load-blueprint` | Loads the examination blueprint, the provisional competency tree and the eight học phần | All |
| `python -m app.cli seed` | Loads the blueprint, the demonstration content and the development learner; repeatable | `dev`, `test` |
| `python -m app.cli reset-dev` | Empties every table, then seeds | `dev`, `test` |
| `python -m app.cli create-staff --email … --name … --role reviewer\|admin\|ministry_viewer` | Creates a staff account; the password is read from `STAFF_PASSWORD` or prompted | All |
| `python -m app.cli export-openapi [--check]` | Writes `openapi.yaml` from the code, or verifies that the file is current | All |
| `python -m seed.cohort --learners 300 --weeks 12 --seed 42` | Generates the sample cohort (`docs/ministry-dashboard.md`, section 7) | `dev`, `test` |

- The service does not start while revisions are pending.
- Approved content is immutable in the database. After changing approved content in the seed files, run `reset-dev`.
- The cohort is best generated in a database of its own:

  ```bash
  createdb yhdp_sample
  export DATABASE_URL=…/yhdp_sample APP_ENV=dev
  python -m app.cli migrate && python -m app.cli seed
  python -m seed.cohort --learners 300 --weeks 12 --seed 42
  STAFF_PASSWORD=… python -m app.cli create-staff --email … --name … --role ministry_viewer
  ```

  Start the backend on that database, start the web client in front of it, and open `/quan-ly/dang-nhap`.

## 6. Mock server

The mock server is the same application in mock mode. It requires neither a database nor a model key.

```bash
docker compose --profile mock up --build mock                       # port 8010
APP_MODE=mock python -m uvicorn app.main:app --port 8010            # or, from backend/
```

- Every `/v1` route returns the example of its response model. Request bodies are validated; path identifiers are ignored. No token is required.
- The chat and explanation streams replay a script selected by the header `X-Mock-State`: `answered` (default), `insufficient_evidence`, `declined`, `needs_clarification`, `queued`. `MOCK_STEP_DELAY_MS` sets the interval between events (default 400).

## 7. Authentication in development

- `POST /v1/auth/activate` with `{"code": "DEMO-0001"}` returns an access token (30 min) and a rotating refresh token (30 days). Send `Authorization: Bearer <access token>` on every other call.
- `POST /v1/consent` with `{"version": "2026-10", "service": true}` must precede every call except the authentication, consent and `/v1/me` routes; until then they answer `403 consent_required`.
- Staff sign in at `POST /v1/auth/staff/login`.
- A refresh token used twice signs that device out. A client must send one refresh at a time and must not retry a refresh whose answer it lost.
- Five failed sign-ins from one address within 15 minutes block that address for the remainder of the window.

## 8. Replay cache

Model replies are stored under `.replay/`, keyed by model, prompt version and the exact prompt.

| `DEMO_REPLAY` | Behaviour |
|---|---|
| `0` | Always call the model |
| `1` | Call the model; if the call fails, serve the cached reply for the same prompt |
| `prefer` | Serve the cached reply when one exists; call the model only for a new prompt |

To present without network dependence: run `npm run rehearse:live` with `DEMO_REPLAY=0` and a model key, inspect the answers, then restart the backend with `DEMO_REPLAY=prefer`. A question that was rehearsed then returns exactly the rehearsed answer. Changing a passage, a prompt or the model invalidates the cached replies.

## 9. Verification

| Command | Scope | Duration |
|---|---|---|
| `cd backend && python -m pytest -q` | Rules, pipeline, safety suite, API integration, contract | 15–35 min |
| `cd web && npm test` | Pure modules of the web client | Seconds |
| `cd web && npm run build` | Type check and production bundle | Under a minute |
| `cd web && npm run rehearse` | Learner flows in headless Chrome, without live model calls | Minutes |
| `cd web && npm run rehearse:live` | As above, with the cited answer, the follow-up and the tutor | Minutes |
| `cd web && npm run rehearse:dashboard` | Ministry dashboard page, 34 checks | Under a minute |

- The backend suite uses the test database and a scripted model gateway; it never calls a provider.
- `rehearse` and `rehearse:live` empty the development database first (`reset-dev`) and therefore require `APP_ENV=dev`. `REHEARSE_BASE` names the client address when it is not `http://localhost:5173`; `REHEARSE_UNTIL=<n>` stops after section n; `REHEARSE_SHOTS=<folder>` saves a screenshot of each main screen; `REHEARSE_PYTHON` names the interpreter when the checkout has no virtual environment of its own.
- `rehearse:dashboard` resets nothing. It requires `DASHBOARD_EMAIL` and `DASHBOARD_PASSWORD` (a ministry viewer) and a backend that serves the sample cohort.

## 10. Manual walkthrough

On a freshly seeded database:

| Step | Action | Demonstrates |
|---|---|---|
| 1 | Sign in with `DEMO-0001`; give the service consent | Sign-in by activation code; separate service and research consents |
| 2 | Chọn học phần → "Bỏ qua, vào học ngay" | Shown once per learner |
| 3 | First unit: request "Gợi ý", answer **5%** (wrong), continue to the end | A hint that does not reveal the answer; expert explanation first; a worked example inserted because of the wrong answer; a revision card created by rule |
| 4 | Trang chủ → "Ôn nhanh N câu" → complete the session | The daily session built by rules; a reason for every step and question; the adaptation screen listing only what changed |
| 5 | Hỏi đáp: "Vắc xin viêm gan B mũi sơ sinh tiêm khi nào?" | An answer with page-level citations; the work trace |
| 6 | Hỏi đáp: "Tỷ lệ mắc tính thế nào?" | Clarification without search or model call |
| 7 | Hỏi đáp: "Con tôi sốt 39 độ nên uống thuốc gì?" | Declined before any model call |
| 8 | Hỏi đáp: "Phác đồ hoá trị ung thư phổi giai đoạn III?" | Insufficient evidence instead of a guess |
| 9 | Thi thử → Đề thi thử số 1: flag a question, leave one blank, reload, submit | Server-side timer, autosave, resumption, results, history |
| 10 | Luyện tập → Thẻ ôn → Bộ thẻ → review a card | Decks populated by wrong answers; FSRS intervals |
| 11 | Tiến độ: Năng lực, then Nhịp học | Coverage, priorities, real mock scores, study time, memory curve; no predicted score |

## 11. Content verification before external demonstration

Passages under a `# VERIFY before kickoff` comment in `backend/seed/content/documents.yaml` require checking against current official sources: the immunisation schedule (`tc-p01`–`tc-p10`) and the wording of Luật Phòng, chống bệnh truyền nhiễm 2007, Điều 3 (`lt-p01`–`lt-p04`). That law was replaced by Luật Phòng bệnh 2025 (số 114/2025/QH15) from 01/07/2026; the seed keeps the 2007 text as a historical source with a validity note. After any edit, run `reset-dev` and the tests.
