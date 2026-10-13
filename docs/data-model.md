# Database design

| | |
|---|---|
| Subject | Relational schema of the YHDP Exam Platform backend, schema revision 0012 |
| Audience | Engineers and technical reviewers |
| Authoritative source | `backend/migrations/versions/` |
| Related documents | `docs/architecture.md`, `docs/handover/03-architecture-and-data-flow.md` (target data model) |

## 1. Scope

This document specifies the tables, keys and integrity rules of the database as created by revisions 0001–0012. Where it and the migrations differ, the migrations are correct. Section 8 lists the differences from the target data model in `docs/handover/03-architecture-and-data-flow.md`.

## 2. Conventions

| Convention | Rule |
|---|---|
| Engine | One PostgreSQL 16 database holds the knowledge base, glossary, question bank, blueprint, learner records and logs |
| Time | Timestamps are `timestamptz`, stored in UTC. The learner's local day is computed in `local_timezone` (default `Asia/Ho_Chi_Minh`) |
| Identifiers | Content and reference rows use stable text identifiers (`question.id`, `passage.id`, `module.id`, `competency_node.code`). Operational rows use generated integers |
| Versioning | `question` and `content_item` are keyed by `(id, version)`. An approved row is immutable; an edit is a new version |
| Deletion | No content row is hard-deleted; the status `retired` is used |
| Pseudonymity | Logs and chat tables reference the learner by `learner_pid` (the pseudonym), with no foreign key to `learner`. Operational learning tables reference `learner_id` |
| Synthetic data | Every row written by the cohort generator is flagged `is_synthetic` on its organisation, learner, question, form, document, activity event or chat message |
| Semi-structured data | `jsonb` is used for values read and written as a whole (session steps, summaries, traces, option orders). Values that are filtered or joined are columns |

## 3. Reference data

### 3.1 Examination blueprint

Loaded from `backend/seed/blueprint.yaml`, a structured transcription of `docs/reference/core_issues.md`. A test verifies the counts.

| Table | Key | Columns | Rows |
|---|---|---|---|
| `core_issue_group` | `id` | `name`, `short_name`, `weight_min`, `weight_max` | 8 |
| `core_issue` | `id` (1–54) | `group_id`, `name` | 54 |
| `exam_competency` | `id` | `name`, `weight_min`, `weight_max` | 4 |
| `exam_competency_component` | `id` | `competency_id`, `name` | 13 |

| Group | Core issues | Weight range |
|---|---|---|
| 1 Vấn đề sức khỏe quần thể cần can thiệp ở cấp ban đầu | 1–5 | 17–19 % |
| 2 Vấn đề sức khỏe cần cấp cứu, sơ cấp cứu | 6–16 | 16–20 % |
| 3 Vấn đề dinh dưỡng, an toàn thực phẩm | 17–19 | 7–9 % |
| 4 Vấn đề bệnh lý truyền nhiễm | 20–27 | 17–21 % |
| 5 Vấn đề sức khỏe nghề nghiệp | 28–29 | 2,5–3,5 % |
| 6 Vấn đề sức khỏe cộng đồng theo tiếp cận y học gia đình | 30–48 | 23–27 % |
| 7 Vấn đề sức khỏe tâm thần và hành vi | 49–51 | 5–7 % |
| 8 Giao tiếp và Cộng tác | 52–54 | 2,5–3,5 % |

Examination competencies: 1 Áp dụng khái niệm cơ bản (18–22 %), 2 Chẩn đoán cấp ban đầu (37–43 %), 3 Xử trí cấp ban đầu (32–38 %), 4 Cộng tác và Giao tiếp (4–6 %).

Cognitive level is stored as a band, `question.bloom_level`: 1 Nhớ, Hiểu; 2 Vận dụng; 3 Phân tích, Đánh giá. The blueprint weights bands 2 and 3 only; a form of kind `mock` therefore contains no band-1 item (open issue 27).

