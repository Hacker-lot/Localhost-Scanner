import { useState } from 'react';
import './FavoritesPanel.css';

/**
 * FavoritesPanel Component
 * Sidebar component for managing favorite ports and folders
 * @param {Object} favorites - Object with ports and folders arrays
 * @param {Array} ports - All scanned ports for navigation
 * @param {Function} onRemovePort - Callback for removing a favorite port
 * @param {Function} onRemoveFolder - Callback for removing a favorite folder
 * @param {Function} onLaunchFolder - Callback for launching a folder
 * @param {Function} onRefresh - Callback for refreshing favorites
 */
function FavoritesPanel({
  favorites = { ports: [], folders: [] },
  ports = [],
  onRemovePort,
  onRemoveFolder,
  onLaunchFolder,
  onRefresh,
}) {
  const [portsExpanded, setPortsExpanded] = useState(true);
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  const togglePortsSection = () => {
    setPortsExpanded(!portsExpanded);
  };

  const toggleFoldersSection = () => {
    setFoldersExpanded(!foldersExpanded);
  };

  const handlePortClick = (favPort) => {
    // Scroll to or highlight the port in the main list
    // For now, just show an alert
    console.log('Navigate to port:', favPort.port);
  };

  const handleFolderLaunch = (folder) => {
    onLaunchFolder?.(folder);
  };

  return (
    <div className="favorites-panel">
      <div className="favorites-header">
        <h2 className="favorites-title">⭐ Favorites</h2>
        <button className="refresh-btn" onClick={onRefresh} title="Refresh">
          🔄
        </button>
      </div>

      {/* Favorite Ports Section */}
      <div className="favorites-section">
        <button
          className="section-header"
          onClick={togglePortsSection}
          aria-expanded={portsExpanded}
        >
          <span className="section-icon">{portsExpanded ? '▼' : '▶'}</span>
          <span className="section-title">Ports</span>
          <span className="section-count">{favorites.ports?.length || 0}</span>
        </button>

        {portsExpanded && (
          <div className="section-content">
            {(!favorites.ports || favorites.ports.length === 0) ? (
              <p className="empty-message">No favorite ports</p>
            ) : (
              <ul className="favorites-list">
                {favorites.ports.map((fav) => (
                  <li key={`port-${fav.port}`} className="favorites-item">
                    <div
                      className="favorites-item-content"
                      onClick={() => handlePortClick(fav)}
                    >
                      <span className="port-badge">:{fav.port}</span>
                      <span className="item-label">{fav.name || `Port ${fav.port}`}</span>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => onRemovePort?.(fav.port)}
                      title="Remove from favorites"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Favorite Folders Section */}
      <div className="favorites-section">
        <button
          className="section-header"
          onClick={toggleFoldersSection}
          aria-expanded={foldersExpanded}
        >
          <span className="section-icon">{foldersExpanded ? '▼' : '▶'}</span>
          <span className="section-title">Folders</span>
          <span className="section-count">{favorites.folders?.length || 0}</span>
        </button>

        {foldersExpanded && (
          <div className="section-content">
            {(!favorites.folders || favorites.folders.length === 0) ? (
              <p className="empty-message">No favorite folders</p>
            ) : (
              <ul className="favorites-list">
                {favorites.folders.map((folder) => (
                  <li key={`folder-${folder.id}`} className="favorites-item">
                    <div
                      className="favorites-item-content"
                      onClick={() => handleFolderLaunch(folder)}
                    >
                      <span className="folder-icon">📁</span>
                      <div className="item-label-folder">
                        <span className="folder-name">{folder.name}</span>
                        <span className="folder-path">{folder.path}</span>
                      </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveFolder?.(folder.id)}
                      title="Remove from favorites"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Add New Section */}
      <div className="favorites-section add-section">
        <p className="add-hint">
          Click ☆ on a port card to add it to favorites.
          <br />
          Use Settings to add favorite folders.
        </p>
      </div>
    </div>
  );
}

export default FavoritesPanel;
