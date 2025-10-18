/**
 * Context Types for Multi-Agent Context Isolation
 * 
 * Defines context scopes for different agent types to prevent
 * context pollution and reduce worker memory footprint by 90%+
 */

/**
 * Agent types that can request context
 */
export type AgentType = 'pm' | 'worker' | 'qc';

/**
 * Context scope configuration
 */
export interface ContextScope {
  type: AgentType;
  allowedFields: string[];
  description: string;
}

/**
 * Minimal context for worker agents
 * Only includes essential fields needed for task execution
 */
export interface WorkerContext {
  // Core task identification
  taskId: string;
  title: string;
  
  // Essential execution data
  requirements: string;
  description?: string;
  
  // References (limited)
  files?: string[];
  dependencies?: string[];
  
  // Agent roles
  workerRole?: string;
  
  // Retry tracking
  attemptNumber?: number;
  maxRetries?: number;
  
  // Error context (only present for retry tasks) - can be string (JSON) or object
  errorContext?: any;
  
  // Metadata
  status?: string;
  priority?: string;
}

/**
 * Full context for PM agents
 * Includes all research, notes, and planning data
 */
export interface PMContext extends WorkerContext {
  // Full research and planning data
  research?: {
    alternatives?: string[];
    references?: string[];
    notes?: string[];
    estimatedComplexity?: string;
  };
  
  // Complete subgraph
  fullSubgraph?: {
    nodes: any[];
    edges: any[];
  };
  
  // Planning metadata
  planningNotes?: string[];
  architectureDecisions?: string[];
  
  // Complete file list (not limited)
  allFiles?: string[];
  
  // Any additional PM-specific data
  [key: string]: any;
}

/**
 * QC agent context
 * Includes requirements and validation data
 */
export interface QCContext extends WorkerContext {
  // Original requirements for comparison
  originalRequirements: string;
  
  // Worker output to verify
  workerOutput?: any;
  
  // Verification criteria/rules to apply (can be string JSON or object)
  verificationCriteria?: any;
  
  // QC agent role
  qcRole?: string;
}

/**
 * Context filtering options
 */
export interface ContextFilterOptions {
  agentType: AgentType;
  agentId: string;
  includeErrorContext?: boolean;
  maxFiles?: number; // Limit file list size
  maxDependencies?: number; // Limit dependency list size
}

/**
 * Context size metrics
 */
export interface ContextMetrics {
  originalSize: number; // bytes
  filteredSize: number; // bytes
  reductionPercent: number; // 0-100
  fieldsRemoved: string[];
  fieldsRetained: string[];
}

/**
 * Default context scopes for each agent type
 */
export const DEFAULT_CONTEXT_SCOPES: Record<AgentType, ContextScope> = {
  pm: {
    type: 'pm',
    allowedFields: ['*'], // PM gets everything
    description: 'Full context including research, notes, and planning data'
  },
  worker: {
    type: 'worker',
    allowedFields: [
      'taskId',
      'title',
      'requirements',
      'description',
      'files',
      'dependencies',
      'errorContext',
      'status',
      'priority'
    ],
    description: 'Minimal task-specific context only'
  },
  qc: {
    type: 'qc',
    allowedFields: [
      'taskId',
      'title',
      'requirements',
      'originalRequirements',
      'description',
      'dependencies',
      'workerOutput',
      'verificationRules',
      'status'
    ],
    description: 'Requirements and validation data for verification'
  }
};
