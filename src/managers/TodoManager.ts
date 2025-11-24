// ============================================================================
// TodoManager - Specialized manager for TODO and TodoList operations
// ============================================================================

import type { Node, Edge } from '../types/graph.types.js';
import type { IGraphManager } from '../types/IGraphManager.js';

export interface TodoListStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  completion_percentage: number;
}

/**
 * TodoManager - Handles todo and todoList specific operations
 * Delegates to GraphManager for core graph operations
 */
export class TodoManager {
  constructor(private graphManager: IGraphManager) {}

  // ============================================================================
  // TODO OPERATIONS
  // ============================================================================

  /**
   * Create a new todo task with default status and priority
   * 
   * Creates a todo node in the graph with 'pending' status and 'medium' priority
   * by default. Automatically generates embeddings from title and description.
   * 
   * @param properties - Todo properties (title, description, status, priority, assignee, etc.)
   * @returns Created todo node with generated ID
   * 
   * @example
   * // Create a basic todo
   * const todo = await todoManager.createTodo({
   *   title: 'Implement authentication',
   *   description: 'Add JWT-based auth with refresh tokens'
   * });
   * console.log(todo.id); // 'todo-1-1732456789'
   * console.log(todo.properties.status); // 'pending'
   * console.log(todo.properties.priority); // 'medium'
   * 
   * @example
   * // Create todo with custom status and priority
   * const urgentTodo = await todoManager.createTodo({
   *   title: 'Fix production bug',
   *   description: 'Users cannot login after deployment',
   *   status: 'in_progress',
   *   priority: 'critical',
   *   assignee: 'worker-agent-1',
   *   deadline: '2024-12-01T00:00:00Z'
   * });
   * 
   * @example
   * // Create todo with metadata for tracking
   * const featureTodo = await todoManager.createTodo({
   *   title: 'Add dark mode support',
   *   description: 'Implement theme switching with user preference persistence',
   *   priority: 'low',
   *   tags: ['ui', 'feature', 'enhancement'],
   *   estimated_hours: 8,
   *   epic: 'UI-Improvements'
   * });
   */
  async createTodo(properties: Record<string, any>): Promise<Node> {
    return this.graphManager.addNode('todo', {
      status: 'pending',
      priority: 'medium',
      ...properties
    });
  }

