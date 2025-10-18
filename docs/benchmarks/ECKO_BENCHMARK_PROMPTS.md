# Ecko Benchmark Prompts - Inference & Single-Shot Testing

**Date:** 2025-10-16  
**Purpose:** Test Ecko's ability to infer intent, research context autonomously, and deliver complete optimized prompts in a single response without hints about what to do.

**Success Criteria:**
- ✅ Ecko checks local files (README, docs/) before web search
- ✅ Ecko researches technology/framework autonomously
- ✅ Ecko delivers all 4 sections (prompt + changes + patterns + criteria) without asking
- ✅ Ecko uses concrete values (no placeholders)
- ✅ Ecko infers target audience from language
- ✅ No follow-up questions or permission-seeking

---

## Test Prompt #1: Deliberately Vague Coding Task

**Prompt:**
```
I need to add authentication
```

**What Ecko Should Infer:**
- Technology stack: Check local files (package.json, README)
- Type: Coding task (verb: "add")
- Audience: Intermediate (simple request, no detail)
- Missing: What framework? JWT vs OAuth? Backend vs frontend?

**Expected Actions:**
1. Check README.md for project tech stack
2. Check package.json for dependencies (Express? Next.js? Django?)
3. Search "JWT authentication [framework] best practices"
4. Search "[framework] authentication implementation example"
5. Infer: Most likely JWT for API, or session-based for full-stack

**Expected Output:**
- Optimized prompt with specific framework (researched from local files)
- Concrete implementation (e.g., Express + JWT middleware)
- All 4 sections delivered
- No questions like "What framework are you using?"

**Scoring:**
- Local check performed: 25 pts
- Framework inferred correctly: 25 pts
- Concrete implementation: 25 pts
- All 4 sections: 25 pts
- **Total: /100**

---

## Test Prompt #2: Ambiguous Research Request

**Prompt:**
```
compare state management options
```

**What Ecko Should Infer:**
- Type: Research/Analysis task (verb: "compare")
- Audience: Intermediate (no specific context)
- Missing: For what framework? React? Vue? Angular?
- Missing: What criteria? Performance? Learning curve? Ecosystem?

**Expected Actions:**
1. Check local files for framework hints (package.json, tsconfig.json)
2. If no local context: Assume React (most common)
3. Search "React state management libraries 2025"
4. Search "Redux vs Zustand vs Jotai comparison"
5. Research evaluation criteria (bundle size, API complexity, performance)

**Expected Output:**
- Optimized research prompt with specific framework
- Structured comparison criteria (researched best practices)
- Citation format specified
- Synthesis framework included
- All 4 sections delivered
- No questions like "Which framework?" or "What criteria?"

**Scoring:**
- Local check performed: 20 pts
- Framework inferred/assumed: 20 pts
- Research criteria defined: 30 pts
- All 4 sections: 30 pts
- **Total: /100**

---

## Test Prompt #3: Context-Dependent Task

**Prompt:**
```
fix the tests
```

**What Ecko Should Infer:**
- Type: Debugging/Coding task (verb: "fix")
- Audience: Intermediate to expert (assumes tests exist)
- Missing: What tests? What's broken? What framework?

**Expected Actions:**
1. Check for test files (*.test.ts, *.spec.js, __tests__/)
2. Check package.json for test framework (Jest? Vitest? Mocha?)
3. Check for test script in package.json
4. Search "[test framework] common test failures"
5. Infer: User needs debugging workflow, not specific fix

**Expected Output:**
- Optimized debugging prompt for tests
- Specific test framework (researched from local files)
- Systematic debugging approach
- Verification checklist (run tests, check output, isolate failure)
- All 4 sections delivered
- No questions like "What test framework?" or "What's failing?"

**Scoring:**
- Local test files checked: 30 pts
- Framework identified: 25 pts
- Systematic approach: 25 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Test Prompt #4: Extremely Minimal Request

