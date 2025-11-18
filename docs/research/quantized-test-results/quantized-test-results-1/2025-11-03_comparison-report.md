# Quantized Preamble Testing Report

**Date:** 2025-11-03T03:53:27.378Z
**Server:** http://192.168.1.167:11434
**Benchmark:** quantized-preamble-benchmark.json

## Results Summary

| Preamble | Model | Score | Tool Calls | Duration (s) | Status |
|----------|-------|-------|------------|-------------|--------|
| baseline-no-instructions | deepseek-coder:6.7b | 35/100 | 0 | 149.2 | ⚠️ Low |
| claudette-mini | deepseek-coder:6.7b | 94/100 | 0 | 373.1 | ✅ Pass |
| baseline-no-instructions | phi4-mini:3.8b | 57/100 | 0 | 23.0 | ⚠️ Low |
| claudette-mini | phi4-mini:3.8b | 66/100 | 0 | 10.6 | ⚠️ Low |
| baseline-no-instructions | phi4:14b | 99/100 | 0 | 268.1 | ✅ Pass |
| claudette-mini | phi4:14b | 98/100 | 0 | 226.5 | ✅ Pass |
| baseline-no-instructions | qwen2.5-coder:1.5b-base | 15/100 | 0 | 634.8 | ⚠️ Low |
| claudette-mini | qwen2.5-coder:1.5b-base | 78/100 | 0 | 6.3 | ⚠️ Low |
| baseline-no-instructions | gemma3:4b | 95/100 | 0 | 21.8 | ✅ Pass |
| claudette-mini | gemma3:4b | 83/100 | 0 | 21.5 | ✅ Pass |
| baseline-no-instructions | deepcoder:1.5b | 43/100 | 0 | 23.3 | ⚠️ Low |
| claudette-mini | deepcoder:1.5b | 24/100 | 0 | 53.8 | ⚠️ Low |

## Score Breakdown by Preamble

### Preamble Effectiveness Summary

This section shows whether preambles actually affect model behavior:

| Preamble | Avg Score | Avg Tools | Improvement vs Baseline |
|----------|-----------|-----------|------------------------|
| baseline-no-instructions | 57.3/100 | 0.0 | (baseline) |
| claudette-mini | 73.8/100 | 0.0 | +16.5 pts (+28.8%) |

### baseline-no-instructions

**Average Score:** 57.3/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 35/100 | 0 | 149.2s |
| phi4-mini:3.8b | 57/100 | 0 | 23.0s |
| phi4:14b | 99/100 | 0 | 268.1s |
| qwen2.5-coder:1.5b-base | 15/100 | 0 | 634.8s |
| gemma3:4b | 95/100 | 0 | 21.8s |
| deepcoder:1.5b | 43/100 | 0 | 23.3s |

### claudette-mini

**Average Score:** 73.8/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 94/100 | 0 | 373.1s |
| phi4-mini:3.8b | 66/100 | 0 | 10.6s |
| phi4:14b | 98/100 | 0 | 226.5s |
| qwen2.5-coder:1.5b-base | 78/100 | 0 | 6.3s |
| gemma3:4b | 83/100 | 0 | 21.5s |
| deepcoder:1.5b | 24/100 | 0 | 53.8s |

## Detailed Category Scores

### baseline-no-instructions + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 10 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 8 | 0 |
| Code Quality | 6 | 0 |
| Strategy Explanation | 6 | 0 |

### claudette-mini + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 30 | 0 |
| Test Coverage | 24 | 0 |
| Code Quality | 14 | 0 |
| Strategy Explanation | 6 | 0 |

### baseline-no-instructions + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 10 | 0 |
| Test Coverage | 15 | 0 |
| Code Quality | 7 | 0 |
| Strategy Explanation | 9 | 0 |

### claudette-mini + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 18 | 0 |
| Test Coverage | 15 | 0 |
| Code Quality | 7 | 0 |
| Strategy Explanation | 10 | 0 |

### baseline-no-instructions + phi4:14b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 30 | 0 |
| Test Coverage | 25 | 0 |
| Code Quality | 14 | 0 |
| Strategy Explanation | 10 | 0 |

### claudette-mini + phi4:14b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 30 | 0 |
| Test Coverage | 25 | 0 |
| Code Quality | 13 | 0 |
| Strategy Explanation | 10 | 0 |

### baseline-no-instructions + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 4 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 3 | 0 |
| Code Quality | 3 | 0 |
| Strategy Explanation | 0 | 0 |

### claudette-mini + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 28 | 0 |
| Test Coverage | 20 | 0 |
| Code Quality | 12 | 0 |
| Strategy Explanation | 2 | 0 |

### baseline-no-instructions + gemma3:4b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 30 | 0 |
| Test Coverage | 25 | 0 |
| Code Quality | 10 | 0 |
| Strategy Explanation | 10 | 0 |

### claudette-mini + gemma3:4b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 25 | 0 |
| Test Coverage | 23 | 0 |
| Code Quality | 10 | 0 |
| Strategy Explanation | 9 | 0 |

### baseline-no-instructions + deepcoder:1.5b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 15 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 12 | 0 |
| Code Quality | 4 | 0 |
| Strategy Explanation | 7 | 0 |

### claudette-mini + deepcoder:1.5b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 7 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 4 | 0 |
| Code Quality | 2 | 0 |
| Strategy Explanation | 6 | 0 |

