# On Purpose Assessment v2 — Implementation Spec

> Drop this into `/docs/assessment-v2-spec.md` in the repo.
> Claude Code: read this file and implement ALL changes described below.

---

## OVERVIEW OF CHANGES

This is a comprehensive update to the assessment covering:
1. New season determination logic (age-anchored with behavioral override)
2. Revised season questions (reduced from 8 to 5, tailored per presumed season)
3. Work/personal split on 3 ambiguous questions in expertise + passion sections
4. Copy edits: behavioral/verb rewrites replacing lofty/thought-based questions
5. Clarity rewrites on confusing questions
6. Question order shuffled so same-season questions aren't adjacent
7. Demographic changes (remove non-binary, expand life events, birth year explainer)
8. Season confidence scoring
9. Smarter narrative output for expertise/passion divergence and life complexity
10. Birth year explainer text

Total question count: ~24 displayed cards (5 season + 9 expertise + 8 passion, with 3 of those showing work/personal sub-questions). Net reduction from 25.

---

## 1. SEASON DETERMINATION — NEW LOGIC

### Old logic:
8 behavioral questions scored across all 4 seasons. Highest-scoring season wins.

### New logic:

**Step A — Age-presumed season:**

| Birth year range | Age range (approx) | Presumed season |
|---|---|---|
| 2005–2025 | 0–20 | Identity |
| 1986–2004 | 21–39 | Exploration |
| 1966–1985 | 40–59 | Influence |
| Before 1966 | 60+ | Multiplication |

**Step B — Self-select question (keep as-is):**

"Which of these sounds most like where you are right now?"

1. I'm still figuring out who I am and what I believe. I'm drawn to new experiences but don't have a clear sense of direction yet. → Identity
2. I'm trying a lot of things — new roles, new environments, new responsibilities. I'm getting reps and learning what fits. → Exploration
3. I know my lane. I'm more focused than I used to be, saying no more than I used to, and going deeper on what I'm good at. → Influence
4. I find more energy in helping others grow than doing everything myself. My biggest impact might be through other people now. → Multiplication

**Step C — Season confirmation questions (5 questions, tailored to presumed season):**

Replace the old 8-question season section. User gets 5 questions specific to their age-presumed season. These measure engagement with that season's work. All scored 1–5. Last question in each set is BS detector.

#### If presumed season = Identity:
1. I'm actively clarifying what I believe and what I'm willing to stand behind.
2. I'm building consistency between what I say and what I do.
3. I've had a conversation recently where I was honest about who I am — even when it was uncomfortable.
4. I'm investing in relationships that challenge me to understand myself better.
5. **This season has been completely fulfilling in every way.** [BS]

#### If presumed season = Exploration:
1. I've said yes to something in the last few months that I didn't feel ready for.
2. I'm discovering how I best contribute — not just what's available.
3. I'm building competency on purpose, not just collecting experiences.
4. I've gotten feedback recently that helped me see how I'm different from the people around me.
5. **I'm perfectly satisfied with where I'm at — I don't wish for anything different.** [BS]

#### If presumed season = Influence:
1. I spend the majority of my time doing the work I'm most effective at.
2. I've clarified where I should say no, and I do it consistently.
3. I've turned down a good opportunity recently because it didn't fit where I'm headed.
4. I'm actively thinking about how to get more done through others.
5. **It's always easy for me to do what's asked.** [BS]

#### If presumed season = Multiplication:
1. I've made time for someone behind me in the last month — not because I had to, but because I chose to.
2. I could name who I'm investing in right now.
3. I'm passing on stories and principles, not just instructions.
4. I care more about the mission outlasting me than about my role in it.
5. **I'm completely satisfied with every area of my life.** [BS]

**Step D — Determine final season:**

1. If age-presumed season AND self-select agree → that's the season (high confidence)
2. If they disagree by 1 step (e.g., age says Exploration, self-select says Influence) → use self-select (medium confidence)
3. If they disagree by 2+ steps → use age-presumed (low confidence), flag for narrative
4. Season confirmation score (average of non-BS questions) modifies confidence:
   - Average >= 3.5 → confirms season (confidence stays or goes up)
   - Average < 3.5 → flag for narrative ("this season's work may not feel natural yet")
   - Average < 3.0 → downgrade to low confidence
5. BS question tracked separately, excluded from confirmation average

Store in database:
- `season` — final determined season
- `season_confidence` — 'high' | 'medium' | 'low' (NEW)
- `season_presumed` — age-based presumed season (NEW)
- `season_self_select` — what they picked (NEW)
- `season_confirmation_score` — average of non-BS confirmation questions (NEW)

---

## 2. EXPERTISE QUESTIONS — REVISED

9 questions. Determines expertise stage. One BS question excluded from scoring.

