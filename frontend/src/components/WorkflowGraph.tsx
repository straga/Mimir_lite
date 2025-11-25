import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  useOnSelectionChange,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDrop } from 'react-dnd';
import { usePlanStore } from '../store/planStore';
import { Task, AgentTemplate, Lambda, isTransformerTask, TransformerTask, AgentTask } from '../types/task';
import { Clock, Zap, User, Shield, CheckCircle, XCircle, Loader2, Trash2, Code2, ArrowRightLeft, HelpCircle, X, ChevronRight } from 'lucide-react';

// Custom Task Node Component (for AgentTask only - TransformerTask uses TransformerNode)
interface TaskNodeData {
  task: AgentTask;
  onSelect: (task: Task) => void;
  isExecuting: boolean;
}

function TaskNode({ data, selected }: { data: TaskNodeData; selected: boolean }) {
  const { task, onSelect, isExecuting } = data;
  const { agentTemplates, updateTask } = usePlanStore();
  
  // Debug: Log when execution status changes (matching TaskCard)
  useEffect(() => {
    if (task.executionStatus) {
      console.log(`🎨 TaskNode ${task.id} (${task.title}) - Status changed to: ${task.executionStatus}`);
    }
  }, [task.executionStatus, task.id, task.title]);
  
  const workerAgent = agentTemplates.find(a => a.id === task.workerPreambleId);
  const qcAgent = agentTemplates.find(a => a.id === task.qcPreambleId);

  // Drop zone for Worker Agent
  const [{ isOverWorker, canDropWorker }, dropWorker] = useDrop(() => ({
    accept: 'agent',
    canDrop: (item: AgentTemplate) => item.agentType === 'worker' && !isExecuting,
    drop: (item: AgentTemplate) => {
      updateTask(task.id, { 
        workerPreambleId: item.id,
        agentRoleDescription: item.role,
      });
    },
    collect: (monitor) => ({
      isOverWorker: monitor.isOver(),
      canDropWorker: monitor.canDrop(),
    }),
  }), [task.id, isExecuting, updateTask]);

  // Drop zone for QC Agent
  const [{ isOverQC, canDropQC }, dropQC] = useDrop(() => ({
    accept: 'agent',
    canDrop: (item: AgentTemplate) => item.agentType === 'qc' && !isExecuting,
    drop: (item: AgentTemplate) => {
      updateTask(task.id, { 
        qcPreambleId: item.id,
        qcRole: item.role,
      });
    },
    collect: (monitor) => ({
      isOverQC: monitor.isOver(),
      canDropQC: monitor.canDrop(),
    }),
  }), [task.id, isExecuting, updateTask]);

  // Remove agent handlers
  const handleRemoveWorker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExecuting) {
      updateTask(task.id, { workerPreambleId: undefined });
    }
  };

  const handleRemoveQC = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExecuting) {
      updateTask(task.id, { qcPreambleId: undefined });
    }
  };

  // Status styling (matching TaskCard)
  const getStatusStyle = () => {
    switch (task.executionStatus) {
      case 'executing':
        return 'border-yellow-500 shadow-lg shadow-yellow-500/50 ring-2 ring-yellow-500/30 animate-pulse';
      case 'completed':
        return 'border-green-500 shadow-md shadow-green-500/30';
      case 'failed':
        return 'border-red-500 shadow-md shadow-red-500/30';
      case 'pending':
        return 'border-gray-600';
      default:
        return selected ? 'border-valhalla-gold shadow-lg shadow-valhalla-gold/30' : 'border-norse-rune';
    }
  };

  const getStatusIcon = () => {
    switch (task.executionStatus) {
      case 'executing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (!isExecuting) {
      onSelect(task);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className={`bg-norse-stone border-2 rounded-lg w-64 transition-all cursor-pointer hover:border-valhalla-gold text-left ${getStatusStyle()}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Input Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-frost-ice !border-norse-night !w-3 !h-3"
      />

      {/* Header */}
      <div className="p-3 bg-norse-shadow border-b border-norse-rune">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-100 text-sm truncate flex-1">
            {task.title}
          </span>
          {getStatusIcon()}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{task.estimatedDuration}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>{task.estimatedToolCalls} calls</span>
          </div>
        </div>
      </div>

      {/* Agents Info - Drop Zones */}
      <div className="p-2 space-y-1">
        {/* Worker Agent Drop Zone */}
        <div 
          ref={dropWorker}
          className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-all ${
            isOverWorker && canDropWorker
              ? 'bg-frost-ice/30 border border-frost-ice'
              : canDropWorker
              ? 'bg-frost-ice/10 border border-dashed border-frost-ice/50'
              : workerAgent
              ? 'bg-norse-shadow'
              : 'bg-norse-shadow/50'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <User className="w-3 h-3 text-frost-ice flex-shrink-0" />
            <span className={`truncate ${workerAgent ? 'text-gray-200' : 'text-gray-500 italic'}`}>
              {workerAgent?.name || 'Drop worker here'}
            </span>
          </div>
          {workerAgent && !isExecuting && (
            <button
              type="button"
              onClick={handleRemoveWorker}
              className="ml-1 p-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Remove worker"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* QC Agent Drop Zone */}
        <div 
          ref={dropQC}
          className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-all ${
            isOverQC && canDropQC
              ? 'bg-magic-rune/30 border border-magic-rune'
              : canDropQC
              ? 'bg-magic-rune/10 border border-dashed border-magic-rune/50'
              : qcAgent
              ? 'bg-norse-shadow'
              : 'bg-norse-shadow/50'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Shield className="w-3 h-3 text-magic-rune flex-shrink-0" />
            <span className={`truncate ${qcAgent ? 'text-gray-200' : 'text-gray-500 italic'}`}>
              {qcAgent?.name || 'Drop QC here'}
            </span>
          </div>
          {qcAgent && !isExecuting && (
            <button
              type="button"
              onClick={handleRemoveQC}
              className="ml-1 p-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Remove QC"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Parallel Group Badge */}
      {task.parallelGroup !== null && (
        <div className="px-2 pb-2">
          <span className="inline-block px-2 py-0.5 text-xs bg-frost-ice/20 text-frost-ice rounded-full">
            Group {task.parallelGroup}
          </span>
        </div>
      )}

      {/* Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-valhalla-gold !border-norse-night !w-3 !h-3"
      />
    </button>
  );
}

// Transformer Node Component - for Lambda scripts
interface TransformerNodeData {
  task: TransformerTask;
  onSelect: (task: Task) => void;
  isExecuting: boolean;
}

function TransformerNode({ data, selected }: { data: TransformerNodeData; selected: boolean }) {
  const { task, onSelect, isExecuting } = data;
  const { lambdas, updateTask } = usePlanStore();
  
  const assignedLambda = lambdas.find(l => l.id === task.lambdaId);

  // Debug: Log when execution status changes
  useEffect(() => {
    if (task.executionStatus) {
      console.log(`🔄 TransformerNode ${task.id} (${task.title}) - Status changed to: ${task.executionStatus}`);
    }
  }, [task.executionStatus, task.id, task.title]);

  // Drop zone for Lambda
  const [{ isOverLambda, canDropLambda }, dropLambda] = useDrop(() => ({
    accept: 'lambda',
    canDrop: () => !isExecuting,
    drop: (item: Lambda) => {
      updateTask(task.id, { lambdaId: item.id });
    },
    collect: (monitor) => ({
      isOverLambda: monitor.isOver(),
      canDropLambda: monitor.canDrop(),
    }),
  }), [task.id, isExecuting, updateTask]);

  // Remove lambda handler
  const handleRemoveLambda = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExecuting) {
      updateTask(task.id, { lambdaId: undefined });
    }
  };

  // Status styling (matching TaskNode but with purple/violet accent)
  const getStatusStyle = () => {
    switch (task.executionStatus) {
      case 'executing':
        return 'border-yellow-500 shadow-lg shadow-yellow-500/50 ring-2 ring-yellow-500/30 animate-pulse';
      case 'completed':
        return 'border-green-500 shadow-md shadow-green-500/30';
      case 'failed':
        return 'border-red-500 shadow-md shadow-red-500/30';
      case 'pending':
        return 'border-gray-600';
      default:
        return selected ? 'border-violet-500 shadow-lg shadow-violet-500/30' : 'border-violet-700/50';
    }
  };

  const getStatusIcon = () => {
    switch (task.executionStatus) {
      case 'executing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (!isExecuting) {
      onSelect(task);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Count incoming dependencies
  const inputCount = task.dependencies.length;

  return (
    <button
      type="button"
      className={`bg-gradient-to-br from-violet-950 to-norse-stone border-2 rounded-lg w-56 transition-all cursor-pointer hover:border-violet-400 text-left ${getStatusStyle()}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Input Handle (top) with count badge */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-violet-400 !border-norse-night !w-3 !h-3"
      />
      {/* Input count badge - shows how many tasks feed into this transformer */}
      {inputCount > 0 && (
        <div 
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg"
          title={`${inputCount} input${inputCount > 1 ? 's' : ''} connected`}
        >
          {inputCount}
        </div>
      )}

      {/* Header */}
      <div className="p-3 bg-violet-900/30 border-b border-violet-700/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-violet-400" />
            <span className="font-medium text-gray-100 text-sm truncate flex-1">
              {task.title}
            </span>
          </div>
          {getStatusIcon()}
        </div>
        {task.description && (
          <p className="text-xs text-gray-400 truncate">{task.description}</p>
        )}
        {/* Show input count in description area if no description */}
        {!task.description && inputCount > 0 && (
          <p className="text-xs text-violet-400/70">
            ⇢ {inputCount} input{inputCount > 1 ? 's' : ''} → λ transform
          </p>
        )}
      </div>

      {/* Lambda Drop Zone */}
      <div className="p-2">
        <div 
          ref={dropLambda}
          className={`flex items-center justify-between px-2 py-2 rounded text-xs transition-all ${
            isOverLambda && canDropLambda
              ? 'bg-violet-500/30 border border-violet-400'
              : canDropLambda
              ? 'bg-violet-500/10 border border-dashed border-violet-500/50'
              : assignedLambda
              ? 'bg-violet-900/30'
              : 'bg-violet-900/20'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Code2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className={`block truncate ${assignedLambda ? 'text-gray-200' : 'text-gray-500 italic'}`}>
                {assignedLambda?.name || 'Drop λ Lambda here'}
              </span>
              {!assignedLambda && (
                <span className="text-[10px] text-gray-600">Pass-through (no-op)</span>
              )}
            </div>
          </div>
          {assignedLambda && !isExecuting && (
            <button
              type="button"
              onClick={handleRemoveLambda}
              className="ml-1 p-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Remove lambda"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-violet-400 !border-norse-night !w-3 !h-3"
      />
    </button>
  );
}

// Node types registration
const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  transformerNode: TransformerNode,
};

// Auto-layout algorithm for DAG with independent subgraph support
function calculateLayout(tasks: Task[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeWidth = 280;
  const nodeHeight = 160;
  const horizontalGap = 60;
  const verticalGap = 80;
  const subgraphGap = 120; // Gap between independent subgraphs

  if (tasks.length === 0) return positions;

  // Build adjacency lists (bidirectional for finding connected components)
  const adjacency = new Map<string, Set<string>>();
  tasks.forEach(task => {
    if (!adjacency.has(task.id)) adjacency.set(task.id, new Set());
    task.dependencies.forEach(dep => {
      adjacency.get(task.id)!.add(dep);
      if (!adjacency.has(dep)) adjacency.set(dep, new Set());
      adjacency.get(dep)!.add(task.id);
    });
  });

  // Find connected components (independent subgraphs)
  const visited = new Set<string>();
  const subgraphs: Task[][] = [];
  
  tasks.forEach(task => {
    if (visited.has(task.id)) return;
    
    // BFS to find all connected tasks
    const component: Task[] = [];
    const queue = [task.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const currentTask = tasks.find(t => t.id === currentId);
      if (currentTask) {
        component.push(currentTask);
        
        // Add all connected nodes (dependencies and dependents)
        const neighbors = adjacency.get(currentId) || new Set();
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        });
      }
    }
    
    if (component.length > 0) {
      subgraphs.push(component);
    }
  });

  // Layout each subgraph independently
  let currentXOffset = 0;
  
  subgraphs.forEach(subgraphTasks => {
    // Topological sort this subgraph into layers
    const layers: string[][] = [];
    const remaining = new Set(subgraphTasks.map(t => t.id));
    const subgraphIds = new Set(subgraphTasks.map(t => t.id));
    
    while (remaining.size > 0) {
      const layer: string[] = [];
      
      remaining.forEach(taskId => {
        const task = subgraphTasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Only consider dependencies within this subgraph
        const hasUnprocessedDeps = task.dependencies
          .filter(dep => subgraphIds.has(dep))
          .some(dep => remaining.has(dep));
        
        if (!hasUnprocessedDeps) {
          layer.push(taskId);
        }
      });
      
      if (layer.length === 0) {
        remaining.forEach(id => { layer.push(id); });
        remaining.clear();
      } else {
        layer.forEach(id => { remaining.delete(id); });
      }
      
      layers.push(layer);
    }

    // Calculate width of this subgraph
    const maxLayerWidth = Math.max(...layers.map(layer => 
      layer.length * nodeWidth + (layer.length - 1) * horizontalGap
    ));

    // Position nodes in this subgraph
    layers.forEach((layer, layerIndex) => {
      const layerWidth = layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
      // Center the layer within the subgraph's column
      const startX = currentXOffset + (maxLayerWidth - layerWidth) / 2;
      
      layer.forEach((taskId, nodeIndex) => {
        const task = subgraphTasks.find(t => t.id === taskId);
        // Use existing position if available, otherwise calculate
        if (task?.position) {
          positions.set(taskId, task.position);
        } else {
          positions.set(taskId, {
            x: startX + nodeIndex * (nodeWidth + horizontalGap),
            y: layerIndex * (nodeHeight + verticalGap),
          });
        }
      });
    });

    // Move X offset for next subgraph
    currentXOffset += maxLayerWidth + subgraphGap;
  });

  // Center all positions around origin
  if (positions.size > 0) {
    const allX = Array.from(positions.values()).map(p => p.x);
    const centerX = (Math.min(...allX) + Math.max(...allX)) / 2;
    positions.forEach((pos, id) => {
      positions.set(id, { x: pos.x - centerX, y: pos.y });
    });
  }

  return positions;
}

interface WorkflowGraphProps {
  isExecuting: boolean;
}

// Inner component that uses React Flow hooks
function WorkflowGraphInner({ isExecuting }: WorkflowGraphProps) {
  const { tasks, setSelectedTask, updateTask, deleteTask } = usePlanStore();
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [showLegend, setShowLegend] = useState(false);  // Collapsed by default

  // Track selected nodes
  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeIds(nodes.map(n => n.id));
    },
  });

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete/Backspace if we have selected nodes and not executing
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0 && !isExecuting) {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        
        e.preventDefault();
        
        const selectedTasks = tasks.filter(t => selectedNodeIds.includes(t.id));
        const taskNames = selectedTasks.map(t => t.title).join(', ');
        const confirmMessage = selectedTasks.length === 1
          ? `Delete task "${taskNames}"?\n\nThis will also remove any dependencies to/from this task.`
          : `Delete ${selectedTasks.length} tasks (${taskNames})?\n\nThis will also remove any dependencies to/from these tasks.`;
        
        if (window.confirm(confirmMessage)) {
          // Delete each selected task
          selectedNodeIds.forEach(nodeId => {
            // First, remove this task from other tasks' dependencies
            tasks.forEach(task => {
              if (task.dependencies.includes(nodeId)) {
                updateTask(task.id, {
                  dependencies: task.dependencies.filter(d => d !== nodeId),
                });
              }
            });
            // Then delete the task
            deleteTask(nodeId);
          });
          
          // Clear selection
          setSelectedNodeIds([]);
          setSelectedTask(null);
          
          console.log(`🗑️ Deleted ${selectedNodeIds.length} task(s)`);
        }
      }
    };

    // Add listener to the document (React Flow handles focus internally)
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, isExecuting, tasks, deleteTask, updateTask, setSelectedTask]);

  // Calculate initial layout
  const initialLayout = useMemo(() => calculateLayout(tasks), [tasks]);

  // Convert tasks to React Flow nodes
  const initialNodes: Node[] = useMemo(() => 
    tasks.map(task => {
      const position = task.position || initialLayout.get(task.id) || { x: 0, y: 0 };
      // Use transformer node type for transformer tasks
      const nodeType = isTransformerTask(task) ? 'transformerNode' : 'taskNode';
      return {
        id: task.id,
        type: nodeType,
        position,
        data: {
          task,
          onSelect: setSelectedTask,
          isExecuting,
        },
      };
    }), [tasks, initialLayout, setSelectedTask, isExecuting]);

  // Convert dependencies to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        edges.push({
          id: `${depId}-${task.id}`,
          source: depId,
          target: task.id,
          type: 'smoothstep',
          animated: task.executionStatus === 'executing',
          style: {
            stroke: task.executionStatus === 'completed' ? '#22c55e' :
                    task.executionStatus === 'executing' ? '#eab308' :
                    '#6b7280',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: task.executionStatus === 'completed' ? '#22c55e' :
                   task.executionStatus === 'executing' ? '#eab308' :
                   '#6b7280',
          },
        });
      });
    });
    return edges;
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when tasks change
  useEffect(() => {
    console.log('📊 WorkflowGraph: Updating nodes due to task changes', 
      tasks.map(t => ({ id: t.id, status: t.executionStatus })));
    setNodes(initialNodes);
  }, [initialNodes, setNodes, tasks]);

  // Update edges when tasks change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle new connections (creating dependencies)
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      
      // Update task dependencies
      const targetTask = tasks.find(t => t.id === params.target);
      if (targetTask && !targetTask.dependencies.includes(params.source)) {
        updateTask(params.target, {
          dependencies: [...targetTask.dependencies, params.source],
        });
      }
      
      setEdges(eds => addEdge({
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      }, eds));
    },
    [tasks, updateTask, setEdges]
  );

  // Handle node position changes (save to store)
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateTask(node.id, {
        position: { x: node.position.x, y: node.position.y },
      });
    },
    [updateTask]
  );

  // Handle edge click (to delete dependency)
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (isExecuting) return;
      
      // Confirm deletion
      const confirmDelete = window.confirm(
        `Remove dependency: ${edge.source} → ${edge.target}?`
      );
      
      if (confirmDelete) {
        // Remove dependency from target task
        const targetTask = tasks.find(t => t.id === edge.target);
        if (targetTask) {
          updateTask(edge.target, {
            dependencies: targetTask.dependencies.filter(d => d !== edge.source),
          });
        }
        
        // Remove edge from graph
        setEdges(eds => eds.filter(e => e.id !== edge.id));
        console.log(`Removed dependency: ${edge.source} → ${edge.target}`);
      }
    },
    [tasks, updateTask, setEdges, isExecuting]
  );

  // Minimap node color based on status
  const getMinimapNodeColor = (node: Node) => {
    const task = node.data.task as Task;
    switch (task.executionStatus) {
      case 'executing': return '#eab308';
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#4b5563';
    }
  };

  return (
    <div className="h-full w-full bg-norse-night">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#6b7280', strokeWidth: 2, cursor: 'pointer' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
        }}
        edgesUpdatable={!isExecuting}
        proOptions={{ hideAttribution: true }}
        // Selection settings
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        // Disable built-in delete (we handle it with confirmation)
        deleteKeyCode={null}
        // Multi-select with Shift
        multiSelectionKeyCode="Shift"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
        />
        <Controls
          className="!bg-norse-shadow !border-norse-rune !rounded-lg !shadow-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={getMinimapNodeColor}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-norse-shadow !border-norse-rune !rounded-lg"
          style={{ height: 100, width: 150 }}
        />
      </ReactFlow>

      {/* Legend - Dismissable Drawer */}
      {showLegend ? (
        <div className="absolute bottom-4 left-4 bg-norse-shadow/95 backdrop-blur-sm border border-norse-rune rounded-lg p-3 text-xs shadow-lg transition-all">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowLegend(false)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-norse-rune hover:bg-red-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shadow-md"
            title="Hide legend"
          >
            <X className="w-3 h-3" />
          </button>
          
          <div className="font-semibold text-valhalla-gold mb-2">Status</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-600" />
              <span className="text-gray-300">Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-gray-300">Executing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-300">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300">Failed</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-norse-rune">
            <div className="font-semibold text-valhalla-gold mb-1">Node Types</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-frost-ice/30 border border-frost-ice/50" />
                <span>Agent Task</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-violet-500/30 border border-violet-500/50" />
                <span>Transformer (λ)</span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-norse-rune">
            <div className="font-semibold text-valhalla-gold mb-1">Controls</div>
            <div className="space-y-0.5 text-gray-400">
              <div>• Drag handles to connect</div>
              <div>• Multi-connect to transformers</div>
              <div>• Click edge to delete link</div>
              <div>• Delete/Backspace to remove</div>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed tab hugging the left edge */
        <button
          type="button"
          onClick={() => setShowLegend(true)}
          className="absolute bottom-4 left-0 bg-norse-shadow/95 backdrop-blur-sm border border-l-0 border-norse-rune rounded-r-lg px-1.5 py-3 text-gray-400 hover:text-valhalla-gold hover:bg-norse-rune/50 transition-all shadow-lg group"
          title="Show legend"
        >
          <div className="flex flex-col items-center space-y-1">
            <HelpCircle className="w-4 h-4" />
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}
    </div>
  );
}

// Export wrapped component with ReactFlowProvider
export function WorkflowGraph({ isExecuting }: WorkflowGraphProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphInner isExecuting={isExecuting} />
    </ReactFlowProvider>
  );
}
