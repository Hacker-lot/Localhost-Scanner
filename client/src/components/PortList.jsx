import { useState } from 'react';
import './PortList.css';

/**
 * PortList Component
 * Displays grid of port cards
 * @param {Array} ports - Array of port objects
 * @param {boolean} loading - Loading state
 * @param {number|null} expandedPort - Currently expanded port number
 * @param {Function} onToggleExpand - Callback for toggling expand
 * @param {Function} onAddFavorite - Callback for adding favorite
 * @param {Function} onQuickLaunch - Callback for quick launch
 * @param {Function} onClosePort - Callback for closing port
 * @param {Array} favorites - Array of favorite ports
 */
function PortList({ ports = [], loading = false, expandedPort, onToggleExpand, onAddFavorite, onQuickLaunch, onClosePort, favorites = [] }) {
  const [addingFavorite, setAddingFavorite] = useState(null);

  if (loading) {
    return (
      <div className="port-list-loading">
        <div className="loading-spinner"></div>
        <p>Scanning ports...</p>
      </div>
    );
  }

  const isFavorite = (port) => {
    return favorites.some(fav => fav.port === port.port);
  };

  const handleAddFavorite = async (port) => {
    if (isFavorite(port) || addingFavorite === port.port) {
      return;
    }

    setAddingFavorite(port.port);
    try {
      await onAddFavorite?.(port);
    } catch (error) {
      console.error('Failed to add favorite:', error);
    } finally {
      setAddingFavorite(null);
    }
  };

  // Get accent color based on position
  const getAccentColor = (index) => {
    const accents = ['orange', 'red', 'blue', 'teal', 'pink'];
    return accents[index % accents.length];
  };

  return (
    <div className="port-list-container">
      {ports.length === 0 ? (
        <div className="port-list-empty">
          <p>No ports found</p>
        </div>
      ) : (
        <div className="port-grid">
          {ports.map((port, index) => {
            const accentColor = getAccentColor(index);
            return (
              <div
                key={`${port.port}-${port.pid}`}
                className={`port-card accent-${accentColor} ${expandedPort === port.port ? 'expanded' : ''}`}
                onClick={() => onToggleExpand(expandedPort === port.port ? null : port.port)}
              >
                <div className="port-card-header">
                  <div className="port-card-main-info">
                    <span className="port-number">:{port.port}</span>
                    <span className="port-process-name">{port.processName || 'Unknown Process'}</span>
                    <span className="status-badge status-running">running</span>
                  </div>
                  <div className="port-card-actions">
                    <button
                      className={`action-btn favorite-btn ${isFavorite(port) ? 'favorited' : ''} ${addingFavorite === port.port ? 'loading' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFavorite(port);
                      }}
                      title={isFavorite(port) ? 'Already favorited' : 'Add to favorites'}
                      disabled={isFavorite(port) || addingFavorite === port.port}
                    >
                      {addingFavorite === port.port ? '⏳' : (isFavorite(port) ? '★' : '☆')}
                    </button>
                    <button
                      className="action-btn open-folder-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickLaunch?.(port);
                      }}
                      title="Quick launch"
                    >
                      🚀
                    </button>
                    <button
                      className="action-btn close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClosePort?.(port);
                      }}
                      title="Close port"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {expandedPort === port.port && (
                  <div className="port-card-details">
                    <div className="detail-row">
                      <span className="detail-label">PID:</span>
                      <span className="detail-value">{port.pid || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Command:</span>
                      <span className="detail-value command-text">{port.command || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Working Directory:</span>
                      <span className="detail-value cwd-text">{port.cwd || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PortList;
