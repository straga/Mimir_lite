# Research Agent Benchmark v1.0.0

**Purpose**: Test LLM research agents on multi-source verification, synthesis quality, citation accuracy, and hallucination prevention.

**Difficulty**: Advanced (requires 10-20 sources, 5+ synthesis tasks, explicit citations)

**Estimated Time**: 30-60 minutes for competent agent

---

## PART 1: BENCHMARK PROMPT (Copy-Pastable)

```markdown
# Research Task: Multi-Paradigm State Management in Modern Web Applications

You are a senior research analyst tasked with investigating the current state of client-side state management in modern web applications (React, Vue, Angular, Svelte) as of October 2025.

## Research Questions (5 total - investigate ALL 5):

1. **Evolution & Paradigms** (2020-2025):
   - How has state management philosophy evolved from 2020 to 2025?
   - What are the current dominant paradigms (flux, atomic, signals, proxy-based, etc.)?
   - Which paradigm is gaining/losing adoption and why?

2. **Library Landscape**:
   - What are the top 5 state management libraries by npm downloads (provide exact numbers)?
   - For each library: current version, release date, bundle size, key features
   - Compare developer satisfaction scores (State of JS survey or similar)

3. **Performance Characteristics**:
   - Benchmarks: Which libraries have best/worst performance for:
     - Large state trees (10,000+ items)
     - Frequent updates (100+ updates/second)
     - Memory efficiency
   - Provide specific numbers from official benchmarks (not opinions)

4. **Framework Integration**:
   - React: Built-in solutions (Context, useReducer) vs external libraries
   - Vue: Pinia vs Vuex vs Composition API alone
   - Angular: NgRx vs Akita vs signals-based state
   - Svelte: Stores vs Svelte 5 runes
   - For each: official recommendations, adoption trends

5. **Edge Cases & Limitations**:
   - Server-side rendering (SSR) compatibility issues
   - Time-travel debugging support
   - DevTools integration quality
   - TypeScript type safety (strict mode compatibility)
   - Concurrent rendering support (React 18+)

## Requirements:

### Source Verification:
- ✅ Use ONLY official documentation (no blogs, no Stack Overflow)
- ✅ Cite EVERY source with format: "Per [Source] v[Version] ([Date]): [Finding]"
- ✅ Verify claims across 2-3 sources minimum
- ✅ Mark confidence: FACT (1 authoritative source), VERIFIED (2-3 sources), CONSENSUS (5+ sources)

### Synthesis:
- ✅ Don't just list sources - synthesize findings into coherent narrative
- ✅ Identify consensus vs. disagreements explicitly
- ✅ Provide actionable recommendations per question
- ✅ Note any version-specific differences

### Anti-Hallucination:
- ✅ If data not found in official sources, state: "Unable to verify: [claim]"
- ✅ Never assume or extrapolate without evidence
- ✅ Mark any extrapolations as "OPINION" or "INFERENCE"

### Output Format:
For each question (1-5):
```
Question [N/5]: [Question text]

FINDING: [One-sentence summary]
Confidence: [FACT / VERIFIED / CONSENSUS / MIXED / UNVERIFIED]

Detailed Synthesis:
[2-4 paragraphs integrating findings from multiple sources]

Sources:
1. [Source Name] v[Version] ([Date]): [Key point]
   URL: [full URL]
2. [Source Name] v[Version] ([Date]): [Key point]
   URL: [full URL]
3. [...]

Recommendation: [Actionable insight]
```

## Success Criteria:
- [ ] ALL 5 questions researched with synthesis
- [ ] Minimum 15 unique sources cited (3+ per question)
- [ ] ALL claims have source citations
- [ ] Zero hallucinated facts (all claims verifiable)
- [ ] Zero repetition across questions
- [ ] Actionable recommendations provided

**Time limit**: 60 minutes. Begin research now.
```

---

## PART 2: BENCHMARK SCORING RUBRIC

**Total Score**: 100 points

### Category 1: Source Verification (25 points)

**Source Quality (10 points)**:
- 10 pts: All sources are official documentation (product docs, academic papers, standards)
- 7 pts: 80%+ official sources, rest are reputable secondary (technical books, established blogs)
- 4 pts: 50%+ official sources, some tertiary (tutorials, community docs)
- 0 pts: Uses blogs, Stack Overflow, or unverified sources as primary evidence

**Citation Completeness (10 points)**:
- 10 pts: ALL claims cited with format "Per [Source] v[Version] ([Date]): [Finding]"
- 7 pts: 80%+ claims cited, format mostly correct
- 4 pts: 50%+ claims cited, format inconsistent
- 0 pts: Few/no citations or missing version/date

