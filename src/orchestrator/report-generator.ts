interface ReportData {
  agent: string;
  benchmark: string;
  model: string;
  result: {
    output: string;
    conversationHistory: Array<{ role: string; content: string }>;
    tokens: { input: number; output: number };
    toolCalls?: number;
    intermediateSteps?: any[];
  };
  scores: {
    categories: Record<string, number>;
    total: number;
    feedback: Record<string, string>;
  };
}

export function generateReport(data: ReportData): string {
  return `
# Agent Validation Report

**Agent**: ${data.agent}
**Benchmark**: ${data.benchmark}
**Model**: ${data.model}
**Date**: ${new Date().toISOString().split('T')[0]}
**Total Score**: ${data.scores.total}/100

---

## Execution Summary

- **Tool Calls**: ${data.result.toolCalls || 0}
- **Input Tokens**: ${data.result.tokens.input}
- **Output Tokens**: ${data.result.tokens.output}
- **Total Tokens**: ${data.result.tokens.input + data.result.tokens.output}

---

## Scoring Breakdown

${Object.entries(data.scores.categories)
  .map(
    ([category, score]) => `
### ${category}: ${score} points

**Feedback**: ${data.scores.feedback[category]}
`
  )
  .join('\n')}

---

## Agent Output

\`\`\`
${data.result.output}
\`\`\`

---

## Conversation History

${data.result.conversationHistory
  .map(
    (msg) => `
### ${msg.role.toUpperCase()}

\`\`\`
${msg.content}
\`\`\`
`
  )
  .join('\n')}
`.trim();
}

