# 02 — Requirements

Baseline exported from the requirements specification (doc revision 38, 09/10/2026). IDs are stable.

- **ID**: `FR-LRN` learner-facing, `FR-CNT` content and review, `FR-ADM` administration and operations, `NFR` non-functional.
- **Priority**: Must (release fails without it), Should (can slip one iteration), Could.
- **Release**: first release in which the requirement must hold. For items marked R1, the R1.0 / R1.1 split in `01-scope-and-plan.md` takes precedence.
- **Source**: work package (CV) or annex of the approved proposal (thuyết minh BM-02 v5.9).

## Learning engine — rules and agentic tutor

Rules decide what to schedule and what to select; the agentic tutor handles what needs language and judgement: grading free text, explaining, and long-term planning. Every agent output that changes a learner's record passes a rule check first, and no feature needs a lecturer to grade.

| Feature | Triggered by | Why this side | Guardrail | Release |
|---|---|---|---|---|
| Spaced repetition: when each card or question returns | Rules | Interval from score and confidence; must be reproducible | Versioned interval table; no AI in the loop. **Proposed: FSRS with versioned parameters** (see `05-algorithms.md`; decision pending) | R1 |
| Revision card creation | Agent | Built from quiz, diagnostic and mock exam results: wrong answers, their distractor rationales, and rubric points the learner missed; the deck is updated after every attempt | Only approved content; every card cites its page; an automated check confirms each card matches its cited passage; learners can report or suspend a card. Scheduling stays rule-based | R1 |
| Quiz assembly inside a học phần | Rules | Selected by competency gap, difficulty and blueprint weight, avoiding recent repeats | Items from the question bank; gen-AI items only where the bank has no coverage, labelled, never used in diagnosis or mock exams | R1 |
| Unit order and interleaving (next content or quiz, remediation) | Rules | Mastery threshold per topic; a wrong answer inserts a worked example or a remedial unit | Thresholds set by the content team; the learner can skip | R1 |
| MCQ and calculation scoring, level-1 diagnosis, mastery estimate | Rules | Deterministic database queries (FR-LRN-20, 22) | — | R1 |
| Review reminders | Rules | Due cards and unfinished sessions | Quiet hours | R2 |
| Freeform answer grading | Agent | Needs language judgement against the expert rubric | Grades per rubric point and shows its confidence; low confidence is marked uncertain with the model answer; counts toward mastery only above the confidence threshold | R1 |
| Explanations, hints and follow-up questions inside a unit | Agent | Conversational; adapts wording to the learner | Cited answers only; same gates as chat (Key processes) | R1 |
| Session summary and next-step suggestion | Agent | Natural-language recap of what was mastered and missed | Numbers come from rules; the agent only phrases them | R1 |
| Learning path recommendation | Agent | Weighs gaps, blueprint weight, exam date and the learner's goals, and explains why | Takes rule outputs as inputs; proposes, the learner accepts | R2 |
| Long-term study and review schedule | Agent | Fits the plan into free time over weeks and re-plans after missed days | Rules check time caps and keep spaced-repetition due dates; no exam-outcome prediction | R2 |
| Drafting quiz items for coverage gaps | Agent (batch) | Fills topics the bank does not cover | Practice-only label; sampled review by the expert council | R2 |

Học phần requirements added by this design:

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-LRN-30 | Home offers a search bar that opens the Practice tab (Luyện tập): học phần cards with progress, plus topic filters by competency domain, core issue and cognitive level (FR-LRN-10). | Must | R1 | Design review 08/10/2026 |
| FR-LRN-31 | Home lists the 3–4 most recent sessions, học phần or chat, to resume in one tap. | Must | R1 | Design review 08/10/2026 |
| FR-LRN-32 | Each học phần is split into short units by topic that interleave content and quiz items. | Must | R1 | Design review 08/10/2026 |
| FR-LRN-33 | Unit order and content adapt to the learner's answers and progress by the rules above, and the screen says why an item was added. | Must | R1 | Design review 08/10/2026 |
| FR-LRN-34 | The agentic tutor builds revision cards from the learner's quiz, diagnostic and mock exam results, and rules schedule them by spaced repetition. Due cards show on Home and in the Progress tab, which in R1 holds only due cards and attempt history. | Must | R1 | Design review 08/10/2026 |
| FR-LRN-35 | The tutor can be opened inside any unit for explanations and hints. | Should | R1 | Design review 08/10/2026 |

