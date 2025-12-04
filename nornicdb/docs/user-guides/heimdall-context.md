# Heimdall Context & Token Budget Guide

This guide explains how Heimdall manages context and token allocation with the default qwen2.5-0.5b-instruct model.

## Overview

Heimdall uses a **single-shot command architecture** - each request is independent with no conversation history accumulation. This maximizes the available context for rich system prompts while keeping responses fast.

## Token Budget Allocation

```
┌─────────────────────────────────────────────────────────────────┐
│                    32K CONTEXT WINDOW                            │
│                  (qwen2.5-0.5b-instruct max)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            SYSTEM PROMPT (12K budget)                     │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ Identity & Role (~50 tokens)                       │  │   │
│  │  │ "You are Heimdall, the AI assistant..."            │  │   │
│  │  ├────────────────────────────────────────────────────┤  │   │
│  │  │ Available Actions (~200-500 tokens)                │  │   │
│  │  │ - heimdall.watcher.status                          │  │   │
│  │  │ - heimdall.watcher.query                           │  │   │
│  │  │ - [plugin-registered actions]                      │  │   │
│  │  ├────────────────────────────────────────────────────┤  │   │
│  │  │ Cypher Query Primer (~400 tokens)                  │  │   │
│  │  │ - Basic patterns, filtering, aggregations          │  │   │
│  │  │ - Path queries, modifications, subqueries          │  │   │
│  │  ├────────────────────────────────────────────────────┤  │   │
│  │  │ Response Modes (~100 tokens)                       │  │   │
│  │  │ - ACTION MODE: JSON for operations                 │  │   │
│  │  │ - HELP MODE: Conversational for questions          │  │   │
│  │  ├────────────────────────────────────────────────────┤  │   │
│  │  │ Plugin Instructions (~variable)                    │  │   │
│  │  │ - AdditionalInstructions from plugins              │  │   │
│  │  ├────────────────────────────────────────────────────┤  │   │
│  │  │ Examples (~500 tokens)                             │  │   │
│  │  │ - 20 built-in examples for common commands         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  Total base system: ~1,200 tokens                         │   │
│  │  Available for plugins: ~10,800 tokens                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            USER MESSAGE (4K budget)                       │   │
│  │  Single-shot command from Bifrost UI                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            RESPONSE (1K max tokens)                       │   │
│  │  JSON action OR conversational help                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Default Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `NORNICDB_HEIMDALL_CONTEXT_SIZE` | 32768 | Full 32K context window |
| `NORNICDB_HEIMDALL_BATCH_SIZE` | 8192 | 8K batch for prefill |
| `NORNICDB_HEIMDALL_MAX_TOKENS` | 1024 | 1K response limit |

## How Multi-Batch Prefill Works

When the system prompt exceeds the batch size, Heimdall automatically splits it into multiple batches:

```
System Prompt (2K tokens) + User Message (500 tokens) = 2.5K total

Batch 1: [System prompt tokens 0-8191]      → KV cache stores
Batch 2: [Remaining tokens + user message]  → KV cache accumulates
                                            → Generation starts
```

The KV cache accumulates across batches, so the model "sees" the entire context when generating.

## Token Budget Constants

These constants define the allocation in `pkg/heimdall/types.go`:

```go
const (
    MaxContextTokens      = 16384  // 16K total context budget
    MaxSystemPromptTokens = 12000  // 12K for system + plugins
    MaxUserMessageTokens  = 4000   // 4K for user commands
    TokensPerChar         = 0.25   // ~4 chars per token estimate
)
```

## What Fits in the System Prompt

| Component | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| Base identity | ~50 | Fixed header |
| Available actions | 200-500 | Depends on plugin count |
| Cypher primer | ~400 | Reference guide |
| Response modes | ~100 | Action + Help modes |
| Built-in examples | ~500 | 20 comprehensive examples |
| **Base total** | **~1,200** | Before plugins |
| Plugin instructions | ~10,800 available | Plugins can add context |

## Fallback Behavior

If plugins add too many instructions and the system prompt exceeds the 12K budget, Heimdall automatically falls back to a minimal prompt:

```go
// Minimal fallback prompt (~200 tokens)
"You are Heimdall, AI assistant for NornicDB graph database.

ACTIONS:
[plugin actions only]

For queries: {"action": "heimdall.watcher.query", "params": {"cypher": "..."}}
Respond with JSON only."
```

## Performance Characteristics

### What Affects Speed

| Factor | Impact | Notes |
|--------|--------|-------|
| **MaxTokens** | High | Each output token takes ~same time |
| **GPU vs CPU** | Very High | GPU is 10-50x faster |
| **Prompt size** | Low | Only affects prefill, not generation |
| **Context/Batch size** | Minimal | Memory allocation only |

### Why Context Size Doesn't Slow Down Inference

1. **KV Cache is lazy** - Only allocates for actual tokens used
2. **Prefill is fast** - Parallel processing of input tokens
3. **Generation dominates** - 90% of time is in token generation
4. **Your prompts are small** - ~2K tokens vs 32K capacity

## Model Specifications

### qwen2.5-0.5b-instruct

| Spec | Value |
|------|-------|
| Parameters | 500M |
| Context Length | 32,768 tokens |
| Quantization | Q4_K_M recommended |
| VRAM (GPU) | ~500MB |
| RAM (CPU) | ~1GB |
| License | Apache 2.0 |

## Configuration Examples

### Default (Balanced)
```bash
NORNICDB_HEIMDALL_ENABLED=true
# Uses all defaults - 32K context, 8K batch, 1K output
```

### Memory Constrained
```bash
NORNICDB_HEIMDALL_ENABLED=true
NORNICDB_HEIMDALL_CONTEXT_SIZE=8192   # Reduce if low RAM
NORNICDB_HEIMDALL_BATCH_SIZE=2048
NORNICDB_HEIMDALL_MAX_TOKENS=512      # Shorter responses
```

### Verbose Responses
```bash
NORNICDB_HEIMDALL_ENABLED=true
NORNICDB_HEIMDALL_MAX_TOKENS=2048     # Allow longer explanations
```

## Monitoring Token Usage

The handler logs token budget information:

```
[Bifrost] Token budget: system=1247, user=156, total=1403/16384
```

If you see truncation errors, check:
1. Is MaxTokens high enough for the response?
2. Are plugins adding too many instructions?
3. Is the user message within budget?

## See Also

- [Heimdall AI Assistant](./heimdall-ai-assistant.md) - Overview and configuration
- [Heimdall Plugins](./heimdall-plugins.md) - Writing custom plugins
- [Operations - Monitoring](../operations/monitoring.md) - Prometheus metrics
