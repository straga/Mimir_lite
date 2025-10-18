/**
 * Context Manager - Multi-Agent Context Isolation
 * 
 * Filters task context based on agent type to prevent context pollution
 * and reduce worker memory footprint by 90%+
 */

import type {
  AgentType,
  WorkerContext,
  PMContext,
  QCContext,
  ContextFilterOptions,
  ContextMetrics,
  DEFAULT_CONTEXT_SCOPES
} from '../types/context.types.js';
import { DEFAULT_CONTEXT_SCOPES as SCOPES } from '../types/context.types.js';
import type { IGraphManager } from '../types/IGraphManager.js';

export class ContextManager {
  constructor(private graphManager: IGraphManager) {}

  /**
   * Filter context for a specific agent type
   * Reduces context size by 90%+ for workers
   */
  filterForAgent(
    fullContext: PMContext,
    agentType: AgentType,
    options?: Partial<ContextFilterOptions>
  ): WorkerContext | PMContext | QCContext {
    const scope = SCOPES[agentType];
    
    switch (agentType) {
      case 'pm':
        // PM gets full context
        return fullContext;
      
      case 'worker':
        return this.filterForWorker(fullContext, options);
      
      case 'qc':
        return this.filterForQC(fullContext, options);
      
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Filter context for worker agent
   * Only includes essential fields for task execution
   */
  private filterForWorker(
    fullContext: PMContext,
    options?: Partial<ContextFilterOptions>
  ): WorkerContext {
    const maxFiles = options?.maxFiles ?? 10;
    const maxDependencies = options?.maxDependencies ?? 5;
    const includeErrorContext = options?.includeErrorContext ?? true;

    const workerContext: WorkerContext = {
      taskId: fullContext.taskId,
      title: fullContext.title,
      requirements: fullContext.requirements,
      description: fullContext.description,
      status: fullContext.status,
      priority: fullContext.priority
    };

    // Add worker role if present
    if (fullContext.workerRole) {
      workerContext.workerRole = fullContext.workerRole;
    }

    // Add attempt tracking
    if (fullContext.attemptNumber !== undefined) {
      workerContext.attemptNumber = fullContext.attemptNumber;
    }
    if (fullContext.maxRetries !== undefined) {
      workerContext.maxRetries = fullContext.maxRetries;
    }

    // Limit file list size to prevent context bloat
    if (fullContext.files && fullContext.files.length > 0) {
      workerContext.files = fullContext.files.slice(0, maxFiles);
    }

    // Limit dependencies
    if (fullContext.dependencies && fullContext.dependencies.length > 0) {
      workerContext.dependencies = fullContext.dependencies.slice(0, maxDependencies);
    }

    // Include error context only for retry tasks (pass through as-is, could be string or object)
    if (includeErrorContext && fullContext.errorContext) {
      workerContext.errorContext = fullContext.errorContext;
    }

    return workerContext;
  }

  /**
   * Filter context for QC agent
   * Includes requirements and validation data
   */
  private filterForQC(
    fullContext: PMContext,
    options?: Partial<ContextFilterOptions>
  ): QCContext {
    const workerContext = this.filterForWorker(fullContext, options);

    return {
      ...workerContext,
      originalRequirements: fullContext.requirements,
      workerOutput: (fullContext as any).workerOutput,
      verificationCriteria: (fullContext as any).verificationCriteria,
      qcRole: (fullContext as any).qcRole
    };
  }

  /**
   * Calculate context size reduction metrics
   * Used to verify we're achieving 90%+ reduction for workers
   */
  calculateReduction(
    fullContext: PMContext,
    filteredContext: WorkerContext | QCContext
  ): ContextMetrics {
    const fullSize = this.calculateSize(fullContext);
    const filteredSize = this.calculateSize(filteredContext);
    const reductionPercent = ((fullSize - filteredSize) / fullSize) * 100;

    const fullKeys = new Set(Object.keys(fullContext));
    const filteredKeys = new Set(Object.keys(filteredContext));
    
    const fieldsRemoved = Array.from(fullKeys).filter(k => !filteredKeys.has(k));
    const fieldsRetained = Array.from(filteredKeys);

    return {
      originalSize: fullSize,
      filteredSize,
      reductionPercent,
      fieldsRemoved,
      fieldsRetained
    };
  }

  /**
   * Calculate size of context object in bytes
   */
  private calculateSize(context: any): number {
    const json = JSON.stringify(context);
    // Use Buffer for accurate byte count (handles UTF-8)
    return Buffer.byteLength(json, 'utf8');
  }

  /**
   * Get task context from graph and filter based on agent type
   * This is the main entry point for retrieving filtered context
   * Returns both the filtered context and metrics about the reduction
   */
  async getFilteredTaskContext(
    taskId: string,
    agentType: AgentType,
    options?: Partial<ContextFilterOptions>
  ): Promise<{
    context: WorkerContext | PMContext | QCContext;
    metrics: ContextMetrics;
  }> {
    // Fetch task from graph
    const taskNode = await this.graphManager.getNode(taskId);
    if (!taskNode) {
      throw new Error(`Task not found`);
    }

    // Build full PM context from node properties
    let fullContext: PMContext = {
      taskId: taskNode.id,
      title: taskNode.properties.title || '',
      requirements: taskNode.properties.requirements || '',
      description: taskNode.properties.description,
      files: taskNode.properties.files || [],
      dependencies: taskNode.properties.dependencies || [],
      errorContext: taskNode.properties.errorContext,
      status: taskNode.properties.status,
      priority: taskNode.properties.priority,
      research: taskNode.properties.research,
      fullSubgraph: taskNode.properties.fullSubgraph,
      planningNotes: taskNode.properties.planningNotes,
      architectureDecisions: taskNode.properties.architectureDecisions,
      allFiles: taskNode.properties.allFiles
    };

    // Add fields needed for worker/QC contexts
    if (taskNode.properties.workerRole) fullContext.workerRole = taskNode.properties.workerRole;
    if (taskNode.properties.qcRole) fullContext.qcRole = taskNode.properties.qcRole;
    if (taskNode.properties.verificationCriteria) fullContext.verificationCriteria = taskNode.properties.verificationCriteria;
    if (taskNode.properties.workerOutput) fullContext.workerOutput = taskNode.properties.workerOutput;
    if (taskNode.properties.attemptNumber !== undefined) fullContext.attemptNumber = taskNode.properties.attemptNumber;
    if (taskNode.properties.maxRetries !== undefined) fullContext.maxRetries = taskNode.properties.maxRetries;

    // If PM agent and subgraph not already cached, fetch it
    if (agentType === 'pm' && !fullContext.fullSubgraph) {
      try {
        const subgraph = await this.graphManager.getSubgraph(taskId, 2);
        fullContext.fullSubgraph = subgraph as any;
      } catch (err) {
        // Subgraph fetch failed, continue without it
        console.warn(`Failed to fetch subgraph for task ${taskId}:`, err);
      }
    }

    // Filter based on agent type
    const filteredContext = this.filterForAgent(fullContext, agentType, options);
    
    // Calculate metrics
    const metrics = this.calculateReduction(fullContext, filteredContext as any);
    
    return {
      context: filteredContext,
      metrics
    };
  }

  /**
   * Validate that worker context meets size requirements
   * Should be <10% of PM context
   */
  validateContextReduction(
    fullContext: PMContext,
    workerContext: WorkerContext
  ): { valid: boolean; metrics: ContextMetrics } {
    const metrics = this.calculateReduction(fullContext, workerContext);
    const valid = metrics.reductionPercent >= 90; // At least 90% reduction

    return { valid, metrics };
  }

  /**
   * Get context scope for agent type
   */
  getScope(agentType: AgentType) {
    return SCOPES[agentType];
  }
}