FR-LRN-36 (Must, R1): the learner can take a diagnostic quiz (bài đánh giá năng lực) covering all domains, or a mock exam, at any time. After each attempt the system updates mastery (rules), the revision deck (agent), and the priority of học phần and topics (rules), and shows the learner what changed.

FR-LRN-37 (Must, R1): after consent, the learner picks one or more học phần to focus on and can change the choice later in Luyện tập. The diagnostic quiz is then offered but not required: the learner can skip it, go straight into the first chosen học phần, and take the diagnostic later from Thi thử. Until a diagnostic or enough quiz attempts exist, mastery shows as unassessed and rules order topics by the chosen học phần, then blueprint weight. Home keeps a slim, dismissible prompt to take the diagnostic.

## Functional requirements — learner-facing

Thirty-seven requirements serve students and recent graduates (FR-LRN-30 to 37 sit under Learning engine); 23 must hold in R1. The rule behind all of them: AI explains and retrieves, experts decide what counts as correct.

### Cited Q&A

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-LRN-01 | The learner can ask questions in Vietnamese, with or without diacritics and in colloquial wording; the system normalises the query before retrieval. | Must | R1 | CV3.2; Phụ lục 2 |
| FR-LRN-02 | Every professional claim in an answer cites document, chapter or lesson, and page. | Must | R1 | CV3.2; CV5.4 |
| FR-LRN-03 | The learner can open the cited source passage beside the answer. Excerpt length follows the licence; full-text download is not offered. | Must | R1 | CV3.2; CV5.5 |
| FR-LRN-04 | When retrieved evidence is insufficient, the system states the limit and does not guess. | Must | R1 | CV3.2; 11.6.1 |
| FR-LRN-05 | The system declines requests for clinical advice on a specific patient case and says why. | Must | R1 | CV5.4 (brought forward to R1) |
| FR-LRN-06 | Conversations keep multi-turn context and resume after a dropped connection. | Must | R1 | CV5.4 |
| FR-LRN-07 | Source-only mode returns retrieved passages without generated text, and flags superseded documents with their replacement. | Should | R2 | CV5.5 |
| FR-LRN-08 | Comparison and synthesis questions (schedules, thresholds, indicators) are answered from structured knowledge tables, not free generation. | Should | R2 | CV5.4; Phụ lục 2 |
| FR-LRN-09 | Answer explanations show the expert-written text first; AI elaboration, with citations, appears only when the learner asks for more. | Must | R1 | CV3.3; CV5.5 |

### Practice and mock exams

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-LRN-10 | The learner can practise questions filtered by competency domain, core issue (of the 54), topic and cognitive level. | Must | R1 | CV3.3 |
| FR-LRN-11 | The learner can sit a timed mock exam assembled to the HĐYKQG blueprint and scored automatically. | Must | R1 | CV3.3 |
| FR-LRN-12 | After an attempt the learner sees score, correct answers and explanations. | Must | R1 | CV3.3 |
| FR-LRN-13 | Results break down by competency domain and point to the textbook sections to revise. | Must | R2 | CV7.3 |
| FR-LRN-14 | Every attempt is stored in the learner's history. | Must | R1 | CV3.3 |
| FR-LRN-15 | Only expert-approved questions appear in mock exams and diagnosis. Any AI-assisted practice question carries a permanent warning label, its source passage and a report button. | Must | R1 | CV3.3; CV5.5 |
| FR-LRN-16 | Freeform and short answers are graded by the agentic tutor against the expert rubric, point by point, after Vietnamese normalisation; calculation items are graded by program. A low-confidence grade is marked uncertain and shown with the model answer for self-check. No answer is sent to a lecturer for grading. | Must | R1 | CV5.5 |
| FR-LRN-17 | Case-based practice follows expert-authored decision trees; the assistant only identifies the branch and shows the prepared feedback. | Should | R2 | CV5.5 |
| FR-LRN-18 | An exam in progress survives a dropped connection without losing answers. | Must | R1 | CV6.3; Phụ lục 4 |

