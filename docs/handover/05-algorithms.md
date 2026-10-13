# 05 — Algorithms

All rules here are deterministic and must be unit-tested. Threshold values marked *config* are defaults to be tuned with experts; keep them in configuration, not code.

## 1. Learner ability and item difficulty (Elo)

Each learner has an ability θ per topic (competency node); each question has a difficulty b. Pilot scale (~300 items, 250–300 learners) is too small for multi-parameter IRT or DKT; those are future research.

```
P(correct) = 1 / (1 + exp(-(θ - b)))
θ ← θ + K  · (result − P)        result = 1 if correct, 0 otherwise
b ← b − K' · (result − P)
```

- K decreases with the learner's number of responses on the topic; K' decreases with the item's number of responses (uncertainty function, Pelánek 2016) so b stays stable with little data. *config*
- Initial b comes from the expert difficulty label at approval: easy / medium / hard → three fixed values. *config*
- A new question version restarts b from its label.
- Responses from quizzes, the diagnostic and mock exams all update θ and b. Card reviews do not.
- Learners never see b.

## 2. Mastery and "unassessed"

- Mastery level = θ mapped to bands, shown only when the learner has at least `MIN_RESPONSES` on that topic; otherwise `unassessed` (FR-LRN-37). *config — value pending, see `09-open-issues.md`*
- A learner who skips the diagnostic starts with every topic unassessed.

## 3. Topic priority

Sort topics lexicographically:

1. topics in the học phần the learner chose, before all others (FR-LRN-37);
2. within each group: assessed topics by `blueprint_weight × (1 − mastery)` descending; unassessed topics by `blueprint_weight` descending. Interleave the two lists by score, treating an unassessed topic's score as `blueprint_weight × (1 − NEUTRAL_MASTERY)`. *config, default NEUTRAL_MASTERY = 0.5*
- If a prerequisite topic is below target, lower the priority of topics that depend on it.
- A topic at target mastery on two consecutive assessments drops to maintenance (cards only); a later mock below target reopens it.
- Priority order must be stable between consecutive runs when inputs do not change (FR-LRN-25).

## 4. Next item in a unit (ZPD)

- R1.0: fixed order authored per unit; after a wrong answer insert the unit's remediation item (worked example or explanation) before the next item, with a line saying why it was added (FR-LRN-33).
- R1.1: choose the next quiz item with P(correct) in **0.6–0.8** (desirable difficulty / zone of proximal development); interleave nearby topics; Bloom gate: a "Vận dụng" item only after the learner reaches the threshold on "Nhớ" items of the topic. *config*

## 5. Spaced repetition (FSRS, proposed)