  /**
   * Mark a todo as complete with automatic timestamp
   * 
   * Updates the todo status to 'completed' and records the completion time.
   * Useful for tracking task completion and calculating metrics.
   * 
   * @param todoId - ID of the todo node to complete
   * @returns Updated todo node with completed status
   * 
   * @example
   * // Complete a todo after finishing work
   * const completed = await todoManager.completeTodo('todo-1-1732456789');
   * console.log(completed.properties.status); // 'completed'
   * console.log(completed.properties.completed_at); // '2024-11-24T14:30:00Z'
   * 
   * @example
   * // Complete todos in a workflow
   * const todos = await todoManager.getTodos({ status: 'in_progress' });
   * for (const todo of todos) {
   *   if (await isTaskDone(todo.id)) {
   *     await todoManager.completeTodo(todo.id);
   *     console.log(`✅ Completed: ${todo.properties.title}`);
   *   }
   * }
   * 
   * @example
   * // Complete and calculate duration
   * const todo = await todoManager.completeTodo('todo-123');
   * const started = new Date(todo.properties.started_at);
   * const completed = new Date(todo.properties.completed_at);
   * const durationHours = (completed - started) / (1000 * 60 * 60);
   * console.log(`Task took ${durationHours.toFixed(1)} hours`);
   */
  async completeTodo(todoId: string): Promise<Node> {
    return this.graphManager.updateNode(todoId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark a todo as in progress with automatic timestamp
   * 
   * Updates the todo status to 'in_progress' and records when work started.
   * Use this when an agent or user begins working on a task.
   * 
   * @param todoId - ID of the todo node to start
   * @returns Updated todo node with in_progress status
   * 
   * @example
   * // Start working on a todo
   * const todo = await todoManager.startTodo('todo-1-1732456789');
   * console.log(todo.properties.status); // 'in_progress'
   * console.log(todo.properties.started_at); // '2024-11-24T14:00:00Z'
   * 
   * @example
   * // Agent claims and starts a todo
   * const availableTodos = await todoManager.getTodos({ 
   *   status: 'pending',
   *   priority: 'high' 
   * });
   * if (availableTodos.length > 0) {
   *   const todo = availableTodos[0];
   *   await todoManager.startTodo(todo.id);
   *   console.log(`Agent started: ${todo.properties.title}`);
   * }
   * 
   * @example
   * // Start todo with additional context
   * await todoManager.startTodo('todo-123');
   * await graphManager.updateNode('todo-123', {
   *   assignee: 'worker-agent-2',
   *   notes: 'Starting implementation with TDD approach'
   * });
   */
  async startTodo(todoId: string): Promise<Node> {
    return this.graphManager.updateNode(todoId, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  /**
   * Query todos with flexible filtering
   * 
   * Retrieves todos from the graph database with optional filters.
   * Supports filtering by any property (status, priority, assignee, tags, etc.).
   * 
   * @param filters - Optional filters as key-value pairs
   * @returns Array of matching todo nodes
   * 
   * @example
   * // Get all pending todos
   * const pending = await todoManager.getTodos({ status: 'pending' });
   * console.log(`${pending.length} pending tasks`);
   * 
   * @example
   * // Get high priority todos in progress
   * const urgent = await todoManager.getTodos({
   *   status: 'in_progress',
   *   priority: 'high'
   * });
   * for (const todo of urgent) {
   *   console.log(`⚠️ ${todo.properties.title}`);
   * }
   * 
   * @example
   * // Get todos assigned to specific agent
   * const myTodos = await todoManager.getTodos({
   *   assignee: 'worker-agent-1'
   * });
   * console.log(`Agent has ${myTodos.length} assigned tasks`);
   * 
   * @example
   * // Get all todos (no filter)
   * const allTodos = await todoManager.getTodos();
   * const stats = {
   *   total: allTodos.length,
   *   pending: allTodos.filter(t => t.properties.status === 'pending').length,
   *   completed: allTodos.filter(t => t.properties.status === 'completed').length
   * };
   */
  async getTodos(filters?: Record<string, any>): Promise<Node[]> {
    return this.graphManager.queryNodes('todo', filters);
  }

  // ============================================================================
  // TODOLIST OPERATIONS
  // ============================================================================

  /**
   * Create a new todo list to organize related tasks
   * 
   * Creates a todoList node that can contain multiple todos.
   * Useful for grouping tasks by project, sprint, or feature.
   * 
   * @param properties - TodoList properties (title, description, etc.)
   * @returns Created todoList node with generated ID
   * 
   * @example
   * // Create a project todo list
   * const projectList = await todoManager.createTodoList({
   *   title: 'Authentication Feature',
   *   description: 'All tasks for implementing user authentication',
   *   project: 'user-management',
   *   sprint: 'sprint-12'
   * });
   * console.log(projectList.id); // 'todoList-1-1732456789'
   * 
   * @example
   * // Create a sprint todo list
   * const sprintList = await todoManager.createTodoList({
   *   title: 'Sprint 12 - Q4 2024',
   *   description: 'Tasks for December sprint',
   *   start_date: '2024-12-01',
   *   end_date: '2024-12-14',
   *   team: 'backend'
   * });
   * 
   * @example
   * // Create a bug fix todo list
   * const bugList = await todoManager.createTodoList({
   *   title: 'Production Hotfixes',
   *   description: 'Critical bugs found in production',
   *   priority: 'critical',
   *   tags: ['bugs', 'production', 'hotfix']
   * });
   */
  async createTodoList(properties: Record<string, any>): Promise<Node> {
    return this.graphManager.addNode('todoList', {
      archived: false,
      ...properties
    });
  }

  /**
   * Add a todo to a todo list by creating a relationship
   * 
   * Creates a 'contains' edge from the todoList to the todo node.
   * This allows organizing todos into hierarchical structures.
   * 
   * @param todoListId - ID of the todoList node
   * @param todoId - ID of the todo node to add
   * @returns The created edge relationship
   * 
   * @example
   * // Add todo to a project list
   * const list = await todoManager.createTodoList({
   *   title: 'API Development'
   * });
   * const todo = await todoManager.createTodo({
   *   title: 'Implement /users endpoint'
   * });
   * await todoManager.addTodoToList(list.id, todo.id);
   * console.log('Todo added to list');
   * 
   * @example
   * // Organize multiple todos into a sprint
   * const sprintList = await todoManager.createTodoList({
   *   title: 'Sprint 12'
   * });
   * const todoIds = ['todo-1', 'todo-2', 'todo-3'];
   * for (const todoId of todoIds) {
   *   await todoManager.addTodoToList(sprintList.id, todoId);
   * }
   * console.log(`Added ${todoIds.length} todos to sprint`);
   * 
   * @example
   * // Move todo from one list to another
   * await todoManager.removeTodoFromList('old-list-id', 'todo-123');
   * await todoManager.addTodoToList('new-list-id', 'todo-123');
   * console.log('Todo moved to new list');
   */
  async addTodoToList(todoListId: string, todoId: string): Promise<Edge> {
    return this.graphManager.addEdge(todoListId, todoId, 'contains');
  }

  /**
   * Remove a todo from a todo list by deleting the relationship
   * 
   * Deletes the 'contains' edge between todoList and todo.
   * The todo node itself is not deleted, only the relationship.
   * 
   * @param todoListId - ID of the todoList node
   * @param todoId - ID of the todo node to remove
   * @returns True if edge was deleted, false if not found
   * 
   * @example
   * // Remove completed todo from active sprint
   * const removed = await todoManager.removeTodoFromList(
   *   'sprint-12-list',
   *   'todo-123'
   * );
   * if (removed) {
   *   console.log('Todo removed from sprint');
   * }
   * 
   * @example
   * // Clean up completed todos from a list
   * const todos = await todoManager.getTodosInList('project-list');
   * const completed = todos.filter(t => t.properties.status === 'completed');
   * for (const todo of completed) {
   *   await todoManager.removeTodoFromList('project-list', todo.id);
   * }
   * console.log(`Removed ${completed.length} completed todos`);
   * 
   * @example
   * // Move todo to different list
   * const success = await todoManager.removeTodoFromList('old-list', 'todo-1');
   * if (success) {
   *   await todoManager.addTodoToList('new-list', 'todo-1');
   *   console.log('Todo moved successfully');
   * }
   */
  async removeTodoFromList(todoListId: string, todoId: string): Promise<boolean> {
    // Find and delete the edge
    const edges = await this.graphManager.getEdges(todoListId, 'out');
    const edge = edges.find(e => e.target === todoId && e.type === 'contains');
    
    if (edge) {
      return this.graphManager.deleteEdge(edge.id);
    }
    
    return false;
  }

  /**
   * Get all todos in a todo list with optional status filtering
   * 
   * Retrieves todos connected to the todoList via 'contains' edges.
   * Optionally filter by status to get only pending, in_progress, or completed todos.
   * 
   * @param todoListId - ID of the todoList node
   * @param statusFilter - Optional status filter ('pending', 'in_progress', 'completed')
   * @returns Array of todo nodes in the list
   * 
   * @example
   * // Get all todos in a sprint
   * const allTodos = await todoManager.getTodosInList('sprint-12-list');
   * console.log(`Sprint has ${allTodos.length} total todos`);
   * 
   * @example
   * // Get only pending todos from a project
   * const pending = await todoManager.getTodosInList(
   *   'project-list',
   *   'pending'
   * );
   * console.log(`${pending.length} tasks remaining`);
   * for (const todo of pending) {
   *   console.log(`- ${todo.properties.title}`);
   * }
   * 
   * @example
   * // Get in-progress todos to check status
   * const inProgress = await todoManager.getTodosInList(
   *   'sprint-list',
   *   'in_progress'
   * );
   * for (const todo of inProgress) {
   *   const started = new Date(todo.properties.started_at);
   *   const hoursActive = (Date.now() - started.getTime()) / (1000 * 60 * 60);
   *   console.log(`${todo.properties.title}: ${hoursActive.toFixed(1)}h`);
   * }
   */
  async getTodosInList(todoListId: string, statusFilter?: string): Promise<Node[]> {
    const neighbors = await this.graphManager.getNeighbors(todoListId, 'contains', 1);
    
    // Filter by status if provided
    if (statusFilter) {
      return neighbors.filter(node => 
        node.type === 'todo' && node.properties.status === statusFilter
      );
    }
    
    return neighbors.filter(node => node.type === 'todo');
  }

  /**
   * Get completion statistics for a todo list
   * 
   * Calculates total, completed, in_progress, pending counts and completion percentage.
   * Useful for progress tracking and reporting.
   * 
   * @param todoListId - ID of the todoList node
   * @returns Stats object with counts and completion percentage
   * 
   * @example
   * // Get sprint progress
   * const stats = await todoManager.getTodoListStats('sprint-12-list');
   * console.log(`Sprint Progress: ${stats.completion_percentage}%`);
   * console.log(`Completed: ${stats.completed}/${stats.total}`);
   * console.log(`In Progress: ${stats.in_progress}`);
   * console.log(`Pending: ${stats.pending}`);
   * 
   * @example
   * // Check if sprint is complete
   * const stats = await todoManager.getTodoListStats('sprint-list');
   * if (stats.completion_percentage === 100) {
   *   console.log('🎉 Sprint complete!');
   *   await todoManager.archiveTodoList('sprint-list');
   * } else {
   *   console.log(`${stats.pending} tasks remaining`);
   * }
   * 
   * @example
   * // Generate progress report for all projects
   * const lists = await todoManager.getTodoLists();
   * for (const list of lists) {
   *   const stats = await todoManager.getTodoListStats(list.id);
   *   console.log(`${list.properties.title}: ${stats.completion_percentage}%`);
   * }
   */
  async getTodoListStats(todoListId: string): Promise<TodoListStats> {
    const todos = await this.getTodosInList(todoListId);
    
    const total = todos.length;
    const completed = todos.filter(t => t.properties.status === 'completed').length;
    const in_progress = todos.filter(t => t.properties.status === 'in_progress').length;
    const pending = todos.filter(t => t.properties.status === 'pending').length;
    
    return {
      total,
      completed,
      in_progress,
      pending,
      completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Query todo lists with flexible filtering
   * 
   * Retrieves todoList nodes from the graph with optional filters.
   * Supports filtering by any property (archived, project, team, etc.).
   * 
   * @param filters - Optional filters as key-value pairs
   * @returns Array of matching todoList nodes
   * 
   * @example
   * // Get all active (non-archived) lists
   * const active = await todoManager.getTodoLists({ archived: false });
   * console.log(`${active.length} active projects`);
   * 
   * @example
   * // Get lists for a specific project
   * const projectLists = await todoManager.getTodoLists({
   *   project: 'user-management'
   * });
   * for (const list of projectLists) {
   *   const stats = await todoManager.getTodoListStats(list.id);
   *   console.log(`${list.properties.title}: ${stats.completion_percentage}%`);
   * }
   * 
   * @example
   * // Get all lists (no filter)
   * const allLists = await todoManager.getTodoLists();
   * console.log(`Total lists: ${allLists.length}`);
   */
  async getTodoLists(filters?: Record<string, any>): Promise<Node[]> {
    return this.graphManager.queryNodes('todoList', filters);
  }

  /**
   * Archive a todo list and optionally clean up completed todos
   * 
   * Marks the list as archived with timestamp. Optionally deletes all
   * completed todos to clean up the graph. Useful for sprint/project completion.
   * 
   * @param todoListId - ID of the todoList node to archive
   * @param removeCompletedTodos - If true, delete completed todos (default: false)
   * @returns Updated todoList node with archived status
   * 
   * @example
   * // Archive completed sprint
   * const archived = await todoManager.archiveTodoList('sprint-12-list');
   * console.log('Sprint archived:', archived.properties.archived_at);
   * 
   * @example
   * // Archive and clean up completed todos
   * const stats = await todoManager.getTodoListStats('project-list');
   * if (stats.completion_percentage === 100) {
   *   await todoManager.archiveTodoList('project-list', true);
   *   console.log('Project archived and completed todos removed');
   * }
   * 
   * @example
   * // Archive old sprints automatically
   * const lists = await todoManager.getTodoLists({ archived: false });
   * for (const list of lists) {
   *   const created = new Date(list.properties.created);
   *   const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
   *   if (daysOld > 30) {
   *     const stats = await todoManager.getTodoListStats(list.id);
   *     if (stats.completion_percentage === 100) {
   *       await todoManager.archiveTodoList(list.id, true);
   *       console.log(`Archived old list: ${list.properties.title}`);
   *     }
   *   }
   * }
   */
  async archiveTodoList(todoListId: string, removeCompletedTodos: boolean = false): Promise<Node> {
    if (removeCompletedTodos) {
      // Get all completed todos and delete them
      const completedTodos = await this.getTodosInList(todoListId, 'completed');
      
      for (const todo of completedTodos) {
        await this.graphManager.deleteNode(todo.id);
      }
    }

    // Mark list as archived
    return this.graphManager.updateNode(todoListId, {
      archived: true,
      archived_at: new Date().toISOString()
    });
  }

  /**
   * Unarchive a todo list to make it active again
   * 
   * Removes the archived flag and clears the archived_at timestamp.
   * Use this to reopen a previously archived list.
   * 
   * @param todoListId - ID of the todoList node to unarchive
   * @returns Updated todoList node with archived=false
   * 
   * @example
   * // Reopen an archived sprint
   * const list = await todoManager.unarchiveTodoList('sprint-12-list');
   * console.log('Sprint reopened:', list.properties.title);
   * 
   * @example
   * // Unarchive if more work is needed
   * const archivedLists = await todoManager.getTodoLists({ archived: true });
   * const listToReopen = archivedLists.find(l => 
   *   l.properties.title === 'Q4 Features'
   * );
   * if (listToReopen) {
   *   await todoManager.unarchiveTodoList(listToReopen.id);
   *   console.log('List reactivated for additional work');
   * }
   */
  async unarchiveTodoList(todoListId: string): Promise<Node> {
    return this.graphManager.updateNode(todoListId, {
      archived: false,
      archived_at: null
    });
  }

  /**
   * Complete multiple todos at once for efficiency
   * 
   * Completes specific todos by ID, or all pending todos if no IDs provided.
   * Useful for batch operations and sprint completion.
   * 
   * @param todoListId - ID of the todoList node
   * @param todoIds - Array of todo IDs to complete (if empty, completes all pending todos)
   * @returns Array of updated todo nodes with completed status
   * 
   * @example
   * // Complete specific todos
   * const completed = await todoManager.bulkCompleteTodos(
   *   'sprint-list',
   *   ['todo-1', 'todo-2', 'todo-3']
   * );
   * console.log(`Completed ${completed.length} todos`);
   * 
   * @example
   * // Complete all pending todos in a list
   * const allCompleted = await todoManager.bulkCompleteTodos('project-list');
   * console.log(`Marked ${allCompleted.length} pending todos as complete`);
   * 
   * @example
   * // Complete todos matching criteria
   * const todos = await todoManager.getTodosInList('sprint-list');
   * const lowPriorityIds = todos
   *   .filter(t => t.properties.priority === 'low' && t.properties.status === 'pending')
   *   .map(t => t.id);
   * await todoManager.bulkCompleteTodos('sprint-list', lowPriorityIds);
   * console.log(`Bulk completed ${lowPriorityIds.length} low priority tasks`);
   */
  async bulkCompleteTodos(todoListId: string, todoIds?: string[]): Promise<Node[]> {
    let todosToComplete: Node[];
    
    if (todoIds && todoIds.length > 0) {
      // Complete specific todos
      todosToComplete = await Promise.all(
        todoIds.map(id => this.graphManager.getNode(id))
      ).then(nodes => nodes.filter(n => n !== null) as Node[]);
    } else {
      // Complete all pending todos in the list
      todosToComplete = await this.getTodosInList(todoListId, 'pending');
    }
    
    return Promise.all(
      todosToComplete.map(todo => this.completeTodo(todo.id))
    );
  }
}