A 40-question form that satisfies every range allocates 7 / 8 / 3 / 8 / 1 / 10 / 2 / 1 questions to groups 1–8 and 8 / 16 / 14 / 2 to competencies 1–4.

### 3.2 Topic axis

| Table | Key | Columns |
|---|---|---|
| `competency_node` | `code` | `parent_code`, `level`, `name`, `blueprint_weight`, `prerequisite_codes[]`, `core_issue_id` (unique, nullable), `provisional` |
| `module` | `id` (`g1`–`g8`) | `name`, `short_name`, `ord`, `core_issue_group_id`, `competency_codes[]`, `coming_soon` |
| `unit` | `id` | `module_id`, `ord`, `topic`, `competency_code` |
| `unit_item` | `id` | `unit_id`, `ord`, `kind`, `content_id`, `question_id`, `after_item_id`, `note` |

- The competency tree is provisional. It is generated from the blueprint: level 1 holds the eight groups (`G1`–`G8`), level 2 the 54 core issues (`CI-01`–`CI-54`). One further level-1 node, `FND`, holds foundation content that maps to examination competency 1 but to no core issue; no core-issue mapping is invented for such content. The tree of QĐ 2755/QĐ-BYT will replace it through the same loader (open issue 28).
- Mastery is tracked per level-2 code and for `FND`.
- **Topic weight.** For a node linked to a core issue: the midpoint of its group's range divided by the number of issues in the group (open issue 26). For `FND`: `blueprint.foundation_weight`.
- A học phần (`module`) is one blueprint group. Short names are display labels written for this project, not official text.

## 4. Tables by domain

Columns marked `?` are nullable.

### 4.1 Knowledge base and glossary

| Table | Key | Columns |
|---|---|---|
| `document` | `id` | `title`, `edition?`, `version`, `validity_status`, `validity_note?`, `excerpt_limit?`, `demo_label`, `is_synthetic` |
| `passage` | `id` | `document_id`, `chapter?`, `lesson?`, `section?`, `page_start?`, `page_end?`, `article?`, `competency_code?`, `content_type?`, `scope_of_use?`, `validity_status`, `version`, `text`, `text_unaccented`, `context`, `context_unaccented`, `corpus_version`, `tsv` |
| `glossary_term` | `id` | `term`, `synonyms[]`, `status`, `ambiguous`, `sense_group?` |

`passage.tsv` is a `tsvector` with a GIN index (`passage_tsv_idx`); it supports the keyword retrieval of the chat pipeline. Passages of a synthetic document are excluded from search, from term statistics and from the source sheet. No vector column exists at this revision; dense retrieval is planned.

### 4.2 Question bank, learning content and review

| Table | Key | Columns |
|---|---|---|
| `question` | `(id, version)` | `type`, `stem`, `options` (jsonb), `explanation`, `rubric?`, `competency_code`, `core_issue_id?`, `exam_competency_component_id?`, `bloom_level`, `difficulty_label`, `difficulty_b`, `n_responses`, `source_passage_ids[]`, `status`, `ai_assisted`, `author?`, `is_synthetic` |
| `content_item` | `(id, version)` | `title?`, `body`, `source_passage_ids[]`, `status`, `ai_assisted`, `competency_code?` |
| `exam_form` | `id` | `title`, `kind` (`diagnostic`, `mock`, `demo_short`, `assembled`), `question_ids[]`, `n_questions?`, `seconds_per_question`, `max_attempts?`, `status`, `is_synthetic`. For kind `assembled`, `question_ids` is empty and each attempt receives `n_questions` chosen for the learner; `exam_attempt.assembly` records how |
| `review_decision` | `id` | `target_type` (`question`, `content`), `target_id`, `version`, `round`, `reviewer_id`, `decision`, `comment?`, `created_at` |
| `status_transition` | `id` | `target_type`, `target_id`, `version`, `from_status?`, `to_status`, `actor_id?`, `actor_label`, `at`, `reason?` |
| `error_report` | `id` | `target_type`, `target_id`, `reason`, `note?`, `learner_pid`, `context?`, `status`, `created_at` |