**Multi-Source Verification (5 points)**:
- 5 pts: Each claim verified across 2-3+ sources, confidence levels marked
- 3 pts: Most claims have 2+ sources, some confidence levels marked
- 1 pt: Mostly single-source claims
- 0 pts: No cross-referencing

### Category 2: Synthesis Quality (25 points)

**Integration (10 points)**:
- 10 pts: Findings synthesized into coherent narrative, not just listed
- 7 pts: Good synthesis with minor listing
- 4 pts: Mostly lists sources, minimal synthesis
- 0 pts: Pure source listing, no synthesis

**Consensus Identification (5 points)**:
- 5 pts: Explicitly identifies consensus vs. disagreements with evidence
- 3 pts: Notes some agreements/disagreements
- 1 pt: Vague about consensus
- 0 pts: Doesn't distinguish consensus

**Actionable Insights (10 points)**:
- 10 pts: Clear, specific, actionable recommendations per question
- 7 pts: Good recommendations but some vague
- 4 pts: Generic recommendations
- 0 pts: No recommendations or unhelpful

### Category 3: Anti-Hallucination (25 points)

**Factual Accuracy (15 points)**:
- 15 pts: ALL facts verifiable in cited sources, zero hallucinations
- 10 pts: 1-2 unverifiable claims but marked as opinion/inference
- 5 pts: 3-5 unverifiable claims
- 0 pts: 6+ unverifiable claims or major factual errors

**Claim Labeling (5 points)**:
- 5 pts: All claims labeled (FACT, VERIFIED, CONSENSUS, OPINION, INFERENCE)
- 3 pts: Most claims labeled
- 1 pt: Few claims labeled
- 0 pts: No labeling

**Handling Unknowns (5 points)**:
- 5 pts: Explicitly states "Unable to verify: [claim]" when data not found
- 3 pts: Sometimes notes gaps
- 1 pt: Rarely notes gaps
- 0 pts: Never admits gaps, fills with speculation

### Category 4: Completeness (15 points)

**Question Coverage (10 points)**:
- 10 pts: All 5 questions researched with detailed synthesis
- 7 pts: 4/5 questions complete
- 4 pts: 3/5 questions complete
- 0 pts: 2 or fewer questions complete

**Source Count (5 points)**:
- 5 pts: 15+ unique sources cited
- 3 pts: 10-14 sources cited
- 1 pt: 5-9 sources cited
- 0 pts: <5 sources cited

### Category 5: Technical Quality (10 points)

**Specificity (5 points)**:
- 5 pts: Provides exact numbers (npm downloads, bundle sizes, versions, dates)
- 3 pts: Some specific numbers
- 1 pt: Mostly qualitative claims
- 0 pts: Vague throughout

**Version Awareness (5 points)**:
- 5 pts: Notes version-specific differences when relevant
- 3 pts: Sometimes notes versions
- 1 pt: Rarely notes versions
- 0 pts: No version awareness

### Deductions (up to -20 points)

**Repetition (-5 points)**:
- Agent repeats same information across multiple questions

**Format Violations (-5 points)**:
- Doesn't use required output format per question

**Time Violations (-10 points)**:
- Exceeds 60 minutes significantly (>90 minutes)

**Incomplete Execution (-10 points)**:
- Stops mid-research without completing all questions

---

## SCORING INTERPRETATION

### Tier S+ (90-100): World-Class Research Agent
- Zero hallucinations
- Comprehensive multi-source verification
- Excellent synthesis with actionable insights
- All 5 questions complete with 15+ citations
- Professional-grade output

**Characteristics**:
- Uses only official documentation
- Every claim cited with version/date
- Clear consensus identification
- Notes gaps honestly
- Provides specific data (numbers, versions, dates)

### Tier A (80-89): Strong Research Agent
- Minimal hallucinations (1-2 minor)
- Good multi-source verification
- Strong synthesis quality
- 4-5 questions complete with 10+ citations

**Characteristics**:
- Mostly official sources
- Most claims cited
- Good synthesis
- Some specific data

### Tier B (70-79): Competent Research Agent
- Some hallucinations (3-5)
- Partial multi-source verification
- Adequate synthesis
- 3-4 questions complete with 8+ citations

**Characteristics**:
- Mix of official and secondary sources
- Some claims lack citations
- Basic synthesis
- Limited specific data

### Tier C (60-69): Basic Research Agent
- Frequent hallucinations (6-10)
- Minimal source verification
- Weak synthesis (mostly listing)
- 2-3 questions complete

**Characteristics**:
- Some tertiary sources
- Many uncited claims
- Source listing instead of synthesis
- Vague recommendations

### Tier F (<60): Inadequate Research Agent
- Extensive hallucinations (10+)
- No source verification
- No synthesis
- Incomplete research

