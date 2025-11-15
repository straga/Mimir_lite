import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  folderPath: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ isOpen, folderPath, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [canConfirm, setCanConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCountdown(3);
      setCanConfirm(false);
      return;
    }

    // Start countdown when modal opens
    setCountdown(3);
    setCanConfirm(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanConfirm(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1f2e] border-2 border-red-500/50 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-norse-rune/50 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Icon and Title */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              Remove Folder from Index?
            </h3>
            <p className="text-sm text-gray-400">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Folder Path */}
        <div className="mb-6 p-3 rounded-lg bg-norse-rune/20 border border-norse-rune/50">
          <p className="text-xs text-gray-500 mb-1">Folder Path:</p>
          <p className="text-sm text-gray-200 font-mono break-all">{folderPath}</p>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300">
            ⚠️ This will:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-300 ml-4">
            <li>• Delete all indexed files from Neo4j</li>
            <li>• Stop watching for changes</li>
            <li>• Remove all embeddings for this folder</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-lg bg-norse-rune/30 hover:bg-norse-rune/50 text-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              canConfirm
                ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                : 'bg-red-500/20 text-red-300/50 cursor-not-allowed'
            }`}
          >
            {canConfirm ? 'Confirm Delete' : `Wait ${countdown}s...`}
          </button>
        </div>
      </div>
    </div>
  );
}
