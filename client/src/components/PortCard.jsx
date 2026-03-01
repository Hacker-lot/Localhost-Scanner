import { useState } from 'react';
import './PortCard.css';

/**
 * PortCard Component
 * Displays individual port information with action buttons
 * @param {Object} port - Port data object
 * @param {Function} onClose - Callback for close action
 * @param {Function} onFavorite - Callback for favorite toggle
 * @param {Function} onOpenFolder - Callback for open folder action
 */
function PortCard({ port, onClose, onFavorite, onOpenFolder }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = (e) => {
    // Don't expand if clicking on action buttons
    if (e.target.closest('.port-card-actions')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onFavorite?.(port);
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose?.(port);
  };

  const handleOpenFolderClick = (e) => {
    e.stopPropagation();
    onOpenFolder?.(port);
  };

  return (
    <div
      className={`port-card ${isExpanded ? 'expanded' : ''}`}
      onClick={handleCardClick}
    >
      <div className="port-card-header">
        <div className="port-card-main-info">
          <span className="port-number">:{port.port}</span>
          <span className="port-process-name" title={port.processName || 'Unknown Process'}>
            {port.processName || 'Unknown Process'}
          </span>
          <span className={`status-badge status-${port.status || 'running'}`}>
            {port.status || 'running'}
          </span>
        </div>
        <div className="port-card-actions">
          <button
            className="action-btn favorite-btn"
            onClick={handleFavoriteClick}
            title={port.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {port.isFavorite ? '★' : '☆'}
          </button>
          <button
            className="action-btn open-folder-btn"
            onClick={handleOpenFolderClick}
            title="Open folder"
          >
            📁
          </button>
          <button
            className="action-btn close-btn"
            onClick={handleCloseClick}
            title="Close port"
          >
            ✕
          </button>
        </div>
      </div>

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
    </div>
  );
}

export default PortCard;