**Prompt:**
```
build api
```

**What Ecko Should Infer:**
- Type: Coding task (verb: "build")
- Audience: Novice to intermediate (very basic request)
- Missing: Everything (language, framework, purpose, endpoints)

**Expected Actions:**
1. Check README.md for project type/language
2. Check package.json or requirements.txt for language
3. If Node.js: Search "Express REST API best practices"
4. If Python: Search "FastAPI best practices"
5. Infer: REST API with CRUD operations (most common)
6. Assume: Basic todo/item resource (common example)

**Expected Output:**
- Optimized prompt with specific language/framework (researched)
- Complete CRUD implementation
- Standard REST conventions applied
- Testing approach included
- All 4 sections delivered
- No questions about language, framework, or purpose

**Scoring:**
- Local language detection: 25 pts
- Framework researched: 25 pts
- Complete CRUD example: 30 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Test Prompt #5: Implied Technical Depth

**Prompt:**
```
optimize the query performance
```

**What Ecko Should Infer:**
- Type: Optimization/Analysis task
- Audience: Expert (assumes existing query, performance knowledge)
- Missing: Database? ORM? Current performance metrics?

**Expected Actions:**
1. Check for database files (schema.sql, migrations/, models/)
2. Check package.json or requirements.txt for ORM (Prisma? Sequelize? SQLAlchemy?)
3. Check for database config (DATABASE_URL in .env.example)
4. Search "[database] query optimization best practices"
5. Search "[ORM] N+1 problem prevention"

**Expected Output:**
- Optimized debugging/optimization prompt
- Database/ORM identified from local files
- Systematic optimization approach (EXPLAIN, indexes, batching)
- Performance measurement criteria
- All 4 sections delivered
- No questions about database or ORM

**Scoring:**
- Local database detection: 30 pts
- ORM identified: 25 pts
- Systematic optimization: 25 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Test Prompt #6: Domain-Ambiguous Request

**Prompt:**
```
set up ci/cd
```

**What Ecko Should Infer:**
- Type: DevOps/Configuration task
- Audience: Intermediate (knows what CI/CD is)
- Missing: Platform? GitHub Actions? GitLab? CircleCI?

**Expected Actions:**
1. Check for .github/workflows/ directory
2. Check for .gitlab-ci.yml or .circleci/config.yml
3. Check package.json for test/build scripts
4. If .github/ exists: Assume GitHub Actions
5. Search "GitHub Actions [language] CI/CD best practices"

**Expected Output:**
- Optimized CI/CD setup prompt
- Platform identified from local files or assumed (GitHub Actions most common)
- Specific workflow stages (test, build, deploy)
- YAML configuration example
- All 4 sections delivered
- No questions about platform

**Scoring:**
- Local CI check performed: 30 pts
- Platform inferred correctly: 25 pts
- Complete workflow: 25 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Test Prompt #7: Cross-Domain Vagueness

**Prompt:**
```
improve error handling
```

**What Ecko Should Infer:**
- Type: Refactoring/Coding task
- Audience: Intermediate
- Missing: Frontend or backend? Framework? Current approach?

**Expected Actions:**
1. Check file structure (src/components/ = frontend, src/routes/ = backend)
2. Check package.json for framework hints
3. Read existing error handling if files referenced
4. Search "[framework] error handling patterns best practices"

**Expected Output:**
- Optimized refactoring prompt
- Context identified (frontend/backend/both)
- Framework-specific patterns researched
- Concrete implementation examples
- All 4 sections delivered
- No questions about context

**Scoring:**
- Local context detection: 30 pts
- Framework-specific patterns: 30 pts
- Concrete examples: 20 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Test Prompt #8: Intentionally Broad

**Prompt:**
```
make it faster
```

**What Ecko Should Infer:**
- Type: Performance/Optimization task
- Audience: Intermediate to expert
- Missing: What is "it"? Backend? Frontend? Database? Build process?

