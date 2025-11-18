# Quantized Preamble Testing Report

**Date:** 2025-11-03T04:41:35.545Z
**Server:** http://192.168.1.167:11434
**Benchmark:** quantized-preamble-benchmark.json

## Results Summary

| Preamble | Model | Score | Tool Calls | Duration (s) | Status |
|----------|-------|-------|------------|-------------|--------|
| claudette-tiny | deepseek-coder:6.7b | 42/100 | 0 | 66.2 | ⚠️ Low |
| claudette-mini | deepseek-coder:6.7b | 95/100 | 0 | 134.9 | ✅ Pass |
| claudette-tiny | phi4-mini:3.8b | 70/100 | 0 | 16.2 | ⚠️ Low |
| claudette-mini | phi4-mini:3.8b | 54/100 | 0 | 5.6 | ⚠️ Low |
| claudette-tiny | qwen2.5-coder:1.5b-base | 23/100 | 0 | 9.1 | ⚠️ Low |
| claudette-mini | qwen2.5-coder:1.5b-base | 79/100 | 0 | 6.2 | ⚠️ Low |

## Score Breakdown by Preamble

### Preamble Effectiveness Summary

This section shows whether preambles actually affect model behavior:

| Preamble | Avg Score | Avg Tools | Improvement vs Baseline |
|----------|-----------|-----------|------------------------|
| claudette-tiny | 45.0/100 | 0.0 | N/A |
| claudette-mini | 76.0/100 | 0.0 | N/A |

### claudette-tiny

**Average Score:** 45.0/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 42/100 | 0 | 66.2s |
| phi4-mini:3.8b | 70/100 | 0 | 16.2s |
| qwen2.5-coder:1.5b-base | 23/100 | 0 | 9.1s |

### claudette-mini

**Average Score:** 76.0/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 95/100 | 0 | 134.9s |
| phi4-mini:3.8b | 54/100 | 0 | 5.6s |
| qwen2.5-coder:1.5b-base | 79/100 | 0 | 6.2s |

## Detailed Category Scores

### claudette-tiny + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 14 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 8 | 0 |
| Code Quality | 7 | 0 |
| Strategy Explanation | 8 | 0 |

### claudette-mini + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 20 | 0 |
| Code Completeness | 30 | 0 |
| Test Coverage | 25 | 0 |
| Code Quality | 15 | 0 |
| Strategy Explanation | 5 | 0 |

### claudette-tiny + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 18 | 0 |
| Code Completeness | 18 | 0 |
| Test Coverage | 18 | 0 |
| Code Quality | 8 | 0 |
| Strategy Explanation | 8 | 0 |

### claudette-mini + phi4-mini:3.8b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 16 | 0 |
| Code Completeness | 8 | 0 |
| Test Coverage | 13 | 0 |
| Code Quality | 8 | 0 |
| Strategy Explanation | 9 | 0 |

### claudette-tiny + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 6 | 0 |
| Code Completeness | 8 | 0 |
| Test Coverage | 5 | 0 |
| Code Quality | 4 | 0 |
| Strategy Explanation | 0 | 0 |

### claudette-mini + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 18 | 0 |
| Code Completeness | 28 | 0 |
| Test Coverage | 18 | 0 |
| Code Quality | 13 | 0 |
| Strategy Explanation | 2 | 0 |