### Profile and study plan

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-LRN-19 | The system keeps a learner profile by competency code, topic, cognitive level and difficulty, including options chosen, time per item and answer changes. | Must | R2 | CV5.6 |
| FR-LRN-20 | Level-1 diagnosis by competency code is computed by deterministic database queries, with no AI involved. | Must | R2 | CV5.6 |
| FR-LRN-21 | Level-2 diagnosis of specific misconceptions uses only expert-written distractor rationales. | Could | R2 | CV5.6 |
| FR-LRN-22 | Mastery is estimated with descriptive statistics and Elo-style updates; a new learner may take a short diagnostic of 3–5 medium items per domain or skip it, in which case mastery starts unassessed (FR-LRN-37). | Must | R2 | CV5.6 |
| FR-LRN-23 | The agentic tutor proposes a learning path and study plan to the exam date, using rule-computed competency gaps, blueprint weights and prerequisites; the learner accepts or edits it, and rules validate it (see Learning engine). | Must | R2 | CV5.6 |
| FR-LRN-24 | The plan fits the learner's declared weekly free time; when time is short it states which domains it covers and the options. | Should | R2 | CV5.6 |
| FR-LRN-25 | The learner can change priorities and time budget and the plan recomputes; priority order stays stable between consecutive runs. | Should | R2 | CV5.6; CV6.4 |
| FR-LRN-26 | No screen shows a pass probability, predicted score or any indicator implying an exam outcome. | Must | R1 | CV5.6; CV6.4 |
| FR-LRN-27 | Flashcards and concept maps are generated from the vetted knowledge base, each linked to its source passage. | Could | R2 | CV6.4 |

### Feedback and escalation

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-LRN-28 | The learner can rate an answer and report an error in an answer or a question. | Must | R1 | CV3.4; CV5.5 |
| FR-LRN-29 | Questions the assistant cannot answer with enough confidence go to an expert queue; the learner sees the status and the reply. | Should | R2 | 11.6.1; CV5.5 |

## Functional requirements — content and review

The question structure in FR-CNT-13 must be fixed before experts write the first question. The thuyết minh is explicit: adding distractor rationales, source links or rubrics later means re-authoring the whole bank.

### Competency framework and knowledge base

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-CNT-01 | A coverage matrix links each core issue to competencies, source sections and questions for the R1 scope. | Must | R1 | CV3.1 |
| FR-CNT-02 | The competency framework is a four-level tree built from QĐ 2755/QĐ-BYT and the 54 core issues. Each node has a unique, immutable ID, prerequisite links and a blueprint weight. | Must | R2 | CV4.1; CV5.1 |
| FR-CNT-03 | A mapping table lets the system switch from an interim framework to the official one on a pre-agreed date. | Should | R2 | CV5.1 |
| FR-CNT-04 | Ingestion keeps page numbers from the first step, preserves table rows and columns, figure captions and formulas, and applies OCR plus one manual correction pass to scanned texts. | Must | R1 | CV5.2; Phụ lục 2 |
| FR-CNT-05 | Every passage carries mandatory metadata: document code, chapter, lesson, section, start and end page, competency code, content type, scope of use, validity status and version. | Must | R1 | CV4.2; CV5.1 |
| FR-CNT-06 | Content whose source cannot be identified is not indexed. | Must | R1 | Phụ lục 2 |
| FR-CNT-07 | Vietnamese text is word-segmented before keyword indexing, and both accented and unaccented versions are indexed. | Must | R1 | CV5.2 |
| FR-CNT-08 | Corpus versions are controlled, and every logged answer records the corpus version it used. | Must | R1 | CV3.2 |
| FR-CNT-09 | Superseded documents are ranked down and flagged wherever they appear. | Should | R2 | Phụ lục 2 |
| FR-CNT-10 | Five structured knowledge tables (infectious diseases, vaccination schedules, epidemiological indicators, thresholds and reference values, national health programmes) are extracted semi-automatically; every record carries its source and is confirmed by an expert. | Must | R2 | CV5.2 |
| FR-CNT-11 | A knowledge graph links concepts, entities and relations, and cross-references passages, tables, figures and formulas. | Must | R2 | CV5.2; 11.5.1 |
| FR-CNT-12 | An expert-approved terminology and synonym dictionary separates variants of the same concept from similar-sounding terms with different meanings. It is never generated automatically. | Must | R2 | CV5.1 |

