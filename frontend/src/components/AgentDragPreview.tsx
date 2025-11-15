import { useDragLayer } from 'react-dnd';
import { AgentTemplate } from '../types/task';
import { User, Shield, GripVertical } from 'lucide-react';

export function AgentDragPreview() {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as AgentTemplate | null,
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !item || !currentOffset || item.agentType === undefined) {
    return null;
  }

  const agent = item as AgentTemplate;

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 100,
        left: currentOffset.x,
        top: currentOffset.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Ephemeral Task Preview */}
      <div className="bg-norse-stone border-2 border-norse-rune rounded-lg overflow-hidden opacity-60 w-64 shadow-2xl">
        {/* Header */}
        <div className="p-3 bg-norse-shadow border-b border-norse-rune">
          <div className="flex items-center space-x-2">
            <GripVertical className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-100 text-sm">New Task</span>
          </div>
        </div>

        {/* Agent Preview */}
        <div className="p-3 bg-norse-shadow">
          <div className="flex items-center space-x-2 mb-2">
            {agent.agentType === 'worker' ? (
              <>
                <User className="w-4 h-4 text-frost-ice" />
                <span className="text-xs font-semibold text-frost-ice uppercase">
                  Worker Agent
                </span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-magic-rune" />
                <span className="text-xs font-semibold text-magic-rune uppercase">
                  QC Agent
                </span>
              </>
            )}
          </div>
          <div className="bg-norse-night rounded p-2 border border-norse-rune">
            <div className="text-sm font-medium text-gray-100 truncate">
              {agent.name}
            </div>
            <div className="text-xs text-gray-400 line-clamp-1">
              {agent.role}
            </div>
          </div>
        </div>

        {/* Other slot placeholder */}
        <div className="p-3 bg-norse-stone">
          <div className="flex items-center space-x-2 mb-2">
            {agent.agentType === 'worker' ? (
              <>
                <Shield className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  QC Agent
                </span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase">
                  Worker Agent
                </span>
              </>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-700 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Assign later</p>
          </div>
        </div>
      </div>
    </div>
  );
}
