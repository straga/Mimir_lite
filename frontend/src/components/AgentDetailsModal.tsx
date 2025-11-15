import { X } from 'lucide-react';
import { AgentTemplate } from '../types/task';

interface AgentDetailsModalProps {
  agent: AgentTemplate | null;
  onClose: () => void;
}

export function AgentDetailsModal({ agent, onClose }: AgentDetailsModalProps) {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-norse-shadow rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 border-2 border-norse-rune flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-norse-rune">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-valhalla-gold">{agent.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{agent.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-valhalla-gold transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Metadata */}
        <div className="px-6 py-4 border-b border-norse-rune bg-norse-stone">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Type</div>
              <div className={`font-medium ${
                agent.agentType === 'qc' ? 'text-magic-rune' : 'text-frost-ice'
              }`}>
                {agent.agentType === 'qc' ? 'QC' : 'Worker'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Version</div>
              <div className="text-gray-200">{agent.version}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Size</div>
              <div className="text-gray-200">{(agent.content?.length || 0).toLocaleString()} chars</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Created</div>
              <div className="text-gray-200">
                {new Date(agent.created).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 scroll-container">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-norse-night p-4 rounded border border-norse-rune">
            {agent.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-norse-rune flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-valhalla-gold text-norse-night font-semibold rounded-lg hover:bg-valhalla-amber transition-all shadow-lg hover:shadow-valhalla-gold/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