### Question bank and expert review

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-CNT-13 | Every question carries competency code, core issue, cognitive level, difficulty, links to source passages, an explanation, and a rationale per distractor naming the misconception. Short-answer items also carry a rubric split into scoring points. | Must | R1 | CV4.2; CV5.1 |
| FR-CNT-14 | Review runs in two independent rounds, content then psychometrics, with states draft → in review → approved or rejected. Reviewers see the source passage beside the question. | Must | R1 | CV4.2; Phụ lục 2 |
| FR-CNT-15 | Each question keeps a provenance log: author, whether AI assisted, reviewers, dates, decision, reason for change, version. | Must | R1 | CV4.2; risk (2) |
| FR-CNT-16 | Learner error reports arrive in the review queue with the question or answer and its context. | Must | R1 | CV3.4 |
| FR-CNT-17 | AI drafts MCQs and short case questions to the blueprint, covering all 54 core issues; drafts never enter the approved bank without review. | Must | R2 | CV4.2 |
| FR-CNT-18 | AI suggests difficulty, blueprint mapping and likely duplicates to reviewers; reviewers decide. | Should | R2 | CV4.2 |
| FR-CNT-19 | A pre-screening filter trained on round-1 decisions may reject drafts but never approve them; its threshold favours keeping. | Could | R2 | CV4.2 |
| FR-CNT-20 | If an AI-assisted practice tier is kept: three automated filters, source shown, and a random sample of at least 5% per month reviewed by the council. | Should | R2 | CV4.2; CV5.5 |
| FR-CNT-21 | Item statistics from real attempts (difficulty, discrimination, distractor use) feed back into review. | Should | R2 | CV6.4 |
| FR-CNT-22 | Expert-written explanations and case decision trees are stored and versioned with their question. | Must | R2 | CV5.5 |

## Functional requirements — administration and operations

R1 needs only the minimum here: accounts for a core learner group and reviewers, consent, logging and monitoring. Classes, exam scheduling and dashboards arrive in R2.

### Accounts, roles and personal data

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-ADM-01 | Central authentication with role-based access for learner, expert reviewer, lecturer, administrator and system operator. R1 needs the first two plus administrator. | Must | R1 | CV3.4; CV6.1 |
| FR-ADM-02 | Administrators can issue accounts in bulk for the R1 core learner group. | Must | R1 | CV3.4 |
| FR-ADM-03 | Users give informed consent at sign-up, including research use of their usage logs, and can withdraw it. | Must | R1 | 11.1; 11.2.2.4 |
| FR-ADM-04 | Users can view and correct their personal data and request its deletion. | Must | R1 | 11.1 |
| FR-ADM-05 | Administrators create classes, group learners by institution, control access to materials and send exam invitations by email. | Must | R2 | CV6.1 |
| FR-ADM-06 | One person has one identity and one learner profile, whether they use the chat or the web interface. | Must | R2 | CV6.1 |
| FR-ADM-07 | An immutable audit log records logins, exam starts, submissions and data edits. | Must | R2 | CV6.1; CV7.2 |

### Exam assembly and delivery

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-ADM-08 | Mock exams are drawn from approved questions by the blueprint engine and match blueprint proportions within the agreed tolerance. | Must | R1 | CV3.3; CV6.2 |
| FR-ADM-09 | Administrators assign exams to classes with time limit, start and end window, and maximum attempts. | Must | R2 | CV6.2 |
| FR-ADM-10 | Lecturers can review and adjust an assembled exam before publishing; every change is logged. | Should | R2 | CV4.2; CV6.2 |
| FR-ADM-11 | The exam client autosaves after every answer, syncs continuously, submits safely and queues requests under load. | Must | R1 | CV6.3 |
| FR-ADM-12 | Question order and option order are shuffled per session. One server-side countdown runs for the whole exam; its length is the number of questions × a configurable 60–75 s, and learners can move freely between questions. | Must | R1 | CV6.3 |
| FR-ADM-13 | An API exchanges questions and results with the exam software of the ĐH Y Hà Nội testing centre and HĐYKQG. | Should | R2 | CV6.3 |

### Logging, analytics and operations

| ID | Requirement | Priority | Release | Source |
|---|---|---|---|---|
| FR-ADM-14 | Each interaction is logged with session, query, retrieved passages, answer, citations, model version and corpus version, under a pseudonymous learner ID. | Must | R1 | CV3.2; CV4.1 |
| FR-ADM-15 | The team can see visits, chat sessions, practice questions answered and mock exams taken. | Must | R1 | CV3.4 |
| FR-ADM-16 | A standardised usage-log dataset can be exported for the MT3 and MT4 analyses. | Must | R1 | CV3.4 |
| FR-ADM-17 | Lecturers and managers see results by competency domain and cognitive level, plus item quality from real attempts. | Must | R2 | CV6.4 |
| FR-ADM-18 | Uptime, response time and errors are monitored in real time, with alerts. | Must | R1 | CV3.4; risk (4) |
| FR-ADM-19 | Data is backed up automatically to independent storage, and restore is tested. | Must | R1 | CV7.1 (brought forward to R1) |
| FR-ADM-20 | All model calls go through one orchestration layer; switching between the external API and a locally hosted model is a configuration change. | Must | R2 | 11.6.1; CV5.4 |
| FR-ADM-21 | Handover includes a deployment package with install scripts, an operations runbook, and user guides for learners, lecturers and administrators. | Must | R2 | CV7.3; 13.3 |

