# 08 — Quality and acceptance

## Acceptance metrics owned by the IT team

**Phase:** these are the project's acceptance targets (binding at R2 acceptance, most requirement IDs are R2). For R1.0 go-live they are **measured and reported** (eval run 2 and load-test reports by 20/12), not pass/fail gates, except NFR-04, NFR-05 and NFR-07, which are R1.0 requirements.

| Area | Metric | Target | How measured |
|---|---|---|---|
| Chat (CV4.4) | Citation precision | ≥ 0.90 | Expert check of cited passages against claims (NFR-09) |
| | Faithfulness / grounding | ≥ 0.80 | Double-blind expert review on the held-out set (NFR-08) |
| | Post-check accuracy | ≥ 0.90 | Post-check verdicts vs expert judgement on the same answers (NFR-10) |
| | Page-level citation coverage of displayed claims | ≥ 95 % | Automated check: passage ID + page on every claim (NFR-07) |
| Retrieval | Recall@k, Precision@k, MRR, nDCG by query group; ablation configurations | Measured and reported, no fixed target | Held-out set opened only at acceptance (NFR-11) |
| Operations | Chat-turn latency | P95 < 15 s at the published operating threshold | Load test at 10, 20, 30, 50 concurrent requests, then to breaking point (NFR-01) |
| | Over threshold | Queue with visible position; 0 % rejected (NFR-02) | Same load test |
| | Exam integrity | No data loss, no session interruption (NFR-04) | Load + failover tests on start, autosave, sync, submit, scoring |
| | Availability | Uptime ≥ 95 % (NFR-05) | Monitoring |
| Question quality (CV3.2, with experts) | Content accuracy · misinformation · CVI · expert agreement κ | ≥ 80 % · ≤ 8 % · ≥ 0.80 · ≥ 0.80 | Expert review; IT builds the tooling and computes the numbers |

Known risks on the numbers: κ ≥ 0.80 has no supporting literature (closest: ICC = 0.62 among 6 experts, Law et al. 2025) — run a pilot review round early. "Misinformation" for the ≤ 8 % target needs a written definition before measuring.

Also measure and report (no target): correct-refusal rate on adversarial questions; recall drop under noisy queries; unsupported-claim and wrong-refusal rates (NFR-12).

## Evaluation sets

- **Golden set** of 200–300 questions with expected answers and source pages, written by experts (first part by 29/11, complete by 13/12). Kept out of prompt tuning; versioned.
- **Ablations**: retrieval configurations (BM25 only, dense only, hybrid, hybrid + rerank, chunk size), CoT on/off, post-check tier 2 on/off.
- Eval harness runs in CI on demand and writes a dated report (run 1: 29/11, run 2: 20/12).

## Tests expected in code

- Unit tests: Elo updates, FSRS scheduling (fixed seeds/params), priority ordering and stability, card creation rules, exam timer and auto-submit, post-check tier 1 (ID membership, quote match, number match), pre-gate declines.
- Integration: chat SSE states (`queued`, `answering`, `checking_sources`, final states), exam autosave/resume after disconnect, idempotent retries.
- Safety regression suite: patient-specific advice prompts → `declined`; out-of-corpus questions → `insufficient_evidence`; no response contains a predicted score.
- Accessibility smoke: touch targets ≥ 44 px, labels on icon buttons, contrast.

## Release gates

| Gate | Date | Must pass |
|---|---|---|
| Alpha | 30/11 | Onboarding, chat (real API), học phần practice on a test build; crash-free on test devices |
| Feature freeze | 13/12 | All R1.0 screens; UAT with PI and experts; approved question set loaded |
| Store submission | 16/12 | Privacy policy URL, account deletion, demo account, Data safety form, AI-content reporting, medical disclaimer |
| Go-live | ≤ 31/12 | Eval run 2 and load test reports; monitoring and backups verified (restore tested) |

## Checks added after the 11/10 design review

- **Trace honesty:** every `step` event in a chat log maps to a real tool call or pipeline stage in the server log for the same request; automated test on the evaluation set.
- **Adaptation summary honesty:** each line on "Gia sư đang điều chỉnh" equals the stored result of that attempt (graded count, competencies updated, cards created, tomorrow reordered); lines with zero are not shown. Unit test on the summary builder.
- **Suggestions:** chat and Home suggestions reference only approved items; no write happens without a tap (UI test).
- **Clarification:** fires only for glossary-flagged ambiguous terms or multi-sense retrieval; tracked rate in the evaluation report.
- **No prediction:** snapshot test over all learner screens and ministry dashboards for pass probability, predicted score or pass line.
- **Reduced motion:** adapting screen and chat trace render static under `prefers-reduced-motion`.