**IMPORTANT: Display in shuffled order** (not grouped by season mapping). Display order shown below. Scoring mappings unchanged.

### Display order for expertise:

**Card 1 — E3 — Maps to: Exploration**
I'm more interested in getting reps than getting recognition right now.
*(unchanged)*

**Card 2 — E1 — Maps to: Influence**
I regularly invest time improving my craft, even when no one is asking me to.
*(unchanged)*

**Card 3 — E8 — Maps to: Identity [inverse scored]**
OLD: I'm still figuring out what kind of work I'm actually good at.
NEW: If someone asked what I'm best at, I'd have to think about it.

**Card 4 — E5 — Maps to: Influence**
I deliberately practice the fundamentals of my work, even when I already feel competent.
*(unchanged)*

**Card 5 — E4 — Maps to: Multiplication**
OLD: I find more energy in teaching others what I know than in doing it myself.
NEW: I find more energy in teaching others what I know how to do than in doing it myself.

**Card 6 — E2 — Maps to: Influence**
OLD: I can name the specific thing I'm known for doing well.
NEW: In the last month, someone came to me specifically because of a skill they know I have.

**Card 7 — E7 — Maps to: Influence — WORK/PERSONAL SPLIT**
OLD: The people around me would say they know exactly what I bring.
NEW (work): The people I work with would say they know exactly how I contribute.
NEW (personal): The people closest to me would say they know exactly how I contribute.
*Show as one card with two rating rows. Average both for E7's score.*

**Card 8 — E6 — Maps to: Influence**
OLD: I say no to opportunities outside my area of focus so I can go deeper on what's inside it.
NEW: I've turned down a good opportunity in the last year because it didn't fit where I'm headed.

**Card 9 — E9 — Maps to: BS [excluded from alignment]**
I'm satisfied with the level of expertise I've developed and don't feel much need to keep growing.
*(unchanged — BS questions stay thought-based intentionally)*

---

## 3. PASSION QUESTIONS — REVISED

8 questions. Determines passion stage. One BS question excluded from scoring.

**IMPORTANT: Display in shuffled order.** Display order shown below.

### Display order for passion:

**Card 1 — P2 — Maps to: Identity**
I notice problems in the world that bother me more than they seem to bother others.
*(unchanged)*

**Card 2 — P1 — Maps to: Influence**
OLD: I can name a specific person or group whose situation I feel responsible to help.
NEW: There's a specific person or group I've shown up for repeatedly — not because I had to, but because I chose to.

**Card 3 — P3 — Maps to: Exploration**
I've recently given time, money, or energy to something that didn't benefit me directly.
*(unchanged)*

**Card 4 — P7 — Maps to: Identity [inverse scored]**
OLD: I'm still figuring out what I'm actually willing to fight for.
NEW: I haven't yet found the thing I'd sacrifice comfort for.

**Card 5 — P4 — Maps to: Influence — WORK/PERSONAL SPLIT**
OLD: My passion and my daily work feel meaningfully connected.
NEW (work): My passion and my professional work feel meaningfully connected.
NEW (personal): My passion and my personal life feel meaningfully connected.
*Show as one card with two rating rows. Average both for P4's score.*

**Card 6 — P6 — Maps to: Multiplication**
OLD: I'm more energized by helping others pursue their mission than building my own.
NEW: I get more energy from investing in someone else's growth than advancing my own work.

**Card 7 — P5 — Maps to: Influence**
OLD: I've named what I won't carry so I can go deeper on what I will.
NEW: I've walked away from something I cared about because it wasn't the thing I cared about most.

**Card 8 — P8 — Maps to: BS [excluded from alignment]**
The cause or people I care about would say I show up for them consistently and without reservation.
*(unchanged — BS questions stay thought-based intentionally)*

---

## 4. DEMOGRAPHIC CHANGES

### Gender options:
OLD: Male, Female, Non-binary, Prefer not to say
NEW: Male, Female, Prefer not to say

### Birth year explainer:
Add subtle text under the birth year input:
"We use this to calibrate your questions — not to put you in a box."

### Life events:
OLD header: "Have you experienced any of these in the last 6 months?"
NEW header: "Have any of these significantly impacted where you are right now?"

Fix "Prompted" → "Promoted" (typo in original).

---

## 5. CONFIDENCE SCORING

```
if (presumedSeason === selfSelectSeason) {
  confidence = 'high'
} else if (Math.abs(seasonIndex(presumedSeason) - seasonIndex(selfSelectSeason)) === 1) {
  confidence = 'medium'
} else {
  confidence = 'low'
}

// Confirmation score can downgrade confidence
if (confirmationAverage < 3.5 && confidence === 'high') {
  confidence = 'medium'
}
if (confirmationAverage < 3.0) {
  confidence = 'low'
}
```

---