## Non-functional requirements

The acceptance anchors are fixed: P95 under 15 s for one chat turn at the published operating threshold, zero rejected requests, and no data loss. Capacity itself is measured, not promised. AI quality is measured on a held-out test set with double-blind expert review.

### Performance, capacity and reliability

| ID | Requirement | Target | Verified by | Release | Source |
|---|---|---|---|---|---|
| NFR-01 | Latency of one chat turn | P95 < 15 s at the published operating threshold of the generation tier | Load test at 10, 20, 30 and 50 concurrent requests, then to breaking point | R2 | 11.6.3 group 1; CV5.7 |
| NFR-02 | Behaviour above the threshold | Requests queue with a visible position; 0% rejected | Same load test | R2 | CV5.7; 11.5.2 |
| NFR-03 | Capacity of the session, retrieval and generation tiers | Measured and published per tier, not fixed in advance | Latency–throughput curves per tier | R2 | 11.5.2; 11.6.3 |
| NFR-04 | Exam integrity under load | No data loss and no session interruption in any test scenario | Load and failover tests on start, autosave, sync, submit, scoring | R1 | CV6.3; CV7.4 |
| NFR-05 | Availability | Uptime ≥ 95% | Monitoring over the release period | R1 | 11.1; CV4.3 |
| NFR-06 | Inference fallback | If local inference fails, requests route to a backup cloud API | Failover test | R2 | CV5.7 |

### AI answer and question quality

| ID | Requirement | Target | Verified by | Release | Source |
|---|---|---|---|---|---|
| NFR-07 | Displayed professional claims with a page-level citation | ≥ 95% | Automated check for passage ID and page on every claim | R1 | CV5.1; CV5.4 |
| NFR-08 | Faithfulness and grounding of chat answers | ≥ 0.80 | Double-blind expert review on the held-out set, with inter-rater agreement reported | R2 | CV5.4 |
| NFR-09 | Citation precision | ≥ 0.90 | Expert check of cited passages against claims | R2 | CV5.4 |
| NFR-10 | Accuracy of the citation post-check | ≥ 0.90 | Post-check verdicts compared with expert judgement on the same answers | R2 | CV5.4 |
| NFR-11 | Retrieval quality | Recall@k, Precision@k, MRR, nDCG reported by 5 query groups and 6 ablation configurations; no fixed target | Held-out set opened only at acceptance | R2 | CV5.3; 11.6.3 group 2, 4 |
| NFR-12 | Unsupported-claim rate and wrong-refusal rate | Measured and reported | Group 3 benchmark | R2 | 11.6.3 group 3 |
| NFR-13 | Quality of AI-assisted questions | Content accuracy ≥ 80%; misinformation ≤ 8%; CVI ≥ 0.80; expert agreement κ ≥ 0.80 | Expert review per 11.6.3 group 3 | R2 | CV4.2; Phụ lục 2 |
| NFR-14 | Digitisation quality | Character and word error rate ≤ 10%; ≥ 90% of source pages indexed; 100% of passages keep page location | Random sample against manual correction | R2 | CV5.2 |

### Security and privacy

| ID | Requirement | Target | Verified by | Release | Source |
|---|---|---|---|---|---|
| NFR-15 | No learner personal data is used to train or fine-tune any model | 0% | Data-flow review; contracts with model providers | R1 | 11.1; CV5.6 |
| NFR-16 | No personal identifiers are sent to an external model API; learner profiles stay on project-controlled infrastructure | 0 identifiers in outbound prompts | Outbound prompt audit | R1 | CV5.6 |
| NFR-17 | Encryption in transit (TLS) and at rest, with managed keys | All stores and links | Configuration review | R1 | CV7.2 |
| NFR-18 | Minimal data collection; identity, scores and session history readable only by authorised roles | Per access policy | Access review against RBAC spec | R1 | CV7.2; CV6.1 |
| NFR-19 | Hosting meets information security level 3 (NĐ 85/2016/NĐ-CP) and an ISO/IEC 27001 checklist | Level 3 | Security dossier; gap report | R2 | 8.1; CV7.2 |
| NFR-20 | Penetration test before the pilot | No open high-severity findings | Pen-test report | R2 | CV7.4 |

