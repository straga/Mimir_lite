export type TaskExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed';
export type TaskType = 'agent' | 'transformer';

// Base properties shared by all task types
interface BaseTask {
  id: string;
  title: string;
  dependencies: string[];
  parallelGroup: number | null;
  position?: { x: number; y: number };
  order?: number; // Execution order for ungrouped tasks (top-to-bottom)
  executionStatus?: TaskExecutionStatus; // Runtime execution status
}

// Agent Task - runs worker + QC agents
export interface AgentTask extends BaseTask {
  taskType: 'agent';
  agentRoleDescription: string;
  workerPreambleId?: string; // Reference to worker preamble
  recommendedModel: string;
  prompt: string;
  context?: string;
  toolBasedExecution?: string;
  successCriteria: string[];
  estimatedDuration: string;
  estimatedToolCalls: number;
  qcRole: string; // QC Agent Role Description
  qcPreambleId?: string; // Reference to QC preamble
  verificationCriteria: string[];
  maxRetries: number;
}

// Transformer Task - runs a Lambda script between agent tasks
export interface TransformerTask extends BaseTask {
  taskType: 'transformer';
  lambdaId?: string; // Reference to Lambda script (undefined = pass-through noop)
  description?: string; // What this transformer does
  inputMapping?: string; // JSONPath or expression for input selection
  outputMapping?: string; // JSONPath or expression for output shaping
  // Resolved Lambda fields (populated at execution time)
  lambdaScript?: string; // The actual Lambda script code
  lambdaLanguage?: 'typescript' | 'javascript' | 'python';
  lambdaName?: string; // Lambda name for logging
}

// Union type for all tasks
export type Task = AgentTask | TransformerTask;

// Lambda - Script entity that can be dropped on Transformers
export interface Lambda {
  id: string;
  name: string;
  description: string;
  language: 'typescript' | 'python' | 'javascript';
  script: string; // The actual script code
  version: string;
  created: string;
  // Input/output schema hints (optional)
  inputSchema?: string;
  outputSchema?: string;
}

// Type guard to check if task is an agent task
export function isAgentTask(task: Task): task is AgentTask {
  return task.taskType === 'agent' || !('taskType' in task);
}

// Type guard to check if task is a transformer
export function isTransformerTask(task: Task): task is TransformerTask {
  return task.taskType === 'transformer';
}

export interface ProjectPlan {
  overview: {
    goal: string;
    complexity: 'Simple' | 'Medium' | 'Complex';
    totalTasks: number;
    estimatedDuration: string;
    estimatedToolCalls: number;
  };
  reasoning: {
    requirementsAnalysis: string;
    complexityAssessment: string;
    repositoryContext: string;
    decompositionStrategy: string;
    taskBreakdown: string;
  };
  tasks: Task[];
  parallelGroups: ParallelGroup[];
}

export interface ParallelGroup {
  id: number;
  name: string;
  taskIds: string[];
  color: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  agentType: 'worker' | 'qc';
  content: string;
  version: string;
  created: string;
}

export interface CreateAgentRequest {
  roleDescription: string;
  agentType: 'worker' | 'qc';
  useAgentinator?: boolean;
}
