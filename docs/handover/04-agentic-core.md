# 04 — Agentic core

Everything AI the learner touches goes through this core. Rules decide the flow; the model only does steps that need language (rewriting a query, phrasing an answer, explaining). Ingestion is out of scope here.

## R1 decision: RAG + tools, not a state machine

For R1 the chatbot is **a RAG pipeline with a short tool-calling loop**, wrapped in three guards written in code. The finite-state conversation manager with 12 tools in the spec is an R2 target. No sub-agents. Chain-of-thought is not enabled by default; it is one configuration in the evaluation ablations and is turned on only if it measurably helps.

## Layers

| Layer | Responsibility |
|---|---|
| Model gateway | The only place that calls a model. Picks the model per task, versioned prompts, timeouts and fallback, rate limits, logging, cost tracking. Provider switch = config change (FR-ADM-20) |
| Chat pipeline | Guards → retrieval → generation with tools → post-check → response states |
| Tutor (in units) | "Giải thích thêm" and hints for the current quiz item, grounded only in the item's source passage and the expert explanation |
| Learning engine | Rules only (see `05-algorithms.md`). Agent outputs that change learner records pass rule checks first |

## Chat pipeline (R1)

1. **Pre-gate (code).** Patient-specific clinical advice → templated decline (`declined`), no model call. R1.0 detection: an expert-maintained pattern list (first-person or third-person patient context combined with a request for diagnosis, treatment or dosing, e.g. "tôi bị…", "con tôi…", "bệnh nhân của tôi…", "nên uống thuốc gì", "liều bao nhiêu cho…"), versioned in config and covered by the safety regression suite. Questions outside the corpus are not declined by pattern: they fall through to retrieval and end as `insufficient_evidence`. Normalise the query: diacritics, glossary synonyms, abbreviations (FR-LRN-01).
2. **Mandatory retrieval (code).** Always run `search_corpus` first: BM25 + vector, rerank, filter by học phần when the chat was opened from one; returns passages with page numbers. Never let the model decide whether to search.
3. **Answer (model, tool loop).** System prompt requires *evidence first, answer second*: the model outputs (a) the passage IDs and key quotes it relies on, (b) the answer composed from them with a citation per claim. It may call extra tools, **max 3 tool rounds**.
4. **Post-check tier 1 (code), every answer.** Every cited ID is in the retrieved set; quoted text matches the passage; numbers in the answer (doses, ages, thresholds) appear in the cited passage or table row; blocked content (patient-specific dosing) absent. Failing claims are removed.
5. **Post-check tier 2 (model, one fixed call), every answer in R1.** Split the answer into claims; for each, ask "does the cited passage state this?" (yes / no / partial). Drop "no". If nothing survives → `insufficient_evidence`. R2 runs this on the 24–32B tier. This is the step measured by "post-check accuracy ≥ 0.90" (CV4.4).
6. **Respond.** One of `answered` · `insufficient_evidence` · `declined` · `needs_clarification` (R1.0) · `plan_proposal` (R2, separate path below), plus citations `[{passage_id, document, chapter, page}]`. Stream status to the app ("Đang trả lời", queue position when busy); deliver the answer text after the post-check, not a draft that later loses sentences.
7. **Log** (FR-ADM-14): pseudonymous learner ID, query, retrieved passage IDs, answer, citations, state, model/prompt/corpus versions, latency, tokens, cost.

**Stop conditions:** final answer produced → stop. Tool-round limit or time budget exceeded → return `insufficient_evidence`, never a partial answer.

## Tools available to the model in R1

Keep schemas small so a 7–8B model can call them reliably.

| Tool | Purpose |
|---|---|
| `search_corpus(query, module_id?)` | Additional retrieval with a different phrasing |
| `get_passage(passage_id, neighbours?)` | Read the passage before/after a citation |
| `lookup_table(table, key)` | Exact facts: vaccination schedules, thresholds, indicators (where tables exist) |
| `lookup_glossary(term)` | Unknown term or abbreviation |
| `get_item(question_id)` | When chat is opened from a quiz item: stem, options, expert explanation, distractor rationales |

Later: `calculate(formula, inputs)` for epidemiology formulas (R1.1; the model fills inputs, code computes), `create_cards` (R1.1, agent proposes, rules validate), `grade_freeform` (R1.1), `propose_plan` (R2), `escalate` (R2).

## Chat UX contract (R1.0, from the 11/10 PO review)

The PO asked that the chat look agentic. Nothing new is invented: the screen shows what the pipeline above already does. Mock: `Chat` (9 states), `ChatQuiz`, `ChatPlan`; PNGs in `screenshots/chat-states/`.