**Expected Actions:**
1. Check README.md for project type
2. Check package.json for scripts (build, test, start)
3. Infer from dependencies: React = frontend perf, Express = backend perf
4. Search "[technology] performance optimization best practices"
5. Provide systematic approach covering multiple areas

**Expected Output:**
- Optimized performance audit prompt
- Technology identified from local files
- Multi-layer optimization approach (frontend + backend + database)
- Measurement criteria (before/after metrics)
- All 4 sections delivered
- No questions about what "it" means

**Scoring:**
- Local technology detection: 25 pts
- Multi-layer approach: 35 pts
- Measurement criteria: 20 pts
- All 4 sections: 20 pts
- **Total: /100**

---

## Benchmark Evaluation Rubric

### Overall Scoring (Per Prompt)

**Local Context Check (0-30 pts)**
- 30: Checks multiple local files, uses findings
- 20: Checks some local files
- 10: Mentions local files but doesn't actually check
- 0: No local file checking

**Autonomous Inference (0-30 pts)**
- 30: Correctly infers all missing context without asking
- 20: Infers most context, makes 1-2 safe assumptions
- 10: Asks clarifying questions or uses excessive placeholders
- 0: Refuses to proceed without clarification

**Research Quality (0-20 pts)**
- 20: Researches relevant docs, patterns, examples
- 15: Researches some context
- 5: Minimal research
- 0: No research performed

**Output Completeness (0-20 pts)**
- 20: All 4 sections delivered (prompt + changes + patterns + criteria)
- 15: 3 sections delivered
- 10: 2 sections delivered
- 0: Incomplete or asks for feedback

**Total: /100 per prompt**

---

## Aggregate Scoring

**Per-Prompt Scores**:
1. Authentication: ___/100
2. State Management: ___/100
3. Fix Tests: ___/100
4. Build API: ___/100
5. Query Performance: ___/100
6. CI/CD: ___/100
7. Error Handling: ___/100
8. Make Faster: ___/100

**Overall Average**: ___/100

**Grade Scale**:
- 90-100: S+ (Gold Standard - Autonomous & Complete)
- 80-89: S (Production Ready)
- 70-79: A (Good, Minor Gaps)
- 60-69: B (Needs Improvement)
- <60: C-F (Significant Issues)

---

## Anti-Pattern Detection

**Watch For** (each occurrence = -10 pts):
- ❌ Asks "What framework are you using?"
- ❌ Asks "Should I include X?"
- ❌ Uses placeholders like "[TECHNOLOGY]" or "[FRAMEWORK]"
- ❌ Delivers prompt only (missing other 3 sections)
- ❌ Says "I would research..." instead of actually researching
- ❌ Skips local file checking and goes straight to web search

---

## Success Pattern Detection

**Look For** (each occurrence = +5 bonus pts):
- ✅ Explicitly states "Checked README.md, found..."
- ✅ Explicitly states "Checked package.json, detected [framework]"
- ✅ Makes informed assumption and states reasoning: "Assuming React (most common)"
- ✅ Provides 5+ concrete examples (no placeholders)
- ✅ Includes verification commands with expected output
- ✅ Adds "Common Pitfalls" section based on research

---

## Testing Instructions

**For Human Evaluator:**
1. Run Ecko with each prompt (no context provided)
2. Record actual behavior vs expected behavior
3. Score each prompt using rubric
4. Calculate aggregate score
5. Document any patterns of failure or success

**For Automated Testing:**
1. Parse Ecko's output for key indicators:
   - "Checked README.md" or "read_file README.md"
   - "Searched for [X]" or "web_search [query]"
   - All 4 sections present
   - Concrete values vs placeholders (regex: `\[.*?\]`)
   - No question marks in output (implies asking user)
2. Score automatically based on detected patterns

---

**Last Updated**: 2025-10-16  
**Version**: 1.0  
**Maintainer**: CVS Health Enterprise AI Team