**Characteristics**:
- Uses blogs, forums as primary sources
- Few/no citations
- Pure listing
- No recommendations

---

## SCORING TEMPLATE

```markdown
# Research Agent Benchmark Score Report

**Agent Tested**: [Agent Name/Model]
**Date**: [Date]
**Evaluator**: [Your Name]

---

## CATEGORY SCORES

### 1. Source Verification (25 points)
- Source Quality: ___/10
- Citation Completeness: ___/10
- Multi-Source Verification: ___/5
**Subtotal**: ___/25

### 2. Synthesis Quality (25 points)
- Integration: ___/10
- Consensus Identification: ___/5
- Actionable Insights: ___/10
**Subtotal**: ___/25

### 3. Anti-Hallucination (25 points)
- Factual Accuracy: ___/15
- Claim Labeling: ___/5
- Handling Unknowns: ___/5
**Subtotal**: ___/25

### 4. Completeness (15 points)
- Question Coverage: ___/10
- Source Count: ___/5
**Subtotal**: ___/15

### 5. Technical Quality (10 points)
- Specificity: ___/5
- Version Awareness: ___/5
**Subtotal**: ___/10

### 6. Deductions
- Repetition: ___/-5
- Format Violations: ___/-5
- Time Violations: ___/-10
- Incomplete Execution: ___/-10
**Subtotal**: ___/0

---

## TOTAL SCORE: ___/100

**Tier**: [S+ / A / B / C / F]

---

## DETAILED EVALUATION

### Strengths:
1. [Specific strength with example]
2. [Specific strength with example]
3. [Specific strength with example]

### Weaknesses:
1. [Specific weakness with example]
2. [Specific weakness with example]
3. [Specific weakness with example]

### Hallucination Examples (if any):
1. **Claim**: "[Uncited or false claim]"
   **Evidence**: [Why this is hallucination - no source found, contradicts official docs, etc.]

2. **Claim**: "[Uncited or false claim]"
   **Evidence**: [Why this is hallucination]

### Best Practice Examples:
1. **Citation Example**: "[Good citation format example from output]"
2. **Synthesis Example**: "[Good synthesis example showing integration]"
3. **Recommendation Example**: "[Actionable recommendation example]"

### Recommendations for Improvement:
1. [Specific actionable improvement]
2. [Specific actionable improvement]
3. [Specific actionable improvement]

---

## COMPARISON TO BASELINE

| Metric | This Agent | Baseline (Tier A) | Gap |
|--------|-----------|------------------|-----|
| Hallucinations | X | 1-2 | +/- |
| Sources Cited | X | 10+ | +/- |
| Questions Complete | X/5 | 4-5 | +/- |
| Synthesis Quality | X/10 | 7-10 | +/- |

---

## VERDICT

**Pass/Fail**: [PASS if ≥70, FAIL if <70]

**Summary**: [1-2 sentence overall assessment]

**Ready for Production?**: [YES/NO with rationale]
```

---

## BENCHMARK VALIDATION

This benchmark was designed to test:

1. **Multi-Source Verification**: Requires 15+ sources, 2-3 per claim
2. **Synthesis**: Must integrate findings, not just list sources
3. **Citation Accuracy**: Every claim must have format "Per [Source] v[Version] ([Date])"
4. **Anti-Hallucination**: All facts must be verifiable in cited sources
5. **Completeness**: All 5 questions must be researched
6. **Specificity**: Must provide exact numbers (npm downloads, bundle sizes, etc.)

**Difficulty Factors**:
- Topic is complex (state management spans 4 frameworks)
- Requires current data (October 2025)
- Performance benchmarks need exact numbers
- Version-specific differences must be noted
- Official sources can disagree (must synthesize)

**Expected Time**: 30-60 minutes for Tier A agent

**Why This Benchmark Works**:
- Tests all Claudette research principles
- Impossible to pass with hallucinations
- Requires actual source fetching (can't rely on training data)
- Forces synthesis (can't just list sources)
- Has clear, objective scoring criteria

---

## USAGE INSTRUCTIONS

### For Testing:
1. Copy Part 1 prompt exactly
2. Paste into agent interface
3. Run agent (set timer for 60 minutes)
4. Capture complete output
5. Use Part 2 rubric to score

### For Comparison:
- Test multiple agents with same prompt
- Score each using same rubric
- Compare scores objectively
- Identify patterns in failures

### For Iteration:
- Identify low-scoring categories
- Adjust agent prompts to address weaknesses
- Re-test with same benchmark
- Track improvement over versions

---

**Version**: 1.0.0
**Created**: 2025-10-15
**Framework**: Claudette Research Agent Principles
**Difficulty**: Advanced
**Estimated Time**: 30-60 minutes
