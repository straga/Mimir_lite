import { ChatOpenAI } from '@langchain/openai';
import { CopilotModel } from '../types.js';

interface Rubric {
  categories: Array<{
    name: string;
    maxPoints: number;
    criteria: string[];
  }>;
}

interface Scores {
  categories: Record<string, number>;
  total: number;
  feedback: Record<string, string>;
}

export async function evaluateAgent(
  agentOutput: string,
  rubric: Rubric
): Promise<Scores> {
  // Use GitHub Copilot for evaluation (LLM-as-judge)
  const evaluator = new ChatOpenAI({
    apiKey: 'dummy-key-not-used', // Required by OpenAI client but not used by proxy
    model: CopilotModel.GPT_4_1, // Default to GPT-4.1
    configuration: {
      baseURL: 'http://localhost:4141/v1', // copilot-api proxy
    },
    temperature: 0.0, // Deterministic scoring
  });

  const scores: Scores = {
    categories: {},
    total: 0,
    feedback: {},
  };

  // Evaluate each category
  for (const category of rubric.categories) {
    const evaluationPrompt = `
You are an expert evaluator. Score the following agent output against this rubric category:

**Category**: ${category.name} (Max: ${category.maxPoints} points)

**Criteria**:
${category.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Agent Output**:
${agentOutput}

**Instructions**:
1. Assign a score from 0 to ${category.maxPoints} based on how well the output meets the criteria.
2. Provide brief feedback explaining the score.
3. Format your response EXACTLY as:
   SCORE: <number>
   FEEDBACK: <explanation>
`.trim();

    const response = await evaluator.invoke(evaluationPrompt);
    const responseText = response.content.toString();

    // Parse score
    const scoreMatch = responseText.match(/SCORE:\s*(\d+)/);
    const feedbackMatch = responseText.match(/FEEDBACK:\s*(.+)/s);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';

    scores.categories[category.name] = Math.min(score, category.maxPoints);
    scores.feedback[category.name] = feedback;
    scores.total += scores.categories[category.name];
  }

  return scores;
}