The core issue of a question is derived by the loader from its competency node, not written in the content file, so the two cannot disagree. Questions and learning-content items share the review tables; item identifiers are unique across both kinds.

### 4.3 People, access and consent

| Table | Key | Columns | Purpose |
|---|---|---|---|
| `organisation` | `id` | `code` (unique), `name`, `region?`, `is_synthetic` | Training institution; dashboard dimension |
| `learner` | `id` | `pseudonym_id` (unique), `organisation_id?`, `audience` (`student`, `graduate`), `focus_module_ids[]`, `exam_date`, `target_retention`, `new_cards_per_day`, `max_reviews_per_day`, `diagnostic_prompt_dismissed`, `active`, `is_synthetic`, `created_at` | |
| `learner_identity` | `learner_id` | `display_name`, `contact?` | Personal data, readable by `admin` only (NFR-18) |
| `import_batch` | `id` | `created_by`, `created_at`, `status` (`preview`, `confirmed`), `rows`, `errors` | Administrative CSV import |
| `activation_code` | `id` | `code_hash` (unique), `batch_id?`, `organisation_id?`, `audience`, `issued_at`, `activated_at?`, `learner_id?`, `display_name?` | Issued against activated. `display_name` holds the imported name until activation, when it moves to `learner_identity` and is cleared here |
| `staff_user` | `id` | `email` (unique), `password_hash`, `display_name`, `role` (`reviewer`, `admin`, `ministry_viewer`), `active`, `is_demo`, `created_at` | |
| `auth_token` | `token_hash` | `subject_type`, `subject_id`, `kind` (`access`, `refresh`), `family_id`, `expires_at`, `revoked_at?`, `created_at` | Opaque tokens; `family_id` links the rotations of one sign-in |
| `auth_failure` | `id` | `ip`, `kind`, `at` | Sign-in rate limit |
| `consent_record` | `id` | `learner_id`, `kind` (`service`, `research`), `version`, `given_at`, `withdrawn_at?` | Two consents, withdrawable separately (open issue 17) |
| `deletion_request` | `id` | `learner_pid`, `requested_at`, `completed_at?` | FR-ADM-04 |

### 4.4 Learning records

| Table | Key | Columns | Purpose |
|---|---|---|---|
| `mastery` | `(learner_id, competency_code)` | `theta`, `n_responses`, `updated_at?` | Ability per topic |
| `item_response` | `id` | `learner_id`, `question_id`, `question_version`, `context`, `attempt_id?`, `unit_session_id?`, `unit_item_id?`, `practice_set_id?`, `chosen?`, `correct`, `card_id?`, `time_ms?`, `created_at` | Every answer, with the version answered |
| `unit_session` | `id` | `learner_id`, `unit_id`, `queue[]`, `cursor`, `cards_created`, `done`, `started_at`, `updated_at` | Position in a unit |
| `practice_set` | `id` | `learner_id`, `source` (`session`, `chat_suggestion`, `quiz_similar`), `competency_code`, `question_ids[]`, `question_versions`, `reasons`, `created_at`, `completed_at?`, `summary?` | A fixed set; `summary` is the stored adaptation summary |
| `daily_session` | `id` | `learner_id`, `local_date` (unique together), `steps`, `practice_set_id?`, `built_at` | The session as built for that day |
| `session_addition` | `id` | `learner_id`, `for_date`, `competency_code`, `suggestion_id?`, `created_at` | A topic added from chat for a day |
| `exam_attempt` | `id` | `learner_id`, `form_id`, `question_order[]`, `option_orders`, `question_versions`, `started_at`, `deadline_at`, `submitted_at?`, `auto_submitted`, `score?`, `summary?`, `assembly?` | `question_versions` fixes the version of each question at the start |
| `attempt_answer` | `(attempt_id, question_id)` | `chosen?`, `flagged`, `changes`, `updated_at` | Autosaved answer |
| `card` | `id` | `learner_id`, `source_question_id` (unique together), `source_context`, `front`, `back`, `citation`, `fsrs_card` (jsonb), `due_at`, `reps`, `lapses`, `suspended`, `created_by`, `created_at` | At most one card per learner and question |
| `card_review` | `id` | `card_id`, `rating`, `reviewed_at`, `scheduled_seconds`, `time_ms?` | |