## 6. NARRATIVE ADJUSTMENTS FOR RESULTS PAGE

### Confidence-based season framing:

- **High confidence:** "You're in the season of [Season]." (direct, no hedging)
- **Medium confidence:** "You're most likely in the season of [Season], though your answers suggest you may be navigating a transition."
- **Low confidence:** "Based on where you are in life, you're likely in the season of [Season] — though your answers suggest you may be revisiting some earlier work. That's not uncommon, especially during periods of change."

### Expertise/passion divergence narrative:

If expertise stage and passion stage land in different seasons, add after the main result:

"Your expertise and passion are in different places right now. [Expertise stage description]. But [passion stage description]. That's not unusual — especially for people navigating [reference life events if checked 2+, otherwise 'multiple responsibilities or new chapters']. The work isn't to force them together. It's to be honest about where each one is."

### Life events acknowledgment:

If user checked 3+ life events, add to results:

"You're carrying a lot of transitions right now. That can make your season feel less clear — not because you're in the wrong one, but because this one is asking a lot of you."

---

## 7. DATABASE SCHEMA CHANGES

Already run in Supabase SQL Editor:

```sql
ALTER TABLE public.assessment_results
  ADD COLUMN season_confidence TEXT DEFAULT 'high',
  ADD COLUMN season_presumed TEXT,
  ADD COLUMN season_self_select TEXT,
  ADD COLUMN season_confirmation_score NUMERIC(4,2);
```

---

## 8. WORK/PERSONAL SPLIT UI

For E7 and P4, display as a single question card with two rating rows:

```
[Question text — work version]
[1] [2] [3] [4] [5]

[Question text — personal version]
[1] [2] [3] [4] [5]
```

Same card, two rows. Both must be answered to advance. Question counter counts as one question.
Score = average of both rows for that question's contribution to alignment.

---

## 9. QUESTION FLOW SUMMARY

| Step | Content | Inputs |
|---|---|---|
| Email + name | Collect, fire magic link | 2 fields |
| Demographics | DOB (with explainer text), gender (Male/Female/Prefer not to say), vocation, relationship | 4 fields |
| Life events | "Have any of these significantly impacted where you are right now?" Multi-select | Multi-select |
| Self-season | "Which of these sounds most like where you are?" 1-4 | 1 selection |
| Season confirmation | 5 tailored questions (4 scored + 1 BS) | 5 Likert |
| Expertise | 9 questions in shuffled order (2 with work/personal split = 11 inputs) | 11 Likert |
| Passion | 8 questions in shuffled order (1 with work/personal split = 9 inputs) | 9 Likert |
| Processing | 2.6s animation, compute + save | — |
| Results | Season, profile, confidence narrative, divergence narrative, scores | — |

Total displayed question cards: 22
Total scored inputs: 25 Likert
Total experience: feels like ~22 questions

---

## 10. SCORING — UNCHANGED FROM V1 (except season)

Expertise and Passion alignment scoring works exactly as before:

- Each question maps to a season: Identity (0), Exploration (1), Influence (2), Multiplication (3)
- Inverse questions are reverse-scored
- BS questions excluded from alignment
- Section score determines which season that ingredient reflects
- Compare ingredient season to behavioral season → Behind / Aligned / Ahead
- Both ingredients combined → overall alignment
- Season × Alignment → one of 12 profiles

The ONLY scoring change is how the Season itself is determined (Section 1 above).

---

## 11. ALL 12 RESULT PROFILES — UNCHANGED

| Season | Behind | Aligned | Ahead |
|---|---|---|---|
| Identity | Foundation | Groundwork | Ahead of Yourself |
| Exploration | Waiting to Launch | Wide Open | Ready to Land |
| Influence | More to Give | In the Pocket | Running on Fumes |
| Multiplication | Holding the Reins | Passing It On | Not Done Yet |

Mirror lines, descriptions, and reflection questions remain exactly as they are in v1.

---

## 12. IMPLEMENTATION ORDER

1. Update demographics (gender options, life events header + timeframe, fix "Promoted" typo, birth year explainer text)
2. Implement new season determination logic (age-presumed + self-select + confirmation)
3. Replace season questions with tailored confirmation questions per presumed season
4. Apply all copy edits to expertise questions (E2, E4, E6, E7, E8 rewrites)
5. Apply all copy edits to passion questions (P1, P4, P5, P6, P7 rewrites)
6. Implement work/personal split UI for E7 and P4
7. Implement shuffled display order for expertise and passion sections
8. Update scoring engine (new season logic, confidence scoring, split question averaging)
9. Update results page with confidence-based narrative framing
10. Update results page with divergence and life complexity narratives
11. Update API route to save new fields (season_confidence, season_presumed, season_self_select, season_confirmation_score)
12. Commit and push