- **Work trace.** The core emits one SSE `step` event per real tool call or pipeline stage: `{id, kind: search | read | lookup_table | lookup_glossary | get_item | check, label_vi, status: running | done}`. Labels come from templates filled with real values ("Đã đọc: Hướng dẫn tiêm chủng tr. 112, 114"), never from model text. Show at most 4 lines. The `final` event carries `trace_summary {sources, claims_checked, claims_removed}`; the app collapses the trace into the chip "Đã tra N nguồn · kiểm tra M nhận định". No step is shown that did not run.
- **Post-check notice.** When `claims_removed > 0`, show "Đã bỏ K ý … vì không tìm được nguồn trong giáo trình". The optional short topic ("về phản ứng sau tiêm") comes from the tier-2 claim label, ≤ 6 words.
- **Answer formats.** `format: text` (default) · `table` when `lookup_table` returns rows that answer the question directly (schedules, thresholds): render the rows as-is with the table's source page, no generated prose · `calc` (R1.1) from `calculate`, shown as inputs → formula → result, labelled as computed.
- **Clarification (`needs_clarification`).** Triggered (a) by rule, when the normalised query hits a glossary term flagged ambiguous by experts (e.g. "tỷ lệ mắc" → hiện mắc / mới mắc / mật độ mới mắc), or (b) when retrieval returns passages for ≥ 2 distinct glossary senses. Options are glossary entries, 2–4, tappable; the tap sends the clarified query. No tool rounds are spent.
- **Insufficient evidence.** The payload lists where the system searched (`searched: [{document, range}]`, from the retrieval set) and the nearest chapter link. "Gửi chuyên gia" stays disabled until R2.
- **Suggestions after an answer.** Computed by rules, not the model: if the answer's competency codes match a competency with recent wrong answers in the learner record, offer "Luyện N câu đã duyệt" (approved items only, same competency) and "Thêm vào phiên ngày mai". Any write needs a tap. Chat text never becomes a card. The model sees competency codes only, never the learner's identity.
- **Chat from a quiz item.** Created with `question_id`; `get_item` output (stem, options, chosen option, expert explanation, distractor rationales) is in context; the answer explains the chosen distractor first. Actions: practise similar (approved items, same competency), back to the session.

## R2: study-plan proposals in chat (`plan_proposal`)

A scheduling request ("làm 6h–18h, chỉ rảnh 30 phút sau 8h tối") is routed away from the RAG path by the pre-gate intent rules. The model only extracts constraints into a fixed schema `{daily_minutes, window_start, window_end, days[], exam_date?}`. Rules build the plan from the same inputs as the study-plan agent above (session composition, FSRS due forecast, topic priority, mock-exam lengths) and detect conflicts (e.g. a 50-minute mock does not fit a 30-minute slot), which come back as options. The model phrases the card. The response carries no citations, is labelled R2 / AI, and nothing is written until the learner taps "Áp dụng". Before R2 the router replies with one line pointing to the daily-time setting.

## Tutor "Giải thích thêm" (R1)

Inside a unit, after the learner answers a quiz item: the expert explanation is shown first (FR-LRN-09). The R1.0 sheet has two actions and no free-text input: "Gợi ý" (before answering; a hint that never reveals the correct option) and "Giải thích thêm" (after answering). "Giải thích thêm" calls the model with only the item's source passage(s) and the expert explanation and rationales; same post-check; citations shown as chips. Hints never reveal the correct option.

## Rules vs agent

| Rules (deterministic, unit-tested) | Agent (proposes only) |
|---|---|
| Elo mastery, item difficulty | "Giải thích thêm", hints (R1.0) |
| Rule-built cards from wrong answers (R1.0) | Cards from chosen distractors and missed rubric points (R1.1) |
| FSRS scheduling | Freeform grading per rubric point; low confidence earns no mastery credit (R1.1) |
| Topic priority, unit order, exam assembly | Long-term study plan; rules validate (R2) |

## R2: study plan agent (for later; keep interfaces open)

Inputs computed by rules: gaps per topic (θ vs target), blueprint weights, prerequisite graph, chosen học phần, weekly capacity minus FSRS due-card forecast, learner pace, days to exam. The agent drafts a plan (horizon → weeks → days) through `propose_plan` with a fixed JSON schema; a rule validator checks load ≤ capacity, prerequisites first, every high-weight gap covered before the exam, no sessions in busy slots, spacing between mock exams. Violations go back to the agent; after the maximum number of revision rounds or the token/time budget, fall back to a greedy rule-built plan. Re-plan after a mock exam or diagnostic, large mastery change, many missed sessions, or a change of chosen học phần / free time / exam date; small slips are shifted by rules without calling the agent. A topic stops getting new sessions after reaching target mastery on two consecutive assessments (cards only) and reopens if a mock shows a drop; in the last N days before the exam only review and mocks are scheduled.

## Hard boundaries

- No generative fine-tuning; learner data never used for training.
- The core never writes to the approved question bank or to any assessed activity.
- No supported citation → no answer. No predicted scores.
- Capability floor: every prompt and tool must work on the 7–8B tier.