- Card memory state: stability S, difficulty D, retrievability R. R decays with elapsed time; larger S decays slower.
- Learner rates each review: Học lại (1) · Khó (2) · Tốt (3) · Dễ (4) → update S and D.
- Next due date: when predicted R falls to the learner's target retention: 85, 90 (default) or 95 %.
- Start with the library's default parameters; re-optimise once enough reviews exist; store the parameter version with each schedule.
- Intervals never extend past the exam date (learner's `exam_date`, default = the configured national exam date, editable in Account); daily caps for new cards (default 20) and reviews (default 200). *config*
- Leech: more than N lapses → label "Khó nhớ", suggest reopening the topic. *config*
- Libraries: ts-fsrs (app/TypeScript) or py-fsrs (server). Run scheduling on the server so all devices agree.
- Spec wording says "versioned interval table"; FSRS with versioned parameters satisfies reproducibility. **Pending team sign-off** (alternative: SM-2, which has no target-retention setting).

## 6. Card creation

- R1.0, rule: every wrong answer on an approved question (quiz, diagnostic, mock) creates at most one card per (learner, question): front = stem; back = correct answer + expert explanation + citation (document, page). Origin label: "Từ quiz học phần" / "Từ bài đánh giá" / "Từ đề thi thử".
- Bloom routing: wrong answers at level 1 (Nhớ, Hiểu) → card; level 2–3 (Vận dụng, Phân tích) → suggest case/unit practice instead of a card (R1.1, once Bloom labels are complete).
- R1.1, agent: proposes cards (including cloze) from the distractor the learner chose and missed rubric points, using approved glossary terms; an automated check confirms each card matches its cited passage; learners can report or suspend a card.

## 7. Mock exam assembly

- R1.0: fixed forms curated by experts to the HĐYKQG blueprint; the diagnostic is one fixed form covering all domains (3–5 medium items per domain).
- R1.1: stratified sampling by blueprint weights (core issue × cognitive level) with constraints: within tolerance of the blueprint (*pending*), difficulty spread, exposure control (prefer items the learner has not seen for longest). Greedy constrained selection is enough at this scale. Approved items only.
- Attempts: `exam_form.max_attempts` nullable (null = unlimited). The diagnostic has no limit and can be retaken any time (FR-LRN-36); mock forms default to null unless the content team sets a limit. *config*
- Exam client (FR-ADM-11/12): question and option order shuffled per session; one server-side countdown for the whole exam = number of questions × 60–75 s (*config*); free navigation; autosave after every answer; auto-submit at time-up; 5-minute warning.

## 8. Item quality (Classical Test Theory), periodic

Per approved item, from real responses: difficulty p (proportion correct), discrimination (point-biserial or upper/lower 27 %), distractor usage; KR-20 per exam form. Flag for expert re-review when p is extreme, discrimination is low, a distractor is almost never chosen, or b and p disagree strongly, or learners report errors. *thresholds config, agree with experts* (FR-CNT-21).

## 9. Bloom levels

- Three levels: **1 Nhớ, Hiểu** · **2 Vận dụng** · **3 Phân tích, Đánh giá**. AI suggests at drafting; the expert confirms at review.
- Uses: coverage matrix (54 core issues × 3 levels); blueprint constraint if HĐYKQG specifies level ratios; unit gating; gap detection (high recall accuracy but low application accuracy → tutor suggests case practice); card vs case routing; monitoring the level distribution of AI-drafted items.
- Not an input to Elo. Learners do not see the label on items; the Luyện tập filter shows "Ghi nhớ / Vận dụng / Phân tích tình huống".

## 10. Duplicate detection (authoring)

Before an AI-drafted item reaches review: embedding cosine similarity against approved items plus near-duplicate text matching; above threshold → auto-reject in prescreen with the matching item linked. *threshold config*

## 11. Daily session ("Phiên hôm nay", added 11/10)

Rules build one session per day; the learner can skip any step. Order:

1. **Due cards** (FSRS), overdue first. Cap by the daily review limit.
2. **Weak-spot practice**: 6 approved items from the competency with the most wrong answers in the last 7 days (ties: higher blueprint weight), excluding items seen in the last 14 days. R1.0: fixed set + remediation item after a wrong answer. R1.1: next item by the ZPD rule (§4).
3. **Continue**: the unfinished unit of the highest-priority học phần (§3).

Each step carries a one-line reason built from its rule inputs (shown under "Vì sao thứ tự này?" / "Vì sao câu này?"). Time estimates: cards × 30 s, items × 80 s, unit remainder × its average; show "khoảng N phút". With a daily-time setting (R1.1) or an applied plan (R2), steps are trimmed in reverse order to fit.

## 12. Memory display (Tiến độ · Nhịp học)

- Retrievability R per card comes from FSRS (§5). "Độ nhớ theo học phần" = mean R over reviewed cards of that học phần, now and at now + 7 days assuming no review. Cards never reviewed are excluded.
- "N thẻ vừa chạm ngưỡng nhớ" = cards whose R has fallen to the target retention (default 90 %) today, i.e. today's due cards.
- The "Đường ghi nhớ" chart is illustrative of the mechanism (reset to 100 % at each review, slower decay as stability grows); it may use the learner's real review dates but never claims an exam outcome.

## 13. Adaptation summary (screen "Gia sư đang điều chỉnh")

After the last item of a practice set, the server returns what the attempt changed: `graded {correct, total}`, `mastery_updated {competencies: n}`, `cards_created {n}`, `tomorrow {reordered: bool, top_item}`. The screen shows only lines with real non-zero results, in that order, then moves on. It is a presentation of work already done (≤ 3 s), not an artificial delay.
