import { useState } from 'react';
import { X, Sparkles, Code2, User, Wand2 } from 'lucide-react';
import { usePlanStore } from '../store/planStore';

type ModalTab = 'agent' | 'lambda';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ModalTab;
}

export function CreateModal({ isOpen, onClose, initialTab = 'agent' }: CreateModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  
  // Agent form state
  const [roleDescription, setRoleDescription] = useState('');
  const [agentType, setAgentType] = useState<'worker' | 'qc'>('worker');
  const [useAgentinator, setUseAgentinator] = useState(true);
  
  // Lambda form state
  const [lambdaName, setLambdaName] = useState('');
  const [lambdaDescription, setLambdaDescription] = useState('');
  const [lambdaLanguage, setLambdaLanguage] = useState<'typescript' | 'python'>('typescript');
  const [lambdaScript, setLambdaScript] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const { createAgent, addLambda } = usePlanStore();

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset form state
    setRoleDescription('');
    setAgentType('worker');
    setUseAgentinator(true);
    setLambdaName('');
    setLambdaDescription('');
    setLambdaLanguage('typescript');
    setLambdaScript('');
    onClose();
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleDescription.trim()) return;

    setIsCreating(true);
    try {
      await createAgent({
        roleDescription: roleDescription.trim(),
        agentType,
        useAgentinator,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateLambda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lambdaName.trim() || !lambdaScript.trim()) return;

    setIsCreating(true);
    try {
      // Validate the script before saving
      const validationResponse = await fetch('/api/validate-lambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: lambdaScript,
          language: lambdaLanguage === 'typescript' ? 'typescript' : 'python',
        }),
      });

      const validationResult = await validationResponse.json();

      if (!validationResult.valid) {
        const errors = validationResult.errors?.join('\n') || 'Unknown validation error';
        alert(`Lambda validation failed:\n\n${errors}`);
        setIsCreating(false);
        return;
      }

      // Create lambda with unique ID
      const newLambda = {
        id: `lambda-${Date.now()}`,
        name: lambdaName.trim(),
        description: lambdaDescription.trim() || 'Custom transformation script',
        language: lambdaLanguage,
        script: lambdaScript,
        version: '1.0',
        created: new Date().toISOString(),
      };
      
      // TODO: In the future, save to database via API
      // For now, add to local store
      addLambda(newLambda);
      handleClose();
    } catch (error) {
      console.error('Failed to create lambda:', error);
      alert('Failed to create lambda. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getDefaultScript = (lang: 'typescript' | 'python') => {
    if (lang === 'typescript') {
      return `/**
 * Transform function for data transformation between tasks
 * 
 * Unified input contract - single API for all scenarios:
 * - input.tasks: Array of upstream task results (agents or transformers)
 * - input.meta: Metadata (transformerId, lambdaName, executionId)
 * 
 * Each task in input.tasks has:
 * - taskId, taskTitle, taskType ('agent' | 'transformer'), status, duration
 * - Agent tasks: workerOutput, qcResult (passed, score, feedback, issues), agentRole
 * - Transformer tasks: transformerOutput, lambdaName
 * 
 * @param input - Unified LambdaInput object
 * @returns Transformed output (string or object that will be JSON stringified)
 */
function transform(input: any): string {
  // Example: Process all upstream task outputs
  const outputs = input.tasks.map((task: any) => {
    if (task.taskType === 'agent') {
      return \`## \${task.taskTitle}\\n\${task.workerOutput || ''}\`;
    } else {
      return \`## \${task.lambdaName}\\n\${task.transformerOutput || ''}\`;
    }
  });
  
  return outputs.join('\\n\\n---\\n\\n');
}`;
    }
    return `"""
Transform function for data transformation between tasks

Unified input contract - single API for all scenarios:
- input.tasks: Array of upstream task results (agents or transformers)
- input.meta: Metadata (transformerId, lambdaName, executionId)

Each task in input.tasks has:
- taskId, taskTitle, taskType ('agent' | 'transformer'), status, duration
- Agent tasks: workerOutput, qcResult (passed, score, feedback, issues), agentRole
- Transformer tasks: transformerOutput, lambdaName

Args:
    input: Unified LambdaInput object

Returns:
    Transformed output (string or object that will be JSON stringified)
"""
def transform(input):
    # Example: Process all upstream task outputs
    outputs = []
    for task in input.tasks:
        if task.taskType == 'agent':
            outputs.append(f"## {task.taskTitle}\\n{task.workerOutput or ''}")
        else:
            outputs.append(f"## {task.lambdaName}\\n{task.transformerOutput or ''}")
    
    return "\\n\\n---\\n\\n".join(outputs)`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-norse-shadow rounded-lg shadow-2xl w-full max-w-2xl mx-4 border-2 border-norse-rune max-h-[90vh] flex flex-col">
        {/* Header with tabs */}
        <div className="flex items-center justify-between p-4 border-b border-norse-rune">
          <div className="flex items-center space-x-1 bg-norse-stone rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all text-sm font-medium ${
                activeTab === 'agent'
                  ? 'bg-valhalla-gold text-norse-night'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Agent</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lambda')}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all text-sm font-medium ${
                activeTab === 'lambda'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Lambda</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-valhalla-gold transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Agent Tab Content */}
        {activeTab === 'agent' && (
          <form onSubmit={handleCreateAgent} className="p-6 space-y-5 overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-valhalla-gold mb-1">Create New Agent</h3>
              <p className="text-xs text-gray-400">Define a reusable agent preamble for your workflows</p>
            </div>
            
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
                onClick={handleClose}
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
                    <Wand2 className="w-5 h-5" />
                    <span>Create Agent</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Lambda Tab Content */}
        {activeTab === 'lambda' && (
          <form onSubmit={handleCreateLambda} className="p-6 space-y-5 overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-violet-400 mb-1">Create New Lambda</h3>
              <p className="text-xs text-gray-400">Define a reusable transformation script for your workflows</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={lambdaName}
                  onChange={(e) => setLambdaName(e.target.value)}
                  placeholder="e.g., JSON Filter"
                  className="w-full px-4 py-2.5 bg-norse-stone border-2 border-norse-rune text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={lambdaLanguage}
                  onChange={(e) => {
                    const lang = e.target.value as 'typescript' | 'python';
                    setLambdaLanguage(lang);
                    if (!lambdaScript || lambdaScript === getDefaultScript(lambdaLanguage === 'typescript' ? 'typescript' : 'python')) {
                      setLambdaScript(getDefaultScript(lang));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-norse-stone border-2 border-norse-rune text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={lambdaDescription}
                onChange={(e) => setLambdaDescription(e.target.value)}
                placeholder="e.g., Filters JSON output to extract specific fields"
                className="w-full px-4 py-2.5 bg-norse-stone border-2 border-norse-rune text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Script
                </label>
                <button
                  type="button"
                  onClick={() => setLambdaScript(getDefaultScript(lambdaLanguage))}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Reset to template
                </button>
              </div>
              <textarea
                value={lambdaScript}
                onChange={(e) => setLambdaScript(e.target.value)}
                placeholder={getDefaultScript(lambdaLanguage)}
                className="w-full px-4 py-3 bg-norse-night border-2 border-norse-rune text-gray-100 placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-mono text-sm"
                rows={10}
                required
                spellCheck={false}
              />
              <p className="text-xs text-gray-400 mt-2">
                Write a transform function that processes input and returns output
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-norse-rune">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-norse-stone border-2 border-norse-rune text-gray-200 font-medium rounded-lg hover:bg-norse-rune hover:border-norse-mist transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !lambdaName.trim() || !lambdaScript.trim()}
                className="px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-lg hover:shadow-violet-500/30"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-5 h-5" />
                    <span>Create Lambda</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
