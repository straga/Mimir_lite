import { useState } from 'react';
import { usePlanStore } from '../store/planStore';
import { apiClient } from '../utils/api';
import { ProjectPlan } from '../types/task';
import { Sparkles, Loader2 } from 'lucide-react';

export function PromptInput() {
  const { projectPrompt, setProjectPrompt, setProjectPlan } = usePlanStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!projectPrompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const plan = await apiClient.post<ProjectPlan>('/generate-plan', { prompt: projectPrompt });
      
      // Validate plan structure
      if (!plan.tasks || !Array.isArray(plan.tasks)) {
        throw new Error('Invalid plan structure: missing tasks array');
      }
      
      setProjectPlan(plan);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-semibold text-gray-300 flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-valhalla-gold" />
          <span>Project Goal & Requirements</span>
        </span>
        <textarea
          value={projectPrompt}
          onChange={(e) => setProjectPrompt(e.target.value)}
          placeholder="Describe your project goal, requirements, and constraints. The PM agent will help decompose this into executable tasks..."
          className="w-full px-4 py-3 bg-norse-stone border-2 border-norse-rune text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-valhalla-gold focus:border-valhalla-gold resize-none"
          rows={3}
        />
      </label>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          💡 Tip: Be specific about deliverables, constraints, and success criteria
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !projectPrompt.trim()}
          className="px-5 py-2.5 bg-valhalla-gold text-norse-night font-semibold rounded-lg hover:bg-valhalla-amber disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-lg hover:shadow-valhalla-gold/30"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate with PM Agent</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