### Usability, maintainability and extensibility

| ID | Requirement | Target | Verified by | Release | Source |
|---|---|---|---|---|---|
| NFR-21 | Runs in desktop and mobile web browsers, in Vietnamese | Current Chrome, Safari, Edge on desktop and phone | Device test matrix | R1 | CV3.2 |
| NFR-22 | Main flows pass user acceptance testing | Login, materials, practice, mock exam, results, AI assistant | UAT with 50–100 final-year students | R2 | CV7.4 |
| NFR-23 | APIs are documented and the assistant's tool signatures frozen before UI build | OpenAPI 3.1 | Document review | R2 | CV4.1; CV5.4 |
| NFR-24 | Conversation state machine has regression tests | One test per transition | CI report | R2 | CV5.4 |
| NFR-25 | Another specialty (GP, RHM, YHCT) can be added with its own framework, blueprint and bank, without changing core code | Configuration and data only | Architecture review | R2 | 11.5.1 |

## Constraints and data

Three constraints shape every design choice: experts, not AI, decide what is correct; learner data never trains a model; and the system must run on the smaller local model as well as on the R1 cloud API.

### Legal and regulatory

- Luật Khám bệnh, chữa bệnh 15/2023/QH15 and QĐ 51/QĐ-HĐYKQG: the exam, its blueprint and the 54 core issues.
- Luật An ninh mạng; Luật Dữ liệu 60/2024/QH15; Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15; NĐ 356/2025/NĐ-CP: personal data handling.
- Luật Trí tuệ nhân tạo 134/2025/QH15 and TT 05/2026/TT-BKHCN (national AI ethics framework).
- NĐ 85/2016/NĐ-CP: information security level 3 for hosting.
- NĐ 267/2025/NĐ-CP: state ownership of results; IP held by Bộ Y tế and ĐH Y Hà Nội.
- Licences for the ~20 source texts govern excerpt length and rule out full-text download.
- Ethics committee approval before any survey or pilot data is collected.

### Design constraints

- **Human in the loop.** AI never places a question in the approved bank or in any assessed activity.
- **Deterministic before generative.** Exact facts (schedules, thresholds, indicators) come from relational tables; the language model only phrases verified results.
- **Separate paths.** The question bank and exam path is deterministic and retrieval-only; the tutoring chatbot is generative and cited. They are built and evaluated separately.
- **Controlled conversation.** A finite-state conversation manager with a closed set of 12 tools decides each step; the model classifies intent only when rules cannot. **R1 override:** R1 uses a RAG tool loop with a closed tool set and three code guards instead (see `04-agentic-core.md`); the state machine is an R2 target.
- **Model independence.** All model calls pass through one orchestration layer (the model gateway).
- **Model tiers.** 7–8B for real-time chat; 13–15B for batch work (extraction, annotation, question drafting); 24–32B for citation post-check, short-answer grading and real-time fallback.
- **Capability floor.** R1 runs on an external API, but prompts and limits are designed for the smaller local model from day one. The switch to local hosting needs a signed decision record covering quality, faithfulness, latency, throughput, cost and GPU use.
- **No generative fine-tuning.** Only the reranker may be tuned on project-owned data; the embedding model is chosen once and changed at most once, at a set milestone, if the gain clears a pre-set threshold, because a change means re-embedding the whole corpus.
- **One database.** A single relational database with vector search holds the knowledge base, glossary, question bank and competency framework together.

### Data groups

| Data group | What it holds | Personal data | Handling |
|---|---|---|---|
| Competency framework | Four-level tree, immutable IDs, prerequisites, blueprint weights | No | The key every other group points to |
| Knowledge base | ~2,000 pages from 20 texts as ~5,000 passages with metadata and vectors; knowledge graph; 5 structured tables (1,500–2,500 records) | No | Licensed content; excerpt limits apply |
| Glossary | 1,500–2,000 expert-approved terms and synonyms | No | Expert-approved only |
| Question bank | Questions, distractor rationales, source links, rubrics, review log, item statistics | Reviewer names only | Provenance kept for every version |
| Learner profile | Account, consent, attempts, options chosen, timing, mastery, study plan, free-time slots, chat session state | Yes | Project infrastructure only; never used for training |
| Learning analytics | Interaction logs, usage metrics, research exports | Yes, pseudonymised | Research use under consent and ethics approval |
| System | Users, roles, audit log, configuration, model and corpus versions | Yes | Audit log is immutable |

