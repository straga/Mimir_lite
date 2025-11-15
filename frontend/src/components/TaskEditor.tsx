import { usePlanStore } from '../store/planStore';
import { X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function TaskEditor() {
  const { selectedTask, updateTask, setSelectedTask, tasks, agentTemplates } = usePlanStore();
  const [localTask, setLocalTask] = useState(selectedTask);

  useEffect(() => {
    setLocalTask(selectedTask);
  }, [selectedTask]);

  if (!selectedTask || !localTask) {
    return (
      <div className="p-6 text-center text-gray-400">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg font-medium">Select a task to edit its details</p>
      </div>
    );
  }

  const handleSave = () => {
    updateTask(selectedTask.id, localTask);
    setSelectedTask(null);
  };

  const addSuccessCriterion = () => {
    setLocalTask({
      ...localTask,
      successCriteria: [...localTask.successCriteria, ''],
    });
  };

  const updateSuccessCriterion = (index: number, value: string) => {
    const newCriteria = [...localTask.successCriteria];
    newCriteria[index] = value;
    setLocalTask({ ...localTask, successCriteria: newCriteria });
  };

  const removeSuccessCriterion = (index: number) => {
    setLocalTask({
      ...localTask,
      successCriteria: localTask.successCriteria.filter((_, i) => i !== index),
    });
  };

  const availableDependencies = tasks
    .filter((t) => t.id !== selectedTask.id)
    .map((t) => t.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-valhalla-gold">Task Editor</h2>
        <button
          type="button"
          onClick={() => setSelectedTask(null)}
          className="text-gray-400 hover:text-valhalla-gold transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Task ID */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Task ID
          </label>
          <input
            type="text"
            value={localTask.id}
            onChange={(e) => setLocalTask({ ...localTask, id: e.target.value })}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={localTask.title}
            onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Agent Role Description */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Worker Role Description
          </label>
          <textarea
            value={localTask.agentRoleDescription}
            onChange={(e) =>
              setLocalTask({ ...localTask, agentRoleDescription: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Worker Preamble Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Worker Preamble (Optional)
          </label>
          <select
            value={localTask.workerPreambleId || ''}
            onChange={(e) =>
              setLocalTask({ ...localTask, workerPreambleId: e.target.value || undefined })
            }
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          >
            <option value="">None - Use role description only</option>
            {agentTemplates
              .filter(a => a.agentType === 'worker')
              .map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} (v{agent.version})
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Link to a saved worker preamble for consistent role execution
          </p>
        </div>

        {/* QC Role Description */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            QC Role Description
          </label>
          <textarea
            value={localTask.qcAgentRoleDescription}
            onChange={(e) =>
              setLocalTask({ ...localTask, qcAgentRoleDescription: e.target.value })
            }
            rows={2}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* QC Preamble Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            QC Preamble (Optional)
          </label>
          <select
            value={localTask.qcPreambleId || ''}
            onChange={(e) =>
              setLocalTask({ ...localTask, qcPreambleId: e.target.value || undefined })
            }
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          >
            <option value="">None - Use role description only</option>
            {agentTemplates
              .filter(a => a.agentType === 'qc')
              .map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} (v{agent.version})
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Link to a saved QC preamble for consistent verification
          </p>
        </div>

        {/* Recommended Model */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Recommended Model
          </label>
          <select
            value={localTask.recommendedModel}
            onChange={(e) =>
              setLocalTask({ ...localTask, recommendedModel: e.target.value })
            }
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          >
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4">gpt-4</option>
            <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
            <option value="claude-3-opus">claude-3-opus</option>
          </select>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Prompt
          </label>
          <textarea
            value={localTask.prompt}
            onChange={(e) => setLocalTask({ ...localTask, prompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm font-mono text-gray-100"
            placeholder="Enter the detailed prompt for this task..."
          />
        </div>

        {/* Success Criteria */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-300">
              Success Criteria
            </label>
            <button
              type="button"
              onClick={addSuccessCriterion}
              className="text-valhalla-gold hover:text-valhalla-amber text-xs flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
          <div className="space-y-2">
            {localTask.successCriteria.map((criterion, index) => (
              <div key={index} className="flex items-start space-x-2">
                <input
                  type="text"
                  value={criterion}
                  onChange={(e) => updateSuccessCriterion(index, e.target.value)}
                  placeholder="Enter success criterion..."
                  className="flex-1 px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => removeSuccessCriterion(index)}
                  className="text-red-400 hover:text-red-600 p-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Dependencies
          </label>
          <select
            multiple
            value={localTask.dependencies}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value);
              setLocalTask({ ...localTask, dependencies: selected });
            }}
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
            size={5}
          >
            {availableDependencies.map((taskId) => (
              <option key={taskId} value={taskId}>
                {taskId}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Hold Cmd/Ctrl to select multiple
          </p>
        </div>

        {/* Estimated Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Estimated Duration
          </label>
          <input
            type="text"
            value={localTask.estimatedDuration}
            onChange={(e) =>
              setLocalTask({ ...localTask, estimatedDuration: e.target.value })
            }
            placeholder="e.g., 30 minutes"
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Estimated Tool Calls */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Estimated Tool Calls
          </label>
          <input
            type="number"
            value={localTask.estimatedToolCalls}
            onChange={(e) =>
              setLocalTask({
                ...localTask,
                estimatedToolCalls: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Max Retries */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Max Retries
          </label>
          <input
            type="number"
            value={localTask.maxRetries}
            onChange={(e) =>
              setLocalTask({
                ...localTask,
                maxRetries: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-norse-shadow border-2 border-norse-rune rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold text-sm text-gray-100"
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full px-4 py-2 bg-valhalla-gold text-norse-night rounded-lg hover:bg-valhalla-amber transition-all font-semibold shadow-lg hover:shadow-valhalla-gold/30"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