### 4.5 Activity log

`activity_event`: `id`, `learner_pid`, `kind`, `occurred_at`, `duration_ms?`, `ref_type?`, `ref_id?`, `is_synthetic`. Append-only; indexed on `occurred_at`.

Kinds: `visit`, `unit_response`, `practice_response`, `exam_started`, `exam_submitted`, `card_review`, `chat_turn`, `session_step_completed`, `cards_created`, `remediation_inserted`, `practice_set_built`.

- An event is written by the service in the same transaction as the fact it records.
- `visit` is written on `GET /home`, at most once per learner per `activity.visit_gap_minutes`.
- `duration_ms` is the client-reported time, capped at `activity.max_duration_ms` so that an idle screen does not inflate study time.
- `is_synthetic` is set from the learner row at insertion, because the table refuses updates.

The table serves four consumers: weekly activity and retention on the ministry dashboard, the research export (FR-ADM-16), Tiến độ · Nhịp học, and the "Đề xuất từ gia sư" list on Home.

### 4.6 Chat

| Table | Key | Columns |
|---|---|---|
| `chat_session` | `id` | `learner_pid`, `title?`, `kind`, `module_id?`, `question_id?`, `created_at`, `updated_at` |
| `chat_message` | `id` | `session_id`, `role`, `text`, `state?`, `format?`, `citations?`, `retrieved_passage_ids[]?`, `trace?`, `claims_checked?`, `claims_removed?`, `notice?`, `clarifies_message_id?`, `clarify_options?`, `searched?`, `nearest_chapter?`, `helpful?`, `model_version?`, `prompt_version?`, `corpus_version?`, `latency_ms?`, `tokens_in?`, `tokens_out?`, `cost?`, `is_synthetic`, `created_at` |
| `suggestion` | `id` | `learner_id`, `message_id`, `kind` (`practise`, `add_to_tomorrow`), `competency_code`, `n_items?`, `reason_vi`, `created_at`, `accepted_at?` |

`clarify_options`, `searched` and `nearest_chapter` are stored because the history operation returns them and they cannot be recomputed. Every assistant message carries its model, prompt and corpus versions (FR-ADM-14, FR-CNT-08).

### 4.7 Infrastructure

| Table | Key | Columns |
|---|---|---|
| `idempotency_key` | `(key, subject, route)` | `status_code`, `response`, `created_at` |
| `audit_log` | `id` | `actor_type`, `actor_id?`, `action`, `target?`, `at`, `details?` |
| `alembic_version` | `version_num` | Schema revision marker |

## 5. Integrity rules enforced by the database

### 5.1 Approval (human in the loop)

Triggers `question_approval` and `content_item_approval`:

- `approved` is reached only by an update from `in_review_r2`. It cannot be set by an insert or from any other status; a retired item therefore cannot return on its earlier reviews.
- The latest decision of round 1 and the latest decision of round 2 for that `(id, version)` must each be `pass`, and must come from different reviewers.
- An approved row keeps its identifier, version and content. Only its status may change and, for a question, `difficulty_b` and `n_responses`.

### 5.2 Uniqueness

| Index | Rule |
|---|---|
| `question_one_approved_version`, `content_item_one_approved_version` (partial, `status = 'approved'`) | At most one approved version per identifier, so that serving by identifier finds one row |
| `card (learner_id, source_question_id)` | At most one card per learner and question |
| `daily_session (learner_id, local_date)` | One session per learner and local day |
| `item_response_unit_once` (partial) | One answer per item of a unit session |
| `item_response_practice_once` (partial) | One answer per question of a practice set |
| `competency_node (core_issue_id)` | One node per core issue |
| `learner (pseudonym_id)`, `organisation (code)`, `staff_user (email)`, `activation_code (code_hash)` | Natural keys |

