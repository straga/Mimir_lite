import { useState, useEffect } from 'react';
import { Folder, FolderOpen, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface IndexedFolder {
  path: string;
  recursive: boolean;
  filePatterns?: string[];
  status: string;
}

interface FileIndexingSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FileIndexingSidebar({ isOpen, onToggle }: FileIndexingSidebarProps) {
  const [folders, setFolders] = useState<IndexedFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const response = await apiClient.listIndexedFolders();
      setFolders(response.folders || []);
    } catch (error) {
      console.error('Failed to load indexed folders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const handleAddFolder = async () => {
    if (!newFolderPath.trim()) return;

    setIsAdding(true);
    try {
      await apiClient.indexFolder(newFolderPath, true, true);
      setNewFolderPath('');
      setShowAddForm(false);
      await loadFolders();
    } catch (error) {
      console.error('Failed to index folder:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFolder = (path: string) => {
    setFolderToDelete(path);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!folderToDelete) return;

    try {
      await apiClient.removeFolder(folderToDelete);
      await loadFolders();
      setShowDeleteModal(false);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Failed to remove folder:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setFolderToDelete(null);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-24 z-50 p-2 rounded-lg bg-[#252d3d] hover:bg-[#2d3548] border border-norse-rune/30 transition-all"
        title={isOpen ? 'Close sidebar' : 'Open file indexing'}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-valhalla-gold" />
        ) : (
          <ChevronRight className="w-5 h-5 text-valhalla-gold" />
        )}
      </button>

      {/* Sidebar - positioned below header */}
      <div
        className={`fixed left-0 bg-[#1a1f2e] border-r border-norse-rune/30 transition-all duration-300 z-40 overflow-y-auto ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'
        }`}
        style={{ top: '66px', height: 'calc(100vh - 66px)', paddingTop: '4rem' }}
      >
        {isOpen && (
          <div className="flex flex-col h-full p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-valhalla-gold" />
                <h2 className="text-lg font-semibold text-gray-100">Embedded/Indexed Folders</h2>
              </div>
              <button
                onClick={loadFolders}
                disabled={loading}
                className="p-1.5 rounded hover:bg-norse-rune/20 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Add Folder Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-lg bg-valhalla-gold/10 hover:bg-valhalla-gold/20 border border-valhalla-gold/30 text-valhalla-gold transition-colors mb-4"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Folder</span>
              </button>
            )}

            {/* Add Folder Form */}
            {showAddForm && (
              <div className="mb-4 p-3 rounded-lg bg-norse-rune/20 border border-norse-rune/50">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Folder Path
                </label>
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  placeholder="/workspace/my-project"
                  className="w-full px-3 py-2 rounded bg-[#252d3d] border border-norse-rune/50 text-gray-100 text-sm focus:outline-none focus:border-valhalla-gold/50 mb-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddFolder();
                    if (e.key === 'Escape') {
                      setShowAddForm(false);
                      setNewFolderPath('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddFolder}
                    disabled={!newFolderPath.trim() || isAdding}
                    className="flex-1 py-1.5 px-3 rounded bg-valhalla-gold hover:bg-yellow-500 text-black text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFolderPath('');
                    }}
                    className="flex-1 py-1.5 px-3 rounded bg-norse-rune/30 hover:bg-norse-rune/50 text-gray-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Folders List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading && folders.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading folders...</p>
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No folders indexed yet</p>
                  <p className="text-xs mt-1">Click "Add Folder" to start</p>
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.path}
                    className="group p-3 rounded-lg bg-norse-rune/10 hover:bg-norse-rune/20 border border-norse-rune/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Folder className="w-4 h-4 text-valhalla-gold flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-200 truncate" title={folder.path}>
                            {folder.path.split('/').pop() || folder.path}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate" title={folder.path}>
                          {folder.path}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            folder.status === 'active' 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {folder.status}
                          </span>
                          {folder.recursive && (
                            <span className="text-xs text-gray-500">recursive</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFolder(folder.path)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all ml-2"
                        title="Remove folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Info */}
            <div className="mt-4 pt-4 border-t border-norse-rune/30">
              <p className="text-xs text-gray-500 text-center">
                {folders.length} {folders.length === 1 ? 'folder' : 'folders'} indexed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        folderPath={folderToDelete || ''}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
