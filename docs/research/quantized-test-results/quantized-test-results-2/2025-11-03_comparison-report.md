# Quantized Preamble Testing Report

**Date:** 2025-11-03T04:13:25.826Z
**Server:** http://192.168.1.167:11434
**Benchmark:** quantized-preamble-benchmark.json

## Results Summary

| Preamble | Model | Score | Tool Calls | Duration (s) | Status |
|----------|-------|-------|------------|-------------|--------|
| baseline-no-instructions | deepseek-coder:6.7b | 64/100 | 0 | 155.0 | ⚠️ Low |
| claudette-mini | deepseek-coder:6.7b | 88/100 | 0 | 150.6 | ✅ Pass |
| baseline-no-instructions | phi4-mini:3.8b | 56/100 | 0 | 23.8 | ⚠️ Low |
| claudette-mini | phi4-mini:3.8b | 66/100 | 0 | 10.4 | ⚠️ Low |
| baseline-no-instructions | qwen2.5-coder:1.5b-base | 19/100 | 0 | 638.9 | ⚠️ Low |
| claudette-mini | qwen2.5-coder:1.5b-base | 76/100 | 0 | 6.5 | ⚠️ Low |

## Score Breakdown by Preamble

### Preamble Effectiveness Summary

This section shows whether preambles actually affect model behavior:

| Preamble | Avg Score | Avg Tools | Improvement vs Baseline |
|----------|-----------|-----------|------------------------|
| baseline-no-instructions | 46.3/100 | 0.0 | (baseline) |
| claudette-mini | 76.7/100 | 0.0 | +30.3 pts (+65.5%) |

### baseline-no-instructions

**Average Score:** 46.3/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 64/100 | 0 | 155.0s |
| phi4-mini:3.8b | 56/100 | 0 | 23.8s |
| qwen2.5-coder:1.5b-base | 19/100 | 0 | 638.9s |

### claudette-mini

**Average Score:** 76.7/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 88/100 | 0 | 150.6s |
| phi4-mini:3.8b | 66/100 | 0 | 10.4s |
| qwen2.5-coder:1.5b-base | 76/100 | 0 | 6.5s |

## Detailed Category Scores

### baseline-no-instructions + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 19 | 0 |
| Code Completeness | 10 | 0 |
| Test Coverage | 18 | 0 |
| Code Quality | 10 | 0 |
| Strategy Explanation | 7 | 0 |

### claudette-mini + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 28 | 0 |
| Test Coverage | 23 | 0 |
| Code Quality | 13 | 0 |
| Strategy Explanation | 4 | 0 |

### baseline-no-instructions + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 10 | 0 |
| Test Coverage | 15 | 0 |
| Code Quality | 7 | 0 |
| Strategy Explanation | 8 | 0 |

### claudette-mini + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 18 | 0 |
| Test Coverage | 14 | 0 |
| Code Quality | 8 | 0 |
| Strategy Explanation | 10 | 0 |

### baseline-no-instructions + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 6 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 5 | 0 |
| Code Quality | 3 | 0 |
| Strategy Explanation | 0 | 0 |

### claudette-mini + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 14 | 0 |
| Code Completeness | 28 | 0 |
| Test Coverage | 20 | 0 |
| Code Quality | 12 | 0 |
| Strategy Explanation | 2 | 0 |

