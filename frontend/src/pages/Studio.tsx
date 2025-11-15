import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PromptInput } from '../components/PromptInput';
import { AgentPalette } from '../components/AgentPalette';
import { TaskCanvas } from '../components/TaskCanvas';
import { TaskEditor } from '../components/TaskEditor';
import { AgentDragPreview } from '../components/AgentDragPreview';
import { ErrorModal } from '../components/ErrorModal';
import { EyeOfMimirLogo } from '../components/EyeOfMimirLogo';
import { usePlanStore } from '../store/planStore';

export function Studio() {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalError, setGlobalError, setProjectPrompt } = usePlanStore();
  
  // Handle initial prompt from Portal navigation
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt) {
      setProjectPrompt(state.initialPrompt);
      // Clear the location state to prevent re-setting on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setProjectPrompt]);
  
  // Helper to safely extract string message from error object
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if (typeof error.message === 'string') return error.message;
    if (typeof error.message === 'object') {
      // If message is an object, try to extract useful info
      return error.message.message || error.message.error || JSON.stringify(error.message);
    }
    return error.error || error.toString();
  };
  
  const getErrorDetails = (error: any): string | undefined => {
    if (!error) return undefined;
    if (typeof error.details === 'string') return error.details;
    if (typeof error.details === 'object') {
      return JSON.stringify(error.details, null, 2);
    }
    return error.details;
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <AgentDragPreview />
      <ErrorModal
        isOpen={globalError !== null}
        title={globalError?.title || 'Error'}
        message={getErrorMessage(globalError)}
        details={getErrorDetails(globalError)}
        onClose={() => setGlobalError(null)}
      />
      <div className="h-screen flex flex-col bg-norse-night">
        {/* Header */}
        <header className="bg-norse-shadow border-b border-norse-rune px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <img 
              src="/mimir-logo.png" 
              alt="Mimir Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-valhalla-gold">Mimir Orchestration Studio</h1>
              <p className="text-sm text-gray-400">Visual Agent Task Planner</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/portal')}
              className="flex items-center space-x-2 px-4 py-2 bg-norse-rune hover:bg-valhalla-gold/20 border-2 border-norse-rune hover:border-valhalla-gold rounded-xl transition-all duration-300 group"
              title="Return to Portal"
            >
              <EyeOfMimirLogo size={32} className="group-hover:opacity-80 transition-opacity" />
              <span className="text-gray-300 group-hover:text-valhalla-gold text-sm font-medium">Portal</span>
            </button>
          </div>
        </header>

        {/* Prompt Input */}
        <div className="bg-norse-shadow border-b border-norse-rune px-6 py-4">
          <PromptInput />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Agent Palette */}
          <aside className="w-80 bg-norse-shadow border-r border-norse-rune overflow-y-auto scroll-container">
            <AgentPalette />
          </aside>

          {/* Center - Task Canvas */}
          <main className="flex-1 overflow-y-auto scroll-container">
            <TaskCanvas />
          </main>

          {/* Right Sidebar - Task Editor */}
          <aside className="w-96 bg-norse-shadow border-l border-norse-rune overflow-y-auto scroll-container">
            <TaskEditor />
          </aside>
        </div>
      </div>
    </DndProvider>
  );
}
