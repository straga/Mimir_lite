import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { CompiledStateGraph } from '@langchain/langgraph';
import fs from 'fs/promises';
import { CopilotModel } from './types.js';
import { allTools, planningTools, getToolNames } from './tools.js';
import type { StructuredToolInterface } from '@langchain/core/tools';


export interface AgentConfig {
  preamblePath: string;
  model?: CopilotModel | string;
  temperature?: number;
  maxTokens?: number;
  tools?: StructuredToolInterface[]; // Allow custom tool set
}

/**
 * Client for GitHub Copilot Chat API via copilot-api proxy
 * WITH FULL AGENT MODE (tool calling enabled) using LangChain 1.0.1 + LangGraph
 * 
 * @example
 * ```typescript
 * const client = new CopilotAgentClient({
 *   preamblePath: 'agent.md',
 *   model: CopilotModel.GPT_4_1,  // Use enum for autocomplete!
 *   temperature: 0.0,
 * });
 * await client.loadPreamble('agent.md');
 * const result = await client.execute('Debug the order processing system');
 * ```
 */
export class CopilotAgentClient {
  private llm: ChatOpenAI;
  private agent: CompiledStateGraph<any, any> | null = null;
  private systemPrompt: string = '';
  private maxIterations: number = 50; // Prevent infinite loops
  private tools: StructuredToolInterface[];

  constructor(config: AgentConfig) {
    // Use custom tools if provided, otherwise default to allTools
    this.tools = config.tools || allTools;
    
    // Use copilot-api proxy (OpenAI-compatible endpoint)
    // Default to gpt-4o which has proven function calling support
    this.llm = new ChatOpenAI({
      apiKey: 'dummy-key-not-used', // Required by OpenAI client but not used by proxy
      model: config.model || CopilotModel.GPT_4_1, // Default to GPT-4o (proven function calling)
      configuration: {
        baseURL: 'http://localhost:4141/v1', // copilot-api proxy
      },
      temperature: config.temperature || 0.0,
      maxTokens: config.maxTokens || -1, // Increased for agent mode
      streaming: false,
    });

    console.log(`🔧 Tools available (${this.tools.length}): ${this.tools.map(t => t.name).slice(0, 10).join(', ')}${this.tools.length > 10 ? '...' : ''}`);
    console.log(`🤖 Model: ${config.model || CopilotModel.GPT_4_1}`);
  }

  async loadPreamble(path: string): Promise<void> {
    this.systemPrompt = await fs.readFile(path, 'utf-8');
    
    // Add tool usage instructions to the system prompt
    const enhancedSystemPrompt = `${this.systemPrompt}

---

## IMPORTANT: TOOL USAGE

You have access to the following tools that you MUST use to complete your task:

- **run_terminal_cmd**: Execute shell commands (npm test, grep, etc.)
- **read_file**: Read file contents
- **write**: Create/overwrite files  
- **search_replace**: Edit files
- **list_dir**: List directory contents
- **grep**: Search files with regex
- **delete_file**: Delete files

**YOU MUST USE THESE TOOLS.** Do not just describe what you would do - ACTUALLY DO IT using the tools.

Example of WRONG approach:
❌ "I would run npm test to check for failures..."

Example of CORRECT approach:
✅ Use run_terminal_cmd with command "npm test testing/agentic/order-processor-v2.test.ts"
✅ Use read_file with target_file "testing/agentic/AGENTS.md"
✅ Use write to create reproduction tests

Start by using read_file to read AGENTS.md, then use run_terminal_cmd to run tests, then continue investigating with tools.`;
    
    // Create React agent using the new LangGraph API
    this.agent = createReactAgent({
      llm: this.llm,
      tools: this.tools,
      prompt: new SystemMessage(enhancedSystemPrompt),
    });

    console.log('✅ Agent initialized with tool-calling enabled using LangGraph');
  }

  async execute(task: string): Promise<{
    output: string;
    conversationHistory: Array<{ role: string; content: string }>;
    tokens: { input: number; output: number };
    toolCalls: number;
    intermediateSteps: any[];
  }> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call loadPreamble() first.');
    }

    console.log('\n🚀 Starting agent execution...\n');

    const startTime = Date.now();
    
    try {
      // LangGraph agents use messages format
      const result = await this.agent.invoke({
        messages: [new HumanMessage(task)],
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ Agent completed in ${duration}s\n`);
      
      // Debug: Log what we actually got
      console.log('📦 Result keys:', Object.keys(result));
      console.log('📦 Result type:', typeof result);
      
      // Extract the final message from LangGraph result
      const messages = (result as any).messages || [];
      const lastMessage = messages[messages.length - 1];
      const output = lastMessage?.content || 'No response generated';
      
      if (!output || output.length === 0) {
        console.warn('⚠️  WARNING: Agent returned empty output!\n');
        console.warn('Full result:', JSON.stringify(result, null, 2));
      }

      // Extract conversation history from messages
      const conversationHistory: Array<{ role: string; content: string }> = [
        { role: 'system', content: this.systemPrompt },
      ];

      // Add all messages to conversation history
      for (const message of messages) {
        const role = (message as any)._getType() === 'human' ? 'user' : 
                    (message as any)._getType() === 'ai' ? 'assistant' : 
                    (message as any)._getType() === 'system' ? 'system' : 'tool';
        
        conversationHistory.push({
          role,
          content: (message as any).content,
        });
      }

      // Count tool calls from messages
      const toolCalls = messages.filter((msg: any) => 
        msg._getType() === 'ai' && msg.tool_calls && msg.tool_calls.length > 0
      ).length;

      return {
        output,
        conversationHistory,
        tokens: {
          input: this.estimateTokens(this.systemPrompt + task),
          output: this.estimateTokens(output),
        },
        toolCalls,
        intermediateSteps: messages as any[], // Return messages as intermediate steps
      };
    } catch (error: any) {
      console.error('\n❌ Agent execution failed:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

