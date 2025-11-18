# Quantized Preamble Testing Report

**Date:** 2025-11-03T04:30:23.484Z
**Server:** http://192.168.1.167:11434
**Benchmark:** quantized-preamble-benchmark.json

## Results Summary

| Preamble | Model | Score | Tool Calls | Duration (s) | Status |
|----------|-------|-------|------------|-------------|--------|
| claudette-tiny | deepseek-coder:6.7b | 41/100 | 0 | 67.9 | ⚠️ Low |
| claudette-mini | deepseek-coder:6.7b | 69/100 | 0 | 120.8 | ⚠️ Low |
| claudette-tiny | phi4-mini:3.8b | 70/100 | 0 | 16.0 | ⚠️ Low |
| claudette-mini | phi4-mini:3.8b | 65/100 | 0 | 5.3 | ⚠️ Low |
| claudette-tiny | qwen2.5-coder:1.5b-base | 24/100 | 0 | 9.0 | ⚠️ Low |
| claudette-mini | qwen2.5-coder:1.5b-base | 79/100 | 0 | 6.2 | ⚠️ Low |

## Score Breakdown by Preamble

### Preamble Effectiveness Summary

This section shows whether preambles actually affect model behavior:

| Preamble | Avg Score | Avg Tools | Improvement vs Baseline |
|----------|-----------|-----------|------------------------|
| claudette-tiny | 45.0/100 | 0.0 | N/A |
| claudette-mini | 71.0/100 | 0.0 | N/A |

### claudette-tiny

**Average Score:** 45.0/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 41/100 | 0 | 67.9s |
| phi4-mini:3.8b | 70/100 | 0 | 16.0s |
| qwen2.5-coder:1.5b-base | 24/100 | 0 | 9.0s |

### claudette-mini

**Average Score:** 71.0/100
**Average Tool Calls:** 0.0

| Model | Score | Tool Calls | Duration |
|-------|-------|------------|----------|
| deepseek-coder:6.7b | 69/100 | 0 | 120.8s |
| phi4-mini:3.8b | 65/100 | 0 | 5.3s |
| qwen2.5-coder:1.5b-base | 79/100 | 0 | 6.2s |

## Detailed Category Scores

### claudette-tiny + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 14 | 0 |
| Code Completeness | 5 | 0 |
| Test Coverage | 8 | 0 |
| Code Quality | 6 | 0 |
| Strategy Explanation | 8 | 0 |

### claudette-mini + deepseek-coder:6.7b

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 18 | 0 |
| Code Completeness | 18 | 0 |
| Test Coverage | 16 | 0 |
| Code Quality | 10 | 0 |
| Strategy Explanation | 7 | 0 |

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
| Problem Analysis | 18 | 0 |
| Code Completeness | 10 | 0 |
| Test Coverage | 20 | 0 |
| Code Quality | 8 | 0 |
| Strategy Explanation | 9 | 0 |

### claudette-tiny + qwen2.5-coder:1.5b-base

| Category | Score | Max |
|----------|-------|-----|
| Problem Analysis | 6 | 0 |
| Code Completeness | 8 | 0 |
| Test Coverage | 6 | 0 |
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

