import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { usePlanStore } from '../store/planStore';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
  const [roleDescription, setRoleDescription] = useState('');
  const [agentType, setAgentType] = useState<'worker' | 'qc'>('worker');
  const [useAgentinator, setUseAgentinator] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { createAgent } = usePlanStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleDescription.trim()) return;

    setIsCreating(true);
    try {
      await createAgent({
        roleDescription: roleDescription.trim(),
        agentType,
        useAgentinator,
      });
      setRoleDescription('');
      setAgentType('worker');
      setUseAgentinator(true);
      onClose();
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-norse-shadow rounded-lg shadow-2xl w-full max-w-2xl mx-4 border-2 border-norse-rune">
        <div className="flex items-center justify-between p-6 border-b border-norse-rune">
          <h2 className="text-xl font-bold text-valhalla-gold">Create New Agent</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-valhalla-gold transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Role Description
            </label>
            <textarea
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="e.g., DevOps engineer specializing in Kubernetes deployment and monitoring"
              className="w-full px-4 py-3 bg-norse-stone border-2 border-norse-rune text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold"
              rows={3}
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Describe the role, expertise, and responsibilities of this agent
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Agent Type
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="worker"
                  checked={agentType === 'worker'}
                  onChange={(e) => setAgentType(e.target.value as 'worker')}
                  className="mr-2 w-4 h-4 text-frost-ice accent-frost-ice"
                />
                <span className="text-sm text-gray-200 font-medium">Worker (Task Executor)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="qc"
                  checked={agentType === 'qc'}
                  onChange={(e) => setAgentType(e.target.value as 'qc')}
                  className="mr-2 w-4 h-4 text-magic-rune accent-magic-rune"
                />
                <span className="text-sm text-gray-200 font-medium">QC (Quality Control)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="useAgentinator"
              checked={useAgentinator}
              onChange={(e) => setUseAgentinator(e.target.checked)}
              className="mr-3 w-4 h-4 text-valhalla-gold accent-valhalla-gold"
            />
            <label htmlFor="useAgentinator" className="text-sm text-gray-200 flex items-center space-x-2 cursor-pointer">
              <Sparkles className="w-5 h-5 text-valhalla-gold" />
              <span className="font-medium">Generate full preamble with Agentinator</span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-norse-rune">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-norse-stone border-2 border-norse-rune text-gray-200 font-medium rounded-lg hover:bg-norse-rune hover:border-norse-mist transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !roleDescription.trim()}
              className="px-5 py-2.5 bg-valhalla-gold text-norse-night font-semibold rounded-lg hover:bg-valhalla-amber disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-lg hover:shadow-valhalla-gold/30"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-norse-night border-t-transparent rounded-full" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Create Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
