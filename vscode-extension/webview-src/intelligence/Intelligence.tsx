import React, { useState, useEffect, useCallback } from 'react';
import './styles.css';

declare const vscode: any;

interface FolderInfo {
  path: string;
  hostPath?: string;
  fileCount: number;
  chunkCount: number;
  embeddingCount: number;
  status: 'active' | 'stopped' | 'error';
  lastSync: string;
  patterns?: string[];
}

interface IndexStats {
  totalFolders: number;
  totalFiles: number;
  totalChunks: number;
  totalEmbeddings: number;
  byType: Record<string, number>;
  byExtension: Record<string, number>;
}

export function Intelligence() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:9042');
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/indexed-folders`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as any;
      setFolders(data.folders || []);
    } catch (err: any) {
      console.error('Failed to load folders:', err);
      setFolders([]);
    }
  }, [apiUrl]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/index-stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as any;
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setStats(null);
    }
  }, [apiUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadFolders(), loadStats()]);
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [loadFolders, loadStats]);

  useEffect(() => {
    loadData();
    
    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'config':
          setApiUrl(message.apiUrl || 'http://localhost:9042');
          break;
        case 'refresh':
          loadData();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadData]);

  const handleAddFolder = () => {
    // Ask extension to open folder picker
    vscode.postMessage({ command: 'selectFolder' });
  };

  const handleRemoveFolder = async (path: string) => {
    if (!confirm(`Remove folder from indexing?\n\n${path}\n\nThis will delete all indexed chunks and embeddings for this folder.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/indexed-folders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      vscode.postMessage({ 
        command: 'showMessage', 
        type: 'info',
        message: `✅ Removed folder from indexing: ${path}` 
      });

      loadData();
    } catch (err: any) {
      vscode.postMessage({ 
        command: 'showMessage', 
        type: 'error',
        message: `❌ Failed to remove folder: ${err.message}` 
      });
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '✅';
      case 'stopped': return '⏸️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getTopExtensions = (byExtension: Record<string, number>) => {
    return Object.entries(byExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  return (
    <div className="intelligence-container">
      {/* Header */}
      <div className="intelligence-header">
        <div className="header-title">
          <span className="header-icon">🧠</span>
          <h1>Mimir Code Intelligence</h1>
        </div>
        <div className="header-subtitle">
          File indexing, chunking, and embedding management
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading index data...</p>
          </div>
        </div>
      )}

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-section">
          <h2>📊 Index Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📁</div>
              <div className="stat-value">{formatNumber(stats.totalFolders)}</div>
              <div className="stat-label">Folders Watched</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-value">{formatNumber(stats.totalFiles)}</div>
              <div className="stat-label">Files Indexed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🧩</div>
              <div className="stat-value">{formatNumber(stats.totalChunks)}</div>
              <div className="stat-label">Chunks Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{formatNumber(stats.totalEmbeddings)}</div>
              <div className="stat-label">Embeddings Generated</div>
            </div>
          </div>
        </div>
      )}

      {/* Indexed Folders */}
      <div className="folders-section">
        <div className="section-header">
          <h2>📂 Indexed Folders</h2>
          <div className="section-actions">
            <button type="button" className="button-refresh" onClick={handleRefresh} title="Refresh">
              🔄 Refresh
            </button>
            <button type="button" className="button-primary" onClick={handleAddFolder}>
              + Add Folder
            </button>
          </div>
        </div>
        
        {folders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>No folders are currently being indexed</p>
            <p className="empty-hint">Click "Add Folder" to start indexing a workspace folder</p>
          </div>
        ) : (
          <div className="folders-list">
            {folders.map((folder) => (
              <div key={folder.path} className={`folder-item ${folder.status}`}>
                <div className="folder-info">
                  <span className="folder-status" title={folder.status}>
                    {getStatusIcon(folder.status)}
                  </span>
                  <div className="folder-details">
                    <div className="folder-path">{folder.hostPath || folder.path}</div>
                    <div className="folder-stats">
                      <span title="Files">📄 {formatNumber(folder.fileCount)}</span>
                      <span title="Chunks">🧩 {formatNumber(folder.chunkCount)}</span>
                      <span title="Embeddings">🎯 {formatNumber(folder.embeddingCount)}</span>
                      {folder.lastSync && (
                        <span title="Last synced" className="folder-sync">
                          ⏰ {formatDate(folder.lastSync)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="folder-actions">
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => handleRemoveFolder(folder.path)}
                    title="Remove from indexing"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Type Breakdown */}
      {stats && stats.byExtension && Object.keys(stats.byExtension).length > 0 && (
        <div className="breakdown-section">
          <h2>📋 File Type Breakdown</h2>
          <div className="breakdown-list">
            {getTopExtensions(stats.byExtension).map(([ext, count]) => {
              const percentage = ((count / stats.totalFiles) * 100).toFixed(1);
              return (
                <div key={ext} className="breakdown-row">
                  <div className="breakdown-info">
                    <span className="breakdown-ext">{ext || '(no extension)'}</span>
                    <span className="breakdown-count">
                      {formatNumber(count)} files ({percentage}%)
                    </span>
                  </div>
                  <div className="breakdown-bar-container">
                    <div 
                      className="breakdown-bar" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="intelligence-footer">
        <p>💡 Tip: Only folders within your mounted workspace can be indexed</p>
      </div>
    </div>
  );
}