### 5.3 Append-only tables

Triggers refuse `UPDATE` and `DELETE` on `activity_event`, `audit_log`, `status_transition` and `review_decision`, including statements that would affect no row.

## 6. Data life cycle

| Event | Effect |
|---|---|
| Edit of approved content | A new `(id, version)` row; the earlier version remains for attempts and sets that recorded it |
| Retirement | Status `retired`; the row is kept |
| Account deletion, mode `erase` | `learner_identity` erased; rows keyed by `learner_id` removed by cascade; rows keyed by pseudonym (chat sessions, messages, suggestions, error reports, idempotency keys, tokens) removed by the deletion service; `activity_event` rows retained under a pseudonym that resolves to no person |
| Account deletion, mode `keep_pseudonymous` | `learner_identity` erased; learning records retained under the pseudonym; the activation code is disabled |
| Consent withdrawal | `consent_record.withdrawn_at` is set; the learner leaves every outcome figure of the ministry dashboard, including past periods (open issue 40) |

## 7. Schema revisions

Revisions are forward-only. `python -m app.cli migrate` applies them and is safe to repeat.

| Revision | Content |
|---|---|
| 0001 | Examination blueprint and competency tree |
| 0002 | Organisations, staff, learners, activation codes, tokens, consent |
| 0003 | Knowledge base, glossary, học phần, question bank, examination forms, review; the approval rule |
| 0004 | Learner records: mastery, unit sessions, attempts, practice sets, responses, cards, daily sessions, activity |
| 0005 | Chat sessions and messages, suggestions, idempotency keys, audit log |
| 0006 | Stricter approval rule; immutable review decisions; three columns required by the contract |
| 0007 | Token families, failed sign-in log, pseudonyms |
| 0008 | An attempt records the version of each question it serves |
| 0009 | A practice set records the version of each question it serves |
| 0010 | One answer per question of a practice set; removal of an unused column |
| 0011 | `is_synthetic` on questions, forms and documents; index on `activity_event (occurred_at)` |
| 0012 | `document.is_synthetic` on databases stamped 0011 before that column was added to it |

## 8. Differences from the target data model (`03`)

The entity list of `03` is the baseline; names and semantics are kept. The implemented schema differs as follows.

| Area | Difference |
|---|---|
| Blueprint | Four tables hold the blueprint as real data (section 3.1) |
| `competency_node` | Adds `core_issue_id` and `provisional` |
| `question`, `content_item` | Keyed by `(id, version)`; `question` adds `core_issue_id`, `exam_competency_component_id`, `bloom_level` as a band 1–3, `is_synthetic`; `content_item` adds `competency_code` |
| `review_decision` | `target_type` and `target_id` replace `question_id`, so that learning content is reviewed through the same records |
| `status_transition` | New; append-only history of every status change (FR-CNT-15) |
| `exam_form` | `kind` includes `demo_short` and `assembled`; adds `is_synthetic` |
| `glossary_term` | Adds `ambiguous` and `sense_group` |
| `document`, `passage` | Add `demo_label`, `validity_note`, `article`, `is_synthetic` |
| People | `organisation`, `learner_identity`, `import_batch`, `activation_code`, `staff_user`, `auth_token`, `auth_failure`, `consent_record` and `deletion_request` are specified here; `learner` adds `organisation_id`, `audience`, `is_synthetic` |
| Activity | `activity_event` is new |
| Learning | `practice_set`, `daily_session`, `session_addition` and `suggestion` are new; `exam_attempt` and `practice_set` record `question_versions` |
| Chat | `chat_session` adds `module_id` and `question_id`; `chat_message` adds the state `needs_clarification` and the trace, claim-count, clarification and rating columns |
| Infrastructure | `idempotency_key` is new |
