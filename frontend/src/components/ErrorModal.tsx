import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
}

export function ErrorModal({ isOpen, title, message, details, onClose }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div className="bg-norse-shadow border-2 border-red-500 rounded-lg max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-norse-rune">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-100">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-base leading-relaxed">{message}</p>
          
          {details && (
            <div className="bg-norse-night border border-norse-rune rounded p-4">
              <p className="text-sm font-semibold text-gray-400 mb-2">Technical Details:</p>
              <pre className="text-xs text-gray-500 whitespace-pre-wrap overflow-x-auto">
                {details}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-norse-rune">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-valhalla-gold text-norse-night font-semibold rounded-lg hover:bg-valhalla-amber transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
